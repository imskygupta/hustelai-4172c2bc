import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw, ShieldCheck, LogOut } from "lucide-react";

const AUTH_DEBUG_KEY = "hustleai_auth_debug";
const RESEND_COOLDOWN_KEY = "hai_verify_resend_at";
const COOLDOWN_SECONDS = 60;

function getCooldownLeft() {
  try {
    return Math.max(0, Number(localStorage.getItem(RESEND_COOLDOWN_KEY) || 0) - Date.now());
  } catch {
    return 0;
  }
}

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
  const { user, profile, trustState, refreshProfile, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    logRestricted("shell_mounted", {
      userId: user?.id,
      reason: trustState.reason,
      verification_status: trustState.verificationStatus ?? profile?.verification_status ?? "profile_missing",
    });
  }, [profile?.verification_status, trustState.reason, trustState.verificationStatus, user?.id]);

  const deadlineLabel = useMemo(() => {
    if (!profile?.verification_deadline) return null;
    return new Date(profile.verification_deadline).toLocaleString();
  }, [profile?.verification_deadline]);

  const onResend = async () => {
    if (!user?.email) return;
    const cooldownLeft = getCooldownLeft();
    if (cooldownLeft > 0) {
      toast.info(`Try again in ${Math.ceil(cooldownLeft / 1000)}s.`);
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: AUTH_EMAIL_REDIRECT_TO },
      });
      if (error) throw error;
      const until = Date.now() + COOLDOWN_SECONDS * 1000;
      try { localStorage.setItem(RESEND_COOLDOWN_KEY, String(until)); } catch { /* ignore */ }
      toast.success("Verification email sent. Check your inbox.");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't resend right now. Try again in a minute.");
    } finally {
      setResending(false);
    }
  };

  const onManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      toast.success("Verification status refreshed.");
    } catch {
      toast.error("Couldn't refresh right now.");
    } finally {
      setRefreshing(false);
    }
  };

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
        <div className="w-full rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">{user?.email}</div>
          <div className="mt-1">Status: {trustState.verificationStatus ?? "restricted"}</div>
          {deadlineLabel && <div>Deadline: {deadlineLabel}</div>}
        </div>
        <div className="w-full flex flex-col gap-2">
          <Button onClick={onResend} disabled={resending} className="w-full">
            {resending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Resend verification email
          </Button>
          <Button variant="outline" onClick={onManualRefresh} disabled={refreshing} className="w-full">
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh status
          </Button>
          <Button variant="ghost" onClick={() => signOut()} className="w-full text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
        <a
          href="mailto:support@hustlaiapp.in?subject=Verification%20help"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          Contact support
        </a>
      </section>
    </main>
  );
}

export default RestrictedVerificationShell;