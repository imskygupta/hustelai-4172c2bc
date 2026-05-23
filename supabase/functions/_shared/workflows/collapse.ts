// Sprint D Phase 7.5 — workflow_events collapse helper.
//
// Problem: delivery retries (and other high-frequency producers) emit one
// workflow_event per attempt. At scale that turns workflow_events into an
// unbounded log table. Per architecture: workflow_events is a lightweight
// CONTINUITY stream, not a full event bus — Railway/ADMIN DB own real logs.
//
// This helper folds N events with the same (origin, dedupe_key) within a
// short window into ONE row, incrementing `collapsed_count` and bumping
// `last_seen_at` instead of inserting a new row.
//
// Use for: delivery.failed retries, retry_storm pulses, queue_lag pings.
// Do NOT use for: payment events, signups, export.delivered (terminal).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const COLLAPSE_WINDOW_MS = 5 * 60_000; // 5 minutes

export interface CollapseOptions {
  /** Stable key identifying this rolling event (e.g. "deliver_fail:<export_id>"). */
  dedupe_key: string;
  /** Producer subsystem (e.g. "edge.export-deliver-telegram"). */
  origin: string;
  /** User scope, if relevant. */
  user_id?: string | null;
}

export async function emitCollapsedEvent(
  sb: SupabaseClient,
  name: string,
  payload: Record<string, unknown>,
  opts: CollapseOptions,
): Promise<{ collapsed: boolean; event_id: string | null }> {
  try {
    const since = new Date(Date.now() - COLLAPSE_WINDOW_MS).toISOString();
    const { data: existing } = await sb
      .from("workflow_events")
      .select("id, collapsed_count")
      .eq("event_name", name)
      .eq("dedupe_key", opts.dedupe_key)
      .eq("event_origin", opts.origin)
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await sb.from("workflow_events")
        .update({
          collapsed_count: (existing.collapsed_count || 1) + 1,
          last_seen_at: new Date().toISOString(),
          payload, // latest payload wins — keeps most recent error message
        })
        .eq("id", existing.id);
      return { collapsed: true, event_id: existing.id };
    }

    const { data: inserted } = await sb.from("workflow_events").insert({
      event_name: name,
      payload,
      dedupe_key: opts.dedupe_key,
      event_origin: opts.origin,
      user_id: opts.user_id ?? null,
      collapsed_count: 1,
      last_seen_at: new Date().toISOString(),
    }).select("id").maybeSingle();
    return { collapsed: false, event_id: inserted?.id ?? null };
  } catch (e) {
    console.warn("[emitCollapsedEvent] error:", e);
    return { collapsed: false, event_id: null };
  }
}