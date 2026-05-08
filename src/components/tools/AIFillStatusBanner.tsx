import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, BatteryLow } from "lucide-react";
import { onAIFill, type AIFillEvent } from "@/lib/ai-fill-bus";

/**
 * Global, subtle inline status banner for AI fill operations.
 * Mounted once in AppShell — reacts to events emitted by AIAutofillIcon.
 * Visible only when an AI fill is writing, exhausted, or errored.
 */
export default function AIFillStatusBanner() {
  const [evt, setEvt] = useState<AIFillEvent | null>(null);

  useEffect(() => {
    return onAIFill((e) => {
      setEvt(e);
      if (e.status === "done" || e.status === "idle") {
        const t = setTimeout(() => setEvt(null), 600);
        return () => clearTimeout(t);
      }
      if (e.status === "writing") return;
      // exhausted / error auto-dismiss after 6s
      const t = setTimeout(() => setEvt(null), 6000);
      return () => clearTimeout(t);
    });
  }, []);

  if (!evt || evt.status === "idle" || evt.status === "done") return null;

  const writing = evt.status === "writing";
  const exhausted = evt.status === "exhausted";
  const errored = evt.status === "error";

  const tone = writing
    ? "bg-violet-50 text-violet-800 border-violet-200"
    : exhausted
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : "bg-rose-50 text-rose-800 border-rose-200";

  const Icon = writing ? Sparkles : exhausted ? BatteryLow : AlertTriangle;

  const text = writing
    ? `AI is writing${evt.section ? ` the ${evt.section}` : ""}…`
    : exhausted
      ? `You've exhausted today's AI fills${evt.section ? ` for ${evt.section}` : ""}. Use BYOK or top-up credits.`
      : `AI fill error${evt.message ? `: ${evt.message}` : ""}`;

  return (
    <AnimatePresence>
      <motion.div
        key={evt.status + (evt.section || "")}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] print:hidden pointer-events-none"
      >
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium shadow-sm ${tone}`}>
          <Icon className={`w-3.5 h-3.5 ${writing ? "animate-pulse" : ""}`} />
          <span>{text}</span>
          {writing && (
            <span aria-hidden className="inline-block w-[2px] h-3 bg-violet-700 align-middle animate-pulse ml-0.5" />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}