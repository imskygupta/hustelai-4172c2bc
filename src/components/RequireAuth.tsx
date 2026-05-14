import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const AUTH_DEBUG_KEY = "hustleai_auth_debug";

function logGuardFailure(path: string, reason: string) {
  try {
    if (localStorage.getItem(AUTH_DEBUG_KEY) !== "1") return;
    console.info("[auth] route_guard", {
      host: window.location.hostname,
      path,
      reason,
    });
  } catch {
    // Debug logging should never affect routing.
  }
}

/**
 * Guards in-app (AppShell) routes. If the user is not signed in we redirect
 * them to /signup instead of rendering the SaaS shell — otherwise logged-out
 * visitors see the sidebar with Profile / Sign out which is confusing.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(location.pathname + location.search);
      logGuardFailure(location.pathname + location.search, "missing_user_after_hydration");
      navigate(`/signup?next=${next}`, { replace: true });
    }
  }, [loading, user, navigate, location]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}