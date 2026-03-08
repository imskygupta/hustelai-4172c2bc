import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, UserPlus, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";

const quotes = [
  "The journey of a thousand miles begins with a single step. 🏃",
  "Your only limit is your mind. Break through. 💥",
  "Turn your skills into income. Start hustling. 🔥",
  "Great things never come from comfort zones. 🌟",
  "Be the CEO of your own life. Start today. 👑",
];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, displayName);
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email!", description: "We sent you a verification link. Please verify to continue." });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute top-8 left-0 right-0 text-center z-10"
      >
        <p className="text-sm md:text-base text-primary/80 font-display italic max-w-lg mx-auto px-4">
          "{quote}"
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass rounded-2xl p-8 space-y-6 border-primary/20 hover:border-primary/40 transition-colors duration-500 hover:shadow-glow">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <Zap className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-display font-bold text-2xl group-hover:text-gradient transition-all">HustleAI</span>
            </Link>
            <p className="text-muted-foreground">Create your account and start hustling.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                className="transition-all duration-300 focus:shadow-glow focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="transition-all duration-300 focus:shadow-glow focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="transition-all duration-300 focus:shadow-glow focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-transform"
              disabled={loading}
            >
              {loading ? "Creating account..." : <><UserPlus className="w-4 h-4 mr-2" /> Create Account</>}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline hover:text-primary/80 transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
