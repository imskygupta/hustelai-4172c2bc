import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  email: string;
}

const RESEND_COOLDOWN = 60; // seconds

/**
 * Full-screen email verification modal. Replaces the legacy tiny destructive
 * banner. Branded, animated, mobile-responsive, with resend cooldown and
 * spam-folder reminder.
 */
export function EmailVerificationBanner({ email }: Props) {
  const [sending, setSending] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resendVerification = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: AUTH_EMAIL_REDIRECT_TO },
    });
    setSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSentOnce(true);
    setCooldown(RESEND_COOLDOWN);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-background/70 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden"
      >
        {/* Branded gradient header */}
        <div className="relative h-32 sm:h-36 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, hsl(var(--primary)/0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, hsl(var(--accent)/0.4) 0%, transparent 50%)" }} />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="relative w-20 h-20 rounded-2xl bg-background/90 backdrop-blur border border-border/60 flex items-center justify-center shadow-lg"
          >
            <ShieldCheck className="w-10 h-10 text-primary" />
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-accent" />
          </motion.div>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Verify your email to activate your workspace
            </h2>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground break-all">{email}</span>.
              Click it to unlock the full HustleAI workspace.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {sentOnce && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>Verification email sent. Please check your inbox.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-xl bg-muted/40 border border-border/40 p-4 text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">Can't find it?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Check your <span className="text-foreground font-medium">spam</span> or <span className="text-foreground font-medium">promotions</span> folder</li>
              <li>Make sure <span className="text-foreground font-medium">{email}</span> is correct</li>
              <li>Wait a minute — delivery can take up to 60 seconds</li>
            </ul>
          </div>

          <Button
            onClick={resendVerification}
            disabled={sending || cooldown > 0}
            size="lg"
            className="w-full font-medium"
          >
            {sending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Sending…</>
            ) : cooldown > 0 ? (
              <><Mail className="w-4 h-4 mr-2" />Resend in {cooldown}s</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" />Resend verification email</>
            )}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            Already verified? <button onClick={() => window.location.reload()} className="text-primary hover:underline font-medium">Refresh this page</button>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
