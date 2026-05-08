/**
 * Pure route-matching helpers for the SaaS app shell.
 * Kept free of React/component imports so Navbar/Footer can import it
 * without pulling in the heavy AppShell tree (which causes a circular
 * import / TDZ "Cannot access 'c' before initialization" error).
 */

export const APP_SHELL_PATHS = new Set<string>([
  "/dashboard",
  "/explore",
  "/saved-hustles",
  "/community",
  "/leaderboard",
  "/profile",
  "/plans",
  "/payment",
  "/payment-status",
  "/marketplace",
  // "/integrations" — now a public marketing page (handles its own Navbar/Footer)
  "/infinity-zone",
  "/affiliates",
  "/knowledge-hub",
  "/problem-leads",
  "/proposal-draft",
  "/skill-gap",
  "/ai-tools",
  "/hustle-blueprint",
  "/resume-optimizer",
  "/gig-arbitrage",
  "/gig-price-calculator",
  "/faceless-content",
  "/red-flag-scanner",
  "/sure-hit-jobs",
  "/relax",
]);

export const APP_SHELL_PREFIXES = ["/marketplace/", "/integrations/", "/hustle/", "/roadmap/", "/dashboard/tools"];

export function isAppShellRoute(pathname: string): boolean {
  if (APP_SHELL_PATHS.has(pathname)) return true;
  return APP_SHELL_PREFIXES.some((p) => pathname.startsWith(p));
}