// Centralized capability registry — single source of truth for tier-gated features.
import type { Meter, Tier } from "./types";

export type CostClass = "cheap" | "standard" | "expensive";

export type Capability = {
  key: string;
  meter: Meter | "workspace" | "portal" | "upload" | "async_job" | "roadmap" | "intake_form";
  feature: string;
  label: string;
  description: string;
  costClass: CostClass;
  minTier: Tier;
  upgradeCopy: string;
};

export const CAPABILITIES: Record<string, Capability> = {
  ai_generation: {
    key: "ai_generation", meter: "ai", feature: "*",
    label: "AI generations", description: "Daily AI assists across all tools",
    costClass: "expensive", minTier: "free",
    upgradeCopy: "Upgrade to raise your daily AI cap — or connect your own AI key for free.",
  },
  export_pdf: {
    key: "export_pdf", meter: "export", feature: "*",
    label: "PDF exports", description: "Branded PDF exports per day",
    costClass: "expensive", minTier: "free",
    upgradeCopy: "Pro unlocks 20/day, Elite 100/day, Infinity 500/day.",
  },
  workspace: {
    key: "workspace", meter: "workspace" as Meter, feature: "*",
    label: "Workspaces", description: "Active workspaces in your account",
    costClass: "standard", minTier: "free",
    upgradeCopy: "Free includes 1 workspace. Pro unlocks 10, Elite 50, Infinity unlimited.",
  },
  portal: {
    key: "portal", meter: "portal" as Meter, feature: "*",
    label: "Public client portals", description: "Live client-facing portals",
    costClass: "expensive", minTier: "free",
    upgradeCopy: "Free includes 1 public portal. Upgrade to publish more.",
  },
  upload: {
    key: "upload", meter: "upload" as Meter, feature: "*",
    label: "File uploads", description: "Files uploaded per day",
    costClass: "standard", minTier: "free",
    upgradeCopy: "Free is capped at 5 uploads/day. Pro raises to 50.",
  },
  async_job: {
    key: "async_job", meter: "async_job" as Meter, feature: "*",
    label: "Async jobs", description: "Queued background jobs per day",
    costClass: "expensive", minTier: "free",
    upgradeCopy: "Free queues 10 jobs/day. Pro 100, Elite 500, Infinity unlimited.",
  },
  roadmap: {
    key: "roadmap", meter: "roadmap" as Meter, feature: "*",
    label: "AI roadmaps", description: "Roadmap generations per week",
    costClass: "expensive", minTier: "free",
    upgradeCopy: "Free generates 3 roadmaps/week. Upgrade for more.",
  },
  intake_form: {
    key: "intake_form", meter: "intake_form" as Meter, feature: "*",
    label: "Intake forms", description: "Public intake forms",
    costClass: "standard", minTier: "free",
    upgradeCopy: "Free includes 1 intake form. Pro unlocks 5.",
  },
  telegram_export: {
    key: "telegram_export", meter: "telegram_export", feature: "*",
    label: "Telegram deliveries", description: "Files delivered to Telegram per day",
    costClass: "standard", minTier: "free",
    upgradeCopy: "Pro raises Telegram deliveries to 50/day.",
  },
  automation: {
    key: "automation", meter: "automation", feature: "*",
    label: "Automations", description: "Workflow runs per day",
    costClass: "expensive", minTier: "pro",
    upgradeCopy: "Automations start on Pro. Elite gets 500/day, Infinity unlimited.",
  },
};

export function getCapability(key: string): Capability | undefined {
  return CAPABILITIES[key];
}

export function listCapabilities(): Capability[] {
  return Object.values(CAPABILITIES);
}

export const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };

/** Suggest the minimum tier that would unlock more headroom. */
export function suggestUpgradeTier(currentTier: Tier, capability: Capability): Tier {
  const tiers: Tier[] = ["pro", "elite", "infinity"];
  const idx = TIER_RANK[currentTier];
  return tiers.find((t) => TIER_RANK[t] > idx) ?? "infinity";
}
