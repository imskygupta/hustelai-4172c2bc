import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, LogIn, Eye, EyeOff, ArrowRight, Shield, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import gsap from "gsap";

const quotes = [
  "Your hustle today is your empire tomorrow. 🚀",
  "Don't wait for opportunity — create it. 💡",
  "Every expert was once a beginner. Start now. 🌱",
  "Side hustle now, financial freedom later. 💰",
  "The best time to start was yesterday. The next best time is now. ⏰",
];

const trustBadges = [
  { icon: Shield, label: "Verified Platform" },
  { icon: TrendingUp, label: "10K+ Users" },
  { icon: Zap, label: "AI-Powered" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const { signIn } = useAuth();
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
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <ParticleBackground />

      {/* Ambient glow */}
      <div ref={glowRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      {/* Rotating quote */}
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
        className="w-full max-w-md relative z-10"
      >
        <div ref={formRef} className="glass rounded-2xl p-8 space-y-6 border-primary/20 hover:border-primary/40 transition-all duration-700 hover:shadow-glow relative overflow-hidden">
          {/* Gradient border shimmer */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="text-center space-y-2 gsap-stagger">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <Zap className="w-8 h-8 text-primary group-hover:scale-125 transition-transform duration-300" />
              <span className="font-display font-bold text-2xl group-hover:text-gradient transition-all">HustleAI</span>
            </Link>
            <p className="text-muted-foreground">Welcome back! Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 gsap-stagger">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required
                className="h-12 transition-all duration-300 focus:shadow-glow focus:border-primary bg-secondary/50"
              />
            </div>
            <div className="space-y-2 gsap-stagger">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="h-12 transition-all duration-300 focus:shadow-glow focus:border-primary bg-secondary/50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="gsap-stagger">
              <Button type="submit" disabled={loading}
                className="w-full h-12 bg-gradient-primary text-primary-foreground font-semibold text-base btn-press hover:shadow-glow transition-shadow duration-300">
                {loading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                ) : (
                  <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
                )}
              </Button>
            </div>
          </form>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 pt-2 gsap-stagger">
            {trustBadges.map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <b.icon className="w-3 h-3 text-primary/60" /> {b.label}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground gsap-stagger">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline hover:text-primary/80 transition-colors font-medium">
              Sign up <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
