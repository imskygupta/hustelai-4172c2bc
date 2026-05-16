/**
 * Tools Hub catalog — outcome-grouped intent registry.
 *
 * This is NOT a list of tools. It is a list of OUTCOMES an operator can
 * launch inline from the workspace. Each entry maps to an `intent` string
 * handled by the `workspace-ai` edge function (`generate_intent`).
 */

export type Speed = "instant" | "fast" | "deep";
export type ToolIntent = {
  intent: string;          // edge function intent key
  title: string;           // big tile title
  hint: string;            // one-liner subtitle
  outputs: string[];       // expected output bullets
  examples: string[];      // operational examples
  bestWith: "gemini" | "openai" | "anthropic" | "groq" | "auto";
  why: string;             // why this provider is recommended
  speed: Speed;            // instant/fast/deep
  cost: "low" | "med" | "high";
  assetKind: "blueprint" | "prompt" | "roadmap" | "proposal" | "brief" | "strategy" | "workflow";
};

export type ToolGroup = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  accent: string;       // gradient classes
  ring: string;         // ring color
  intents: ToolIntent[];
};

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "delivery",
    kicker: "01",
    title: "Client Delivery",
    description: "From kickoff to handover — the deliverables clients actually pay for.",
    accent: "from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20",
    ring: "ring-emerald-200/60 dark:ring-emerald-900/40",
    intents: [
      { intent: "scope",       title: "Generate project scope",   hint: "Objectives, deliverables, milestones",   outputs: ["Scope statement", "Milestones", "Success metrics"], examples: ["Fixed-price web build for D2C brand", "3-month retainer for SaaS lifecycle"], bestWith: "anthropic", why: "Claude reasons through scope without inventing fluff", speed: "fast",    cost: "med",  assetKind: "brief" },
      { intent: "onboarding",  title: "Build onboarding flow",    hint: "Kickoff, access, week-1 deliverables",   outputs: ["Kickoff checklist", "Comms cadence", "Welcome doc"], examples: ["New client kickoff in 24h", "Replace your messy onboarding email"], bestWith: "openai",    why: "GPT structures step-by-step onboarding cleanly",        speed: "fast",    cost: "low",  assetKind: "workflow" },
      { intent: "proposal",    title: "Create AI proposal",       hint: "Exec summary → scope → investment",      outputs: ["Executive summary", "Scope & pricing", "Terms"],     examples: ["$8k website rebuild proposal", "Retainer pitch for marketing services"],    bestWith: "anthropic", why: "Claude writes long-form, persuasive proposals",         speed: "deep",    cost: "high", assetKind: "proposal" },
      { intent: "invoice",     title: "Draft invoice",            hint: "Line items, terms, payment links",       outputs: ["Itemized invoice", "Payment terms", "Due dates"],    examples: ["50% milestone invoice", "Monthly retainer invoice"],                          bestWith: "gemini",    why: "Gemini handles structured docs fast and cheap",         speed: "instant", cost: "low",  assetKind: "brief" },
    ],
  },
  {
    id: "outreach",
    kicker: "02",
    title: "Outreach Systems",
    description: "Turn cold lists into qualified pipeline. Sequences, hooks, and ICPs.",
    accent: "from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-fuchsia-950/20",
    ring: "ring-violet-200/60 dark:ring-violet-900/40",
    intents: [
      { intent: "outreach", title: "Build outreach sequence", hint: "Cold email + 2 follow-ups",  outputs: ["3-email sequence", "Subject lines", "Personalization tokens"], examples: ["Cold outreach to Shopify founders", "Re-engage stale leads"], bestWith: "openai", why: "GPT writes high-conversion short copy",          speed: "fast", cost: "low",  assetKind: "workflow" },
      { intent: "icp",      title: "Define ideal customer",   hint: "Firmographics, triggers, hooks", outputs: ["ICP profile", "Buying triggers", "Objections"],            examples: ["ICP for design retainers", "ICP for ghostwriting"],         bestWith: "anthropic", why: "Claude isolates pains and triggers with rigor", speed: "fast", cost: "med",  assetKind: "strategy" },
    ],
  },
  {
    id: "strategy",
    kicker: "03",
    title: "Strategy & Research",
    description: "The thinking that justifies the price. Positioning, roadmaps, research.",
    accent: "from-slate-50 via-zinc-50 to-stone-50 dark:from-slate-950/30 dark:via-zinc-950/30 dark:to-stone-950/30",
    ring: "ring-slate-200/60 dark:ring-slate-800/50",
    intents: [
      { intent: "strategy", title: "Build first strategy",   hint: "Goal → strategy → action plan", outputs: ["3 strategic pillars", "30/60/90 milestones", "KPIs"],         examples: ["90-day growth plan for B2B SaaS", "Brand repositioning for studio"], bestWith: "anthropic", why: "Claude reasons through long-horizon plans best", speed: "deep", cost: "high", assetKind: "strategy" },
      { intent: "research", title: "Research brief",         hint: "Questions, sources, synthesis", outputs: ["Research questions", "Sources to consult", "Hypotheses"],     examples: ["Competitor teardown brief", "Market sizing for a new service"],     bestWith: "gemini",    why: "Gemini handles long-context research well",       speed: "deep", cost: "med",  assetKind: "brief"    },
    ],
  },
  {
    id: "content",
    kicker: "04",
    title: "Content Engines",
    description: "Pillars, calendars, and hooks — content that compounds.",
    accent: "from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20",
    ring: "ring-amber-200/60 dark:ring-amber-900/40",
    intents: [
      { intent: "content",          title: "Generate content pillars", hint: "3–5 pillars with hooks",       outputs: ["Pillars", "Sample hooks", "Channels"],          examples: ["Founder-led LinkedIn pillars", "YouTube niche pillars"],   bestWith: "openai", why: "GPT writes punchy hooks and pillar copy",       speed: "fast", cost: "low", assetKind: "strategy" },
      { intent: "content_calendar", title: "30-day content plan",      hint: "Date × channel × format × CTA", outputs: ["Calendar table", "Hooks", "CTAs per post"],     examples: ["LinkedIn calendar for agency", "Twitter daily plan"],      bestWith: "gemini", why: "Gemini fills structured calendars cheaply",    speed: "fast", cost: "low", assetKind: "workflow" },
    ],
  },
  {
    id: "automation",
    kicker: "05",
    title: "Automation Flows",
    description: "Trigger → steps → output. Replace manual ops with a clean blueprint.",
    accent: "from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/20 dark:via-blue-950/20 dark:to-indigo-950/20",
    ring: "ring-sky-200/60 dark:ring-sky-900/40",
    intents: [
      { intent: "automation", title: "Map automation flow", hint: "Trigger → steps → output → fallback", outputs: ["Trigger spec", "Step list", "Rollout checklist"], examples: ["New lead → CRM → welcome email", "Invoice paid → onboarding kickoff"], bestWith: "anthropic", why: "Claude lays out clean conditional logic", speed: "fast", cost: "med", assetKind: "workflow" },
    ],
  },
  {
    id: "ops",
    kicker: "06",
    title: "Internal Operations",
    description: "Run the studio like a product. Cadences, retros, SOPs.",
    accent: "from-rose-50 via-pink-50 to-orange-50 dark:from-rose-950/20 dark:via-pink-950/20 dark:to-orange-950/20",
    ring: "ring-rose-200/60 dark:ring-rose-900/40",
    intents: [
      { intent: "onboarding", title: "Studio onboarding SOP", hint: "Reusable client onboarding doc", outputs: ["SOP checklist", "Templates", "Roles"], examples: ["Standardize how every new client starts", "Make handoff between you and a VA"], bestWith: "openai", why: "GPT writes crisp SOPs",  speed: "fast", cost: "low", assetKind: "workflow" },
    ],
  },
];

export const PROVIDER_DISPLAY: Record<string, { label: string; tint: string }> = {
  anthropic: { label: "Claude",  tint: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  openai:    { label: "GPT",     tint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  gemini:    { label: "Gemini",  tint: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  groq:      { label: "Groq",    tint: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30" },
  auto:      { label: "Auto",    tint: "bg-muted text-foreground/70 border-border" },
};

export const SPEED_DISPLAY: Record<Speed, { label: string; dot: string }> = {
  instant: { label: "Instant", dot: "bg-emerald-500" },
  fast:    { label: "Fast",    dot: "bg-sky-500" },
  deep:    { label: "Deep",    dot: "bg-violet-500" },
};

export function findIntent(intent: string): ToolIntent | undefined {
  for (const g of TOOL_GROUPS) {
    const m = g.intents.find((i) => i.intent === intent);
    if (m) return m;
  }
  return undefined;
}
