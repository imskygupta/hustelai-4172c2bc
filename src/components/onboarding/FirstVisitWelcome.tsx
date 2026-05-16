import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { hasMilestone } from "@/lib/onboarding/firstSession";

/**
 * FirstVisitWelcome — a calm, one-line orientation shown ONLY to users who
 * haven't created their first project yet. Disappears the moment they do,
 * or when they dismiss it. No tutorial, no checklist — one sentence and one
 * next action.
 */
export default function FirstVisitWelcome() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show only if user hasn't created their first project AND hasn't
    // dismissed the welcome in this device.
    const dismissed = localStorage.getItem("hai:welcome:dismissed") === "1";
    if (dismissed) return;
    if (hasMilestone("first_project")) return;
    setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem("hai:welcome:dismissed", "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.section
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)/0.07),transparent_60%)] p-4 sm:p-5"
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 text-muted-foreground/70 hover:text-foreground transition-colors p-1"
            aria-label="Dismiss welcome"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="inline-flex h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 items-center justify-center shadow shadow-primary/30 shrink-0">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-tight">
                  Welcome — what are you building today?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Workspace turns AI into operational systems. Start with a project — outreach, proposals, content, delivery — and you'll have your first deliverable in under a minute.
                </p>
              </div>
            </div>
            <Link
              to="/workspaces/new"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-medium shadow shadow-primary/30 hover:scale-[1.02] active:scale-[0.99] transition-transform"
            >
              Start first project
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}