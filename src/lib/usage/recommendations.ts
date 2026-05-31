// U3b — smart upgrade & booster recommendation engine.
// Pure function over the /me-usages payload. No network, no state.

export type MeterCard = {
  meter: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  pct: number;
};

export type Booster = {
  id: string;
  meter: string;
  title: string;
  benefit: string;
  price_inr: number;
  duration: string;
  pack_size: number;
};

export const BOOSTER_CATALOG: Booster[] = [
  { id: "ai_pack_10",      meter: "ai",      title: "+10 AI Assists",  benefit: "Instant top-up, valid today",  price_inr: 49,  duration: "Today only", pack_size: 10 },
  { id: "export_pack_5",   meter: "export",  title: "+5 Exports",      benefit: "Generate 5 more PDFs/Docs",    price_inr: 39,  duration: "7 days",     pack_size: 5  },
  { id: "storage_pack_1g", meter: "storage", title: "+1GB Storage",    benefit: "Extra workspace storage",      price_inr: 99,  duration: "30 days",    pack_size: 1024 },
  { id: "automation_pack_5", meter: "automation", title: "+5 Automations", benefit: "Run 5 extra automations",  price_inr: 79,  duration: "7 days",     pack_size: 5 },
  { id: "roadmap_pack_3",  meter: "roadmap", title: "+3 Roadmaps",     benefit: "Generate 3 detailed roadmaps", price_inr: 59,  duration: "7 days",     pack_size: 3 },
];

export const PLAN_ORDER = ["free", "pro", "elite", "infinity"] as const;
export type Plan = (typeof PLAN_ORDER)[number];

export function nextPlan(current: string): Plan | null {
  const idx = PLAN_ORDER.indexOf(current as Plan);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}

export type Recommendation =
  | { kind: "booster"; booster: Booster; card: MeterCard; reason: string }
  | { kind: "plan"; from: string; to: Plan; reason: string; hotMeters: string[] };

// Returns at most 3 recommendations.
// Rule: 2+ meters >80% → recommend plan upgrade. Otherwise per-meter booster.
export function recommend(
  plan: string,
  cards: MeterCard[],
  opts: { max?: number } = {}
): Recommendation[] {
  const max = opts.max ?? 3;
  const hot = cards.filter((c) => c.limit && c.limit > 0 && c.pct >= 80);
  const out: Recommendation[] = [];

  if (hot.length >= 2) {
    const np = nextPlan(plan);
    if (np) {
      out.push({
        kind: "plan",
        from: plan,
        to: np,
        reason: `You're at 80%+ on ${hot.length} meters today — upgrading covers them all.`,
        hotMeters: hot.map((h) => h.meter),
      });
    }
  }

  for (const card of hot.sort((a, b) => b.pct - a.pct)) {
    if (out.length >= max) break;
    const booster = BOOSTER_CATALOG.find((b) => b.meter === card.meter);
    if (!booster) continue;
    if (out.some((r) => r.kind === "booster" && r.booster.id === booster.id)) continue;
    out.push({
      kind: "booster",
      booster,
      card,
      reason: `You've used ${card.used}/${card.limit} ${card.meter} today.`,
    });
  }

  // If nothing is hot, suggest a soft plan nudge (only if user has used at least 1 meter)
  if (!out.length && cards.some((c) => c.used > 0)) {
    const np = nextPlan(plan);
    if (np) {
      out.push({
        kind: "plan",
        from: plan,
        to: np,
        reason: `You're cruising — ${np} unlocks higher limits and more tools.`,
        hotMeters: [],
      });
    }
  }

  return out.slice(0, max);
}

// Plan-tier deltas for the comparison strip. Keeps copy tight — no table.
export const PLAN_DELTAS: Record<Plan, { ai: string; exports: string; automations: string; extras: string }> = {
  free:     { ai: "5 / day",   exports: "3 / day",  automations: "—",        extras: "Community access" },
  pro:      { ai: "20 / day",  exports: "15 / day", automations: "5 / day",  extras: "Priority models, branded PDFs" },
  elite:    { ai: "60 / day",  exports: "60 / day", automations: "20 / day", extras: "Elite Vault, white-label" },
  infinity: { ai: "Unlimited", exports: "Unlimited", automations: "Unlimited", extras: "Everything + Infinity Zone" },
};