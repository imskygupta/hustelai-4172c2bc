/**
 * /dashboard/clients/:id — Client Profile page.
 *
 * The "client feels real" surface: contact info, total deliveries, channel
 * usage, and a timeline of every artifact ever shipped to this client. Reads
 * from DB2 (`work_clients`, `work_deliveries`) via getClientDetail.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Building2, Mail, Phone, MessageCircle, Send, FileText, Save,
  Loader2, Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getClientDetail, type DeliveryRow, type WorkClientLite } from "@/lib/delivery/api";
import { SEO } from "@/components/SEO";
import { TelegramStatusBadge } from "@/components/delivery/TelegramStatusBadge";

const CHANNEL_META: Record<string, { label: string; icon: any; tone: string }> = {
  whatsapp_opened:   { label: "WhatsApp",     icon: MessageCircle, tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  telegram_sent:     { label: "Telegram",     icon: Send,          tone: "text-sky-700 bg-sky-50 border-sky-200" },
  telegram_pdf_sent: { label: "Telegram PDF", icon: FileText,      tone: "text-violet-700 bg-violet-50 border-violet-200" },
  saved_to_client:   { label: "Saved",        icon: Save,          tone: "text-amber-700 bg-amber-50 border-amber-200" },
};

export default function ClientProfile() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<WorkClientLite | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);

  useEffect(() => { (async () => {
    if (!user?.id || !id) { setLoading(false); return; }
    try {
      const { client, deliveries } = await getClientDetail(user.id, id);
      setClient(client); setDeliveries(deliveries);
    } finally { setLoading(false); }
  })(); }, [user?.id, id]);

  const channelCounts = deliveries.reduce<Record<string, number>>((acc, d) => {
    acc[d.channel] = (acc[d.channel] || 0) + 1; return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <SEO title={`${client?.name || "Client"} · HustleAI`} description="Client profile and delivery history." path="" noindex />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/dashboard/deliveries" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-3 h-3" /> Back to deliveries
          </Link>
          <TelegramStatusBadge />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading client…
          </div>
        ) : !client ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-600">Client not found in your workspace.</p>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
                  {client.company && (
                    <p className="text-sm text-slate-600 inline-flex items-center gap-1 mt-1">
                      <Building2 className="w-3.5 h-3.5" /> {client.company}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
                    {client.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                    {client.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Last activity</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {client.last_delivery_at ? new Date(client.last_delivery_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="Total deliveries" value={deliveries.length} />
              <StatTile label="WhatsApp"  value={channelCounts.whatsapp_opened || 0} />
              <StatTile label="Telegram"  value={(channelCounts.telegram_sent || 0) + (channelCounts.telegram_pdf_sent || 0)} />
              <StatTile label="Saved"     value={channelCounts.saved_to_client || 0} />
            </div>

            {/* Timeline */}
            <section>
              <h2 className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Activity timeline
              </h2>
              {deliveries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  Nothing delivered to this client yet.
                </div>
              ) : (
                <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                  {deliveries.map((d) => {
                    const meta = CHANNEL_META[d.channel] || { label: d.channel, icon: Send, tone: "text-slate-700 bg-slate-50 border-slate-200" };
                    const Icon = meta.icon;
                    return (
                      <li key={d.id} className="px-4 py-3 flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.tone}`}>
                          <Icon className="w-3 h-3" /> {meta.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-900 truncate">
                            <span className="font-medium">{toolLabel(d.tool_slug)}</span>
                            {d.content_title && <><span className="text-slate-400"> · </span><span className="text-slate-600">{d.content_title}</span></>}
                          </div>
                        </div>
                        <time className="text-[11px] text-slate-400 shrink-0">
                          {new Date(d.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </time>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

function toolLabel(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}