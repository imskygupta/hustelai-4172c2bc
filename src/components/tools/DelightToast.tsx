import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { onDelight, getDelightCount, setDelightMuted, type DelightEvent } from "@/lib/delight-bus";

/**
 * Zomato-style bottom-right toast that appears after pure-algorithm wins
 * (PDF generated, draft saved). Auto-dismisses, optional CTA, and from
 * the 2nd toast onwards exposes a "mute" button persisted in localStorage.
 */
export default function DelightToast() {
  const [evt, setEvt] = useState<DelightEvent | null>(null);
  const [showMute, setShowMute] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return onDelight((e) => {
      setEvt(e);
      setShowMute(getDelightCount() >= 2);
      const t = setTimeout(() => setEvt(null), 7000);
      return () => clearTimeout(t);
    });
  }, []);

  return (
    <AnimatePresence>
      {evt && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="fixed bottom-4 right-4 z-[200] w-[min(360px,calc(100vw-2rem))] print:hidden"
        >
          <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-rose-500 to-orange-500 p-[1.5px] shadow-2xl">
            <div className="rounded-2xl bg-white p-3.5 relative">
              <button
                onClick={() => setEvt(null)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start gap-3 pr-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 leading-tight">{evt.title}</div>
                  <div className="text-[12px] text-slate-600 mt-0.5 leading-snug">{evt.body}</div>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {evt.ctaHref && (
                      <button
                        onClick={() => { const href = evt.ctaHref!; setEvt(null); navigate(href); }}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition group"
                      >
                        {evt.ctaLabel || "Try it"}
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                    {showMute && (
                      <button
                        onClick={() => { setDelightMuted(true); setEvt(null); }}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                        title="Stop showing these"
                      >
                        <BellOff className="w-3 h-3" /> Mute these
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}