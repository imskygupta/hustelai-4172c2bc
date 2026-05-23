// Sprint E Phase 1 — Canonical tier capability matrix (frontend mirror).
//
// This is the SINGLE source of truth for tier-driven runtime rights.
// Mirrored 1:1 in supabase/functions/_shared/tier/resolveCapabilities.ts.
// Keep both in lockstep when editing.
//
// Hard rule: never gate behavior with `if (tier === "pro")` inline.
// Always resolve through `resolveCapabilities(tier)` and check the field.

export type Tier = "free" | "pro" | "elite" | "infinity";

export const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };

/** Queue priority lanes — Railway workers MUST respect this ordering. */
export type QueueLane = "free" | "standard" | "priority" | "premium";

export interface TierCapabilities {
  // Runtime rights
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

  // Numeric ceilings (rolling-day windows except continuity_days)
  continuity_days: number;        // -1 = forever
  continuity_slots: number;       // max rows in Exports continuity index
  export_quota: number;           // exports/day
  ai_quota: number;               // AI generations/day
  telegram_delivery_quota: number; // TG deliveries/day
  automation_quota: number;       // automation runs/day

  // Execution
  queue_lane: QueueLane;          // 'premium' = infinity, etc.
  queue_priority: number;         // higher = scheduled sooner (0..100)

  // Resend / cooldown discipline (Phase 10)
  resend_cooldown_seconds: number;
  max_resends_per_artifact: number;
}

const FREE: TierCapabilities = {
  ai_generation: true,
  export_generation: true,
  telegram_notifications: true,
  telegram_exports: false,        // notifications only; not durable exports
  persistent_storage: false,
  hybrid_storage: false,
  workflow_automation: false,
  realtime_sync: true,
  collaboration: false,
  operational_agents: false,
  advanced_exports: false,
  infinity_mode: false,
  continuity_days: 7,
  continuity_slots: 25,
  export_quota: 5,
  ai_quota: 20,
  telegram_delivery_quota: 10,
  automation_quota: 0,
  queue_lane: "free",
  queue_priority: 10,
  resend_cooldown_seconds: 60,
  max_resends_per_artifact: 2,
};

const PRO: TierCapabilities = {
  ...FREE,
  telegram_exports: true,
  persistent_storage: true,
  hybrid_storage: true,
  workflow_automation: true,
  collaboration: true,
  advanced_exports: true,
  continuity_days: 90,
  continuity_slots: 500,
  export_quota: 50,
  ai_quota: 200,
  telegram_delivery_quota: 100,
  automation_quota: 50,
  queue_lane: "standard",
  queue_priority: 40,
  resend_cooldown_seconds: 30,
  max_resends_per_artifact: 5,
};

const ELITE: TierCapabilities = {
  ...PRO,
  operational_agents: true,
  continuity_days: 365,
  continuity_slots: 2500,
  export_quota: 200,
  ai_quota: 1000,
  telegram_delivery_quota: 500,
  automation_quota: 500,
  queue_lane: "priority",
  queue_priority: 70,
  resend_cooldown_seconds: 15,
  max_resends_per_artifact: 10,
};

const INFINITY: TierCapabilities = {
  ...ELITE,
  infinity_mode: true,
  continuity_days: -1,
  continuity_slots: 10000,
  export_quota: 2000,
  ai_quota: 10000,
  telegram_delivery_quota: 5000,
  automation_quota: 5000,
  queue_lane: "premium",
  queue_priority: 100,
  resend_cooldown_seconds: 5,
  max_resends_per_artifact: 25,
};

const TABLE: Record<Tier, TierCapabilities> = {
  free: FREE,
  pro: PRO,
  elite: ELITE,
  infinity: INFINITY,
};

export function resolveCapabilities(tier: Tier | string | null | undefined): TierCapabilities {
  const t = (tier ?? "free") as Tier;
  return TABLE[t] ?? TABLE.free;
}

/** Return the minimum tier that satisfies a given boolean capability. */
export function minTierFor(cap: keyof TierCapabilities): Tier {
  const order: Tier[] = ["free", "pro", "elite", "infinity"];
  for (const t of order) {
    if (TABLE[t][cap]) return t;
  }
  return "infinity";
}

/** Suggest a sensible upgrade for the current tier. */
export function suggestUpgrade(current: Tier): Tier {
  if (current === "free") return "pro";
  if (current === "pro") return "elite";
  if (current === "elite") return "infinity";
  return "infinity";
}

export function tierLabel(t: Tier): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Operational, non-spammy upgrade prompts per capability. */
export const UPGRADE_COPY: Partial<Record<keyof TierCapabilities, string>> = {
  persistent_storage: "Persistent continuity available on Pro",
  hybrid_storage: "Hybrid storage (Telegram + local copy) available on Pro",
  telegram_exports: "Telegram export continuity requires Pro",
  workflow_automation: "Automations start on Pro",
  collaboration: "Workspace collaboration starts on Pro",
  operational_agents: "Operational agents unlock on Elite",
  advanced_exports: "Advanced export routing unlocks on Pro",
  infinity_mode: "Unlimited operational memory on Infinity",
};