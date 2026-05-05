import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DISMISS_KEY = "ha_verify_modal_dismissed_v1";

/**
 * Soft modal — auto-shows once per session on dashboard / app pages
 * if the user hasn't verified their email yet.
 * Dismissible once, then any locked feature can call `useEmailVerified()`
 * to know whether to block the action.
 */
export function VerifyEmailGate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const verified = !!user?.email_confirmed_at;

  useEffect(() => {
    if (!user || verified) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [user, verified]);

  // Allow other components to force-open the gate
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("ha:open-verify-gate", handler);
    return () => window.removeEventListener("ha:open-verify-gate", handler);
  }, []);

  if (!user || verified) return null;

  const resend = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email!,
      options: { emailRedirectTo: AUTH_EMAIL_REDIRECT_TO },
    });
    setSending(false);
    if (error) {
      toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verification email sent ✉️", description: "Check your inbox & spam folder." });
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 grid place-items-center mb-2">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-center">Hey dude, just 1 quick sec 👋</DialogTitle>
          <DialogDescription className="text-center">
            Verify your email and we're good to go — searches, AI tools and the leaderboard unlock instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 text-center">
          We sent a link to <b>{user.email}</b>
        </div>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={dismiss}>Later</Button>
          <Button onClick={resend} disabled={sending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Resend link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Returns { verified, requireVerified } — call requireVerified() before
 * running a search or AI tool. If the user isn't verified it shows a
 * toast + opens the gate modal and returns false.
 */
export function useRequireVerifiedEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const verified = !!user?.email_confirmed_at;

  const requireVerified = () => {
    if (verified) return true;
    sessionStorage.removeItem(DISMISS_KEY);
    // Force the gate to re-open by dispatching a custom event the gate listens for
    window.dispatchEvent(new CustomEvent("ha:open-verify-gate"));
    toast({
      title: "Verify your email first",
      description: "Quick 1-click verification unlocks AI tools & searches.",
      variant: "destructive",
    });
    return false;
  };

  return { verified, requireVerified };
}