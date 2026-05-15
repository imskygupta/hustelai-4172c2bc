import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RESET_PASSWORD_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Zap, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { checkEmailPolicy } from "@/lib/auth/email-policy";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    const policy = checkEmailPolicy(email);
    if (policy.ok === false) {
      setInlineError(policy.message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_REDIRECT_TO,
    });
    setLoading(false);
    if (error) {
      setInlineError(error.message);
      toast({ title: "Couldn't send link", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative">
      <SEO title="Reset password | HustleAI Workspace OS" description="Reset your HustleAI account password." path="" noindex />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.08),transparent_70%)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-6 text-foreground/90 hover:text-foreground transition-colors">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-display font-semibold tracking-tight">HustleAI</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border border-border rounded px-1.5 py-0.5">Workspace OS</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-7 sm:p-8 shadow-sm">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-display font-semibold tracking-tight">Reset your password</h1>
            <p className="text-sm text-muted-foreground">
              {sent ? "We've sent a secure reset link to your inbox." : "Enter your email and we'll send a secure reset link."}
            </p>
          </div>

          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-foreground">Check <strong>{email}</strong> for the reset link.</p>
                  <p className="text-muted-foreground mt-1">It may take a minute. Don't forget to check spam.</p>
                </div>
              </div>
              <button
                onClick={() => { setSent(false); setInlineError(null); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (inlineError) setInlineError(null); }}
                  placeholder="you@gmail.com"
                  required
                  autoComplete="email"
                  className="h-11"
                />
                {inlineError && (
                  <p className="text-xs text-destructive pt-1">{inlineError}</p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 font-medium">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to sign in
            </Link>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Encrypted transit
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
