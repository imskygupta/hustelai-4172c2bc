// Quota guard primitives — throws structured QuotaError on cap-exceeded.
import { consumeUsage } from "./meter";
import { CAPABILITIES, suggestUpgradeTier, type Capability } from "./capabilities";
import type { Tier } from "./types";

export class QuotaError extends Error {
  constructor(
    public capability: Capability,
    public used: number,
    public max: number,
    public currentTier: Tier,
    public upgradeTier: Tier,
  ) {
    super(`Quota exceeded for ${capability.label}`);
    this.name = "QuotaError";
  }
}

/**
 * Consume one unit against a registered capability. If denied, throws QuotaError
 * which the global <QuotaBoundary> catches to render an upgrade sheet.
 */
export async function requireQuota(
  capabilityKey: string,
  units = 1,
  currentTier: Tier = "free",
): Promise<{ used: number; max: number }> {
  const cap = CAPABILITIES[capabilityKey];
  if (!cap) return { used: 0, max: -1 };
  const r = await consumeUsage(cap.meter as any, cap.feature, units);
  if (!r.allowed) {
    throw new QuotaError(cap, r.used, r.max, currentTier, suggestUpgradeTier(currentTier, cap));
  }
  return { used: r.used, max: r.max };
}
