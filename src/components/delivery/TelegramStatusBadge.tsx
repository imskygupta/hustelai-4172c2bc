/**
 * Tiny status pill: "Telegram connected" or "Connect Telegram →".
 * Drop into headers (Dashboard, Deliveries, Deliver dialog) so the
 * connection state — the key retention loop — is always one glance away.
 */
import { Link } from "react-router-dom";
import { Send, Plug } from "lucide-react";
import { useTelegramConnection } from "@/lib/usage/useTelegramConnection";

export function TelegramStatusBadge({ className = "" }: { className?: string }) {
  const tg = useTelegramConnection();
  if (tg.loading) return null;
  if (tg.connected) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ${className}`}
        title="Your HustleAI bot can deliver to your Telegram chat"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        <Send className="h-3 w-3" /> Telegram connected
      </span>
    );
  }
  return (
    <Link
      to="/settings/telegram"
      className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700 ${className}`}
    >
      <Plug className="h-3 w-3" /> Connect Telegram →
    </Link>
  );
}