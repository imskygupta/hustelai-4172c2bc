import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  isWorkspaceHost,
  isMarketingHost,
  isWorkspacePath,
  isMarketingOnlyPath,
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

      // Marketing host → workspace path: bounce to workspace.*
      if (isMarketingHost() && isWorkspacePath(pathname)) {
        window.location.replace(`${WORKSPACE_ORIGIN}${pathname}${search}${hash}`);
        return;
      }

      // Workspace host → marketing-only path: bounce to root domain
      if (isWorkspaceHost() && isMarketingOnlyPath(pathname)) {
        window.location.replace(`${MARKETING_ORIGIN}${pathname}${search}${hash}`);
        return;
      }
    } catch (err) {
      console.warn("[SurfaceHostRedirect] safe-fallback:", err);
    }
  }, [pathname, search, hash]);

  return null;
}