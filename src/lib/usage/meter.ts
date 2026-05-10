// Unified metering API. Replace ad-hoc consume_* calls with these helpers.
// Backward-compatible: existing `consume_ai_quota` / `consume_export_quota`
// still work — `consume_usage` is the new canonical entry point.
import { supabase } from "@/integrations/supabase/client";
import type { ConsumeResult, LimitsPayload, Meter } from "./types";

let limitsCache: { at: number; userId: string; payload: LimitsPayload } | null = null;
const TTL = 30_000;

export async function resolveLimits(userId: string, force = false): Promise<LimitsPayload> {
  if (!force && limitsCache && limitsCache.userId === userId && Date.now() - limitsCache.at < TTL) {
    return limitsCache.payload;
  }
  const { data, error } = await (supabase as any).rpc("resolve_user_limits", { _user: userId });
  if (error) throw error;
  const payload = (data || { tier: "free", limits: {}, features: {}, overrides: [] }) as LimitsPayload;
  limitsCache = { at: Date.now(), userId, payload };
  return payload;
}

export async function hasFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
  try {
    const lim = await resolveLimits(userId);
    return !!lim.features?.[featureKey];
  } catch { return false; }
}

export async function getRemainingQuota(
  userId: string, meter: Meter, feature = "*",
): Promise<{ used: number; max: number; remaining: number; bypass: boolean }> {
  try {
    const lim = await resolveLimits(userId);
    const key = `${meter}:${feature}`;
    const wildcardKey = `${meter}:*`;
    const cap = (lim.limits[key] || lim.limits[wildcardKey])?.max ?? -1;
    return { used: 0, max: cap, remaining: cap < 0 ? Infinity : cap, bypass: false };
  } catch {
    return { used: 0, max: 0, remaining: 0, bypass: false };
  }
}

export async function consumeUsage(
  meter: Meter, feature = "*", units = 1,
): Promise<ConsumeResult> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) return { allowed: true, bypass: false, used: 0, max: 0, reason: "ok" };
    const { data, error } = await (supabase as any).rpc("consume_usage", {
      _user: userId, _meter: meter, _feature: feature, _units: units,
    });
    if (error) throw error;
    // Fire-and-forget heavy ledger write to analytics DB
    void supabase.functions.invoke("usage-record", {
      body: { meter, feature, units, result: data },
    }).catch(() => {});
    return data as ConsumeResult;
  } catch {
    // Fail-open so transient analytics issues never block paying users
    return { allowed: true, bypass: false, used: 0, max: 0, reason: "ok" };
  }
}

export async function getRetentionPolicy(resource: string): Promise<number> {
  const { data } = await supabase.from("retention_policies" as any)
    .select("retention_days").eq("resource", resource).maybeSingle();
  return ((data as any)?.retention_days as number) ?? -1;
}

export function clearLimitsCache() { limitsCache = null; }
