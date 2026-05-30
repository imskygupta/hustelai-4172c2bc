import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Operator Mode = role-based entry into the workspace.
 * Replaces "tool wall" overload with intent-first UX.
 *
 * Stored in localStorage so it works without a DB migration.
 * Future: sync to profile.preferences when a server column exists.
 */

export type OperatorMode =
  | "freelancer"   // get + manage clients
  | "agency"       // run agency ops
  | "creator"      // grow content/income streams
  | "consultant"   // discovery → strategy → retainer
  | "coach"        // 1:1 coaching ops (consultant-aligned for v1)
  | "operator"     // generalist operator (agency-aligned for v1)
  | "explorer";    // browse all tools

export interface TodayStep {
  label: string;
  href: string;
}

export interface EmptyStateMeta {
  title: string;
  cta: string;
  ctaLabel?: string;
}

/**
 * Persona-aware framing for the Workspace landing surface. Same routes, same
 * data — just a different title/tagline so the user feels the workspace was
 * built for them.
 */
export interface WorkspaceFraming {
  /** Big workspace headline (replaces "Your operations, in one place."). */
  title: string;
  /** One-line subtitle / domain pills (e.g. "Clients • Team • Delivery • Revenue"). */
  pills: string;
  /** Primary dashboard CTA label (e.g. "Open Agency Workspace"). */
  dashboardCtaLabel: string;
  /** Where the dashboard CTA leads. */
  dashboardCtaHref: string;
}

/**
 * Dashboard widget IDs that the adaptive stack can reorder. Keep this list in
 * sync with the renderer map in `src/pages/Dashboard.tsx`.
 */
export type DashboardWidgetId =
  | "operations"   // OperationsTodayCard
  | "clients"     // ClientsHeadlineCard
  | "activity"    // RecentClientActivityFeed
  | "portal"      // WorkspacePortalTile
  | "hero"        // DashboardHero (emotional entrypoint)
  | "resume";     // (placeholder — Resume Workflow Card if present)

export interface OperatorModeMeta {
  id: OperatorMode;
  label: string;
  tagline: string;
  primary: { label: string; to: string; sub: string };
  modules: { label: string; to: string; desc: string }[];
  /** 4-step "TODAY" answer to "what should I do next?" — rendered in the hero. */
  todaySteps?: TodayStep[];
  /** Persona-aware empty state used across the product. */
  emptyState?: EmptyStateMeta;
  /** Adaptive dashboard widget order. Unknown widgets render in default order at the end. */
  widgetOrder?: DashboardWidgetId[];
  /** Persona-aware framing for the Workspace landing surface. */
  workspace?: WorkspaceFraming;
}

export const OPERATOR_MODES: OperatorModeMeta[] = [
  {
    id: "freelancer",
    label: "Freelancer",
    tagline: "Win clients & get paid",
    primary: {
      label: "Send your first proposal",
      to: "/dashboard/tools/proposal-generator",
      sub: "Draft a polished proposal in under 2 minutes.",
    },
    todaySteps: [
      { label: "Find a client",    href: "/problem-leads" },
      { label: "Send a proposal",  href: "/dashboard/tools/proposal-generator" },
      { label: "Deliver the work", href: "/work" },
      { label: "Get paid",         href: "/dashboard/tools/invoice-generator" },
    ],
    emptyState: {
      title: "Get your first client",
      cta: "/dashboard/tools/proposal-generator",
      ctaLabel: "Start a proposal",
    },
    widgetOrder: ["clients", "activity", "portal", "hero", "operations"],
    workspace: {
      title: "Freelance OS",
      pills: "Leads • Proposals • Delivery • Payment",
      dashboardCtaLabel: "Open Freelance Workspace",
      dashboardCtaHref: "/workspaces",
    },
    modules: [
      { label: "Proposal Generator",   to: "/dashboard/tools/proposal-generator", desc: "AI-drafted client pitches" },
      { label: "Invoice Generator",    to: "/dashboard/tools/invoice-generator",  desc: "Branded GST-ready invoices" },
      { label: "Contract Generator",   to: "/dashboard/tools/contract-generator", desc: "Freelance agreement / NDA" },
      { label: "Pricing Calculator",   to: "/dashboard/tools/pricing-calculator", desc: "3-tier pricing in seconds" },
      { label: "Client Intake Forms",  to: "/workspaces/intake",                  desc: "Branded onboarding forms" },
      { label: "Portfolio Bio",        to: "/dashboard/tools/portfolio-bio",      desc: "Polished bio for clients" },
    ],
  },
  {
    id: "agency",
    label: "Agency / Studio",
    tagline: "Manage delivery & operations",
    primary: {
      label: "Open the client pipeline",
      to: "/workspaces/pipeline",
      sub: "Track every deal across discovery, proposal, delivery, billed.",
    },
    todaySteps: [
      { label: "Client health",  href: "/workspaces/clients" },
      { label: "Team workload",  href: "/workspaces" },
      { label: "Delivery queue", href: "/dashboard/deliveries" },
      { label: "Revenue",        href: "/workspaces/revenue" },
    ],
    emptyState: {
      title: "Create your first project",
      cta: "/workspaces",
      ctaLabel: "Open Workspace",
    },
    widgetOrder: ["operations", "clients", "portal", "activity", "hero"],
    workspace: {
      title: "Agency Control Center",
      pills: "Clients • Team • Delivery • Revenue",
      dashboardCtaLabel: "Open Agency Workspace",
      dashboardCtaHref: "/workspaces",
    },
    modules: [
      { label: "Pipeline",        to: "/workspaces/pipeline",   desc: "Deal stages kanban" },
      { label: "Clients (CRM)",   to: "/workspaces/clients",    desc: "All clients in one place" },
      { label: "Workspaces",      to: "/workspaces",            desc: "Per-engagement workspaces" },
      { label: "Revenue",         to: "/workspaces/revenue",    desc: "Earnings dashboard" },
      { label: "Client Portals",  to: "/workspaces",            desc: "Public client links" },
      { label: "Brand Kit",       to: "/workspaces/brand-kit",  desc: "Reusable brand foundation" },
    ],
  },
  {
    id: "creator",
    label: "Creator / Operator",
    tagline: "Grow income streams",
    primary: {
      label: "Plan a 7-day hustle blueprint",
      to: "/hustle-blueprint",
      sub: "Get a step-by-step action plan for your next income stream.",
    },
    todaySteps: [
      { label: "Research",  href: "/explore" },
      { label: "Create",    href: "/faceless-content" },
      { label: "Publish",   href: "/dashboard/tools/content-calendar" },
      { label: "Monetize",  href: "/problem-leads" },
    ],
    emptyState: {
      title: "Plan your next content sprint",
      cta: "/hustle-blueprint",
      ctaLabel: "Open Content OS",
    },
    widgetOrder: ["activity", "hero", "portal", "clients", "operations"],
    workspace: {
      title: "Creator Studio",
      pills: "Content • Distribution • Sponsors • Revenue",
      dashboardCtaLabel: "Open Creator Studio",
      dashboardCtaHref: "/workspaces",
    },
    modules: [
      { label: "Hustle Blueprint",     to: "/hustle-blueprint",                desc: "7-day action plans" },
      { label: "Faceless Content",     to: "/faceless-content",                desc: "Viral storyboards" },
      { label: "Content Calendar",     to: "/dashboard/tools/content-calendar",desc: "4-week social plan" },
      { label: "Knowledge Hub",        to: "/knowledge-hub",                   desc: "Save & automate prompts" },
      { label: "Lead Finder",          to: "/problem-leads",                   desc: "Social-media lead radar" },
      { label: "AI Tool Bench",        to: "/ai-tools",                        desc: "Compare AI tools" },
    ],
  },
  {
    id: "consultant",
    label: "Consultant",
    tagline: "Discovery → strategy → retainer",
    primary: {
      label: "Draft a discovery brief",
      to: "/dashboard/tools/proposal-generator",
      sub: "Turn a first call into a structured engagement proposal.",
    },
    todaySteps: [
      { label: "Discovery",  href: "/workspaces/clients" },
      { label: "Strategy",   href: "/knowledge-hub" },
      { label: "Proposal",   href: "/dashboard/tools/proposal-generator" },
      { label: "Retainer",   href: "/dashboard/tools/contract-generator" },
    ],
    emptyState: {
      title: "Land your first retainer",
      cta: "/dashboard/tools/proposal-generator",
      ctaLabel: "Draft a proposal",
    },
    widgetOrder: ["clients", "operations", "activity", "hero", "portal"],
    workspace: {
      title: "Consulting Practice",
      pills: "Discovery • Strategy • Proposal • Retainer",
      dashboardCtaLabel: "Open Practice Workspace",
      dashboardCtaHref: "/workspaces",
    },
    modules: [
      { label: "Proposal Generator", to: "/dashboard/tools/proposal-generator", desc: "Discovery → engagement" },
      { label: "Contract Generator", to: "/dashboard/tools/contract-generator", desc: "Retainers & SOWs" },
      { label: "Clients (CRM)",      to: "/workspaces/clients",                 desc: "Engagement pipeline" },
      { label: "Knowledge Hub",      to: "/knowledge-hub",                      desc: "Reusable frameworks" },
      { label: "Invoice Generator",  to: "/dashboard/tools/invoice-generator",  desc: "Retainer billing" },
      { label: "Pricing Calculator", to: "/dashboard/tools/pricing-calculator", desc: "Anchor your value" },
    ],
  },
  {
    id: "coach",
    label: "Coach",
    tagline: "1:1 programs & cohorts",
    primary: {
      label: "Draft a coaching proposal",
      to: "/dashboard/tools/proposal-generator",
      sub: "Package your offer for the next discovery call.",
    },
    todaySteps: [
      { label: "Discovery call",  href: "/workspaces/clients" },
      { label: "Send program",    href: "/dashboard/tools/proposal-generator" },
      { label: "Onboard client",  href: "/workspaces/intake" },
      { label: "Track outcomes",  href: "/dashboard/deliveries" },
    ],
    emptyState: {
      title: "Onboard your first coachee",
      cta: "/workspaces/intake",
      ctaLabel: "Open intake",
    },
    widgetOrder: ["clients", "activity", "hero", "operations", "portal"],
    workspace: {
      title: "Coaching Studio",
      pills: "Discovery • Program • Onboarding • Outcomes",
      dashboardCtaLabel: "Open Coaching Studio",
      dashboardCtaHref: "/workspaces",
    },
    modules: [
      { label: "Proposal Generator", to: "/dashboard/tools/proposal-generator", desc: "Package your program" },
      { label: "Client Intake",      to: "/workspaces/intake",                  desc: "Branded onboarding" },
      { label: "Clients (CRM)",      to: "/workspaces/clients",                 desc: "All coachees in one place" },
      { label: "Contract Generator", to: "/dashboard/tools/contract-generator", desc: "Program agreements" },
      { label: "Knowledge Hub",      to: "/knowledge-hub",                      desc: "Reusable session prompts" },
      { label: "Invoice Generator",  to: "/dashboard/tools/invoice-generator",  desc: "Program billing" },
    ],
  },
  {
    id: "operator",
    label: "Operator",
    tagline: "Run the whole stack",
    primary: {
      label: "Open the workspace",
      to: "/workspaces",
      sub: "Pipelines, delivery and revenue in one cockpit.",
    },
    todaySteps: [
      { label: "Pipeline",     href: "/workspaces/pipeline" },
      { label: "Delivery",     href: "/dashboard/deliveries" },
      { label: "Revenue",      href: "/workspaces/revenue" },
      { label: "Automations",  href: "/knowledge-hub" },
    ],
    emptyState: {
      title: "Wire up your operating stack",
      cta: "/workspaces",
      ctaLabel: "Open Workspace",
    },
    widgetOrder: ["operations", "portal", "clients", "activity", "hero"],
    workspace: {
      title: "Operator Control Center",
      pills: "Pipeline • Delivery • Revenue • Automations",
      dashboardCtaLabel: "Open Operator Workspace",
      dashboardCtaHref: "/workspaces",
    },
    modules: [
      { label: "Pipeline",      to: "/workspaces/pipeline",   desc: "Deal stages kanban" },
      { label: "Workspaces",    to: "/workspaces",            desc: "Per-engagement workspaces" },
      { label: "Revenue",       to: "/workspaces/revenue",    desc: "Earnings dashboard" },
      { label: "Clients (CRM)", to: "/workspaces/clients",    desc: "All clients in one place" },
      { label: "Knowledge Hub", to: "/knowledge-hub",         desc: "Prompts & automations" },
      { label: "AI Tool Bench", to: "/ai-tools",              desc: "Compare AI tools" },
    ],
  },
  {
    id: "explorer",
    label: "Just exploring",
    tagline: "Browse the full toolbox",
    primary: {
      label: "Browse all tools",
      to: "/dashboard/tools",
      sub: "See every generator, calculator and workflow.",
    },
    todaySteps: [
      { label: "Discover",  href: "/explore" },
      { label: "Try a tool", href: "/dashboard/tools" },
      { label: "Save what works", href: "/saved-hustles" },
      { label: "Pick a mode", href: "/dashboard" },
    ],
    emptyState: {
      title: "Pick a workflow to start",
      cta: "/dashboard/tools",
      ctaLabel: "Browse tools",
    },
    modules: [
      { label: "Tools Hub",       to: "/dashboard/tools",     desc: "Every doc tool" },
      { label: "Workspaces",      to: "/workspaces",          desc: "Operational workspace" },
      { label: "Knowledge Hub",   to: "/knowledge-hub",       desc: "Prompts & docs" },
      { label: "Explore Hustles", to: "/explore",             desc: "AI hustle search" },
      { label: "Insights",        to: "/insights",            desc: "Operator playbooks" },
      { label: "Systems",         to: "/systems",             desc: "Operational stacks" },
    ],
  },
];

/* ---------------- Workspace Recipes ---------------- */

export type RecipeId =
  | "freelancer-starter"
  | "agency-delivery"
  | "creator-ops"
  | "telegram-client";

export interface Recipe {
  id: RecipeId;
  label: string;
  mode: OperatorMode;
  pitch: string;
  /** Tools / pages prioritised in the cockpit when this recipe is active */
  prioritised: string[];
  startAt: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "freelancer-starter",
    label: "Freelancer Starter OS",
    mode: "freelancer",
    pitch: "Proposals, invoices & contracts ready to send today.",
    prioritised: [
      "/dashboard/tools/proposal-generator",
      "/dashboard/tools/invoice-generator",
      "/dashboard/tools/contract-generator",
      "/workspaces/intake",
    ],
    startAt: "/dashboard/tools/proposal-generator",
  },
  {
    id: "agency-delivery",
    label: "Agency Delivery OS",
    mode: "agency",
    pitch: "Pipeline, CRM & per-client workspaces wired up.",
    prioritised: ["/workspaces/pipeline", "/work/clients", "/workspaces", "/workspaces/revenue"],
    startAt: "/workspaces/pipeline",
  },
  {
    id: "creator-ops",
    label: "Creator Ops OS",
    mode: "creator",
    pitch: "Content planning, blueprints & lead-gen on autopilot.",
    prioritised: ["/hustle-blueprint", "/faceless-content", "/knowledge-hub", "/problem-leads"],
    startAt: "/hustle-blueprint",
  },
  {
    id: "telegram-client",
    label: "Telegram Client OS",
    mode: "freelancer",
    pitch: "Branded intake → proposal → invoice, delivered on Telegram.",
    prioritised: ["/workspaces/intake", "/dashboard/tools/proposal-generator", "/dashboard/tools/invoice-generator"],
    startAt: "/workspaces/intake",
  },
];

/* ---------------- Persistence + hook ---------------- */

const MODE_KEY = "hai.operator.mode";
const RECIPE_KEY = "hai.operator.recipe";
const PENDING_MODE_KEY = "hai.operator.pendingMode";
const LOCKED_KEY = "hai.operator.modeLocked";

/**
 * Pending mode handoff: Homepage persona tabs (Freelancer / Creator / Agency /
 * Consultant) write here. After signup completes we apply it to the user's
 * profile and clear the pending slot.
 */
export function setPendingMode(mode: OperatorMode) {
  try { localStorage.setItem(PENDING_MODE_KEY, mode); } catch { /* ignore */ }
}
export function getPendingMode(): OperatorMode | null {
  try { return (localStorage.getItem(PENDING_MODE_KEY) as OperatorMode) || null; } catch { return null; }
}
export function clearPendingMode() {
  try { localStorage.removeItem(PENDING_MODE_KEY); } catch { /* ignore */ }
}

export function isModeLocked(): boolean {
  try { return localStorage.getItem(LOCKED_KEY) === "1"; } catch { return false; }
}
function setModeLocked(locked: boolean) {
  try {
    if (locked) localStorage.setItem(LOCKED_KEY, "1");
    else localStorage.removeItem(LOCKED_KEY);
  } catch { /* ignore */ }
}

export function getOperatorMode(): OperatorMode | null {
  try { return (localStorage.getItem(MODE_KEY) as OperatorMode) || null; } catch { return null; }
}
export function setOperatorMode(mode: OperatorMode | null, opts: { lock?: boolean; syncDb?: boolean } = { syncDb: true }) {
  try {
    if (mode) localStorage.setItem(MODE_KEY, mode);
    else localStorage.removeItem(MODE_KEY);
    if (opts.lock !== undefined) setModeLocked(!!opts.lock);
    window.dispatchEvent(new Event("hai:operator-mode-change"));
  } catch { /* ignore */ }
  if (opts.syncDb !== false && mode) {
    // Fire-and-forget: persist to profiles for cross-device continuity.
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
          .from("profiles")
          .update({
            profile_mode: mode,
            ...(opts.lock ? { profile_mode_locked: true } : {}),
          } as never)
          .eq("user_id", user.id);
      } catch { /* ignore — localStorage stays source-of-truth on failure */ }
    })();
  }
}

export function getRecipe(): RecipeId | null {
  try { return (localStorage.getItem(RECIPE_KEY) as RecipeId) || null; } catch { return null; }
}
export function setRecipe(id: RecipeId | null) {
  try {
    if (id) localStorage.setItem(RECIPE_KEY, id);
    else localStorage.removeItem(RECIPE_KEY);
    window.dispatchEvent(new Event("hai:operator-mode-change"));
  } catch { /* ignore */ }
}

export function useOperatorMode() {
  const [mode, setMode] = useState<OperatorMode | null>(() => getOperatorMode());
  const [recipe, setRecipeState] = useState<RecipeId | null>(() => getRecipe());

  useEffect(() => {
    const sync = () => { setMode(getOperatorMode()); setRecipeState(getRecipe()); };
    window.addEventListener("hai:operator-mode-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hai:operator-mode-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // On mount: if no local mode yet, hydrate from profiles.profile_mode so the
  // persona persists across devices and sessions.
  useEffect(() => {
    if (getOperatorMode()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("profile_mode, profile_mode_locked")
          .eq("user_id", user.id)
          .maybeSingle();
        const dbMode = (data as { profile_mode?: string; profile_mode_locked?: boolean } | null)?.profile_mode as OperatorMode | undefined;
        if (!cancelled && dbMode) {
          setOperatorMode(dbMode, { syncDb: false, lock: !!(data as { profile_mode_locked?: boolean } | null)?.profile_mode_locked });
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return {
    mode,
    recipe,
    meta: mode ? OPERATOR_MODES.find(m => m.id === mode) || null : null,
    activeRecipe: recipe ? RECIPES.find(r => r.id === recipe) || null : null,
    chooseMode: (m: OperatorMode | null, opts?: { lock?: boolean }) => setOperatorMode(m, { lock: opts?.lock, syncDb: true }),
    chooseRecipe: (r: RecipeId | null) => setRecipe(r),
    locked: isModeLocked(),
  };
}

/**
 * Apply a pending mode (set by Homepage persona tabs) to a freshly signed-in
 * user. Safe to call multiple times — no-op if no pending mode exists.
 */
export async function applyPendingModeOnSignup() {
  const pending = getPendingMode();
  if (!pending) return;
  setOperatorMode(pending, { lock: true, syncDb: true });
  clearPendingMode();
}
