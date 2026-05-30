import { supabase } from "@/integrations/supabase/client";

export type DailyQuotaResult = {
  allowed: boolean;
  bypass: boolean;
  used: number;
  max: number;
};

/**
 * Client-side pre-flight. Authoritative enforcement + counter writes now
 * happen server-side in every AI edge function via `enforceAIQuota`, which
 * mirrors successful consumption into `ai_daily_usage`. We deliberately
 * DO NOT call `consume_ai_quota` from the client anymore — doing so was
 * causing double-counting on metered tools and silent fail-open on errors.
 *
 * This helper is kept as an optimistic UI hint only. If the server caps
 * the request it returns a structured 429 with `error: "ai_quota_exceeded"`
 * that callers handle.
 */
export async function consumeDailyAI(_feature: string): Promise<DailyQuotaResult> {
  return { allowed: true, bypass: false, used: 0, max: 0 };
}

export type DailyUsageSnapshot = {
  totalUsed: number;
  totalMax: number;
  perFeature: { feature: string; count: number }[];
};

const TIER_MAX: Record<string, number> = { free: 3, pro: 5, elite: 10, infinity: 20 };

export async function getDailyUsage(userId: string, tier: string = "free"): Promise<DailyUsageSnapshot> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await (supabase as any)
    .from("ai_daily_usage")
    .select("feature, count")
    .eq("user_id", userId)
    .eq("usage_date", today);

  const perFeature = (data || []).map((r: any) => ({ feature: r.feature, count: Number(r.count || 0) }));
  const totalUsed = perFeature.reduce((a, r) => a + r.count, 0);
  // Per-feature cap is what the RPC enforces; total max shown as cap × distinct features used today (min 1)
  const cap = TIER_MAX[tier] ?? 3;
  return { totalUsed, totalMax: cap, perFeature };
}

export const FEATURE_LABELS: Record<string, string> = {
  doc_autofill: "Doc Auto-fill",
  proposal: "Proposal AI",
  invoice: "Invoice AI",
  contract: "Contract AI",
  hustlebot: "HustleBot",
  resume: "Resume AI",
  blueprint: "Blueprint AI",
  search: "AI Search",
};