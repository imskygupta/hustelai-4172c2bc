import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RESET_PASSWORD_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";

import { SEO } from "@/components/SEO";
import { checkEmailPolicy } from "@/lib/auth/email-policy";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const policy = checkEmailPolicy(email);
    if (policy.ok === false) {
      toast({ title: "Email not accepted", description: policy.message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_REDIRECT_TO,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Check your email!", description: "We sent a password reset link." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <SEO title="Reset password | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      <ParticleBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass rounded-2xl p-8 space-y-6 border-primary/20">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <Zap className="w-8 h-8 text-primary group-hover:scale-125 transition-transform duration-300" />
              <span className="font-display font-bold text-2xl group-hover:text-gradient transition-all">HustleAI</span>
            </Link>
            <h2 className="text-xl font-display font-bold">Reset Your Password</h2>
            <p className="text-sm text-muted-foreground">
              {sent ? "Check your inbox for the reset link." : "Enter your email and we'll send a reset link."}
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Didn't get the email? Check spam or{" "}
                <button onClick={() => setSent(false)} className="text-primary hover:underline font-medium">try again</button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required className="h-12 bg-secondary/50 focus:shadow-glow focus:border-primary" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-primary text-primary-foreground font-semibold">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline font-medium">
              <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
