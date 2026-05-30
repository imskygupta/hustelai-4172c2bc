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
  // Workspace subdomain hosts ONLY its own cockpit surfaces. Dashboard
  // tools (Blueprint, AI Tools, Knowledge Hub, Canvas, etc.) live on the
  // main domain and open in a NEW TAB from dashboard — auth is shared via
  // the bridge cookie scoped to `.hustlaiapp.in`, so no duplicate hosting.
  "/client",
];

/**
 * Tools live on the main domain. Dashboard launchers open them in a new
 * tab. Kept exported for backwards compat with any importer; intentionally
 * empty so `goTool` always routes via marketingUrl + new tab.
 */
export const MIGRATED_TO_WORKSPACE = new Set<string>();

/**
 * Path prefixes that ARE part of the workspace cockpit. Anything outside
 * this list, when hit on the workspace subdomain, is bounced back to the
 * marketing host so tools never render under the workspace shell.
 */
export const WORKSPACE_COCKPIT_PREFIXES = [
  "/projects",
  "/clients",
  "/providers",
  "/pipeline",
  "/revenue",
  "/roadmap",
  "/brand-kit",
  "/blocks",
  "/intake",
  "/workspaces", // legacy aliases that redirect inside the shell
  "/workspace",
  "/client",      // client portal surface
  // Heavy-execution surfaces mounted in the workspace block of App.tsx.
  // These were previously absent and got bounced back to marketing by
  // SurfaceHostRedirect, making palette nav-canvas/nav-blueprint dead
  // clicks on workspace.* (Audit 2.5 P1-5).
  "/canvas",
  "/blueprint",
  // User-facing workspace surfaces that the cockpit owns. Without these the
  // SurfaceHostRedirect on the workspace subdomain bounces e.g.
  // workspace.hustlaiapp.in/automations back to the marketing host, where
  // no route is registered → 404. (Workspace Automations migration.)
  "/automations",
  "/tools",
  "/library",
  // NOTE: /login, /signup, /forgot-password, /reset-password, /auth and
  // /logout intentionally live on the marketing host only. If we listed
  // them here, SurfaceHostRedirect would NOT bounce workspace.*/login back
  // to marketing — instead the workspace `*` fallback would silently drop
  // unauthenticated users to `/` (PortalGate) without ever showing the
  // login form. (Audit 2.5 P1-1)
];

export function isWorkspaceCockpitPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return WORKSPACE_COCKPIT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

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