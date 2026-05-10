import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Workflow, Play, Pause, RefreshCw, AlertOctagon, CheckCircle2, Clock,
  XCircle, RotateCcw, ChevronRight, Activity, Layers, Gauge, Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type WorkflowRow = {
  id: string; slug: string; name: string; trigger_event: string;
  enabled: boolean; paused: boolean; version: number; max_attempts: number;
  feature_flag: string | null; updated_at: string;
};
type RunRow = {
  id: string; workflow_id: string; trigger_event: string; status: string;
  attempt: number; max_attempts: number; scheduled_at: string;
  started_at: string | null; finished_at: string | null; last_error: string | null;
  payload: any; created_at: string;
};
type StepRow = {
  id: string; step_id: string; action: string; status: string;
  input: any; output: any; error: string | null; duration_ms: number | null;
  created_at: string;
};
type FailureRow = {
  id: string; workflow_id: string; trigger_event: string;
  attempts: number; last_error: string | null; failed_at: string;
  resolved: boolean; replayed_at: string | null; payload: any;
};
type OpsSummary = {
  total_runs: number; succeeded: number; failed: number;
  pending: number; retrying: number; dlq_open: number;
  success_rate: number; avg_attempts: number;
  queue_lag_p50_s: number; queue_lag_p95_s: number;
};
type TopEvent = { event_name: string; total: number; runs_enqueued: number; last_seen: string };

type Tab = "workflows" | "runs" | "failures";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)    return `${Math.round(d)}s ago`;
  if (d < 3600)  return `${Math.round(d / 60)}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

function statusTone(s: string) {
  if (s === "succeeded")           return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
  if (s === "running")             return "text-sky-300 bg-sky-500/10 border-sky-500/30";
  if (s === "retrying")            return "text-amber-300 bg-amber-500/10 border-amber-500/30";
  if (s === "failed")              return "text-red-300 bg-red-500/10 border-red-500/30";
  if (s === "cancelled")           return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
  return "text-zinc-300 bg-white/5 border-white/10";
}
function statusIcon(s: string) {
  if (s === "succeeded") return CheckCircle2;
  if (s === "running")   return Activity;
  if (s === "retrying")  return RotateCcw;
  if (s === "failed")    return XCircle;
  if (s === "pending")   return Clock;
  return Clock;
}

export default function Automations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [tab, setTab] = useState<Tab>("workflows");
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [ops, setOps] = useState<OpsSummary | null>(null);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Admin gate
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

  const load = async () => {
    setLoading(true);
    const [wfs, rns, fls, opsRes, topRes] = await Promise.all([
      (supabase as any).from("workflows").select("*").order("updated_at", { ascending: false }),
      (supabase as any).from("workflow_runs").select("*").order("created_at", { ascending: false }).limit(80),
      (supabase as any).from("workflow_failures").select("*").order("failed_at", { ascending: false }).limit(60),
      (supabase as any).rpc("workflow_ops_summary"),
      (supabase as any).rpc("workflow_top_events"),
    ]);
    setWorkflows((wfs.data as WorkflowRow[]) || []);
    setRuns((rns.data as RunRow[]) || []);
    setFailures((fls.data as FailureRow[]) || []);
    setOps((opsRes.data as OpsSummary) || null);
    setTopEvents((topRes.data as TopEvent[]) || []);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin]);

  const openRun = async (run: RunRow) => {
    setSelectedRun(run);
    const { data } = await (supabase as any).from("workflow_steps")
      .select("*").eq("run_id", run.id).order("created_at", { ascending: true });
    setSteps((data as StepRow[]) || []);
  };

  const togglePause = async (wf: WorkflowRow) => {
    setBusy(wf.id);
    const { error } = await (supabase as any).from("workflows")
      .update({ paused: !wf.paused }).eq("id", wf.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${wf.name} ${!wf.paused ? "paused" : "resumed"}` });
      load();
    }
    setBusy(null);
  };

  const tickRunner = async () => {
    setBusy("runner");
    const { error } = await supabase.functions.invoke("workflow-runner");
    if (error) toast({ title: "Runner failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Runner ticked" }); await load(); if (selectedRun) await openRun(selectedRun); }
    setBusy(null);
  };

  const replayFailure = async (f: FailureRow) => {
    setBusy(f.id);
    const { data, error } = await (supabase as any).rpc("replay_workflow_failure", { _failure_id: f.id });
    if (error) toast({ title: "Replay failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Replayed", description: `New run ${String(data).slice(0, 8)}` }); load(); }
    setBusy(null);
  };

  const counts = useMemo(() => ({
    total:     workflows.length,
    enabled:   workflows.filter(w => w.enabled && !w.paused).length,
    paused:    workflows.filter(w => w.paused).length,
    running:   runs.filter(r => r.status === "running" || r.status === "retrying").length,
    failed24h: runs.filter(r => r.status === "failed" && Date.now() - new Date(r.created_at).getTime() < 86400_000).length,
    open_failures: failures.filter(f => !f.resolved).length,
  }), [workflows, runs, failures]);

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
              <Workflow className="h-3 w-3" /> Automations
            </div>
            <h1 className="text-2xl font-semibold mt-1">Workflow engine</h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Event-driven async automations. Workflows trigger on events, run as
              durable jobs with retries, and surface here as runs & failures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={tickRunner} disabled={busy === "runner"}
              className="border-white/10">
              <Play className={`h-3.5 w-3.5 mr-1.5 ${busy === "runner" ? "animate-pulse" : ""}`} />
              Tick runner
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="border-white/10">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/admin/runtime" className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5">
              Runtime <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* KPI strip */}
        <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi label="Workflows"    value={counts.total} />
          <Kpi label="Active"       value={counts.enabled} tone="ok" />
          <Kpi label="Paused"       value={counts.paused} tone={counts.paused ? "warn" : "default"} />
          <Kpi label="In flight"    value={counts.running} />
          <Kpi label="Failed 24h"   value={counts.failed24h} tone={counts.failed24h ? "danger" : "default"} />
          <Kpi label="DLQ open"     value={counts.open_failures} tone={counts.open_failures ? "danger" : "default"} />
        </section>

        {/* Ops visibility (24h window) */}
        {ops && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="h-3.5 w-3.5 text-zinc-400" />
              <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-400">Engine ops · last 24h</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Kpi label="Throughput"     value={ops.total_runs} />
              <Kpi label="Success rate"   value={`${ops.success_rate}%`}
                tone={ops.success_rate >= 95 ? "ok" : ops.success_rate >= 80 ? "warn" : "danger"} />
              <Kpi label="Avg attempts"   value={ops.avg_attempts}
                tone={ops.avg_attempts > 1.5 ? "warn" : "default"} />
              <Kpi label="Queue lag p50"  value={`${ops.queue_lag_p50_s}s`}
                tone={ops.queue_lag_p50_s > 60 ? "warn" : "default"} />
              <Kpi label="Queue lag p95"  value={`${ops.queue_lag_p95_s}s`}
                tone={ops.queue_lag_p95_s > 300 ? "danger" : ops.queue_lag_p95_s > 120 ? "warn" : "default"} />
              <Kpi label="Retrying now"   value={ops.retrying}
                tone={ops.retrying > 0 ? "warn" : "default"} />
            </div>
          </section>
        )}

        {/* Top events (producer health) */}
        {topEvents.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-3.5 w-3.5 text-zinc-400" />
              <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-400">Event producers · last 24h</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {topEvents.slice(0, 12).map(e => (
                <div key={e.event_name} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.015]">
                  <div className="min-w-0">
                    <div className="text-xs font-mono truncate">{e.event_name}</div>
                    <div className="text-[10px] text-zinc-500">{timeAgo(e.last_seen)} · {e.runs_enqueued} runs</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums shrink-0">{e.total}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="inline-flex rounded-lg border border-white/10 p-0.5 bg-white/[0.02]">
          {(["workflows","runs","failures"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs rounded-md capitalize transition ${
                tab === t ? "bg-white/10 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "workflows" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {workflows.length === 0
              ? <Empty text="No workflows yet. Seed a template or create one via the API." />
              : workflows.map(w => (
                <div key={w.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{w.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{w.slug} · v{w.version}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{w.trigger_event}</span>
                      {w.feature_flag && (
                        <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30 font-mono text-[10px]">
                          flag: {w.feature_flag}
                        </Badge>
                      )}
                      <span>· max {w.max_attempts} attempts</span>
                      <span>· updated {timeAgo(w.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {w.paused
                      ? <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30">Paused</Badge>
                      : w.enabled
                        ? <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">Active</Badge>
                        : <Badge className="bg-red-500/10 text-red-300 border-red-500/30">Disabled</Badge>
                    }
                    <Button size="sm" variant="outline" disabled={busy === w.id} onClick={() => togglePause(w)}
                      className="border-white/10 h-8">
                      {w.paused
                        ? <><Play className="h-3.5 w-3.5 mr-1" /> Resume</>
                        : <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</>}
                    </Button>
                  </div>
                </div>
              ))}
          </section>
        )}

        {tab === "runs" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <section className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 max-h-[640px] overflow-y-auto">
              {runs.length === 0
                ? <Empty text="No runs yet. Emit an event to /functions/v1/workflow-emit." />
                : runs.map(r => {
                  const Icon = statusIcon(r.status);
                  const wf = workflows.find(w => w.id === r.workflow_id);
                  const active = selectedRun?.id === r.id;
                  return (
                    <button key={r.id} onClick={() => openRun(r)}
                      className={`w-full text-left p-3 hover:bg-white/[0.03] transition ${active ? "bg-white/[0.04]" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-6 w-6 rounded-md grid place-items-center border ${statusTone(r.status)}`}>
                          <Icon className="h-3 w-3" />
                        </span>
                        <span className="text-xs font-medium truncate">{wf?.name || r.workflow_id.slice(0, 8)}</span>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusTone(r.status)}`}>
                          {r.status}
                        </span>
                        {r.attempt > 1 && (
                          <span className="text-[10px] text-amber-300">attempt {r.attempt}/{r.max_attempts}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 flex gap-2 flex-wrap">
                        <span className="font-mono">{r.trigger_event}</span>
                        <span>· {timeAgo(r.created_at)}</span>
                        {r.last_error && <span className="text-red-400/80 truncate">· {r.last_error}</span>}
                      </div>
                    </button>
                  );
                })}
            </section>

            <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 max-h-[640px] overflow-y-auto">
              {!selectedRun ? (
                <Empty text="Select a run to inspect its steps." />
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Run</div>
                    <div className="text-xs font-mono break-all">{selectedRun.id}</div>
                  </div>
                  <pre className="text-[10px] bg-black/40 border border-white/5 rounded-md p-2 overflow-x-auto">
{JSON.stringify(selectedRun.payload, null, 2)}
                  </pre>
                  <div className="space-y-1.5">
                    {steps.length === 0
                      ? <Empty text="No steps recorded yet." />
                      : steps.map(s => {
                        const Icon = statusIcon(s.status === "succeeded" ? "succeeded" : s.status === "failed" ? "failed" : "running");
                        return (
                          <div key={s.id} className="rounded-md border border-white/5 bg-white/[0.015] p-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3 w-3" />
                              <span className="text-xs font-medium">{s.step_id}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{s.action}</span>
                              <span className={`ml-auto text-[10px] uppercase tracking-wider px-1 rounded border ${statusTone(s.status === "succeeded" ? "succeeded" : s.status === "failed" ? "failed" : "running")}`}>
                                {s.status}
                              </span>
                              {s.duration_ms != null && <span className="text-[10px] text-zinc-500">{s.duration_ms}ms</span>}
                            </div>
                            {s.error && <div className="text-[10px] text-red-300 mt-1">{s.error}</div>}
                            {s.output && (
                              <pre className="text-[10px] text-zinc-400 mt-1 overflow-x-auto">{JSON.stringify(s.output)}</pre>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "failures" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {failures.length === 0
              ? <Empty text="Dead-letter queue is clean." />
              : failures.map(f => {
                const wf = workflows.find(w => w.id === f.workflow_id);
                return (
                  <div key={f.id} className="p-3 flex items-start gap-3">
                    <div className="mt-0.5 h-7 w-7 rounded-md grid place-items-center bg-red-500/10 border border-red-500/30">
                      <AlertOctagon className="h-3.5 w-3.5 text-red-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{wf?.name || f.workflow_id.slice(0, 8)}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{f.trigger_event}</span>
                        <span className="text-[10px] text-zinc-500">· {f.attempts} attempts</span>
                        <span className="text-[10px] text-zinc-500">· {timeAgo(f.failed_at)}</span>
                        {f.resolved && (
                          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">
                            replayed
                          </Badge>
                        )}
                      </div>
                      {f.last_error && <div className="text-[10px] text-red-300 mt-0.5 truncate">{f.last_error}</div>}
                    </div>
                    <Button size="sm" variant="outline" disabled={busy === f.id || f.resolved}
                      onClick={() => replayFailure(f)} className="border-white/10 h-8">
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Replay
                    </Button>
                  </div>
                );
              })}
          </section>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "border-red-500/30 from-red-500/10 to-red-500/5"
            : tone === "warn"   ? "border-amber-500/30 from-amber-500/10 to-amber-500/5"
            : tone === "ok"     ? "border-emerald-500/30 from-emerald-500/10 to-emerald-500/5"
                                : "border-white/10 from-white/[0.02] to-white/[0.01]";
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${cls} p-3`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="text-xl font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-white/10 rounded-md m-3">
      <Layers className="h-4 w-4 mx-auto mb-2 opacity-60" />
      {text}
    </div>
  );
}