/**
 * Host-aware routing helpers.
 *
 * The product is split into two surfaces served from the same codebase:
 *  - hustlaiapp.in            → marketing, pricing, blog, trust, SEO
 *  - workspace.hustlaiapp.in  → authenticated cockpit (dashboard, work, CRM,
 *                               documents, portals, hustlebot, settings)
 *
 * Preview/lovable/localhost hosts behave as a "both" surface so devs and the
 * in-product preview keep working without redirect loops.
 */

const MARKETING_HOST = "hustlaiapp.in";
const WORKSPACE_HOST = "workspace.hustlaiapp.in";

export const MARKETING_ORIGIN = `https://${MARKETING_HOST}`;
export const WORKSPACE_ORIGIN = `https://${WORKSPACE_HOST}`;

function host(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}

export function isWorkspaceHost(): boolean {
  return /^workspace\./i.test(host());
}

export function isMarketingHost(): boolean {
  const h = host().toLowerCase();
  return h === MARKETING_HOST || h === `www.${MARKETING_HOST}`;
}

/** Preview/lovable/localhost — neither strict surface; render everything. */
export function isDualHost(): boolean {
  return !isWorkspaceHost() && !isMarketingHost();
}

/** Absolute URL into the workspace surface (or relative on dual hosts). */
export function appUrl(path: string): string {
  if (isDualHost() || isWorkspaceHost()) return path;
  return `${WORKSPACE_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Absolute URL into the marketing surface (or relative on dual hosts). */
export function marketingUrl(path: string): string {
  if (isDualHost() || isMarketingHost()) return path;
  return `${MARKETING_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Path prefixes that belong to the authenticated workspace surface.
 * On the marketing host, hits to these paths are redirected to workspace.*.
 */
export const WORKSPACE_PATH_PREFIXES = [
  // ONLY deep operational execution surfaces belong on workspace.*
  // Dashboard, AI tools, admin, settings, billing, etc. stay on the main app.
  // NOTE: /workspaces is intentionally NOT here — on the marketing host it
  // renders the WorkspaceGateway (transition surface), and the user explicitly
  // clicks "Enter Workspace" to hop to workspace.hustlaiapp.in.
  "/canvas",
  "/client",
  // Phase 1 wave 1 — heavy execution tools migrating to workspace.*
  // Routes still render on both hosts during the grace period; the redirect
  // layer only hard-jumps marketing → workspace so direct URL hits land in
  // the right surface. See mem://tech/workspace-subdomain.
  "/ai-tools",
  "/knowledge-hub",
  "/hustle-blueprint",
  "/roadmap",
];

/**
 * Subset of WORKSPACE_PATH_PREFIXES that have already been *migrated* in
 * Phase 1 of the workspace pivot. Used by dashboard launcher cards to know
 * which tool buttons should cross-host link via appUrl() vs stay local.
 */
export const MIGRATED_TO_WORKSPACE = new Set<string>([
  "/ai-tools",
  "/knowledge-hub",
  "/hustle-blueprint",
  "/canvas",
]);

export function isWorkspacePath(pathname: string): boolean {
  return WORKSPACE_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/**
 * Marketing-only paths that should never render on the workspace host.
 * Anything else (auth, legal, status) is allowed on both.
 */
export const MARKETING_ONLY_PREFIXES = [
  "/about",
  "/pricing",
  "/blog",
  "/insights",
  "/systems",
  "/stories",
  "/topics",
  "/authors",
  "/features",
  "/workflows",
  "/use-cases",
  "/free-tools",
  "/freelancer-crm",
  "/ai-invoice-generator",
  "/quotation-generator",
  "/proposal-generator",
  "/client-onboarding-software",
  "/workspace-os",
  "/freelancer-workspace",
  "/ai-document-generator",
  "/client-portal-software",
  "/agency-workflow-tools",
  "/freelancer-productivity-tools",
  "/ai-business-card-maker",
  "/for-freelancers",
  "/for-agencies",
  "/for-creators",
  "/for-telegram-business",
  "/career",
  "/company",
  "/reviews",
  "/contact",
  "/trust",
  "/platform",
  "/how-it-works",
  "/operations",
  "/products",
  "/integrations",
  "/marketplace",
];

export function isMarketingOnlyPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MARKETING_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}