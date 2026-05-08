import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  toolName: string;
  action: string;
}

const perks = [
  "Unlimited downloads — PDF, share links, branded exports",
  "Save unlimited drafts and re-edit anytime",
  "Auto-fill from your saved business profile",
  "Sync with HustleAI Workspace OS — clients, invoices, proposals",
];

export function ToolGateDialog({ open, onClose, toolName, action }: Props) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white border border-emerald-200/60 shadow-2xl overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="relative p-7 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-700">One quick step</div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Sign up free to {action}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your <span className="font-semibold text-slate-900">{toolName}</span> draft is ready. Create a free HustleAI account to download, save & manage it inside your workspace.
              </p>
              <ul className="space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <Button
                  onClick={() => navigate(`/signup?next=${next}`)}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold group"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create free account
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <button onClick={() => navigate(`/login?next=${next}`)} className="w-full text-xs text-slate-500 hover:text-slate-900 transition">
                  Already have an account? Sign in
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400">No credit card · Free forever plan · Cancel anytime</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useToolGate(toolName: string, action: string) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const guard = (fn: () => void) => {
    if (user) fn();
    else setOpen(true);
  };

  const gate = <ToolGateDialog open={open} onClose={() => setOpen(false)} toolName={toolName} action={action} />;
  return { guard, gate, isAuthed: !!user };
}
