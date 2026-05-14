import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  isWorkspaceHost,
  isMarketingHost,
  isWorkspacePath,
  WORKSPACE_ORIGIN,
  MARKETING_ORIGIN,
} from "@/lib/host";
import { useAuth } from "@/hooks/useAuth";

const AUTH_DEBUG_KEY = "hustleai_auth_debug";

function logRedirect(reason: string, target?: string) {
  try {
    if (localStorage.getItem(AUTH_DEBUG_KEY) !== "1") return;
    console.info("[auth] middleware_redirect", {
      host: window.location.hostname,
      path: window.location.pathname,
      reason,
      target,
    });
  } catch {
    // Debug logging should never affect routing.
  }
}

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
  const { user, loading } = useAuth();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (loading) {
        logRedirect("auth_hydration_pending");
        return;
      }

      // Marketing host → deep workspace execution path: bounce to workspace.*
      // Note: workspace paths are narrow (only /workspaces, /canvas, /client).
      // Dashboard, admin, AI tools, settings, billing all stay on main.
      if (isMarketingHost() && isWorkspacePath(pathname)) {
        if (!user) {
          logRedirect("workspace_path_requires_main_auth", `/signup?next=${pathname}${search}`);
          return;
        }
        const target = `${WORKSPACE_ORIGIN}${pathname}${search}${hash}`;
        logRedirect("open_workspace_surface", target);
        window.location.replace(target);
        return;
      }

      // Workspace host → anything that is NOT a workspace execution path:
      // bounce back to main app. Workspace subdomain is a focused surface,
      // not a mirror of the whole product.
      if (isWorkspaceHost() && !isWorkspacePath(pathname)) {
        const target = `${MARKETING_ORIGIN}${pathname}${search}${hash}`;
        logRedirect("non_workspace_path_on_workspace_host", target);
        window.location.replace(target);
        return;
      }
    } catch (err) {
      console.warn("[SurfaceHostRedirect] safe-fallback:", err);
    }
  }, [pathname, search, hash, loading, user]);

  return null;
}