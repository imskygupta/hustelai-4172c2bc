import { supabase } from "@/integrations/supabase/client";

export type Tier = "free" | "pro" | "elite" | "infinity" | string;

/** Standard per-tool monthly limit across ALL AI tools. */
export const TIER_LIMITS: Record<string, number> = {
  free: 3,
  pro: 5,
  elite: 10,
  infinity: 20,
};

export function getMaxUses(tier?: Tier): number {
  return TIER_LIMITS[tier || "free"] ?? 3;
}

/** localStorage usage helpers — keyed per-tool & per-user. */
export function getUsage(toolKey: string, userId?: string): number {
  if (!userId) return 0;
  return parseInt(localStorage.getItem(`tool_uses_${toolKey}_${userId}`) || "0", 10);
}
export function bumpUsage(toolKey: string, userId?: string): number {
  if (!userId) return 0;
  const k = `tool_uses_${toolKey}_${userId}`;
  const next = getUsage(toolKey, userId) + 1;
  localStorage.setItem(k, String(next));
  return next;
}

/** Silently award XP to the current user for using an AI tool. Default 10. */
export async function awardXP(userId?: string, amount = 10) {
  if (!userId) return;
  try {
    const { data } = await supabase.from("profiles").select("xp_points").eq("user_id", userId).single();
    const current = ((data as any)?.xp_points as number) || 0;
    await supabase.from("profiles").update({ xp_points: current + amount } as any).eq("user_id", userId);
  } catch {
    // silent — XP is bonus
  }
}