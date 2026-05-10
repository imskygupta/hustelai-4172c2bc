import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type AsyncItemKind = "ai_job" | "export";
export type AsyncItemStatus =
  | "queued" | "running" | "retrying" | "succeeded" | "failed" | "cancelled"
  | "pending" | "ready" | "delivered" | "expired" | "revoked";

export interface AsyncItem {
  id: string;
  kind: AsyncItemKind;
  /** Human label e.g. "Hustle Blueprint" or export title */
  label: string;
  status: AsyncItemStatus;
  progress?: number;
  created_at: string;
  updated_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
  /** Optional href to jump back into context */
  href?: string;
  /** Whether this item is still actively being worked on */
  active: boolean;
  raw?: any;
}

const KIND_LABELS: Record<string, string> = {
  blueprint: "Hustle Blueprint",
  resume_score: "Resume Score",
  resume_autofill: "Resume Autofill",
  proposal: "Proposal Draft",
  red_flag: "Red-Flag Scan",
  faceless: "Faceless Storyboard",
  price_calc: "Price Tiers",
  skill_gap: "Skill Gap Analysis",
  hustlebot: "HustleBot Reply",
};

const KIND_HREF: Record<string, string> = {
  blueprint: "/hustle-blueprint",
  resume_score: "/resume-optimizer",
  resume_autofill: "/resume-optimizer",
  proposal: "/proposal-draft",
  red_flag: "/red-flag-scanner",
  faceless: "/faceless-content",
  price_calc: "/gig-price-calculator",
  skill_gap: "/skill-gap",
  hustlebot: "/hustlebot",
};

function jobLabel(kind: string) {
  return KIND_LABELS[kind] || kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACTIVE_JOB = new Set(["queued", "running", "retrying"]);
const ACTIVE_EXPORT = new Set(["pending"]);

export interface UseAsyncActivityOpts {
  enabled?: boolean;
  /** Active polling interval (ms) when something is running */
  activeInterval?: number;
  /** Idle polling interval (ms) when nothing active */
  idleInterval?: number;
  /** Max items to fetch per source */
  limit?: number;
}

/**
 * Lightweight global async activity poller.
 * Surfaces in-flight + recently-completed AI jobs and exports for the
 * current user. Polls faster while items are active, slower while idle.
 */
export function useAsyncActivity(opts: UseAsyncActivityOpts = {}) {
  const { enabled = true, activeInterval = 5000, idleInterval = 30000, limit = 8 } = opts;
  const [items, setItems] = useState<AsyncItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { setItems([]); return; }

      const [jobsRes, expRes] = await Promise.all([
        sb.from("ai_jobs").select("id,kind,status,progress,error,created_at,updated_at,finished_at")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(limit),
        sb.from("generated_exports").select("id,title,export_type,status,created_at,updated_at,delivered_at")
          .eq("user_id", uid).order("created_at", { ascending: false }).limit(limit),
      ]);

      const merged: AsyncItem[] = [];
      (jobsRes.data || []).forEach((r: any) => {
        merged.push({
          id: `job:${r.id}`,
          kind: "ai_job",
          label: jobLabel(r.kind),
          status: r.status,
          progress: r.progress,
          error: r.error,
          created_at: r.created_at,
          updated_at: r.updated_at,
          finished_at: r.finished_at,
          href: KIND_HREF[r.kind],
          active: ACTIVE_JOB.has(r.status),
          raw: r,
        });
      });
      (expRes.data || []).forEach((r: any) => {
        merged.push({
          id: `exp:${r.id}`,
          kind: "export",
          label: r.title || r.export_type || "Export",
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
          finished_at: r.delivered_at,
          href: "/settings/exports",
          active: ACTIVE_EXPORT.has(r.status),
          raw: r,
        });
      });

      merged.sort((a, b) => {
        // active first, then most recent
        if (a.active !== b.active) return a.active ? -1 : 1;
        return new Date(b.updated_at || b.created_at).getTime()
             - new Date(a.updated_at || a.created_at).getTime();
      });
      setItems(merged.slice(0, limit * 2));
      setError(null);
    } catch (e: any) {
      setError(e.message || "fetch failed");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: any;

    const tick = async () => {
      if (cancelled || document.hidden) {
        timer = setTimeout(tick, idleInterval);
        return;
      }
      await fetchAll();
      if (cancelled) return;
      const hasActive = items.some(i => i.active);
      timer = setTimeout(tick, hasActive ? activeInterval : idleInterval);
    };
    tick();
    const onVis = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchAll, activeInterval, idleInterval]);

  const activeCount = items.filter(i => i.active).length;
  const failedCount = items.filter(i => i.status === "failed").length;

  return { items, activeCount, failedCount, loading, error, refresh: fetchAll };
}