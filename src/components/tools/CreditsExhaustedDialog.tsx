import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { KeyRound, Wallet, X, Sparkles, ArrowRight, Save } from "lucide-react";

/**
 * Friendly upsell shown when a user has exhausted today's free AI quota.
 * Three actions: BYOK (unlimited), buy ₹10 credits, or close.
 */
export function CreditsExhaustedDialog({
  open,
  onClose,
  toolName = "AI tool",
  onSaveDraft,
}: {
  open: boolean;
  onClose: () => void;
  toolName?: string;
  onSaveDraft?: () => void;
}) {
  const navigate = useNavigate();

  const goPayments = () => {
    onSaveDraft?.();
    onClose();
    navigate("/payment?intent=ai_credits&amount=10");
  };
  const goByok = () => {
    onSaveDraft?.();
    onClose();
    navigate("/workspaces/ai-settings");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white border border-amber-200/70 shadow-2xl overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-fuchsia-200/30 blur-3xl pointer-events-none" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700">{toolName}</div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    Today's free AI assists are up
                  </h3>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                Don't worry — we've got you. Pick what fits and keep building. Your draft is safe.
              </p>

              <div className="space-y-2 pt-1">
                <button
                  onClick={goByok}
                  className="w-full h-11 inline-flex items-center justify-between px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition group"
                >
                  <span className="inline-flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> Use your own AI key — unlimited
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={goPayments}
                  className="w-full h-11 inline-flex items-center justify-between px-4 rounded-lg bg-gradient-to-r from-amber-500 to-fuchsia-600 hover:from-amber-400 hover:to-fuchsia-500 text-white text-sm font-semibold transition group shadow-md shadow-amber-600/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Buy AI credits — from ₹10
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => { onSaveDraft?.(); onClose(); }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-900 transition"
                  >
                    <Save className="w-3 h-3" /> Save draft & close
                  </button>
                  <button
                    onClick={onClose}
                    className="text-[11px] text-slate-400 hover:text-slate-700 transition"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}