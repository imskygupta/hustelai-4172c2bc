/**
 * RecentClientActivityFeed
 *
 * A live "your workspace is doing things" panel on the Dashboard. Pulls
 * the 5 most-recent rows from DB2 `work_deliveries` (via
 * listRecentDeliveries) and renders them as a one-line activity feed
 * with channel icons + client links. Empty state hints at the Deliver
 * button so first-time users know how to fill it.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, FileText, Save, Activity, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listRecentDeliveries, type DeliveryRow } from "@/lib/delivery/api";

type Row = DeliveryRow & { client_name: string | null };

const CHANNEL: Record<string, { label: string; icon: any; tone: string; verb: string }> = {
  whatsapp_opened:   { label: "WhatsApp",     icon: MessageCircle, tone: "text-emerald-600", verb: "sent via WhatsApp" },
  telegram_sent:     { label: "Telegram",     icon: Send,          tone: "text-sky-600",     verb: "sent to Telegram" },
  telegram_pdf_sent: { label: "Telegram PDF", icon: FileText,      tone: "text-violet-600",  verb: "delivered as PDF to Telegram" },
  saved_to_client:   { label: "Saved",        icon: Save,          tone: "text-amber-600",   verb: "saved to client" },
};

export default function RecentClientActivityFeed() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    if (!user?.id) { setLoading(false); return; }
    try { setRows(await listRecentDeliveries(user.id, 5)); }
    finally { setLoading(false); }
  })(); }, [user?.id]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Recent activity</div>
            <div className="text-sm font-semibold text-slate-900">Your latest client work</div>
          </div>
        </div>
        <Link
          to="/dashboard/deliveries"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500">
            Nothing yet. Generate something with a tool and hit <span className="font-semibold text-slate-700">Deliver</span> — it'll show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const meta = CHANNEL[r.channel] || { label: r.channel, icon: Send, tone: "text-slate-600", verb: r.channel };
            const Icon = meta.icon;
            return (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.tone}`} />
                <div className="flex-1 min-w-0 truncate text-slate-700">
                  <span className="font-medium text-slate-900">{toolLabel(r.tool_slug)}</span>
                  <span className="text-slate-400"> · {meta.verb}</span>
                  {r.client_id && r.client_name && (
                    <>
                      <span className="text-slate-400"> · </span>
                      <Link to={`/dashboard/clients/${r.client_id}`} className="text-emerald-700 hover:underline">
                        {r.client_name}
                      </Link>
                    </>
                  )}
                </div>
                <time className="text-[10px] text-slate-400 shrink-0 tabular-nums">{ago(r.created_at)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function toolLabel(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}