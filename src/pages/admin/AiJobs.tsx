import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Cpu, RefreshCw, ChevronLeft, CheckCircle2, XCircle, Clock, Loader2,
  ShieldAlert, Activity, BarChart3, Search, Ban,
} from "lucide-react";

const sb = supabase as any;

type Summary = {
  window_start: string;
  queued: number; running: number; retrying: number;
  succeeded: number; failed: number; cancelled: number; total: number;
  avg_duration_ms: number; p95_duration_ms: number; avg_attempts: number;
  total_cost: number; tokens_in: number; tokens_out: number;
};

function StatCard({ label, value, sub, tone = "default", icon: Icon }: any) {
  const tones: Record<string, string> = {
    default: "text-foreground", good: "text-emerald-500",
    warn: "text-amber-500", bad: "text-red-500",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusIcon({ s }: { s: string }) {
  if (s === "succeeded") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  if (s === "cancelled") return <Ban className="h-4 w-4 text-zinc-500" />;
  if (s === "running") return <Loader2 className="h-4 w-4 text-sky-500 animate-spin" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

function fmtMs(ms: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AdminAiJobs() {
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [kinds, setKinds] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [s, p, k, j] = await Promise.all([
      sb.rpc("ai_jobs_ops_summary"),
      sb.rpc("ai_jobs_provider_breakdown"),
      sb.rpc("ai_jobs_kind_breakdown"),
      sb.from("ai_jobs").select("id,user_id,kind,status,provider,model,attempt,max_attempts,progress,duration_ms,error,created_at,started_at,finished_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (s.error) toast.error(s.error.message); else setSummary(s.data as Summary);
    setProviders((p.data as any[]) || []);
    setKinds((k.data as any[]) || []);
    setJobs((j.data as any[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => jobs.filter(j => {
    if (status !== "all" && j.status !== status) return false;
    if (search && !`${j.kind} ${j.user_id} ${j.error || ""} ${j.provider || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [jobs, status, search]);

  const cancel = async (id: string) => {
    setBusy(id);
    try {
      const { error } = await supabase.functions.invoke("ai-job-cancel", { body: { job_id: id } });
      if (error) throw error;
      toast.success("Cancelled");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const retry = async (job: any) => {
    setBusy(job.id);
    const { error } = await sb.from("ai_jobs").update({ status: "queued", scheduled_at: new Date().toISOString(), attempt: 0 }).eq("id", job.id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Re-queued"); load(); }
  };

  const tickNow = async () => {
    setBusy("tick");
    const { error } = await supabase.functions.invoke("ai-job-runner", { body: {} });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Worker ticked"); setTimeout(load, 800); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin/automations" className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></Link>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Compute</div>
              <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2"><Cpu className="h-5 w-5 text-violet-500" /> AI Job Queue</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={tickNow} disabled={busy === "tick"}>
              {busy === "tick" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Activity className="h-3.5 w-3.5 mr-1.5" />}
              Tick worker
            </Button>
            <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {loading && !summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-20 rounded-xl"/>)}</div>
        ) : summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="In queue" value={summary.queued + summary.retrying} sub={`${summary.queued} queued · ${summary.retrying} retrying`} icon={Clock} tone={summary.queued + summary.retrying > 50 ? "warn" : "default"} />
            <StatCard label="Running" value={summary.running} icon={Loader2} tone="good" />
            <StatCard label="Succeeded 24h" value={summary.succeeded} sub={`${summary.total} total`} icon={CheckCircle2} tone="good" />
            <StatCard label="Failed 24h" value={summary.failed} sub={`${summary.cancelled} cancelled`} tone={summary.failed > 0 ? "bad" : "default"} icon={XCircle} />
            <StatCard label="Avg duration" value={fmtMs(summary.avg_duration_ms)} sub={`p95 ${fmtMs(summary.p95_duration_ms)}`} icon={Activity} />
            <StatCard label="Avg attempts" value={summary.avg_attempts} icon={ShieldAlert} />
            <StatCard label="Tokens" value={(summary.tokens_in + summary.tokens_out).toLocaleString()} sub={`${summary.tokens_in.toLocaleString()} in · ${summary.tokens_out.toLocaleString()} out`} icon={BarChart3} />
            <StatCard label="Cost (units)" value={Number(summary.total_cost).toFixed(2)} icon={BarChart3} />
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Recent jobs</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="kinds">Kinds</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search kind, user, error, provider…" className="pl-8" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="md:w-44"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["all","queued","running","retrying","succeeded","failed","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              {loading ? <div className="p-4 space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
              : filtered.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No jobs match.</div>
              : <div className="divide-y divide-border/40">
                  {filtered.map(j => (
                    <div key={j.id} className="px-4 py-3 flex items-center gap-3 text-sm flex-wrap">
                      <StatusIcon s={j.status} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs flex items-center gap-2 truncate">
                          <span className="font-medium text-foreground">{j.kind}</span>
                          {j.provider && <Badge variant="outline" className="text-[10px]">{j.provider}</Badge>}
                          {j.model && <span className="text-muted-foreground">{j.model}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {j.user_id ? `${j.user_id.slice(0,8)}… · ` : ""}attempt {j.attempt}/{j.max_attempts} · {fmtMs(j.duration_ms)}
                          {j.error && <span className="text-red-500"> · {j.error.slice(0,80)}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{new Date(j.created_at).toLocaleTimeString()}</span>
                      {(j.status === "queued" || j.status === "running" || j.status === "retrying") &&
                        <Button size="sm" variant="ghost" disabled={busy===j.id} onClick={() => cancel(j.id)}>{busy===j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : "Cancel"}</Button>}
                      {j.status === "failed" &&
                        <Button size="sm" variant="ghost" disabled={busy===j.id} onClick={() => retry(j)}>{busy===j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : "Retry"}</Button>}
                    </div>
                  ))}
                </div>}
            </div>
          </TabsContent>

          <TabsContent value="providers" className="mt-4">
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground bg-muted/20">
                  <tr><th className="text-left p-2 px-4">Provider</th><th className="text-right p-2">Total</th><th className="text-right p-2">Succeeded</th><th className="text-right p-2">Failed</th><th className="text-right p-2">Avg ms</th><th className="text-right p-2">Tokens</th><th className="text-right p-2 px-4">Cost</th></tr>
                </thead>
                <tbody>
                  {providers.map((p:any,i:number) => {
                    const sr = Number(p.total) ? (Number(p.succeeded)/Number(p.total)*100).toFixed(1) : "—";
                    return (
                      <tr key={i} className="border-t border-border/40">
                        <td className="p-2 px-4 font-medium">{p.provider} <span className="text-xs text-muted-foreground">({sr}%)</span></td>
                        <td className="p-2 text-right tabular-nums">{p.total}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-500">{p.succeeded}</td>
                        <td className="p-2 text-right tabular-nums text-red-500">{p.failed}</td>
                        <td className="p-2 text-right tabular-nums">{fmtMs(Number(p.avg_ms))}</td>
                        <td className="p-2 text-right tabular-nums">{Number(p.tokens).toLocaleString()}</td>
                        <td className="p-2 px-4 text-right tabular-nums">{Number(p.cost).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {providers.length===0 && <tr><td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">No provider activity.</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="kinds" className="mt-4">
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground bg-muted/20"><tr><th className="text-left p-2 px-4">Kind</th><th className="text-right p-2">Total</th><th className="text-right p-2">Succeeded</th><th className="text-right p-2">Failed</th><th className="text-right p-2 px-4">Avg ms</th></tr></thead>
                <tbody>
                  {kinds.map((k:any,i:number) => (
                    <tr key={i} className="border-t border-border/40">
                      <td className="p-2 px-4 font-mono">{k.kind}</td>
                      <td className="p-2 text-right tabular-nums">{k.total}</td>
                      <td className="p-2 text-right tabular-nums text-emerald-500">{k.succeeded}</td>
                      <td className="p-2 text-right tabular-nums text-red-500">{k.failed}</td>
                      <td className="p-2 px-4 text-right tabular-nums">{fmtMs(Number(k.avg_ms))}</td>
                    </tr>
                  ))}
                  {kinds.length===0 && <tr><td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">No jobs yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
