import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AUTH_EMAIL_REDIRECT_TO, authRedirectTo } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, LogIn, Eye, EyeOff, ArrowRight, Shield, Briefcase, KeyRound, Mail, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import gsap from "gsap";

import { SEO } from "@/components/SEO";

const quotes = [
  "Your workspace, your way. Run client work like a pro studio.",
  "Clients, projects, invoices — unified in one operating system.",
  "Less switching tabs. More billable hours.",
  "Built for freelancers, creators and modern agencies.",
  "The professional command center for independent work.",
];

const trustBadges = [
  { icon: Shield, label: "Secure by design" },
  { icon: Briefcase, label: "Workspace OS" },
  { icon: Sparkles, label: "AI-assisted" },
];

type LoginMethod = "password" | "magic";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [method, setMethod] = useState<LoginMethod>("password");
  const [linkSent, setLinkSent] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setQuoteIdx(i => (i + 1) % quotes.length), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(formRef.current.querySelectorAll(".gsap-stagger"),
        { opacity: 0, y: 20, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.3 }
      );
    }
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        scale: 1.15, opacity: 0.6, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut",
      });
    }
  }, []);

  const redirectAfterLogin = async (_userId: string) => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      navigate(next, { replace: true });
      return;
    }

    // Normal user login must never auto-fallback into the admin surface.
    // Admins can enter via /imskygupta-admin or the explicit Admin Panel link.
    const { data: adminRole, error } = await supabase.rpc("has_role", {
      _user_id: _userId,
      _role: "admin",
    });

    if (!error && adminRole) {
      navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }

    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    setLoading(false);

    if (signedInUser) {
      await redirectAfterLogin(signedInUser.id);
    } else {
      navigate("/dashboard");
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sign-in link sent", description: "Check your inbox for a secure sign-in link." });
      setLinkSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <SEO title="Login | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      <ParticleBackground />
      <div ref={glowRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      <div className="absolute top-8 left-0 right-0 text-center z-10">
        <AnimatePresence mode="wait">
          <motion.p
            key={quoteIdx}
            initial={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            transition={{ duration: 0.5 }}
            className="text-sm md:text-base text-primary/80 font-display italic max-w-lg mx-auto px-4"
          >
            "{quotes[quoteIdx]}"
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <div ref={formRef} className="glass rounded-2xl p-6 space-y-4 border-primary/20 hover:border-primary/40 transition-all duration-700 hover:shadow-glow relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="text-center space-y-1 gsap-stagger">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <Zap className="w-7 h-7 text-primary group-hover:scale-125 transition-transform duration-300" />
              <span className="font-display font-bold text-xl group-hover:text-gradient transition-all">HustleAI</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">Workspace OS</span>
            </Link>
            <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>

          {/* Method toggle */}
          <div className="flex rounded-lg bg-muted/30 p-1 gsap-stagger">
            <button
              onClick={() => { setMethod("password"); setLinkSent(false); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === "password" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LogIn className="w-3.5 h-3.5 inline mr-1.5" />Password
            </button>
            <button
              onClick={() => { setMethod("magic"); setLinkSent(false); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === "magic" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Mail className="w-3.5 h-3.5 inline mr-1.5" />Magic Link
            </button>
          </div>

          {/* Password Login */}
          {method === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="space-y-1.5 gsap-stagger">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="h-10 transition-all duration-300 focus:shadow-glow focus:border-primary bg-secondary/50"
                />
              </div>
              <div className="space-y-1.5 gsap-stagger">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="h-10 transition-all duration-300 focus:shadow-glow focus:border-primary bg-secondary/50"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="gsap-stagger">
                <Button type="submit" disabled={loading}
                  className="w-full h-10 bg-gradient-primary text-primary-foreground font-semibold text-sm btn-press hover:shadow-glow transition-shadow duration-300">
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                  ) : (
                    <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Magic Link */}
          {method === "magic" && !linkSent && (
            <form onSubmit={handleSendMagicLink} className="space-y-3">
              <p className="text-xs text-muted-foreground gsap-stagger">
                We'll email you a secure sign-in link. No password needed.
              </p>
              <div className="space-y-1.5 gsap-stagger">
                <Label className="text-sm font-medium">Work email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com" required
                    className="h-10 pl-10 bg-secondary/50 focus:shadow-glow focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div className="gsap-stagger">
                <Button type="submit" disabled={loading}
                  className="w-full h-10 bg-gradient-primary text-primary-foreground font-semibold text-sm btn-press hover:shadow-glow transition-shadow">
                  {loading ? "Sending link…" : "Email me a sign-in link"}
                </Button>
              </div>
            </form>
          )}

          {method === "magic" && linkSent && (
            <div className="space-y-3 text-center gsap-stagger">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-foreground">Check <strong>{email}</strong> for your secure sign-in link.</p>
              <button type="button" onClick={() => setLinkSent(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Use a different email
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative gsap-stagger">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or continue with</span></div>
          </div>

          {/* Google Sign In */}
          <div className="gsap-stagger">
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 font-medium border-border/50 hover:border-primary/30 hover:bg-secondary/50 transition-all"
              onClick={async () => {
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
                    if (data?.url) {
                      window.location.href = data.url;
                    }
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
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2 gsap-stagger">
            {trustBadges.map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <b.icon className="w-3 h-3 text-primary/60" /> {b.label}
              </div>
            ))}
          </div>

          <div className="text-center space-y-2 gsap-stagger">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Forgot password?
            </Link>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline hover:text-primary/80 transition-colors font-medium">
                Sign up <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
