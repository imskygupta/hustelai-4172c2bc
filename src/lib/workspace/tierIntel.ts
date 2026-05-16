/**
 * Tier intelligence — the workspace's quiet scaling brain.
 *
 * Pure config + helpers. NO hard paywalls live here. Surfaces consume
 * this to:
 *   - clip operational memory depth by tier
 *   - cap project scale (soft, with possibility message)
 *   - hint output quality tier on deliverables
 *   - choose AI concurrency / queue posture per tier
 *   - render a single calm "what becomes possible" line — never nag
 *
 * Rules of the road:
 *   1. Free still feels premium. Caps are generous-enough to taste magic.
 *   2. BYOK = "Bring your own AI power" lifts AI caps regardless of tier.
 *   3. Messaging is possibility-first: "becomes persistent on Elite",
 *      not "you've hit a limit".
 */
import type { Tier } from "@/lib/workspace-os/entitlements";

export type TierProfile = {
  tier: Tier;
  /** How far back operational memory may reach, in days. -1 = unlimited. */
  memoryDays: number;
  /** Soft active-project cap. Above this, surface a possibility hint. */
  projectCap: number;
  /** Concurrent AI generations the workspace will fan out. */
  aiConcurrency: number;
  /** Suggested queue posture for the runner UI. */
  lane: "shared" | "priority" | "fast" | "infinity";
  /** Output quality tier — drives subtle deliverable polish + watermark. */
  output: "discover" | "client" | "branded" | "team";
  /** Whether cross-project intelligence is available. */
  crossProject: boolean;
};

export const TIER_PROFILE: Record<Tier, TierProfile> = {
  free:     { tier: "free",     memoryDays: 7,   projectCap: 3,   aiConcurrency: 1, lane: "shared",   output: "discover", crossProject: false },
  pro:      { tier: "pro",      memoryDays: 90,  projectCap: 25,  aiConcurrency: 2, lane: "priority", output: "client",   crossProject: false },
  elite:    { tier: "elite",    memoryDays: -1,  projectCap: 999, aiConcurrency: 3, lane: "fast",     output: "branded",  crossProject: true  },
  infinity: { tier: "infinity", memoryDays: -1,  projectCap: 9999,aiConcurrency: 5, lane: "infinity", output: "team",     crossProject: true  },
};

export function profileOf(tier?: Tier | string | null): TierProfile {
  const t = (tier || "free") as Tier;
  return TIER_PROFILE[t] || TIER_PROFILE.free;
}

/** Clip an array of dated rows down to the tier's memory window. */
export function clipByMemoryWindow<T extends { created_at?: string | null }>(
  rows: T[], tier?: Tier | string | null,
): T[] {
  const p = profileOf(tier);
  if (p.memoryDays < 0) return rows;
  const cutoff = Date.now() - p.memoryDays * 86_400_000;
  return rows.filter((r) => {
    const t = r.created_at ? +new Date(r.created_at) : 0;
    return t >= cutoff;
  });
}

/** Next tier up — for possibility messaging. */
const ORDER: Tier[] = ["free", "pro", "elite", "infinity"];
export function nextTier(tier?: Tier | string | null): Tier | null {
  const i = ORDER.indexOf((tier || "free") as Tier);
  if (i < 0 || i >= ORDER.length - 1) return null;
  return ORDER[i + 1];
}

/**
 * Possibility hints — one short, calm sentence per intent/surface that
 * describes what becomes possible at the next tier. Used by surfaces to
 * show ONE line, never a paywall.
 *
 * Key shape: `${surface}:${tier}` — surface is free-form ("intent",
 * "memory", "projects", "exports", "providers").
 */
export const POSSIBILITY: Record<string, string> = {
  // Generation surfaces
  "intent:free":  "This deliverable becomes client-grade on Pro.",
  "intent:pro":   "Branded exports + advanced chains unlock on Elite.",
  "intent:elite": "Cross-project intelligence and team handoff unlock on Infinity.",

  // Operational memory
  "memory:free":  "Memory keeps the last 7 days. Pro remembers 90.",
  "memory:pro":   "Elite carries the full project memory, end-to-end.",
  "memory:elite": "Infinity links memory across every project you run.",

  // Projects
  "projects:free":  "Pro lifts active projects to 25 and unlocks priority lane.",
  "projects:pro":   "Elite runs unlimited solo operations.",
  "projects:elite": "Infinity scales to agency-shaped workspaces.",

  // Provider infrastructure
  "providers:free":  "Bring your own key to unlock unlimited execution — free at provider cost.",
  "providers:pro":   "Elite adds the fast lane and multi-flow execution.",
  "providers:elite": "Infinity opens parallel chains with the largest context windows.",

  // Exports
  "exports:free":  "Clean, watermark-free PDFs ship with Pro.",
  "exports:pro":   "Elite adds branded operational exports.",
  "exports:elite": "Infinity bundles team-ready operational systems.",
};

export function possibilityFor(surface: string, tier?: Tier | string | null): string | null {
  const p = profileOf(tier);
  if (p.tier === "infinity") return null;
  return POSSIBILITY[`${surface}:${p.tier}`] ?? null;
}

/** Output-quality label rendered subtly on deliverables. */
export const OUTPUT_LABEL: Record<TierProfile["output"], string> = {
  discover: "Discover edition",
  client:   "Client-grade",
  branded:  "Branded operational",
  team:     "Team-ready system",
};

export const LANE_LABEL: Record<TierProfile["lane"], string> = {
  shared:   "Shared lane",
  priority: "Priority lane",
  fast:     "Fast lane",
  infinity: "Infinity lane",
};