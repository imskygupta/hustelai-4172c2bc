import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AUTH_EMAIL_REDIRECT_TO } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, UserPlus, Eye, EyeOff, ArrowRight, CheckCircle, Gift, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import gsap from "gsap";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const quotes = [
  "The journey of a thousand miles begins with a single step. 🏃",
  "Your only limit is your mind. Break through. 💥",
  "Turn your skills into income. Start hustling. 🔥",
  "Great things never come from comfort zones. 🌟",
  "Be the CEO of your own life. Start today. 👑",
];

const benefits = [
  "AI-powered hustle discovery",
  "Track your income progress",
  "Join an active community",
  "Earn XP & climb leaderboards",
];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get("ref") || "";
  const [couponCode, setCouponCode] = useState(refFromUrl);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // OTP verification state
  const [step, setStep] = useState<"signup" | "otp">("signup");
  const [otpCode, setOtpCode] = useState("");
  const [otpDeliveryMode, setOtpDeliveryMode] = useState<"custom" | "auth">("custom");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Resend cooldown timer
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

        if (!error) {
          setOtpDeliveryMode("custom");
          return true;
        }

        console.error("Custom OTP send failed, falling back to managed auth OTP:", error);
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: AUTH_EMAIL_REDIRECT_TO,
        },
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
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, displayName, couponCode.trim());
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created! 🎉", description: "Check your email for a 6-digit verification code." });
      const sent = await sendOTPEmail();
      if (sent) {
        setStep("otp");
        setResendCooldown(60);
      } else {
        toast({ title: "Warning", description: "Could not send OTP. You can resend from the next screen.", variant: "destructive" });
        setStep("otp");
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Enter 6-digit code", variant: "destructive" });
      return;
    }

    setVerifying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || otpDeliveryMode === "auth") {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "email",
        });

        if (error || !data.user) {
          throw new Error(error?.message || "Invalid or expired verification code");
        }

        try {
          await supabase.functions.invoke("send-welcome-email", {
            body: { email, displayName },
          });
        } catch (e) {
          console.error("Welcome email failed:", e);
        }

        toast({ title: "Email verified! ✅", description: "Welcome to HustleAI! Redirecting..." });
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
        toast({ title: "Invalid code", description: "The OTP you entered is incorrect or expired.", variant: "destructive" });
        return;
      }

      const expiresAt = new Date(verification.expires_at);
      if (expiresAt < new Date()) {
        toast({ title: "Code expired", description: "Please request a new code.", variant: "destructive" });
        return;
      }

      await supabase
        .from("email_verifications")
        .update({ verified: true } as any)
        .eq("id", verification.id);

      try {
        await supabase.functions.invoke("send-welcome-email", {
          body: { email, displayName },
        });
      } catch (e) {
        console.error("Welcome email failed:", e);
      }

      toast({ title: "Email verified! ✅", description: "Welcome to HustleAI! Redirecting..." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    const sent = await sendOTPEmail();
    if (sent) {
      toast({ title: "Code resent! 📧", description: "Check your inbox for the new code." });
    } else {
      toast({ title: "Failed to resend", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <ParticleBackground />
      <div ref={glowRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-3xl pointer-events-none" />

      <div className="absolute top-8 left-0 right-0 text-center z-10">
        <AnimatePresence mode="wait">
          <motion.p
            key={quoteIdx}
            initial={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            transition={{ duration: 0.5 }}
            className="text-sm md:text-base text-accent/80 font-display italic max-w-lg mx-auto px-4"
          >
            "{quotes[quoteIdx]}"
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div ref={formRef} className="glass rounded-2xl p-8 space-y-6 border-accent/20 hover:border-accent/40 transition-all duration-700 hover:shadow-glow relative overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {step === "signup" ? (
            <>
              <div className="text-center space-y-2 gsap-stagger">
                <Link to="/" className="inline-flex items-center gap-2 group">
                  <Zap className="w-8 h-8 text-primary group-hover:scale-125 transition-transform duration-300" />
                  <span className="font-display font-bold text-2xl group-hover:text-gradient transition-all">HustleAI</span>
                </Link>
                <p className="text-muted-foreground">Create your account and start hustling.</p>
                {refFromUrl && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    🎁 Referred by a friend — you both earn rewards!
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 gsap-stagger">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name" required className="h-12 bg-secondary/50 focus:shadow-glow focus:border-primary transition-all" />
                </div>
                <div className="space-y-2 gsap-stagger">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required className="h-12 bg-secondary/50 focus:shadow-glow focus:border-primary transition-all" />
                </div>
                <div className="space-y-2 gsap-stagger">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                      className="h-12 bg-secondary/50 focus:shadow-glow focus:border-primary transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 gsap-stagger">
                  <Label htmlFor="coupon" className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-primary" /> Coupon / Referral Code
                    <span className="text-muted-foreground text-[10px] ml-1">(optional)</span>
                  </Label>
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. HA-abc12345"
                    disabled={!!refFromUrl}
                    className={`h-12 bg-secondary/50 focus:shadow-glow focus:border-primary transition-all ${refFromUrl ? 'opacity-70' : ''}`}
                  />
                  {refFromUrl && (
                    <p className="text-[10px] text-primary/70">✓ Auto-applied from referral link</p>
                  )}
                </div>
                <div className="gsap-stagger">
                  <Button type="submit" disabled={loading}
                    className="w-full h-12 bg-gradient-primary text-primary-foreground font-semibold text-base btn-press hover:shadow-glow transition-shadow">
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                    ) : (
                      <><UserPlus className="w-4 h-4 mr-2" /> Create Account</>
                    )}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative gsap-stagger">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or continue with</span></div>
              </div>

              {/* Google Sign Up */}
              <div className="gsap-stagger">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 font-medium border-border/50 hover:border-primary/30 hover:bg-secondary/50 transition-all"
                  onClick={async () => {
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) toast({ title: "Google sign-up failed", description: String(error), variant: "destructive" });
                  }}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 gsap-stagger">
                {benefits.map(b => (
                  <div key={b} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-primary/60 shrink-0" /> {b}
                  </div>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground gsap-stagger">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline hover:text-primary/80 transition-colors font-medium">
                  Sign in <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </p>
            </>
          ) : (
            /* OTP Verification Step */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display font-bold text-xl">Verify Your Email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
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

              <Button
                onClick={handleVerifyOTP}
                disabled={verifying || otpCode.length !== 6}
                className="w-full h-12 bg-gradient-primary text-primary-foreground font-semibold"
              >
                {verifying ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" /> Verify Email</>
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0}
                  className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline transition-colors"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Check your spam folder if you don't see the email.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
