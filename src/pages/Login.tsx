import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { authRedirectTo } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, Mail, ShieldCheck, Lock, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "@/components/SEO";

type LoginMethod = "password" | "magic";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<LoginMethod>("password");
  const [linkSent, setLinkSent] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const redirectAfterLogin = async () => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      navigate(next, { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    if (!authLoading && user) void redirectAfterLogin();
  }, [authLoading, user?.id]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      setInlineError(error.message);
      return;
    }
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    setLoading(false);
    if (signedInUser) await redirectAfterLogin();
    else navigate("/dashboard");
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInlineError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: authRedirectTo(searchParams.get("next") || "/dashboard"),
      },
    });
    setLoading(false);
    if (error) {
      setInlineError(error.message);
    } else {
      setLinkSent(true);
    }
  };

  const handleGoogle = async () => {
    try {
      const isCustomDomain =
        !window.location.hostname.includes("lovable.app") &&
        !window.location.hostname.includes("lovableproject.com");
      if (isCustomDomain) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: authRedirectTo(searchParams.get("next") || "/dashboard"),
            skipBrowserRedirect: true,
            queryParams: { prompt: "select_account" },
          },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      } else {
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: authRedirectTo(searchParams.get("next") || "/dashboard"),
          extraParams: { prompt: "select_account" },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: "Google sign-in failed", description: error.message || String(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative">
      <SEO title="Sign in | HustleAI Workspace OS" description="Sign in to your HustleAI workspace." path="" noindex />
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
            <h1 className="text-2xl font-display font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your AI Operating System for freelancers.
            </p>
          </div>

          <div className="mt-6 inline-flex w-full rounded-lg bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => { setMethod("password"); setLinkSent(false); setInlineError(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${method === "password" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Lock className="w-3.5 h-3.5 inline mr-1.5" /> Password
            </button>
            <button
              type="button"
              onClick={() => { setMethod("magic"); setLinkSent(false); setInlineError(null); }}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${method === "magic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Mail className="w-3.5 h-3.5 inline mr-1.5" /> Magic link
            </button>
          </div>

          <AnimatePresence mode="wait">
            {method === "password" && (
              <motion.form
                key="password"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onSubmit={handlePasswordSubmit}
                className="mt-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input
                    id="email" type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (inlineError) setInlineError(null); }}
                    placeholder="you@gmail.com" required autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password" type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => { setPassword(e.target.value); if (inlineError) setInlineError(null); }}
                      placeholder="Your password" required autoComplete="current-password"
                      className="h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {inlineError && (
                  <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                    {inlineError}
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full h-11 font-medium">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </motion.form>
            )}

            {method === "magic" && !linkSent && (
              <motion.form
                key="magic"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSendMagicLink}
                className="mt-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input
                    type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (inlineError) setInlineError(null); }}
                    placeholder="you@gmail.com" required autoComplete="email"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">We'll email you a secure one-time sign-in link.</p>
                </div>
                {inlineError && (
                  <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                    {inlineError}
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full h-11 font-medium">
                  <Send className="w-4 h-4 mr-2" /> {loading ? "Sending…" : "Email me a sign-in link"}
                </Button>
              </motion.form>
            )}

            {method === "magic" && linkSent && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3"
              >
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-foreground">Sign-in link sent to <strong>{email}</strong>.</p>
                  <button onClick={() => setLinkSent(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
                    Use a different email
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            className="w-full h-11 font-medium"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/signup" className="text-foreground font-medium hover:underline">Create an account</Link>
          </p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Secure auth</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3 h-3" /> Encrypted billing</span>
          <span className="inline-flex items-center gap-1.5"><Send className="w-3 h-3" /> Live workspace</span>
        </div>
      </motion.div>
    </div>
  );
}
