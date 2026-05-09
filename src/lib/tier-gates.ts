// Centralized tier gating helpers used across Settings/Profile/Integrations UI.
// Backend continues to enforce limits independently (RLS + RPC quotas).
export type Tier = "free" | "pro" | "elite" | "infinity";

const PAID = new Set<Tier>(["pro", "elite", "infinity"]);
const PREMIUM = new Set<Tier>(["elite", "infinity"]);

export const norm = (t?: string | null): Tier => {
  const v = (t || "free").toLowerCase();
  return (["free", "pro", "elite", "infinity"].includes(v) ? v : "free") as Tier;
};

export const canPersistentExports = (t?: string | null) => PAID.has(norm(t));
export const canPriorityDelivery  = (t?: string | null) => PREMIUM.has(norm(t));
export const canPhoneNumber       = (t?: string | null) => PAID.has(norm(t));
export const canAdvancedRouting   = (t?: string | null) => PREMIUM.has(norm(t));
export const canTelegramAlerts    = (t?: string | null) => PAID.has(norm(t));

export const tierLabel = (t?: string | null) => norm(t).toUpperCase();