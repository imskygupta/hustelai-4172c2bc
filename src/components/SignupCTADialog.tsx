import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Lock, Rocket, Map, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  query?: string;
}

const teasers = [
  { icon: Lock, text: "Private hustles only members can see", color: "text-primary" },
  { icon: Map, text: "AI-generated step-by-step roadmaps", color: "text-accent-foreground" },
  { icon: Rocket, text: "Real earning leads scanned daily", color: "text-primary" },
];

export function SignupCTADialog({ open, onClose, query }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-card via-background to-card border border-primary/30 shadow-glow overflow-hidden"
          >
            {/* Animated gradient orbs */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gradient-to-br from-primary/30 to-emerald-400/20 blur-3xl pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-400/20 blur-3xl pointer-events-none"
            />

            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-8 space-y-5 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="inline-flex w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 items-center justify-center shadow-glow"
              >
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-2xl font-display font-bold">
                  Got nothing here? <span className="text-gradient">Here's the catch.</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {query ? <>We searched for "<span className="text-foreground font-medium">{query}</span>" in the public index.</> : "You've seen the public preview."}
                  {" "}The <span className="text-primary font-semibold">spicy stuff</span> is locked.
                </p>
              </div>

              <div className="space-y-2 text-left bg-muted/40 rounded-xl p-4 border border-border/50">
                {teasers.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                    </div>
                    <span className="text-foreground/90">{t.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => navigate(`/signup${query ? `?next=${encodeURIComponent("/explore?q=" + query)}` : ""}`)}
                  className="w-full h-11 bg-gradient-primary text-primary-foreground font-semibold hover:shadow-glow transition-all group"
                >
                  Unlock Private Hustles — Free
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <button
                  onClick={onClose}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}