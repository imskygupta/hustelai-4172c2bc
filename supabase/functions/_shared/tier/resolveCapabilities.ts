// Sprint E Phase 1 — Canonical tier capability matrix (edge/Railway).
//
// Mirrors src/lib/tier/capabilities.ts. Backend is authoritative; the
// frontend matrix exists only for UX/labels — every gate must run here.
//
// Hard rule: NEVER inline-compare `tier === "pro"` in edge code.
// Resolve via resolveCapabilities(tier) and check the field.

export type Tier = "free" | "pro" | "elite" | "infinity";
export type QueueLane = "free" | "standard" | "priority" | "premium";

export interface TierCapabilities {
  ai_generation: boolean;
  export_generation: boolean;
  telegram_notifications: boolean;
  telegram_exports: boolean;
  persistent_storage: boolean;
  hybrid_storage: boolean;
  workflow_automation: boolean;
  realtime_sync: boolean;
  collaboration: boolean;
  operational_agents: boolean;
  advanced_exports: boolean;
  infinity_mode: boolean;

  continuity_days: number;
  continuity_slots: number;
  export_quota: number;
  ai_quota: number;
  telegram_delivery_quota: number;
  automation_quota: number;

  queue_lane: QueueLane;
  queue_priority: number;

  resend_cooldown_seconds: number;
  max_resends_per_artifact: number;
}

export const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };

const FREE: TierCapabilities = {
  ai_generation: true, export_generation: true,
  telegram_notifications: true, telegram_exports: false,
  persistent_storage: false, hybrid_storage: false,
  workflow_automation: false, realtime_sync: true,
  collaboration: false, operational_agents: false,
  advanced_exports: false, infinity_mode: false,
  continuity_days: 7, continuity_slots: 25,
  export_quota: 5, ai_quota: 20,
  telegram_delivery_quota: 10, automation_quota: 0,
  queue_lane: "free", queue_priority: 10,
  resend_cooldown_seconds: 60, max_resends_per_artifact: 2,
};

const PRO: TierCapabilities = {
  ...FREE,
  telegram_exports: true, persistent_storage: true, hybrid_storage: true,
  workflow_automation: true, collaboration: true, advanced_exports: true,
  continuity_days: 90, continuity_slots: 500,
  export_quota: 50, ai_quota: 200,
  telegram_delivery_quota: 100, automation_quota: 50,
  queue_lane: "standard", queue_priority: 40,
  resend_cooldown_seconds: 30, max_resends_per_artifact: 5,
};

const ELITE: TierCapabilities = {
  ...PRO,
  operational_agents: true,
  continuity_days: 365, continuity_slots: 2500,
  export_quota: 200, ai_quota: 1000,
  telegram_delivery_quota: 500, automation_quota: 500,
  queue_lane: "priority", queue_priority: 70,
  resend_cooldown_seconds: 15, max_resends_per_artifact: 10,
};

const INFINITY: TierCapabilities = {
  ...ELITE,
  infinity_mode: true,
  continuity_days: -1, continuity_slots: 10000,
  export_quota: 2000, ai_quota: 10000,
  telegram_delivery_quota: 5000, automation_quota: 5000,
  queue_lane: "premium", queue_priority: 100,
  resend_cooldown_seconds: 5, max_resends_per_artifact: 25,
};

const TABLE: Record<Tier, TierCapabilities> = { free: FREE, pro: PRO, elite: ELITE, infinity: INFINITY };

export function resolveCapabilities(tier: Tier | string | null | undefined): TierCapabilities {
  const t = (tier ?? "free") as Tier;
  return TABLE[t] ?? TABLE.free;
}

export function minTierFor(cap: keyof TierCapabilities): Tier {
  const order: Tier[] = ["free", "pro", "elite", "infinity"];
  for (const t of order) if (TABLE[t][cap]) return t;
  return "infinity";
}

export function suggestUpgrade(current: Tier): Tier {
  if (current === "free") return "pro";
  if (current === "pro") return "elite";
  if (current === "elite") return "infinity";
  return "infinity";
}