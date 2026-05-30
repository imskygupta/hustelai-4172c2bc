import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFloatingLauncherSuppressed } from "@/lib/ui/useFloatingLauncherSuppressed";

const SEEN_KEY = "hai.hustlebot.intro.v1";

/**
 * One-time HustleBot introduction shown on first authenticated visit.
 * Anchors visually toward the bottom-right where the mascot launcher lives.
 * Designed to be calm — no auto-open, no modal blocker, dismissible.
 */
export function HustleBotIntro() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const suppressed = useFloatingLauncherSuppressed();

  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      // Delay longer on mobile so PersonaWelcomeCard / persona-flow onboarding
      // gets first read before the copilot nudge appears.
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const t = window.setTimeout(() => setOpen(true), isMobile ? 6000 : 1200);
      return () => window.clearTimeout(t);
    } catch { /* ignore */ }
  }, [user]);

  function dismiss() {
    setOpen(false);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
  }

  return (
    <AnimatePresence>
      {open && !suppressed && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-24 right-4 md:right-6 z-40 max-w-[300px] rounded-xl border border-border bg-card shadow-card p-3.5"
          role="dialog"
          aria-label="Meet your Workspace Copilot"
        >
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex w-7 h-7 rounded-md bg-primary/10 items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </span>
            <span className="text-sm font-display font-semibold text-foreground">Workspace Copilot</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A calm operations assistant built into your workspace. Ask it to draft proposals,
            summarise client notes, build onboarding checklists or unblock stuck workflows.
          </p>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button onClick={dismiss} className="text-[11px] text-muted-foreground hover:text-foreground">
              Maybe later
            </button>
            <button
              onClick={() => { window.dispatchEvent(new Event("open-hustlebot")); dismiss(); }}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              <Sparkles className="w-3 h-3" /> Try it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}