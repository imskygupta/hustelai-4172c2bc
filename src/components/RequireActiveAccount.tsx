import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAccountAccess } from "@/hooks/useAccountAccess";

/**
 * Global account-status gate. Renders children only when status === 'active'.
 * Locked states route to /account-status (suspended/deleted/banned) or
 * /pending-access (pending_approval). Never infinite-spins — 8s timeout in
 * useAccountAccess flips to 'error' which we render as a recoverable screen.
 */
export function RequireActiveAccount({ children }: { children: ReactNode }) {
  const { status } = useAccountAccess();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "pending_approval") {
    if (location.pathname === "/pending-access") return <>{children}</>;
    return <Navigate to="/pending-access" replace />;
  }

  if (status === "suspended" || status === "deleted" || status === "banned") {
    if (location.pathname === "/account-status") return <>{children}</>;
    return <Navigate to="/account-status" replace />;
  }

  // 'error' → show terminal recovery message (never infinite spinner)
  if (status === "error") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">We couldn't verify your account.</h1>
          <p className="text-sm text-muted-foreground">
            Please check your connection and refresh. If this keeps happening, contact
            support@hustlaiapp.in.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}