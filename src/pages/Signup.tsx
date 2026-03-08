import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, UserPlus, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import gsap from "gsap";

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
  const referralCode = searchParams.get("ref") || "";
  const { signUp } = useAuth();
  const navigate = useNavigate();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, displayName, referralCode);
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email!", description: "We sent you a verification link. Please verify before signing in." });
      navigate("/login");
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

          <div className="text-center space-y-2 gsap-stagger">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <Zap className="w-8 h-8 text-primary group-hover:scale-125 transition-transform duration-300" />
              <span className="font-display font-bold text-2xl group-hover:text-gradient transition-all">HustleAI</span>
            </Link>
            <p className="text-muted-foreground">Create your account and start hustling.</p>
            {referralCode && (
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
        </div>
      </motion.div>
    </div>
  );
}
