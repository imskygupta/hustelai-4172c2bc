import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FlagQuickControls } from "@/components/admin/FlagQuickControls";
import {
  Activity, Bot, Radio, Send, Terminal, Database, ShieldAlert,
  RefreshCw, ChevronLeft, CheckCircle2, XCircle, Clock, Loader2,
  Power, Wrench, Pause, PlayCircle, Search,
} from "lucide-react";

type Overview = {
  window_start: string;
  links: { connected: number; pending: number; revoked: number };
  bots: { total: number; enabled: number };
  deliveries: { total: number; sent: number; failed: number; queued: number; success_rate: number };
  broadcasts: { total: number; sent: number; failed: number };
  exports: { delivered: number; failed: number; cached: number };
  commands: { total: number };
};

const sb = supabase as any;

function StatCard({ label, value, sub, tone = "default", icon: Icon }: any) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    good: "text-emerald-500",
    warn: "text-amber-500",
    bad: "text-red-500",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500 shadow-[0_0_8px_2px] shadow-emerald-500/40" : "bg-red-500"}`} />
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ data, loading, refresh }: { data: Overview | null; loading: boolean; refresh: () => void }) {
  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }
  if (!data) return <div className="text-sm text-muted-foreground">No telemetry yet.</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Connected users" value={data.links.connected} sub={`${data.links.pending} pending · ${data.links.revoked} revoked`} icon={CheckCircle2} tone="good" />
        <StatCard label="Bots active" value={`${data.bots.enabled}/${data.bots.total}`} icon={Bot} />
        <StatCard label="Delivery success" value={`${data.deliveries.success_rate}%`} sub={`${data.deliveries.sent}/${data.deliveries.total} in 24h`} tone={data.deliveries.success_rate >= 95 ? "good" : data.deliveries.success_rate >= 80 ? "warn" : "bad"} icon={Activity} />
        <StatCard label="Failed deliveries" value={data.deliveries.failed} sub={`${data.deliveries.queued} in queue`} tone={data.deliveries.failed > 0 ? "bad" : "default"} icon={XCircle} />
        <StatCard label="Broadcasts (24h)" value={data.broadcasts.total} sub={`${data.broadcasts.sent} sent · ${data.broadcasts.failed} failed`} icon={Radio} />
        <StatCard label="Exports delivered" value={data.exports.delivered} sub={`${data.exports.cached} cached on TG`} icon={Send} tone="good" />
        <StatCard label="Export failures" value={data.exports.failed} tone={data.exports.failed > 0 ? "warn" : "default"} icon={ShieldAlert} />
        <StatCard label="Registered commands" value={data.commands.total} icon={Terminal} />
      </div>
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-3.5 w-3.5 mr-2" /> Refresh</Button>
      </div>
    </div>
  );
}

/* ---------------- Bots ---------------- */
function BotsTab() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("telegram_bots").select("*").order("created_at", { ascending: false });
    setBots(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await sb.from("telegram_bots").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  if (bots.length === 0) return <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No Telegram bots registered yet.</div>;

  return (
    <div className="space-y-3">
      {bots.map((b) => {
        const ok = b.status === "healthy" || b.status === "ok";
        const stale = b.last_ping_at ? (Date.now() - new Date(b.last_ping_at).getTime() > 10 * 60_000) : true;
        return (
          <div key={b.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium">
                  <StatusDot ok={ok && !stale} />
                  {b.name} <span className="text-xs text-muted-foreground">@{b.username}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {b.purpose || "—"} · env <Badge variant="outline" className="ml-1">{b.environment}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={b.enabled ? "default" : "secondary"}>{b.enabled ? "enabled" : "disabled"}</Badge>
                <Badge variant={ok ? "default" : "destructive"}>{b.status}</Badge>
                {stale && b.last_ping_at && <Badge variant="outline" className="text-amber-500 border-amber-500/30">stale</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><div className="text-muted-foreground">Deliveries 24h</div><div className="font-medium tabular-nums text-sm">{b.delivery_count_24h ?? 0}</div></div>
              <div><div className="text-muted-foreground">Failures 24h</div><div className="font-medium tabular-nums text-sm">{b.failure_count_24h ?? 0}</div></div>
              <div><div className="text-muted-foreground">Last ping</div><div className="font-medium text-sm">{b.last_ping_at ? new Date(b.last_ping_at).toLocaleString() : "never"}</div></div>
              <div className="truncate"><div className="text-muted-foreground">Webhook</div><div className="font-medium text-sm truncate" title={b.webhook_url || ""}>{b.webhook_url ? "configured" : "—"}</div></div>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40">
              <Button size="sm" variant="outline" onClick={() => update(b.id, { enabled: !b.enabled })}>
                {b.enabled ? <><Pause className="h-3.5 w-3.5 mr-1.5" /> Pause</> : <><PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Resume</>}
              </Button>
              <Button size="sm" variant="outline" onClick={async () => {
                const { error } = await supabase.functions.invoke("telegram-bot-health", { body: { bot_id: b.id } });
                if (error) toast.error(error.message); else { toast.success("Health check sent"); load(); }
              }}><Activity className="h-3.5 w-3.5 mr-1.5" /> Ping</Button>
              <Button size="sm" variant="ghost" onClick={() => {
                const v = prompt("New environment (production/staging/dev)", b.environment);
                if (v) update(b.id, { environment: v });
              }}><Wrench className="h-3.5 w-3.5 mr-1.5" /> Env</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Broadcasts ---------------- */
function BroadcastsTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState<any[]>([]);
  const [draft, setDraft] = useState({ title: "", message: "", audience: "all", tier: "infinity", bot_id: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: j }, { data: b }] = await Promise.all([
      sb.from("broadcast_jobs").select("*").order("created_at", { ascending: false }).limit(50),
      sb.from("telegram_bots").select("id,name,username,enabled").eq("enabled", true).order("name"),
    ]);
    setJobs(j || []); setBots(b || []);
    if (b?.[0] && !draft.bot_id) setDraft((d) => ({ ...d, bot_id: b[0].id }));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const send = async (test = false) => {
    if (!draft.message.trim()) { toast.error("Message required"); return; }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const audience = test ? "self" : (draft.audience === "tier" ? `tier:${draft.tier}` : draft.audience);
      const { data: job, error: jErr } = await sb.from("broadcast_jobs").insert({
        title: draft.title || draft.message.slice(0, 60),
        message: draft.message, channel: "telegram",
        bot_id: draft.bot_id || null, audience,
        status: "queued", created_by: user?.id,
      }).select().single();
      if (jErr) throw jErr;
      const { error } = await supabase.functions.invoke("telegram-broadcast", { body: { job_id: job.id, test } });
      if (error) throw error;
      toast.success(test ? "Test broadcast sent" : "Broadcast queued");
      setDraft((d) => ({ ...d, title: "", message: "" }));
      load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSending(false); }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-4 space-y-3 h-fit">
        <div className="text-sm font-medium flex items-center gap-2"><Radio className="h-4 w-4" /> New broadcast</div>
        <div><Label className="text-xs">Internal title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Optional title" /></div>
        <div><Label className="text-xs">Message (HTML)</Label><Textarea rows={6} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="<b>Hi</b> — what's new..." /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Audience</Label>
            <Select value={draft.audience} onValueChange={(v) => setDraft({ ...draft, audience: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All connected</SelectItem>
                <SelectItem value="tier">By tier</SelectItem>
                <SelectItem value="beta">Beta users</SelectItem>
                <SelectItem value="affiliates">Affiliates</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.audience === "tier" && (
            <div>
              <Label className="text-xs">Tier</Label>
              <Select value={draft.tier} onValueChange={(v) => setDraft({ ...draft, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["free", "pro", "elite", "infinity"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {bots.length > 1 && (
          <div>
            <Label className="text-xs">Bot</Label>
            <Select value={draft.bot_id} onValueChange={(v) => setDraft({ ...draft, bot_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {bots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" onClick={() => send(false)} disabled={sending}>{sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />} Send</Button>
          <Button size="sm" variant="outline" onClick={() => send(true)} disabled={sending}>Test to me</Button>
        </div>
      </div>
      <div className="lg:col-span-3 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Recent broadcasts</div>
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : jobs.length === 0 ? <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No broadcasts yet.</div>
          : jobs.map((j) => (
            <div key={j.id} className="rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{j.title}</div>
                <div className="text-xs text-muted-foreground">{j.audience} · {new Date(j.created_at).toLocaleString()}</div>
              </div>
              <Badge variant={j.status === "sent" || j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>{j.status}</Badge>
              <span className="text-xs text-emerald-500 tabular-nums">{j.sent_count} sent</span>
              {j.failed_count > 0 && <span className="text-xs text-red-500 tabular-nums">{j.failed_count} failed</span>}
            </div>
          ))}
      </div>
    </div>
  );
}

/* ---------------- Deliveries ---------------- */
function DeliveriesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = sb.from("notification_deliveries").select("id,user_id,provider,status,attempt_count,last_error,external_message_id,delivered_at,created_at,event_id").eq("provider", "telegram").order("created_at", { ascending: false }).limit(200);
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setRows(data || []);
    const { data: f } = await sb.rpc("telegram_top_failures");
    setFailures(f || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => rows.filter(r =>
    !search || `${r.user_id} ${r.last_error} ${r.external_message_id}`.toLowerCase().includes(search.toLowerCase())
  ), [rows, search]);

  return (
    <div className="space-y-4">
      {failures.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" /> Top failure reasons (7d)</div>
          <div className="flex flex-wrap gap-2">
            {failures.map((f: any, i: number) => (
              <div key={i} className="text-xs px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                <span className="font-medium tabular-nums mr-1">{f.count}</span> {f.reason}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, error, message id…" className="pl-8" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all", "sent", "failed", "queued", "skipped"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-2" /> Refresh</Button>
      </div>
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        : filtered.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No deliveries match.</div>
        : <div className="divide-y divide-border/40">
            {filtered.map((r) => (
              <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 text-sm flex-wrap">
                {r.status === "sent" ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : r.status === "failed" ? <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  : <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs truncate">{r.user_id?.slice(0, 8)}… · attempt {r.attempt_count}</div>
                  {r.last_error && <div className="text-xs text-red-500 truncate">{r.last_error}</div>}
                </div>
                <Badge variant="outline" className="text-xs">{r.status}</Badge>
                <span className="text-xs text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}

/* ---------------- Commands ---------------- */
function CommandsTab() {
  const [cmds, setCmds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("telegram_commands").select("*, telegram_bots(name,username)").order("command");
    setCmds(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await sb.from("telegram_commands").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (cmds.length === 0) return <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No commands registered.</div>;

  return (
    <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40">
      {cmds.map((c) => (
        <div key={c.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm">/{c.command}</div>
            <div className="text-xs text-muted-foreground truncate">{c.description || "—"} · {c.telegram_bots?.name || "any bot"}</div>
          </div>
          <Badge variant="outline" className="text-xs">tier: {c.min_tier || "free"}</Badge>
          {c.admin_only && <Badge variant="destructive" className="text-xs">admin</Badge>}
          {c.beta_only && <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">beta</Badge>}
          <span className="text-xs text-muted-foreground">rl {c.rate_limit_per_min}/m</span>
          <Switch checked={c.enabled} onCheckedChange={(v) => update(c.id, { enabled: v })} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Exports (links to existing TelegramOps) ---------------- */
function ExportsTab() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 text-sm space-y-3">
      <div className="font-medium flex items-center gap-2"><Database className="h-4 w-4" /> Export delivery infrastructure</div>
      <p className="text-muted-foreground">Detailed export delivery monitoring, cache reuse stats and storage cleanup live in the dedicated Exports console.</p>
      <Button asChild size="sm" variant="outline"><Link to="/admin/telegram">Open export console →</Link></Button>
    </div>
  );
}

/* ---------------- Runtime ---------------- */
function RuntimeTab() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Power className="h-3 w-3" /> Runtime kill switches</div>
      <FlagQuickControls />
    </div>
  );
}

/* ---------------- Main page ---------------- */
export default function TelegramOpsCenter() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    setLoading(true);
    const { data, error } = await sb.rpc("telegram_ops_overview");
    if (error) toast.error(error.message);
    else setOverview(data as Overview);
    setLoading(false);
  };
  useEffect(() => { loadOverview(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin/communications" className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></Link>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Communications</div>
              <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2"><Send className="h-5 w-5 text-sky-500" /> Telegram Ops Center</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusDot ok={(overview?.deliveries.success_rate ?? 100) >= 80} />
            <span className="hidden md:inline">{overview ? `${overview.deliveries.success_rate}% delivery · ${overview.bots.enabled} bots live` : "loading…"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview"><Activity className="h-3.5 w-3.5 mr-1.5" /> Overview</TabsTrigger>
            <TabsTrigger value="bots"><Bot className="h-3.5 w-3.5 mr-1.5" /> Bots</TabsTrigger>
            <TabsTrigger value="broadcasts"><Radio className="h-3.5 w-3.5 mr-1.5" /> Broadcasts</TabsTrigger>
            <TabsTrigger value="deliveries"><Send className="h-3.5 w-3.5 mr-1.5" /> Deliveries</TabsTrigger>
            <TabsTrigger value="commands"><Terminal className="h-3.5 w-3.5 mr-1.5" /> Commands</TabsTrigger>
            <TabsTrigger value="exports"><Database className="h-3.5 w-3.5 mr-1.5" /> Exports</TabsTrigger>
            <TabsTrigger value="runtime"><Power className="h-3.5 w-3.5 mr-1.5" /> Runtime</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6"><OverviewTab data={overview} loading={loading} refresh={loadOverview} /></TabsContent>
          <TabsContent value="bots" className="mt-6"><BotsTab /></TabsContent>
          <TabsContent value="broadcasts" className="mt-6"><BroadcastsTab /></TabsContent>
          <TabsContent value="deliveries" className="mt-6"><DeliveriesTab /></TabsContent>
          <TabsContent value="commands" className="mt-6"><CommandsTab /></TabsContent>
          <TabsContent value="exports" className="mt-6"><ExportsTab /></TabsContent>
          <TabsContent value="runtime" className="mt-6"><RuntimeTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
