import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOTPEmail = async () => {
    const otp = generateOTP();
    setGeneratedOTP(otp);

    try {
      // Store OTP in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("email_verifications").insert({
          user_id: user.id,
          email,
          otp_code: otp,
        } as any);

        // Send OTP email
        await supabase.functions.invoke("send-otp-email", {
          body: { email, otp, displayName },
        });
      }
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
      // Send OTP for verification
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
      if (!user) throw new Error("Not logged in");

      // Check OTP from database
      const { data: verification } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("otp_code", otpCode)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!verification) {
        toast({ title: "Invalid code", description: "The OTP you entered is incorrect or expired.", variant: "destructive" });
        setVerifying(false);
        return;
      }

      // Check expiry
      const expiresAt = new Date((verification as any).expires_at);
      if (expiresAt < new Date()) {
        toast({ title: "Code expired", description: "Please request a new code.", variant: "destructive" });
        setVerifying(false);
        return;
      }

      // Mark as verified
      await supabase
        .from("email_verifications")
        .update({ verified: true } as any)
        .eq("id", (verification as any).id);

      // Send welcome email
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
    }
    setVerifying(false);
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
