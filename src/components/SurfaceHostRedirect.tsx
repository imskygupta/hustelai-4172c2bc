/**
 * Cross-host redirector — Phase 1 (workspace pivot).
 *
 * Behaviour is intentionally narrow and ONE-WAY:
 *
 *   marketing host (hustlaiapp.in)  ──►  workspace.hustlaiapp.in
 *     ONLY for paths in WORKSPACE_PATH_PREFIXES (heavy execution tools).
 *
 * We deliberately do NOT redirect workspace → marketing. Earlier that caused
 * Supabase session loss on the subdomain and forced unexpected logouts. Auth
 * lives on the main domain; the workspace surface relies on the first-party
 * bridge cookie scoped to `.hustlaiapp.in`. See mem://tech/workspace-subdomain.
 *
 * Dual hosts (lovable preview / localhost) are no-ops so dev/preview keep
 * rendering both surfaces without redirect loops.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  isMarketingHost,
  isWorkspaceHost,
  isWorkspacePath,
  isWorkspaceCockpitPath,
  WORKSPACE_ORIGIN,
  MARKETING_ORIGIN,
} from "@/lib/host";

export function SurfaceHostRedirect() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // marketing → workspace: only the narrow workspace-only paths (e.g. /client)
    if (isMarketingHost()) {
      if (isWorkspacePath(pathname)) {
        window.location.replace(`${WORKSPACE_ORIGIN}${pathname}${search}${hash}`);
      }
      return;
    }
    // workspace → marketing: anything that is NOT a cockpit path bounces back
    // to the main domain. Tools (/blueprint, /hustle-blueprint, /ai-tools,
    // /knowledge-hub, /canvas, /pricing, /blog, etc.) must NEVER render under
    // the workspace shell. Auth is shared via the .hustlaiapp.in bridge cookie.
    if (isWorkspaceHost()) {
      if (!isWorkspaceCockpitPath(pathname)) {
        window.location.replace(`${MARKETING_ORIGIN}${pathname}${search}${hash}`);
      }
    }
  }, [pathname, search, hash]);

  return null;
}