// Unified entitlement resolver — wraps the get_user_entitlements RPC.
// Use this instead of stitching together tier + limits + features + overrides
// in the UI. Cached for 30s per user.
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "./types";

export type Entitlements = {
  tier: Tier;
  limits: Record<string, { max: number; period: string; source: "tier" | "override" }>;
  features: Record<string, boolean>;
  overrides: Array<{
    meter: string; feature: string;
    bonus_units: number; max_override: number | null;
    expires_at: string | null;
  }>;
  boosters: Array<{
    meter: string; feature: string;
    remaining: number; expires_at: string | null;
  }>;
  resolved_at: string;
};

const cache = new Map<string, { at: number; data: Entitlements }>();
const TTL = 30_000;

export async function getEntitlements(userId: string, force = false): Promise<Entitlements | null> {
  const hit = cache.get(userId);
  if (!force && hit && Date.now() - hit.at < TTL) return hit.data;
  const { data, error } = await (supabase as any).rpc("get_user_entitlements", { _user: userId });
  if (error || !data) return null;
  cache.set(userId, { at: Date.now(), data: data as Entitlements });
  return data as Entitlements;
}

export function clearEntitlementsCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/** Resolve a single capability's effective max (override > tier). */
export function effectiveMax(ent: Entitlements, meter: string, feature = "*"): number {
  const k = `${meter}:${feature}`;
  const wk = `${meter}:*`;
  return ent.limits[k]?.max ?? ent.limits[wk]?.max ?? 0;
}

/** Active booster units available for a capability, if any. */
export function boosterRemaining(ent: Entitlements, meter: string, feature = "*"): number {
  return ent.boosters
    .filter((b) => b.meter === meter && (b.feature === feature || b.feature === "*"))
    .reduce((sum, b) => sum + (b.remaining || 0), 0);
}