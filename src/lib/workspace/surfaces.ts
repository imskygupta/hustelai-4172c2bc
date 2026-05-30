/**
 * Workspace + cross-host surface registry.
 *
 * Single source of truth for every destination the workspace UI can navigate
 * to — command palette, sidebar groups, dashboard cards, ContinueBuilding,
 * LinkedTimeline, empty-state CTAs, header quick actions, etc.
 *
 * Why centralised:
 *   1. The workspace cockpit and the marketing app share a codebase but mount
 *      *different* React Router blocks per host. A path that exists on one
 *      host (e.g. `/tools/invoice-generator`) is a dead click on the other if
 *      we navigate with the in-app router. This file knows which is which.
 *   2. Renaming a surface (see /assets → /library) becomes a one-line edit
 *      instead of a project-wide grep. The Vite-collision class of bug
 *      (`/assets` serving a JS bundle) cannot recur because every reference
 *      flows through `wp()` / this registry.
 *
 * If you add a new workspace route in `App.tsx`, register it here. If you
 * add a new marketing-host destination that workspace users need to reach,
 * add it to MARKETING_SURFACES and use `goCrossHost()` to navigate.
 */
import type { NavigateFunction } from "react-router-dom";
import { wp } from "@/lib/workspace/paths";
import { marketingUrl, isWorkspaceHost } from "@/lib/host";

/**
 * Every cockpit surface mounted inside the `isWorkspaceHost()` block of
 * `src/App.tsx`. The value is the *clean* surface key passed to `wp()`.
 * Keep this list in sync with the workspace `<Route>` block.
 */
export const WORKSPACE_SURFACES = {
  overview:   "",
  clients:    "clients",
  pipeline:   "pipeline",
  revenue:    "revenue",
  roadmap:    "roadmap",
  brandKit:   "brand-kit",
  blocks:     "blocks",
  intake:     "intake",
  library:    "library",        // canonical name for what used to be "assets"
  tools:      "tools",
  automations:"automations",
  canvas:     "canvas",
  blueprint:  "blueprint",
  providers:  "providers",
  newProject: "projects/new",
} as const;

export type WorkspaceSurfaceKey = keyof typeof WORKSPACE_SURFACES;

/** Resolve a workspace surface key to a host-shaped URL. */
export function surface(key: WorkspaceSurfaceKey): string {
  return wp(WORKSPACE_SURFACES[key]);
}

/**
 * Destinations that live on the marketing host only. Reaching them from the
 * workspace cockpit requires a full-page navigation, not a router push.
 */
export const MARKETING_SURFACES = {
  invoiceTool:    "/tools/invoice-generator",
  proposalTool:   "/tools/proposal-generator",
  contractTool:   "/tools/contract-generator",
  pricingTool:    "/tools/pricing-calculator",
  calendarTool:   "/tools/content-calendar",
  onboardingTool: "/tools/onboarding-form",
  portfolioTool:  "/tools/portfolio-bio",
  businessCard:   "/tools/business-card",
  wallet:         "/settings/wallet",
  billing:        "/settings/billing",
  dashboard:      "/dashboard",
  hustlebot:      "/hustlebot",
} as const;

export type MarketingSurfaceKey = keyof typeof MARKETING_SURFACES;

/**
 * Cross-host navigation. On the workspace subdomain we hard-navigate via
 * `window.location` so the request hits the marketing host and the right
 * route table renders. On marketing / dual hosts we keep using the router
 * so the SPA transition stays smooth.
 *
 * Use this for every destination in MARKETING_SURFACES.
 */
export function goCrossHost(
  navigate: NavigateFunction,
  path: string,
  opts: { newTab?: boolean } = {},
) {
  const url = marketingUrl(path);
  const isAbsolute = /^https?:\/\//i.test(url);
  if (opts.newTab) {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
    return;
  }
  if (isAbsolute && isWorkspaceHost()) {
    if (typeof window !== "undefined") window.location.href = url;
    return;
  }
  navigate(url);
}
