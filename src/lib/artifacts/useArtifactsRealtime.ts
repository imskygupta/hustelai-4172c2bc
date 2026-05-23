// Sprint D Phase 9 — realtime hydration for the Exports page.
//
// Strategy: low-cost. ONE postgres_changes subscription filtered by
// user_id on workspace_artifacts. On every event we merge the row into
// state without re-fetching the whole list. On mount we hydrate via the
// unified view (covers legacy_export rows the realtime channel can't see).
//
// If realtime is unavailable (transient outage, throttled tab), we fall
// back to a 60s reconciliation poll. No aggressive timers — visibility-
// gated and adaptive.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listArtifacts, type ArtifactRow } from "@/lib/artifacts/api";

interface Opts {
  userId: string | null;
  search?: string;
  deliveryStatus?: string;
  limit?: number;
}

const MAX_ROWS = 200;

export function useArtifactsRealtime(opts: Opts) {
  const { userId, search, deliveryStatus, limit = MAX_ROWS } = opts;
  const [rows, setRows] = useState<ArtifactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const lastHydratedAt = useRef<number>(0);

  const hydrate = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await listArtifacts({ search, deliveryStatus, limit });
      setRows(list);
      lastHydratedAt.current = Date.now();
    } catch (e) {
      // partial failure isolation — keep prior rows on transient hydrate fail
      console.warn("[exports] hydrate failed:", (e as any)?.message || e);
      setDegraded(true);
    } finally {
      setLoading(false);
    }
  }, [userId, search, deliveryStatus, limit]);

  // Hydrate on mount + when filters change.
  useEffect(() => {
    setLoading(true);
    void hydrate();
  }, [hydrate]);

  // Realtime subscription — single channel, user-scoped, no fan-out.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`artifacts:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_artifacts", filter: `user_id=eq.${userId}` },
        (payload) => {
          setDegraded(false);
          const next = (payload.new || payload.old) as any;
          if (!next?.id) return;
          setRows((prev) => mergeRow(prev, next, payload.eventType));
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setDegraded(true);
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Adaptive reconcile: only when tab visible AND >60s since last hydrate.
  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastHydratedAt.current < 60_000) return;
      void hydrate();
    };
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(tick, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [userId, hydrate]);

  // Optimistic insert helper for generation surfaces.
  const insertOptimistic = useCallback((row: ArtifactRow) => {
    setRows((prev) => mergeRow(prev, row as any, "INSERT"));
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const bytes = rows.reduce((a, r) => a + (r.size_bytes || 0), 0);
    const favorites = rows.filter((r) => r.is_favorite).length;
    const tgCached = rows.filter((r) => r.storage_mode === "telegram" || r.storage_mode === "hybrid").length;
    return { total, bytes, favorites, tgCached };
  }, [rows]);

  return { rows, loading, degraded, stats, refresh: hydrate, insertOptimistic };
}

function mergeRow(prev: ArtifactRow[], next: any, eventType: string): ArtifactRow[] {
  if (eventType === "DELETE") {
    return prev.filter((r) => r.id !== next.id);
  }
  const idx = prev.findIndex((r) => r.id === next.id);
  if (idx >= 0) {
    const merged = { ...prev[idx], ...next } as ArtifactRow;
    const copy = prev.slice();
    copy[idx] = merged;
    return copy;
  }
  // New row — keep newest-first, respect MAX_ROWS soft cap.
  return [next as ArtifactRow, ...prev].slice(0, MAX_ROWS);
}