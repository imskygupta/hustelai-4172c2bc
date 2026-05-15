import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Zap, Eye, EyeOff, ShieldCheck, Lock, Send, Sparkles, Gift, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { SEO } from "@/components/SEO";
import { checkEmailPolicy } from "@/lib/auth/email-policy";

const benefits = [
  "Clients, projects & invoices in one place",
  "AI workflows tuned for freelance work",
  "Production-ready docs & integrations",
  "Telegram alerts & exports",
];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const [couponCode, setCouponCode] = useState(refFromUrl);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // OTP verification state
  const [step, setStep] = useState<"signup" | "otp">("signup");
  const [otpCode, setOtpCode] = useState("");
  const [otpDeliveryMode, setOtpDeliveryMode] = useState<"custom" | "auth">("custom");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendOTPEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.functions.invoke("send-otp-email", {
          body: { email, displayName },
        });
        if (!error) { setOtpDeliveryMode("custom"); return true; }
        console.error("Custom OTP send failed, falling back to managed auth OTP:", error);
      }
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: AUTH_EMAIL_REDIRECT_TO },
      });
      if (otpError) throw otpError;
      setOtpDeliveryMode("auth");
      return true;
    } catch (e) {
      console.error("OTP send error:", e);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    const policy = checkEmailPolicy(email);
    if (policy.ok === false) {
      setInlineError(policy.message);
      try {
        void supabase.functions.invoke("signup-guard", {
          body: { email, source: typeof window !== "undefined" ? window.location.hostname : "" },
        }).catch(() => {});
      } catch {}
      return;
    }
    if (password.length < 6) {
      setInlineError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, displayName, couponCode.trim());
    if (error) {
      setLoading(false);
      setInlineError(error.message);
      return;
    }

    try { await supabase.functions.invoke("send-welcome-email", { body: { email, displayName } }); }
    catch (e) { console.error("Welcome email failed:", e); }
    try {
      void supabase.functions.invoke("admin-bot-notify", {
        body: {
          event: "signup",
          payload: { email, name: displayName, timestamp: new Date().toISOString(),
            source: typeof window !== "undefined" ? window.location.hostname : "" },
        },
      }).catch(() => {});
    } catch {}
    try {
      await supabase.functions.invoke("send-resend-email", {
        body: { to: email, template: "verify-reminder", data: { name: displayName } },
      });
    } catch (e) { console.error("Verify reminder email failed:", e); }
    setLoading(false);
    toast({ title: "Welcome to HustleAI", description: "Setting up your workspace…" });
    try {
      const { yandexTrack } = await import("@/lib/yandex");
      yandexTrack("signup_complete", { method: "password" });
    } catch {}
    navigate("/onboarding");
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || otpDeliveryMode === "auth") {
        const { data, error } = await supabase.auth.verifyOtp({
          email, token: otpCode, type: "email",
        });
        if (error || !data.user) throw new Error(error?.message || "Invalid or expired code");
        try { await supabase.functions.invoke("send-welcome-email", { body: { email, displayName } }); }
        catch (e) { console.error("Welcome email failed:", e); }
        toast({ title: "Email verified", description: "Welcome to HustleAI." });
        navigate("/dashboard");
        return;
      }
      const { data: verification, error: verificationError } = await supabase
        .from("email_verifications")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("otp_code", otpCode)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (verificationError || !verification) {
        toast({ title: "Invalid code", description: "The code is incorrect or expired.", variant: "destructive" });
        return;
      }
      const expiresAt = new Date(verification.expires_at);
      if (expiresAt < new Date()) {
        toast({ title: "Code expired", description: "Please request a new code.", variant: "destructive" });
        return;
      }
      await supabase.from("email_verifications").update({ verified: true } as any).eq("id", verification.id);
      try { await supabase.functions.invoke("send-welcome-email", { body: { email, displayName } }); }
      catch (e) { console.error("Welcome email failed:", e); }
      toast({ title: "Email verified", description: "Welcome to HustleAI." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    const sent = await sendOTPEmail();
    if (sent) toast({ title: "Code resent", description: "Check your inbox." });
    else toast({ title: "Failed to resend", variant: "destructive" });
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
            redirectTo: AUTH_EMAIL_REDIRECT_TO,
            skipBrowserRedirect: true,
            queryParams: { prompt: "select_account" },
          },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      } else {
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: AUTH_EMAIL_REDIRECT_TO,
          extraParams: { prompt: "select_account" },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: "Google sign-up failed", description: error.message || String(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative">
      <SEO title="Create your account | HustleAI Workspace OS"
        description="HustleAI — the AI Operating System for freelancers. Manage clients, projects, docs, and AI workflows in one place."
        path="" noindex />
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
          {step === "signup" ? (
            <>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-display font-semibold tracking-tight">
                  The AI Operating System for freelancers
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage clients, projects, docs & AI workflows — all in one workspace.
                </p>
                {refFromUrl && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Gift className="w-3 h-3" /> Referred — you both earn rewards
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm">Your name</Label>
                    <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe" required autoComplete="name" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input id="email" type="email" value={email}
                      onChange={(e) => { setEmail(e.target.value); if (inlineError) setInlineError(null); }}
                      placeholder="you@gmail.com" required autoComplete="email" className="h-11" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => { setPassword(e.target.value); if (inlineError) setInlineError(null); }}
                      placeholder="At least 6 characters" required minLength={6} autoComplete="new-password"
                      className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coupon" className="text-sm flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-muted-foreground" />
                    Referral / coupon
                    <span className="text-muted-foreground text-[11px]">(optional)</span>
                  </Label>
                  <Input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. HA-abc12345" disabled={!!refFromUrl}
                    className={`h-11 ${refFromUrl ? "opacity-70" : ""}`} />
                  {refFromUrl && (
                    <p className="text-[11px] text-muted-foreground">Auto-applied from your invite link.</p>
                  )}
                </div>

                {inlineError && (
                  <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                    {inlineError}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-11 font-medium">
                  {loading ? "Creating account…" : "Create account"}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  We're in invite-only beta — Gmail accounts only for now.
                </p>
              </form>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>

              <Button type="button" variant="outline" onClick={handleGoogle} className="w-full h-11 font-medium">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3">
                {benefits.map(b => (
                  <div key={b} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary/70 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
              </p>
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="font-display font-semibold text-xl tracking-tight">Verify your email</h2>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
                  </p>
                </div>

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button onClick={handleVerifyOTP} disabled={verifying || otpCode.length !== 6}
                  className="w-full h-11 font-medium">
                  {verifying ? "Verifying…" : "Verify email"}
                </Button>

                <div className="text-center">
                  <button onClick={handleResendOTP} disabled={resendCooldown > 0}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-60 transition-colors">
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Secure auth</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3 h-3" /> Encrypted billing</span>
          <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Live workspace</span>
          <span className="inline-flex items-center gap-1.5"><Send className="w-3 h-3" /> Telegram alerts</span>
        </div>
      </motion.div>
    </div>
  );
}
