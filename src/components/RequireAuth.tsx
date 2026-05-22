import { ReactNode, useEffect, useState } from "react";
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
 * Guards in-app (AppShell) routes. It waits for centralized auth hydration
 * before redirecting so page refreshes and workspace transitions don't race.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingExpired, setLoadingExpired] = useState(false);

  useEffect(() => {
    if (!loading) { setLoadingExpired(false); return; }
    const t = window.setTimeout(() => setLoadingExpired(true), 8_000);
    return () => window.clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if ((!loading || loadingExpired) && !user) {
      const next = encodeURIComponent(location.pathname + location.search);
      logGuardFailure(location.pathname + location.search, loadingExpired ? "auth_loading_timeout" : "missing_user_after_hydration");
      navigate(`/login?next=${next}`, { replace: true });
    }
  }, [loading, loadingExpired, user, navigate, location]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}