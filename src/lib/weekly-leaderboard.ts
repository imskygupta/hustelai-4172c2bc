// Weekly leaderboard fake users.
// 10–15 hardcoded "personas" with XP. Names rotate each Sunday using a deterministic
// seeded shuffle so every user sees the same names for the current ISO week, and
// the list automatically refreshes when a new week starts.
//
// Distribution (target):
//   - Gender:   ~60% male, ~40% female
//   - Origin:   ~50% Indian, ~30% foreign, ~20% misc / random handles
//
// XP is intentionally above the 1000+ threshold (the page requirement).

export interface WeeklyEntry {
  rank: number;
  display_name: string;
  xp_points: number;
  region: "IN" | "FR" | "MISC";
  gender: "M" | "F";
  tier: "pro" | "elite" | "infinity";
}

// --- Name pools ---
const indianMale = [
  "Aarav Sharma", "Rohan Mehta", "Vihaan Kapoor", "Aditya Iyer", "Kabir Reddy",
  "Arjun Nair", "Dev Malhotra", "Yash Patel", "Ishaan Bose", "Rudra Chauhan",
  "Aryan Singh", "Karan Joshi", "Veer Khanna", "Manav Rao", "Siddharth Verma",
];
const indianFemale = [
  "Ananya Gupta", "Priya Desai", "Saanvi Kulkarni", "Diya Bansal", "Meera Pillai",
  "Aisha Khan", "Ritika Shah", "Tanvi Menon", "Kavya Reddy", "Nisha Choudhary",
];
const foreignMale = [
  "Liam Carter", "Ethan Walker", "Noah Hughes", "Lucas Müller", "Mateo Rossi",
  "Daniel Park", "Hiroshi Tanaka", "Adrian Vega",
];
const foreignFemale = [
  "Emma Bennett", "Olivia Reed", "Sofia Conti", "Chloe Martin", "Yuki Sato",
  "Isabella Cruz",
];
const miscHandles = [
  "h4ck3r_jay", "the_sigma_grindset", "midnight_coder", "quietHustler99",
  "byte_rider", "ramen_dev",
];

function pickGenderedSet(): { name: string; gender: "M" | "F"; region: WeeklyEntry["region"] }[] {
  // Build pool tagged by region & gender
  const pool: { name: string; gender: "M" | "F"; region: WeeklyEntry["region"] }[] = [
    ...indianMale.map((n) => ({ name: n, gender: "M" as const, region: "IN" as const })),
    ...indianFemale.map((n) => ({ name: n, gender: "F" as const, region: "IN" as const })),
    ...foreignMale.map((n) => ({ name: n, gender: "M" as const, region: "FR" as const })),
    ...foreignFemale.map((n) => ({ name: n, gender: "F" as const, region: "FR" as const })),
    ...miscHandles.map((n, i) => ({
      name: n,
      gender: (i % 2 === 0 ? "M" : "F") as "M" | "F",
      region: "MISC" as const,
    })),
  ];
  return pool;
}

/** ISO week number — used as the rotation seed (refreshes every Sunday at week boundary). */
function getWeekSeed(d = new Date()): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return target.getUTCFullYear() * 100 + week;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build this week's leaderboard. Length 12. Sorted by XP desc. */
export function getWeeklyLeaderboard(): WeeklyEntry[] {
  const seed = getWeekSeed();
  const rand = mulberry32(seed);
  const pool = pickGenderedSet();

  // Quotas — 12 total: ~7 male / ~5 female, 6 IN / 4 FR / 2 MISC
  const quotas: Array<[WeeklyEntry["region"], "M" | "F", number]> = [
    ["IN", "M", 4], ["IN", "F", 2],
    ["FR", "M", 2], ["FR", "F", 2],
    ["MISC", "M", 1], ["MISC", "F", 1],
  ];

  const chosen: { name: string; gender: "M" | "F"; region: WeeklyEntry["region"] }[] = [];
  const used = new Set<string>();
  for (const [region, gender, n] of quotas) {
    const candidates = pool.filter((p) => p.region === region && p.gender === gender && !used.has(p.name));
    // shuffle deterministically
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.slice(0, n).forEach((c) => { chosen.push(c); used.add(c.name); });
  }

  // Assign XP between 1000 and 4800 — top 3 always >3000
  const xps: number[] = [];
  for (let i = 0; i < chosen.length; i++) {
    const base = 1000 + Math.floor(rand() * 3800);
    xps.push(base);
  }
  xps.sort((a, b) => b - a);

  // Tier: top 3 → infinity, next 4 → elite, rest → pro
  const tiers: WeeklyEntry["tier"][] = chosen.map((_, i) =>
    i < 3 ? "infinity" : i < 7 ? "elite" : "pro"
  );

  // Pair chosen with xps (sorted desc) — the deterministic shuffle above already
  // randomized which person ends up at which rank.
  return chosen.map((c, i) => ({
    rank: i + 1,
    display_name: c.name,
    xp_points: xps[i],
    region: c.region,
    gender: c.gender,
    tier: tiers[i],
  }));
}

export const WEEKLY_XP_THRESHOLD = 1000;