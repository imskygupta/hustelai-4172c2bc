import { supabase } from "@/integrations/supabase/client";
import type { UnlockPack, UnlockSummary } from "./types";
import { getCachedUnlockPacks } from "@/lib/public-bootstrap";

export async function getUnlockSummary(userId: string): Promise<UnlockSummary> {
  const { data, error } = await (supabase as any).rpc("unlock_summary", { _user: userId });
  if (error) throw error;
  return (data || { balances: [], recent: [] }) as UnlockSummary;
}

export async function getUnlockPacks(meter?: string, feature?: string): Promise<UnlockPack[]> {
  // Cost stabilization: served from the cached public-bootstrap payload.
  // Filtering happens client-side (8 rows total — negligible).
  const all = (await getCachedUnlockPacks()) as UnlockPack[];
  return all.filter((p) => {
    if (meter && p.meter !== meter) return false;
    if (feature && feature !== "*" && p.feature !== feature && p.feature !== "*") return false;
    return true;
  });
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