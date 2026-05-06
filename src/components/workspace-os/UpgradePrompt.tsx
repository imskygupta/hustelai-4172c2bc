import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, KeyRound, X, ArrowRight, Zap } from "lucide-react";
import { ENTITLEMENTS, type EntitlementKey } from "@/lib/workspace-os/entitlements";

type Props = {
  open: boolean;
  onClose: () => void;
  entitlement: EntitlementKey;
  /** Optional contextual line shown above the headline. */
  context?: string;
};

export default function UpgradePrompt({ open, onClose, entitlement, context }: Props) {
  const e = ENTITLEMENTS[entitlement];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            onClick={(ev) => ev.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent pointer-events-none" />
            <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/60 hover:bg-background flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-6 pt-10">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              {context && <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1">{context}</p>}
              <h3 className="text-xl font-semibold tracking-tight">{e.label}</h3>
              <p className="text-sm text-muted-foreground mt-2">{e.reason}</p>

              <div className="mt-5 space-y-2">
                <Link
                  to="/plans"
                  className="flex items-center justify-between rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium shadow-lg shadow-primary/30 hover:scale-[1.01] transition-transform"
                >
                  <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" /> {e.cta}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/workspaces/ai-settings"
                  className="flex items-center justify-between rounded-xl border border-border bg-background hover:bg-muted/50 px-4 py-3 text-sm"
                >
                  <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4" /> Or connect your own AI key (bypasses limits)</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}