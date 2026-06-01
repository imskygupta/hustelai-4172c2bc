// Single source of truth for tier-based gating across Workspace OS.
// Pure config — no DB calls. Use with the user's profile.subscription_tier.

export type Tier = "free" | "pro" | "elite" | "infinity";

export const PAID_TIERS: Tier[] = ["pro", "elite", "infinity"];

export type EntitlementKey =
  | "remove_watermark"
  | "unlimited_proposals"
  | "ai_unlimited"
  | "byo_ai_key"
  | "premium_workflows"
  | "white_label"
  | "team_seats";

export const TIER_RANK: Record<Tier, number> = {
  free: 0, pro: 1, elite: 2, infinity: 3,
};

export const ENTITLEMENTS: Record<EntitlementKey, { minTier: Tier; label: string; cta: string; reason: string }> = {
  remove_watermark: {
    minTier: "pro",
    label: "Remove HustleAI watermark",
    cta: "Upgrade to Pro to export clean documents",
    reason: "Free exports include a small HustleAI watermark.",
  },
  unlimited_proposals: {
    minTier: "pro",
    label: "Unlimited proposals & quotations",
    cta: "Upgrade to Pro for unlimited document exports",
    reason: "Free plan is capped to 3 exports per day.",
  },
  ai_unlimited: {
    minTier: "infinity",
    label: "Unlimited AI assists",
    cta: "Connect your own AI key (free) — or upgrade to Infinity",
    reason: "Each tier has a daily AI cap. BYO key bypasses it.",
  },
  byo_ai_key: {
    minTier: "free",
    label: "Bring your own AI key",
    cta: "Connect Gemini / OpenRouter — free at provider cost",
    reason: "Bypass platform AI limits using your own provider key.",
  },
  premium_workflows: {
    minTier: "elite",
    label: "Premium workflows",
    cta: "Upgrade to Elite for advanced workspace automations",
    reason: "Includes retainer mode, advanced reminders, deeper exports.",
  },
  white_label: {
    minTier: "infinity",
    label: "White-label client portals",
    cta: "Upgrade to Infinity for fully branded portals",
    reason: "Remove HustleAI branding from client-facing surfaces.",
  },
  team_seats: {
    minTier: "elite",
    label: "Team seats",
    cta: "Upgrade to Elite to invite teammates",
    reason: "Collaborate with up to 3 teammates on Elite, unlimited on Infinity.",
  },
};

export function tierOf(profile: any): Tier {
  return ((profile?.subscription_tier || "free") as Tier);
}

export function hasEntitlement(profile: any, key: EntitlementKey): boolean {
  const e = ENTITLEMENTS[key];
  return TIER_RANK[tierOf(profile)] >= TIER_RANK[e.minTier];
}

// ⚠️ DEPRECATED: hardcoded tier caps are now owned by the `tier_limits` table
// + `get_user_entitlements()` RPC (single source of truth, U-Final hardening).
// Do NOT import these. They are kept ONLY as a fallback type reference and
// will be removed once every caller migrates to `useUserLimits()` / `/me-usages`.
/** @deprecated Use tier_limits via resolve_user_limits() / useUserLimits(). */
export const WORKSPACE_LIMITS: Record<Tier, number> = {
  free: 2, pro: 15, elite: 50, infinity: -1,
};
/** @deprecated Use tier_limits via resolve_user_limits() / useUserLimits(). */
export const EXPORT_LIMITS: Record<Tier, number> = {
  free: 3, pro: 20, elite: 100, infinity: -1,
};
/** @deprecated Use tier_limits via resolve_user_limits() / useUserLimits(). */
export const AI_LIMITS: Record<Tier, number> = {
  free: 3, pro: 5, elite: 10, infinity: -1,
};
/** @deprecated */
export function workspaceLimit(profile: any): number { return WORKSPACE_LIMITS[tierOf(profile)]; }
/** @deprecated */
export function exportLimit(profile: any): number { return EXPORT_LIMITS[tierOf(profile)]; }
/** @deprecated */
export function aiLimit(profile: any): number { return AI_LIMITS[tierOf(profile)]; }