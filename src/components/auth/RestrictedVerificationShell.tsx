import { useEffect } from "react";
import VerificationLock from "@/components/auth/VerificationLock";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck } from "lucide-react";

const AUTH_DEBUG_KEY = "hustleai_auth_debug";

function logRestricted(event: string, details: Record<string, unknown> = {}) {
  try {
    if (localStorage.getItem(AUTH_DEBUG_KEY) !== "1") return;
    console.info(`[auth] restricted.${event}`, {
      path: window.location.pathname,
      ...details,
    });
  } catch {
    // Never let diagnostics affect the restricted shell.
  }
}

export function RestrictedVerificationShell() {
  const { user, profile } = useAuth();

  useEffect(() => {
    logRestricted("shell_mounted", {
      userId: user?.id,
      verification_status: profile?.verification_status ?? "profile_missing",
    });
  }, [profile?.verification_status, user?.id]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <section className="w-full max-w-md text-center space-y-4" aria-label="Verification required">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verification required</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Your workspace is paused until this account is verified. Runtime systems stay offline here to keep the app responsive.
          </p>
        </div>
        <a
          href="mailto:support@hustlaiapp.in?subject=Verification%20help"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Contact support
        </a>
      </section>
      <VerificationLock alwaysOpen />
    </main>
  );
}

export default RestrictedVerificationShell;