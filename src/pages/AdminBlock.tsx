import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Skull, AlertTriangle, ShieldAlert } from "lucide-react";

export default function AdminBlock() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-destructive/90 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating skulls background */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-destructive-foreground/10"
          initial={{ opacity: 0, y: 100, x: Math.random() * 800 - 400, rotate: 0 }}
          animate={{ opacity: [0, 0.3, 0], y: -200, rotate: 360 }}
          transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2, ease: "easeOut" }}
          style={{ left: `${Math.random() * 100}%`, top: `${50 + Math.random() * 50}%` }}
        >
          <Skull className="w-12 h-12" />
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-center space-y-6 max-w-lg z-10"
      >
        {/* Danger icon */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
          className="mx-auto"
        >
          <div className="w-28 h-28 mx-auto rounded-full bg-background/10 backdrop-blur-sm border-4 border-destructive-foreground/30 flex items-center justify-center">
            <ShieldAlert className="w-16 h-16 text-destructive-foreground" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="text-4xl md:text-5xl font-display font-black text-destructive-foreground"
        >
          🚫 YOU'RE NOT SUPPOSED TO BE HERE! 🚫
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-destructive-foreground/80 font-medium"
        >
          Nice try, detective 🕵️ but this area is way above your pay grade!
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-background/10 backdrop-blur-sm rounded-xl p-4 border border-destructive-foreground/20"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            <span className="text-sm font-bold text-yellow-300 uppercase tracking-wider">⚠️ Serious Warning ⚠️</span>
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
          </div>
          <p className="text-sm text-destructive-foreground/70">
            We appreciate your <span className="font-bold text-destructive-foreground">extra knowledge</span> and curiosity... 
            but getting here <span className="font-bold text-yellow-300">one more time</span> can lead to your 
            <span className="font-bold text-destructive-foreground underline"> account being permanently blocked</span>. 
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Skull className="w-5 h-5 text-destructive-foreground/60" />
            <Skull className="w-5 h-5 text-destructive-foreground/80" />
            <Skull className="w-5 h-5 text-destructive-foreground" />
            <Skull className="w-5 h-5 text-destructive-foreground/80" />
            <Skull className="w-5 h-5 text-destructive-foreground/60" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-destructive-foreground/50 text-sm"
        >
          Redirecting you to safety in <span className="text-2xl font-bold text-destructive-foreground">{countdown}</span> seconds...
        </motion.div>
      </motion.div>
    </div>
  );
}
