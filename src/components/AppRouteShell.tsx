import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
export { APP_SHELL_PATHS, APP_SHELL_PREFIXES, isAppShellRoute } from "@/components/app-shell-routes";

/**
 * Wraps in-app pages in the SaaS sidebar shell so navigation feels like a
 * real SaaS app instead of dropping users back onto the marketing layout.
 *
 * The page's own <Navbar /> auto-hides on these routes (see Navbar.tsx),
 * so we don't get a double header.
 */

const TITLES: Record<string, string> = {
  "/explore": "Explore Hustles",
  "/saved-hustles": "Saved Hustles",
  "/community": "Community",
  "/leaderboard": "Leaderboard",
  "/profile": "Profile",
  "/plans": "Plans & Billing",
  "/payment": "Payment",
  "/payment-status": "Payment Status",
  "/marketplace": "Integrations",
  "/integrations": "Integrations",
  "/infinity-zone": "Infinity Zone",
  "/affiliates": "Affiliates",
  "/knowledge-hub": "Knowledge Hub",
  "/problem-leads": "Lead Finder",
  "/proposal-draft": "Proposal Draft",
  "/skill-gap": "Skill Gap",
  "/ai-tools": "AI Tool Bench",
  "/hustle-blueprint": "Hustle Blueprint",
  "/resume-optimizer": "Resume Optimizer",
  "/gig-arbitrage": "Gig Arbitrage",
  "/gig-price-calculator": "Gig Price Calculator",
  "/faceless-content": "Faceless Content",
  "/red-flag-scanner": "Red-Flag Scanner",
  "/sure-hit-jobs": "Sure-Hit Jobs",
  "/relax": "Relax",
};

export function AppRouteShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const base = "/" + pathname.split("/")[1];
  const title = TITLES[pathname] || TITLES[base];
  return <AppShell title={title}>{children}</AppShell>;
}