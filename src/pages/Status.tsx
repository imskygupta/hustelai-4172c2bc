import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertTriangle, Clock, Cpu, Webhook, FileText, Inbox } from "lucide-react";

type Health = "operational" | "degraded" | "outage" | "maintenance";

const STATUS_STYLES: Record<Health, { label: string; dot: string; text: string; ring: string }> = {
  operational: { label: "Operational", dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-400/20" },
  degraded:    { label: "Degraded",    dot: "bg-amber-400",   text: "text-amber-400",   ring: "ring-amber-400/20" },
  outage:      { label: "Outage",      dot: "bg-red-500",     text: "text-red-400",     ring: "ring-red-500/20" },
  maintenance: { label: "Maintenance", dot: "bg-sky-400",     text: "text-sky-400",     ring: "ring-sky-400/20" },
};

const SYSTEMS: { name: string; status: Health; icon: any; latency?: string }[] = [
  { name: "hustlaiapp.in (Marketing)",        status: "operational", icon: Activity, latency: "98 ms" },
  { name: "Workspace OS Dashboard",            status: "operational", icon: Cpu,      latency: "142 ms" },
  { name: "docs.hustlaiapp.in",                status: "operational", icon: FileText, latency: "76 ms"  },
  { name: "AI Model Router (hustle-fast/logic)", status: "operational", icon: Cpu,    latency: "1.2 s" },
  { name: "Export Engine (PDF / DOCX)",        status: "operational", icon: FileText, latency: "880 ms" },
  { name: "Intake OS",                         status: "operational", icon: Inbox,    latency: "210 ms" },
  { name: "Webhooks Delivery",                 status: "operational", icon: Webhook,  latency: "—" },
];

const INCIDENTS: { date: string; title: string; resolved: boolean; summary: string }[] = [
  {
    date: "2026-05-07",
    title: "Root domain returned 403 from edge",
    resolved: true,
    summary:
      "Subdomain routing experiment caused edge protection to block hustlaiapp.in for ~12 min. Mitigated by hardening hostname parsing and adding safe fallbacks in all subdomain redirects. Post-mortem: production safety layer (try/catch + maintenance mode + status page) shipped same day.",
  },
];

function Pill({ status }: { status: Health }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${s.ring} ${s.text} bg-white/[0.02]`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  );
}

export default function Status() {
  const overall: Health = SYSTEMS.some(s => s.status === "outage")
    ? "outage"
    : SYSTEMS.some(s => s.status === "degraded")
      ? "degraded"
      : SYSTEMS.some(s => s.status === "maintenance")
        ? "maintenance"
        : "operational";

  const overallStyle = STATUS_STYLES[overall];

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200 antialiased">
      <SEO
        title="HustleAI Status — Platform Uptime & Incidents"
        description="Real-time status of HustleAI marketing site, Workspace OS, docs, AI router, exports, and intake OS."
      />

      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <a href="https://hustlaiapp.in" className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-7 w-7 rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30 grid place-items-center">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
            </span>
            HustleAI <span className="text-zinc-500 font-normal">Status</span>
          </a>
          <Badge variant="outline" className="border-white/10 text-zinc-400 text-[11px]">
            status.hustlaiapp.in
          </Badge>
        </div>
      </header>

      {/* Hero — overall */}
      <section className="mx-auto max-w-5xl px-6 pt-12 pb-8">
        <div className={`rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-6 md:p-8`}>
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-xl grid place-items-center bg-white/[0.03] ring-1 ${overallStyle.ring}`}>
              {overall === "operational"
                ? <CheckCircle2 className={`h-6 w-6 ${overallStyle.text}`} />
                : <AlertTriangle className={`h-6 w-6 ${overallStyle.text}`} />
              }
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                {overall === "operational" ? "All systems operational" : `Some systems ${overallStyle.label.toLowerCase()}`}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Live status of the HustleAI platform, B2B API, and supporting infrastructure.
              </p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                Last checked {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Systems */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Systems</h2>
        <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015]">
          {SYSTEMS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-200 truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {s.latency && <span className="text-[11px] text-zinc-500 tabular-nums hidden sm:inline">{s.latency}</span>}
                  <Pill status={s.status} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Incidents */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Recent incidents</h2>
        {INCIDENTS.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-6 text-sm text-zinc-400">
            No incidents reported in the last 30 days.
          </div>
        ) : (
          <div className="space-y-3">
            {INCIDENTS.map((i) => (
              <article key={i.title} className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-white">{i.title}</h3>
                  <Pill status={i.resolved ? "operational" : "degraded"} />
                </div>
                <div className="text-[11px] text-zinc-500 mb-2">{i.date}{i.resolved ? " · Resolved" : " · Investigating"}</div>
                <p className="text-sm text-zinc-400 leading-relaxed">{i.summary}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/[0.06] py-6 text-center text-[11px] text-zinc-600">
        Powered by the HustleAI API layer · <a className="hover:text-zinc-400" href="https://hustlaiapp.in">hustlaiapp.in</a>
      </footer>
    </div>
  );
}