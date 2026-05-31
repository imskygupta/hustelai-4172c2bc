import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, ShieldAlert, X } from "lucide-react";

const DISMISS_KEY = "hai_verify_banner_dismissed_at";
const RESEND_KEY = "hai_verify_resend_at";
const DISMISS_MS = 6 * 60 * 60 * 1000; // 6h soft dismiss
const RESEND_COOLDOWN_MS = 60_000;

/**
 * Passive, render-only verification prompt.
 * - Does NOT mutate auth/profile during render
 * - Does NOT poll
 * - Does NOT redirect or replace the app shell
 * - Only displays status + Resend + Dismiss
 *
 * Backend enforcement (requireVerifiedUser) is the real security boundary.
 */
export function VerificationOverlay() {
  const { user, trustState } = useAuth();
  const { status } = useAccountAccess();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return ts > Date.now() - DISMISS_MS;
    } catch { return false; }
  });
  const [resending, setResending] = useState(false);

  // Listen for a "denied" event from privileged actions to force-show the banner.
  useEffect(() => {
    const onDenied = () => setDismissed(false);
    window.addEventListener("hai:verification-denied", onDenied as EventListener);
    return () => window.removeEventListener("hai:verification-denied", onDenied as EventListener);
  }, []);

  if (!user || !trustState.restricted) return null;
  // Hide verification banner when the account is non-active (suspended/deleted/banned/pending).
  // Locked accounts get their own dedicated screens — don't dangle a Resend CTA.
  if (status !== "active" && status !== "loading") return null;
  if (dismissed) return null;

  const onResend = async () => {
    if (!user.email) return;
    try {
      const last = Number(localStorage.getItem(RESEND_KEY) || 0);
      if (Date.now() - last < RESEND_COOLDOWN_MS) {
        toast.info("Please wait a moment before resending.");
        return;
      }
    } catch { /* ignore */ }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: AUTH_EMAIL_REDIRECT_TO },
      });
      if (error) throw error;
      try { localStorage.setItem(RESEND_KEY, String(Date.now())); } catch { /* ignore */ }
      toast.success("Verification email sent. Check your inbox.");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't resend right now.");
    } finally {
      setResending(false);
    }
  };

  const onDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setDismissed(true);
  };

  const label =
    trustState.reason === "security_review" ? "Account under security review" :
    trustState.reason === "suspended" ? "Account suspended" :
    trustState.reason === "expired" ? "Verification window expired" :
    trustState.reason === "email_unverified" ? "Verify your email to unlock AI tools" :
    "Verification required to use AI tools";

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-2rem)] max-w-xl
                 rounded-xl border border-amber-500/30 bg-amber-50 text-amber-950
                 dark:bg-amber-950/80 dark:text-amber-50 dark:border-amber-400/30
                 shadow-lg backdrop-blur px-4 py-3 flex items-center gap-3"
    >
      <ShieldAlert className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-medium leading-tight">{label}</p>
        <p className="text-xs opacity-80 truncate">{user.email}</p>
      </div>
      {trustState.reason !== "suspended" && trustState.reason !== "security_review" && (
        <Button size="sm" variant="secondary" onClick={onResend} disabled={resending} className="shrink-0">
          {resending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
          Resend
        </Button>
      )}
      {trustState.reason === "security_review" && (
        <a
          href="mailto:support@hustlaiapp.in"
          className="shrink-0 text-xs underline opacity-90 hover:opacity-100"
        >
          Contact support
        </a>
      )}
      <button
        aria-label="Dismiss"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default VerificationOverlay;