import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useRecentOutputs } from "@/lib/workspace/outputs";
import { suggestChainFromOutput } from "@/lib/workspace/operationalChains";
import { wp } from "@/lib/workspace/paths";

/**
 * NextInFlow — calm "what usually happens next" panel.
 *
 * Renders only when the project has at least one AI output. Picks chain
 * suggestions off the most-recent output and dedupes against work that
 * already exists in the project. Dismissible per-output (so it returns the
 * moment a new generation lands but never re-nags after a deliberate skip).
 *
 * No popups, no toasts, no spam — pure inline momentum.
 */
export function NextInFlow({ workspaceId }: { workspaceId: string }) {
  const { items, loading } = useRecentOutputs({ scopeToProject: true, limit: 12 });
  const latest = items[0];
  const chain = useMemo(() => latest ? suggestChainFromOutput(latest, items.slice(1)) : [], [latest, items]);

  const dismissKey = latest ? `ws-nextflow:${workspaceId}:${latest.id}` : null;
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!dismissKey) return;
    setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  if (loading || !latest || chain.length === 0 || dismissed) return null;

  function dismiss() {
    if (!dismissKey) return;
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-6 w-6 rounded-md bg-primary/10 items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-tight">What usually happens next</p>
              <p className="text-[11px] text-muted-foreground truncate">
                After <span className="text-foreground/80">{latest.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss suggestions"
            className="text-muted-foreground/70 hover:text-foreground transition-colors p-1 -m-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {chain.map((s, i) => (
            <motion.div
              key={s.id + i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.28 }}
            >
              <Link
                to={`${wp(s.href)}?workspace=${workspaceId}&intent=${s.intent}&from=nextflow&source=${latest.id}`}
                className="group block rounded-xl border border-border/40 bg-background/40 hover:bg-card hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5 transition-all p-3 h-full"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex h-6 w-6 rounded-md bg-primary/8 items-center justify-center">
                    <s.icon className="h-3 w-3 text-primary" />
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60 ml-auto group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[13px] font-medium leading-tight">{s.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.sub}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
