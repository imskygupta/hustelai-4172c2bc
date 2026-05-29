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
    modules: [
      { label: "Pipeline",        to: "/workspaces/pipeline",   desc: "Deal stages kanban" },
      { label: "Clients (CRM)",   to: "/work/clients",          desc: "All clients in one place" },
      { label: "Workspaces",      to: "/workspaces",            desc: "Per-engagement workspaces" },
      { label: "Revenue",         to: "/workspaces/revenue",    desc: "Earnings dashboard" },
      { label: "Client Portals",  to: "/work/portals",          desc: "Public client links" },
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
    id: "explorer",
    label: "Just exploring",
    tagline: "Browse the full toolbox",
    primary: {
      label: "Browse all tools",
      to: "/dashboard/tools",
      sub: "See every generator, calculator and workflow.",
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

export function getOperatorMode(): OperatorMode | null {
  try { return (localStorage.getItem(MODE_KEY) as OperatorMode) || null; } catch { return null; }
}
export function setOperatorMode(mode: OperatorMode | null) {
  try {
    if (mode) localStorage.setItem(MODE_KEY, mode);
    else localStorage.removeItem(MODE_KEY);
    window.dispatchEvent(new Event("hai:operator-mode-change"));
  } catch { /* ignore */ }
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

  return {
    mode,
    recipe,
    meta: mode ? OPERATOR_MODES.find(m => m.id === mode) || null : null,
    activeRecipe: recipe ? RECIPES.find(r => r.id === recipe) || null : null,
    chooseMode: (m: OperatorMode | null) => setOperatorMode(m),
    chooseRecipe: (r: RecipeId | null) => setRecipe(r),
  };
}
