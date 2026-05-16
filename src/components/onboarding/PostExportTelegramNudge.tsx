import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import { Link } from "react-router-dom";
import { hasMilestone, markMilestone } from "@/lib/onboarding/firstSession";

/**
 * PostExportTelegramNudge — appears once, AFTER the user's first export.
 * Intentionally not aggressive: a single calm line offering operational
 * deliveries via Telegram. Dismissed forever once shown.
 */
export default function PostExportTelegramNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (hasMilestone("telegram_prompted")) return;
      if (!hasMilestone("first_export")) return;
      setShow(true);
      markMilestone("telegram_prompted");
      clearInterval(id);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 p-4"
      >
        <button
          onClick={() => setShow(false)}
          className="absolute top-2.5 right-2.5 text-muted-foreground/70 hover:text-foreground p-1"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3 pr-4">
          <span className="inline-flex h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 items-center justify-center shrink-0">
            <Send className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Want operational deliveries in Telegram?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get exports, reminders and workflow results pushed straight to chat.
            </p>
            <Link
              to="/settings/telegram"
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:underline"
              onClick={() => setShow(false)}
            >
              Connect Telegram →
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}