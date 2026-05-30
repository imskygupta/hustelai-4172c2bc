/**
 * Canonical redirect for every legacy automations entry point.
 *
 * Workspace Automations now lives at `wp("automations")`:
 *   - workspace.hustlaiapp.in/automations  (cockpit)
 *   - hustlaiapp.in/workspaces/automations (marketing/dual fallback)
 *
 * Older surfaces (`/automations` on marketing, `/dashboard/automations`,
 * `/telegram-automations`) used to either 404 or render duplicate shells.
 * This component sends every one of them to the single canonical surface,
 * crossing host boundaries via `appUrl()` when needed.
 */
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { appUrl, isWorkspaceHost, isDualHost } from "@/lib/host";
import { wp } from "@/lib/workspace/paths";

export default function AutomationsRedirect() {
  const target = wp("automations");
  // Same host (workspace or dual preview) — soft client redirect.
  if (isWorkspaceHost() || isDualHost()) {
    return <Navigate to={target} replace />;
  }
  // Marketing host → cross to workspace subdomain.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace(appUrl(target));
    }
  }, [target]);
  return null;
}