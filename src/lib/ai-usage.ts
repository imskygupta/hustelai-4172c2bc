import { supabase } from "@/integrations/supabase/client";

export type DailyQuotaResult = {
  allowed: boolean;
  bypass: boolean;
  used: number;
  max: number;
};

/** Server-backed: consumes one unit of daily AI quota for a feature. */
export async function consumeDailyAI(feature: string): Promise<DailyQuotaResult> {
  try {
    const { data, error } = await (supabase as any).rpc("consume_ai_quota", { _feature: feature });
    if (error) throw error;
    const d = data || {};
    return {
      allowed: !!d.allowed,
      bypass: !!d.bypass,
      used: Number(d.used || 0),
      max: Number(d.max || 0),
    };
  } catch {
    // fail-open so a transient error doesn't block paid users
    return { allowed: true, bypass: false, used: 0, max: 0 };
  }
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