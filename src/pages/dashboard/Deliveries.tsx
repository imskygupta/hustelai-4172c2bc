/**
 * /dashboard/deliveries — visible proof that HustleAI ships work.
 *
 * Reads `work_deliveries` (DB2) for the signed-in owner and groups by
 * Today / This Week / Earlier. Channel chips show the path (WhatsApp,
 * Telegram, Telegram PDF, Saved). Intentionally read-only: this page is
 * the activity log, not an inbox.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, FileText, Save, Loader2, Inbox, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listRecentDeliveries, type DeliveryRow } from "@/lib/delivery/api";
import { SEO } from "@/components/SEO";
import { TelegramStatusBadge } from "@/components/delivery/TelegramStatusBadge";

type Row = DeliveryRow & { client_name: string | null };

const CHANNEL_META: Record<string, { label: string; icon: any; tone: string }> = {
  whatsapp_opened:   { label: "WhatsApp",     icon: MessageCircle, tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  telegram_sent:     { label: "Telegram",     icon: Send,          tone: "text-sky-700 bg-sky-50 border-sky-200" },
  telegram_pdf_sent: { label: "Telegram PDF", icon: FileText,      tone: "text-violet-700 bg-violet-50 border-violet-200" },
  saved_to_client:   { label: "Saved",        icon: Save,          tone: "text-amber-700 bg-amber-50 border-amber-200" },
};

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d = new Date()) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }

export default function Deliveries() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const data = await listRecentDeliveries(user.id, 200);
      setRows(data);
    } finally { setLoading(false); }
  })(); }, [user?.id]);

  const buckets = useMemo(() => {
    const today = startOfDay();
    const week = startOfWeek();
    const t: Row[] = [], w: Row[] = [], e: Row[] = [];
    for (const r of rows) {
      const d = new Date(r.created_at);
      if (d >= today) t.push(r);
      else if (d >= week) w.push(r);
      else e.push(r);
    }
    return { t, w, e };
  }, [rows]);

  const weekStats = useMemo(() => {
    const week = startOfWeek();
    const inWeek = rows.filter(r => new Date(r.created_at) >= week);
    const clients = new Set(inWeek.map(r => r.client_id).filter(Boolean));
    const wa = inWeek.filter(r => r.channel === "whatsapp_opened").length;
    const tg = inWeek.filter(r => r.channel.startsWith("telegram")).length;
    return { total: inWeek.length, clients: clients.size, wa, tg };
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <SEO title="Deliveries · HustleAI Workspace OS" description="Every delivery your workspace has shipped." path="" noindex />
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-600" /> Deliveries
            </h1>
            <TelegramStatusBadge />
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Proof that your workspace is doing the work — every WhatsApp, Telegram, and saved delivery, traced by client.
          </p>
        </div>

        {/* Week stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="This week" value={weekStats.total} />
          <StatTile label="Clients reached" value={weekStats.clients} />
          <StatTile label="WhatsApp opens" value={weekStats.wa} />
          <StatTile label="Telegram sends" value={weekStats.tg} />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading your delivery history…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Inbox className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <div className="font-semibold text-slate-900">No deliveries yet</div>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Generate something with a tool (proposal, red-flag report, contract) and use the
              <span className="font-semibold"> Deliver</span> button. It'll show up here.
            </p>
            <Link to="/dashboard/tools" className="inline-block mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Open tools →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <Bucket title="Today"      rows={buckets.t} />
            <Bucket title="This week"  rows={buckets.w} />
            <Bucket title="Earlier"    rows={buckets.e} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function Bucket({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">{title} · {rows.length}</h2>
      <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
        {rows.map((r) => {
          const meta = CHANNEL_META[r.channel] || { label: r.channel, icon: Send, tone: "text-slate-700 bg-slate-50 border-slate-200" };
          const Icon = meta.icon;
          return (
            <li key={r.id} className="px-4 py-3 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.tone}`}>
                <Icon className="w-3 h-3" /> {meta.label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 truncate">
                  <span className="font-medium">{toolLabel(r.tool_slug)}</span>
                  <span className="text-slate-400"> → </span>
                  {r.client_id && r.client_name ? (
                    <Link to={`/dashboard/clients/${r.client_id}`} className="text-emerald-700 hover:underline">
                      {r.client_name}
                    </Link>
                  ) : (
                    <span className="text-slate-500">Unassigned</span>
                  )}
                </div>
                {r.content_title && (
                  <div className="text-[11px] text-slate-500 truncate">{r.content_title}</div>
                )}
              </div>
              <time className="text-[11px] text-slate-400 shrink-0">{formatTime(r.created_at)}</time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function toolLabel(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatTime(iso: string) {
  const d = new Date(iso);
  const today = startOfDay();
  if (d >= today) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}