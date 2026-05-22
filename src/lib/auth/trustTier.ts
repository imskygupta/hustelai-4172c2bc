import type { Database } from "@/integrations/supabase/types";

export type VerificationStatus = "pending" | "verified" | "suspended" | "flagged";
export type TrustTier = 0 | 1 | 2 | 3;

export interface TrustProfileLike {
  verification_status?: VerificationStatus | string | null;
  subscription_tier?: string | null;
}

/**
 * Tier 0 — guest (no session)
 * Tier 1 — authenticated, email NOT verified
 * Tier 2 — verified free user
 * Tier 3 — verified paying user (pro / elite / infinity)
 *
 * AI tools, exports, automations, workspace execution, BYOK and admin
 * paths require minimum tier 2. Tier 3 is reserved for high-cost
 * operations as we layer them in.
 */
export function trustTierFor(
  hasUser: boolean,
  profile: TrustProfileLike | null | undefined,
): TrustTier {
  if (!hasUser) return 0;
  const status = (profile?.verification_status ?? "pending") as VerificationStatus;
  if (status !== "verified") return 1;
  const tier = profile?.subscription_tier ?? "free";
  if (tier === "pro" || tier === "elite" || tier === "infinity") return 3;
  return 2;
}

export function meetsTier(current: TrustTier, required: TrustTier): boolean {
  return current >= required;
}

export type _DbHint = Database; // keeps the import from being elided