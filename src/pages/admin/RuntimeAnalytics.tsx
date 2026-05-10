import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Activity, AlertOctagon, Wrench, ShieldAlert, Lock, Sparkles,
  RefreshCw, ChevronRight, Clock, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SummaryRow = {
  flag_key: string;
  reason: string;
  blocks: number;
  unique_users: number;
  last_block: string;
};
type TimelineRow = { bucket: string; blocks: number };
type IncidentRow = {
  id: string;
  flag_key: string | null;
  kind: string;
  severity: string;
  message: string | null;
  actor_id: string | null;
  resolved_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

const WINDOWS = [
  { label: "1h",  hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7d",  hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
] as const;

function reasonTone(r: string) {
  if (r === "killed" || r === "kill_switch") return "text-red-300 bg-red-500/10 border-red-500/30";
  if (r === "maintenance")                   return "text-amber-300 bg-amber-500/10 border-amber-500/30";
  if (r === "tier_locked" || r === "tier")   return "text-violet-300 bg-violet-500/10 border-violet-500/30";
  if (r === "beta_required" || r === "beta_only") return "text-sky-300 bg-sky-500/10 border-sky-500/30";
  return "text-zinc-300 bg-white/5 border-white/10";
}
function severityTone(s: string) {
  if (s === "critical") return "text-red-300 bg-red-500/10 border-red-500/30";
  if (s === "warning")  return "text-amber-300 bg-amber-500/10 border-amber-500/30";
  return "text-zinc-300 bg-white/5 border-white/10";
}
function kindIcon(kind: string) {
  if (kind.startsWith("kill_switch")) return ShieldAlert;
  if (kind.startsWith("maintenance")) return Wrench;
  if (kind === "flag_disabled")        return Lock;
  return AlertOctagon;
}
function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)         return `${Math.round(d)}s ago`;
  if (d < 3600)       return `${Math.round(d / 60)}m ago`;
  if (d < 86400)      return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

export default function RuntimeAnalytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [windowH, setWindowH] = useState<(typeof WINDOWS)[number]["hours"]>(24);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/imskygupta-admin"); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      if (!data) navigate("/");
    })();
  }, [user, authLoading, navigate]);

  const refresh = async () => {
    setLoading(true);
    const since = new Date(Date.now() - windowH * 3600_000).toISOString();
    const bucket = windowH <= 1 ? "1 minute"
                : windowH <= 24 ? "1 hour"
                : windowH <= 24 * 7 ? "6 hours"
                : "1 day";
    const [sumRes, tlRes, incRes] = await Promise.all([
      (supabase as any).rpc("flag_block_summary", { _since: since }),
      (supabase as any).rpc("flag_block_timeline", { _since: since, _bucket: bucket }),
      (supabase as any).from("feature_flag_incidents")
        .select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(60),
    ]);
    setSummary((sumRes.data as SummaryRow[]) || []);
    setTimeline((tlRes.data as TimelineRow[]) || []);
    setIncidents((incRes.data as IncidentRow[]) || []);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) refresh(); /* eslint-disable-next-line */ }, [isAdmin, windowH]);

  const totalBlocks = useMemo(() => summary.reduce((s, r) => s + Number(r.blocks || 0), 0), [summary]);
  const uniqueUsers = useMemo(() => {
    // sum is approximate (RPC is per-flag/reason); show maximum across rows for honesty
    return summary.reduce((m, r) => Math.max(m, Number(r.unique_users || 0)), 0);
  }, [summary]);
  const openIncidents = useMemo(() => incidents.filter(i => !i.resolved_at).length, [incidents]);

  const topByFlag = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of summary) map.set(r.flag_key, (map.get(r.flag_key) || 0) + Number(r.blocks || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [summary]);

  const maxTl = Math.max(1, ...timeline.map(t => Number(t.blocks || 0)));

  if (isAdmin === null || authLoading) {
    return <div className="min-h-screen grid place-items-center text-zinc-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 flex items-center gap-2">
              <Activity className="h-3 w-3" /> Runtime Analytics
            </div>
            <h1 className="text-2xl font-semibold mt-1">Operational visibility</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Live block telemetry, maintenance impact, and incident feed across the feature flag runtime.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/10 p-0.5 bg-white/[0.02]">
              {WINDOWS.map(w => (
                <button key={w.label} onClick={() => setWindowH(w.hours)}
                  className={`px-2.5 py-1 text-xs rounded-md transition ${
                    windowH === w.hours
                      ? "bg-white/10 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}>
                  {w.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}
              className="border-white/10 bg-white/[0.02] hover:bg-white/[0.05]">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/admin/runtime"
              className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5">
              Runtime controls <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* KPI strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Total blocks"     value={totalBlocks}                tone="default" />
          <Kpi label="Unique users"     value={uniqueUsers}                tone="default" sub="(max per flag·reason)" />
          <Kpi label="Active flags hit" value={topByFlag.length}           tone="default" />
          <Kpi label="Open incidents"   value={openIncidents}              tone={openIncidents ? "danger" : "default"} />
        </section>

        {/* Timeline */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" /> Block timeline
            </h2>
            {refreshedAt && (
              <span className="text-[11px] text-zinc-500">Updated {timeAgo(refreshedAt.toISOString())}</span>
            )}
          </div>
          {loading && timeline.length === 0 ? (
            <div className="h-32 rounded-md bg-white/[0.03] animate-pulse" />
          ) : timeline.length === 0 ? (
            <EmptyState text="No blocks recorded in this window. Runtime is healthy." />
          ) : (
            <div className="flex items-end gap-1 h-32">
              {timeline.map(t => {
                const h = Math.max(4, Math.round((Number(t.blocks) / maxTl) * 100));
                return (
                  <div key={t.bucket} className="flex-1 group relative">
                    <div className="bg-gradient-to-t from-amber-500/40 via-amber-500/60 to-amber-400/80 rounded-sm transition-all hover:opacity-100 opacity-80"
                      style={{ height: `${h}%`, minHeight: 4 }} />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-black/80 text-zinc-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none">
                      {new Date(t.bucket).toLocaleString()} · {t.blocks}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Two columns: top blocked & incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top blocked features */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" /> Most blocked features
            </h2>
            {loading && summary.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) =>
                  <div key={i} className="h-9 rounded-md bg-white/[0.03] animate-pulse" />)}
              </div>
            ) : summary.length === 0 ? (
              <EmptyState text="No blocked requests yet." />
            ) : (
              <div className="space-y-1.5">
                {summary.slice(0, 12).map((r, i) => {
                  const max = Number(summary[0].blocks) || 1;
                  const pct = Math.max(2, (Number(r.blocks) / max) * 100);
                  return (
                    <div key={`${r.flag_key}:${r.reason}:${i}`}
                      className="relative rounded-md border border-white/5 bg-white/[0.015] px-3 py-2 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/15 to-transparent"
                        style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-zinc-100 truncate">{r.flag_key}</div>
                          <div className="text-[10px] text-zinc-500">{r.unique_users} users · last {timeAgo(r.last_block)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${reasonTone(r.reason)}`}>
                            {r.reason}
                          </span>
                          <span className="text-sm font-semibold tabular-nums">{r.blocks}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Incident feed */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-zinc-400" /> Incident feed
              </h2>
              {openIncidents > 0 && (
                <Badge className="bg-red-500/15 text-red-300 border-red-500/30">{openIncidents} open</Badge>
              )}
            </div>
            {loading && incidents.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) =>
                  <div key={i} className="h-12 rounded-md bg-white/[0.03] animate-pulse" />)}
              </div>
            ) : incidents.length === 0 ? (
              <EmptyState text="No incidents in this window. Smooth sailing." />
            ) : (
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {incidents.map(inc => {
                  const Icon = kindIcon(inc.kind);
                  const open = !inc.resolved_at;
                  return (
                    <div key={inc.id}
                      className="flex items-start gap-3 rounded-md border border-white/5 bg-white/[0.015] px-3 py-2.5">
                      <div className={`mt-0.5 h-7 w-7 rounded-md grid place-items-center border ${severityTone(inc.severity)}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{inc.message || inc.kind}</span>
                          {open ? (
                            <span className="text-[9px] uppercase tracking-wider text-red-300 bg-red-500/10 border border-red-500/30 px-1 rounded">Open</span>
                          ) : (
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1 rounded">Resolved</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {inc.flag_key && <span className="font-mono">{inc.flag_key}</span>}
                          {inc.flag_key && " · "}
                          {timeAgo(inc.created_at)}
                          {inc.resolved_at && <> · resolved {timeAgo(inc.resolved_at)}</>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone: "default" | "danger" }) {
  const toneCls = tone === "danger"
    ? "border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5"
    : "border-white/10 bg-white/[0.02]";
  return (
    <div className={`rounded-xl border ${toneCls} p-4`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-xs text-zinc-500 border border-dashed border-white/10 rounded-md">
      <Sparkles className="h-4 w-4 mx-auto mb-2 opacity-60" />
      {text}
    </div>
  );
}