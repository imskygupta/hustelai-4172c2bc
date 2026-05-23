// Sprint E Phases 3 + 10 — capability + cooldown guard.
//
// Single chokepoint every edge function should pass through before doing
// tier-sensitive work. Always backend-first: never trust client gates.
//
// Pattern:
//   const guard = await requireCapability(supabase, userId, "telegram_exports");
//   if (!guard.ok) return new Response(JSON.stringify(guard), { status: 403 });

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  minTierFor,
  resolveCapabilities,
  suggestUpgrade,
  type Tier,
  type TierCapabilities,
} from "./resolveCapabilities.ts";

export interface GuardResult {
  ok: boolean;
  tier: Tier;
  capabilities: TierCapabilities;
  required_tier?: Tier;
  suggested_tier?: Tier;
  reason?: "tier_locked" | "tier_lookup_failed" | "cooldown" | "resend_cap";
  cooldown_seconds?: number;
  upgrade_copy?: string;
}

async function readTier(supabase: SupabaseClient, userId: string): Promise<Tier> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();
  return ((data?.subscription_tier as Tier) || "free") as Tier;
}

/** Boolean capability guard. */
export async function requireCapability(
  supabase: SupabaseClient,
  userId: string,
  cap: keyof TierCapabilities,
): Promise<GuardResult> {
  const tier = await readTier(supabase, userId);
  const capabilities = resolveCapabilities(tier);
  const value = capabilities[cap];
  if (typeof value === "boolean" && value) {
    return { ok: true, tier, capabilities };
  }
  if (typeof value === "number" && value !== 0) {
    return { ok: true, tier, capabilities };
  }
  const required = minTierFor(cap);
  return {
    ok: false,
    tier,
    capabilities,
    required_tier: required,
    suggested_tier: suggestUpgrade(tier),
    reason: "tier_locked",
    upgrade_copy: `This capability requires ${required.charAt(0).toUpperCase() + required.slice(1)}.`,
  };
}

/**
 * Cooldown guard for resend/retry abuse (Phase 10). Reads the artifact's
 * `last_delivery_at` + `resend_count` and checks against the tier's
 * cooldown + max-resends. No extra table — reuses existing fields.
 */
export async function checkResendCooldown(
  supabase: SupabaseClient,
  userId: string,
  artifactId: string,
): Promise<GuardResult> {
  const tier = await readTier(supabase, userId);
  const capabilities = resolveCapabilities(tier);

  const { data, error } = await supabase
    .from("workspace_artifacts")
    .select("last_delivery_at, resend_count, user_id")
    .eq("id", artifactId)
    .maybeSingle();
  if (error || !data) {
    return { ok: true, tier, capabilities };
  }
  if (data.user_id !== userId) {
    // Ownership guard — caller should also enforce this independently.
    return { ok: false, tier, capabilities, reason: "tier_locked" };
  }

  const resendCount = (data.resend_count as number) ?? 0;
  if (resendCount >= capabilities.max_resends_per_artifact) {
    return {
      ok: false,
      tier,
      capabilities,
      reason: "resend_cap",
      suggested_tier: suggestUpgrade(tier),
      upgrade_copy: `Resend cap reached for this artifact (${resendCount}/${capabilities.max_resends_per_artifact}).`,
    };
  }

  if (data.last_delivery_at) {
    const elapsed = (Date.now() - new Date(data.last_delivery_at as string).getTime()) / 1000;
    if (elapsed < capabilities.resend_cooldown_seconds) {
      const wait = Math.ceil(capabilities.resend_cooldown_seconds - elapsed);
      return {
        ok: false,
        tier,
        capabilities,
        reason: "cooldown",
        cooldown_seconds: wait,
        upgrade_copy: `Please wait ${wait}s before resending.`,
      };
    }
  }

  return { ok: true, tier, capabilities };
}

/** Standard 403 body shape for guard failures. */
export function guardErrorBody(g: GuardResult) {
  return {
    error: g.reason || "tier_locked",
    tier: g.tier,
    required_tier: g.required_tier,
    suggested_tier: g.suggested_tier,
    cooldown_seconds: g.cooldown_seconds,
    message: g.upgrade_copy,
  };
}