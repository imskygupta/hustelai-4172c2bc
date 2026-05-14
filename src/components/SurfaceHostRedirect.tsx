import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  isWorkspaceHost,
  isMarketingHost,
  isWorkspacePath,
  WORKSPACE_ORIGIN,
  MARKETING_ORIGIN,
} from "@/lib/host";

/**
 * Cross-host redirector. Same SPA build serves both surfaces; this component
 * sends the visitor to the correct origin when they land on a path that
 * belongs to the *other* surface.
 *
 * Preview/lovable/localhost (dual host) is exempt — both surfaces render
 * locally so devs and the in-product preview keep working.
 */
export function SurfaceHostRedirect() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      // Marketing host → deep workspace execution path: bounce to workspace.*
      // Note: workspace paths are narrow (only /workspaces, /canvas, /client).
      // Dashboard, admin, AI tools, settings, billing all stay on main.
      if (isMarketingHost() && isWorkspacePath(pathname)) {
        window.location.replace(`${WORKSPACE_ORIGIN}${pathname}${search}${hash}`);
        return;
      }

      // Workspace host → anything that is NOT a workspace execution path:
      // bounce back to main app. Workspace subdomain is a focused surface,
      // not a mirror of the whole product.
      if (isWorkspaceHost() && !isWorkspacePath(pathname)) {
        window.location.replace(`${MARKETING_ORIGIN}${pathname}${search}${hash}`);
        return;
      }
    } catch (err) {
      console.warn("[SurfaceHostRedirect] safe-fallback:", err);
    }
  }, [pathname, search, hash]);

  return null;
}