// Sprint E Phase 5 — Quota enforcement helper (edge).
//
// Atomic consume + check. Backed by `tier_usage_counters` and the
// `atomic_tier_consume` RPC. Rolling-day windows (UTC).
//
// Usage:
//   const r = await consumeAndCheck(supabase, userId, "export", caps.export_quota);
//   if (!r.ok) return tierError("export_quota_exceeded", r);

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type QuotaKind =
  | "export"
  | "ai"
  | "telegram_delivery"
  | "automation"
  | "continuity_slot";

export interface QuotaResult {
  ok: boolean;
  kind: QuotaKind;
  count: number;
  limit: number;
  remaining: number;
  reason?: "exceeded" | "rpc_failed";
}

/** Increment counter then check against limit. Atomic. */
export async function consumeAndCheck(
  supabase: SupabaseClient,
  userId: string,
  kind: QuotaKind,
  limit: number,
  amount = 1,
): Promise<QuotaResult> {
  if (limit < 0) {
    // Unlimited (e.g. Infinity tier).
    return { ok: true, kind, count: 0, limit, remaining: -1 };
  }
  const { data, error } = await supabase.rpc("atomic_tier_consume", {
    _user_id: userId,
    _kind: kind,
    _amount: amount,
  });
  if (error) {
    console.warn("[quota] rpc failed:", error.message);
    return { ok: true, kind, count: 0, limit, remaining: limit, reason: "rpc_failed" };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const count = (row as any)?.count ?? amount;
  const remaining = Math.max(0, limit - count);
  return {
    ok: count <= limit,
    kind,
    count,
    limit,
    remaining,
    reason: count > limit ? "exceeded" : undefined,
  };
}

/** Read-only peek for diagnostics + UI hydration. */
export async function peekToday(
  supabase: SupabaseClient,
  userId: string,
  kind: QuotaKind,
): Promise<number> {
  const { data, error } = await supabase.rpc("tier_usage_today", {
    _user_id: userId,
    _kind: kind,
  });
  if (error) return 0;
  return (data as number) ?? 0;
}