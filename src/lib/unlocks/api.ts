import { supabase } from "@/integrations/supabase/client";
import type { UnlockPack, UnlockSummary } from "./types";

export async function getUnlockSummary(userId: string): Promise<UnlockSummary> {
  const { data, error } = await (supabase as any).rpc("unlock_summary", { _user: userId });
  if (error) throw error;
  return (data || { balances: [], recent: [] }) as UnlockSummary;
}

export async function getUnlockPacks(meter?: string, feature?: string): Promise<UnlockPack[]> {
  let q = (supabase as any).from("unlock_packs").select("*").eq("active", true).order("sort_order");
  if (meter) q = q.eq("meter", meter);
  if (feature && feature !== "*") q = q.in("feature", [feature, "*"]);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as UnlockPack[];
}

/**
 * Kicks off a Cashfree checkout for an unlock pack purchase. Re-uses the
 * existing payment infrastructure — the webhook completes the purchase
 * server-side and credits the user via `grant_unlocks`.
 */
export async function purchaseUnlockPack(packKey: string): Promise<{ checkout_url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("unlock-purchase", {
      body: { pack_key: packKey },
    });
    if (error) throw error;
    return data as any;
  } catch (e: any) {
    return { error: e?.message || "Purchase failed" };
  }
}

/** Friendly relative time until daily reset (UTC midnight). */
export function hoursUntilDailyReset(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 3_600_000));
}