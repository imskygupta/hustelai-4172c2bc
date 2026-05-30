/**
 * Sprint 1 — P1 routing trust fixes.
 *
 * Two cross-host collisions kept landing signed-in users on the wrong
 * surface:
 *
 *   - `hustlaiapp.in/tools` rendered the PUBLIC Tools Hub even for
 *     signed-in workspace users. Workspace bookmarks lost context.
 *   - `hustlaiapp.in/providers` redirected to `/settings/integrations`,
 *     which is a completely different page from the workspace AI
 *     Providers cockpit. Onboarding broke silently.
 *
 * This component is the canonical fix for both: on the marketing host,
 * signed-in users are hard-navigated to the matching workspace surface
 * (`appUrl(workspacePath)`). Guests fall through to the supplied public
 * element, or to `guestFallback` when there isn't a public equivalent.
 *
 * On the workspace host / dual previews this just renders `children`.
 */
import { ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { appUrl, isMarketingHost } from "@/lib/host";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  workspacePath: string;       // e.g. "/tools", "/providers"
  children?: ReactNode;        // public element rendered for guests on marketing
  guestFallback?: string;      // path to send guests when no public element
}

export default function SurfaceAwareRedirect({ workspacePath, children, guestFallback }: Props) {
  const { user, loading } = useAuth();

  // Only intervene on the strict marketing host. Workspace + dual hosts
  // mount the real cockpit route directly.
  const shouldRedirect = isMarketingHost() && !loading && !!user;

  useEffect(() => {
    if (shouldRedirect && typeof window !== "undefined") {
      window.location.replace(appUrl(workspacePath));
    }
  }, [shouldRedirect, workspacePath]);

  if (shouldRedirect) return null;
  if (loading) return null;
  if (children) return <>{children}</>;
  if (guestFallback) return <Navigate to={guestFallback} replace />;
  return null;
}