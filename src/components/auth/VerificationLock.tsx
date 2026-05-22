import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck, LogOut } from "lucide-react";

const RESEND_COOLDOWN_KEY = "hai_verify_resend_at";
const COOLDOWN_SECONDS = 60;

function fmtCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Full-screen, non-dismissable verification gate. Shown whenever the
 * authenticated user is in `pending` or `suspended` verification state.
 *
 * Behavior matches the trust-tier model in `src/lib/auth/trustTier.ts`:
 * tier 1 users can browse, but every privileged surface should render
 * underneath this lock and through the centralized edge guard.
 */
export function VerificationLock({ alwaysOpen = false }: { alwaysOpen?: boolean } = {}) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(RESEND_COOLDOWN_KEY);
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });

  const status = profile?.verification_status;
  const open =
    !!user &&
    (alwaysOpen || (!!profile && status !== "verified" && status !== undefined) || forcedOpen);

  useEffect(() => {
    const onDenied = () => {
      setForcedOpen(true);
      refreshProfile().catch(() => undefined);
    };
    window.addEventListener("hai:verification-denied", onDenied);
    return () => window.removeEventListener("hai:verification-denied", onDenied);
  }, [refreshProfile]);

  useEffect(() => {
    if (status === "verified") setForcedOpen(false);
  }, [status]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  const remainingMs = useMemo(() => {
    if (!profile?.verification_deadline) return 0;
    return new Date(profile.verification_deadline).getTime() - now;
  }, [profile?.verification_deadline, now]);

  const cooldownLeft = Math.max(0, cooldownUntil - now);

  const onResend = async () => {
    if (!user?.email || cooldownLeft > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: AUTH_EMAIL_REDIRECT_TO },
      });
      if (error) throw error;
      const until = Date.now() + COOLDOWN_SECONDS * 1000;
      setCooldownUntil(until);
      try {
        localStorage.setItem(RESEND_COOLDOWN_KEY, String(until));
      } catch {
        /* ignore */
      }
      toast.success("Verification email sent. Check your inbox.");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't resend right now. Try again in a minute.");
    } finally {
      setResending(false);
    }
  };

  if (!open) return null;

  const suspended = status === "suspended";

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        // Non-dismissable: kill close affordances
        className="max-w-md border-border/70 bg-background/95 backdrop-blur-xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {suspended ? "Re-verify to restore access" : "One quick step to unlock your workspace"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              HustleAI protects client workspaces and AI runtime integrity. We need
              to confirm <span className="text-foreground font-medium">{user?.email}</span>{" "}
              before AI tools, exports and automations come online for this account.
            </p>
          </div>

          {!suspended && remainingMs > 0 && (
            <div className="w-full rounded-md border border-border/60 bg-muted/40 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Verification window
              </div>
              <div className="font-mono text-lg tabular-nums text-foreground">
                {fmtCountdown(remainingMs)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                After this window the account is paused until verification.
              </div>
            </div>
          )}

          {suspended && (
            <div className="w-full rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-foreground">
              This account is paused because the verification window expired.
              Resending the email and confirming will restore access immediately.
            </div>
          )}

          <div className="w-full flex flex-col gap-2 pt-1">
            <Button onClick={onResend} disabled={resending || cooldownLeft > 0} className="w-full">
              {resending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {cooldownLeft > 0
                ? `Resend in ${Math.ceil(cooldownLeft / 1000)}s`
                : "Resend verification email"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground/80 pt-1">
            Already confirmed? This panel will close automatically within a few seconds.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VerificationLock;