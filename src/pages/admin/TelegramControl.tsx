import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bot, Activity, Link2, Send, Terminal, RefreshCw,
  Loader2, ShieldCheck, Megaphone, Pause, Play, Zap,
} from "lucide-react";

type TgBot = { id: string; name: string; username: string; purpose: string | null; environment: string; enabled: boolean; status: string; webhook_url: string | null; last_ping_at: string | null; delivery_count_24h: number; failure_count_24h: number; token_secret_name: string | null; notes: string | null };
type Route = { id: string; event_pattern: string; channel: string; target_bot_id: string | null; target_email: string | null; severity_min: string; enabled: boolean };
type Cmd = { id: string; bot_id: string | null; command: string; description: string | null; enabled: boolean; min_tier: string; admin_only: boolean; beta_only: boolean; rate_limit_per_min: number };
type Broadcast = { id: string; title: string; message: string; channel: string; audience: string; status: string; sent_count: number; failed_count: number; created_at: string };

export default function TelegramControl() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
              <Bot className="h-6 w-6 text-emerald-500" /> Telegram Control Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage bots, routing, commands, broadcasts, and secure linking — DB-driven, hot-reloadable.
            </p>
          </div>
        </header>

        <Tabs defaultValue="bots" className="w-full">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="bots"><Bot className="h-4 w-4 mr-1.5" /> Bots</TabsTrigger>
            <TabsTrigger value="routes"><Activity className="h-4 w-4 mr-1.5" /> Routing</TabsTrigger>
            <TabsTrigger value="commands"><Terminal className="h-4 w-4 mr-1.5" /> Commands</TabsTrigger>
            <TabsTrigger value="broadcast"><Megaphone className="h-4 w-4 mr-1.5" /> Broadcast</TabsTrigger>
            <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-1.5" /> Links</TabsTrigger>
          </TabsList>

          <TabsContent value="bots" className="mt-4"><BotsPanel /></TabsContent>
          <TabsContent value="routes" className="mt-4"><RoutesPanel /></TabsContent>
          <TabsContent value="commands" className="mt-4"><CommandsPanel /></TabsContent>
          <TabsContent value="broadcast" className="mt-4"><BroadcastPanel /></TabsContent>
          <TabsContent value="links" className="mt-4"><LinksPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* -------------------- Bots -------------------- */
function BotsPanel() {
  const [rows, setRows] = useState<TgBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("telegram_bots" as any).select("*").order("created_at");
    setRows(((data || []) as unknown) as TgBot[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, enabled: boolean) {
    setBusy(id);
    const { error } = await supabase.from("telegram_bots" as any).update({ enabled } as any).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(enabled ? "Bot enabled" : "Bot paused"); load(); }
  }

  async function ping(id: string) {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("telegram-bot-health", { body: { bot_id: id } });
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(`Status: ${(data as any)?.status || "ok"}`); load(); }
  }

  if (loading) return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map(b => (
        <Card key={b.id} className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-500" /> {b.name}
                <Badge variant={b.enabled ? "default" : "secondary"}>{b.enabled ? "live" : "paused"}</Badge>
                <Badge variant="outline">{b.environment}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">@{b.username}</div>
              {b.purpose && <p className="text-sm text-muted-foreground mt-2">{b.purpose}</p>}
            </div>
            <Switch checked={b.enabled} disabled={busy === b.id} onCheckedChange={v => toggle(b.id, v)} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Status" value={b.status} accent={b.status === "ok" ? "text-emerald-600" : b.status === "down" ? "text-red-600" : "text-muted-foreground"} />
            <Stat label="24h sent" value={String(b.delivery_count_24h)} />
            <Stat label="24h fails" value={String(b.failure_count_24h)} accent={b.failure_count_24h > 0 ? "text-amber-600" : ""} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => ping(b.id)}>
              {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
              Health check
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggle(b.id, !b.enabled)}>
              {b.enabled ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</> : <><Play className="h-3.5 w-3.5 mr-1" /> Resume</>}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Token: <code className="font-mono">{b.token_secret_name || "—"}</code>
            </span>
          </div>
          {b.last_ping_at && (
            <div className="text-[11px] text-muted-foreground">Last ping: {new Date(b.last_ping_at).toLocaleString()}</div>
          )}
        </Card>
      ))}
      {rows.length === 0 && <EmptyState icon={Bot} title="No bots registered" hint="Bots are seeded automatically." />}
    </div>
  );
}

/* -------------------- Routes -------------------- */
function RoutesPanel() {
  const [rows, setRows] = useState<Route[]>([]);
  const [bots, setBots] = useState<TgBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ event_pattern: "", channel: "telegram", target_bot_id: "", severity_min: "info" });

  async function load() {
    setLoading(true);
    const [{ data: r }, { data: b }] = await Promise.all([
      supabase.from("notification_routes" as any).select("*").order("event_pattern"),
      supabase.from("telegram_bots" as any).select("*"),
    ]);
    setRows(((r || []) as unknown) as Route[]);
    setBots(((b || []) as unknown) as TgBot[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.event_pattern) return toast.error("Pattern required");
    setAdding(true);
    const payload: any = { ...draft, target_bot_id: draft.target_bot_id || null };
    const { error } = await supabase.from("notification_routes" as any).insert(payload);
    setAdding(false);
    if (error) toast.error(error.message);
    else { setDraft({ event_pattern: "", channel: "telegram", target_bot_id: "", severity_min: "info" }); load(); }
  }
  async function toggle(id: string, enabled: boolean) {
    await supabase.from("notification_routes" as any).update({ enabled } as any).eq("id", id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("notification_routes" as any).delete().eq("id", id);
    load();
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Add route</div>
        <div className="grid md:grid-cols-5 gap-2">
          <Input placeholder="event pattern (payment.* )" value={draft.event_pattern} onChange={e => setDraft({ ...draft, event_pattern: e.target.value })} />
          <Select value={draft.channel} onValueChange={v => setDraft({ ...draft, channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="discord">Discord</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
          <Select value={draft.target_bot_id || "_"} onValueChange={v => setDraft({ ...draft, target_bot_id: v === "_" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Target bot" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">No bot</SelectItem>
              {bots.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.severity_min} onValueChange={v => setDraft({ ...draft, severity_min: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["info", "warn", "error", "critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={adding}>{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {rows.length === 0 && <EmptyState icon={Activity} title="No routes" hint="Add your first event → channel route above." />}
        <div className="divide-y">
          {rows.map(r => (
            <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
              <code className="text-xs font-mono px-2 py-0.5 rounded bg-muted">{r.event_pattern}</code>
              <Badge variant="outline">{r.channel}</Badge>
              <Badge variant="secondary">≥ {r.severity_min}</Badge>
              <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                {bots.find(b => b.id === r.target_bot_id)?.name || r.target_email || r.target_url || "—"}
              </span>
              <Switch checked={r.enabled} onCheckedChange={v => toggle(r.id, v)} />
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Remove</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* -------------------- Commands -------------------- */
function CommandsPanel() {
  const [rows, setRows] = useState<Cmd[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("telegram_commands" as any).select("*").order("command");
    setRows(((data || []) as unknown) as Cmd[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, patch: Partial<Cmd>) {
    await supabase.from("telegram_commands" as any).update(patch as any).eq("id", id);
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } as Cmd : r));
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="divide-y">
        {rows.map(c => (
          <div key={c.id} className="p-3 flex items-center gap-3 flex-wrap">
            <code className="text-xs font-mono px-2 py-0.5 rounded bg-muted">/{c.command}</code>
            <span className="text-xs text-muted-foreground flex-1 min-w-[200px]">{c.description}</span>
            <Select value={c.min_tier} onValueChange={v => update(c.id, { min_tier: v })}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{["free","pro","elite","infinity"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <label className="text-xs flex items-center gap-1"><Switch checked={c.admin_only} onCheckedChange={v => update(c.id, { admin_only: v })} /> admin</label>
            <label className="text-xs flex items-center gap-1"><Switch checked={c.beta_only} onCheckedChange={v => update(c.id, { beta_only: v })} /> beta</label>
            <Switch checked={c.enabled} onCheckedChange={v => update(c.id, { enabled: v })} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------------------- Broadcast -------------------- */
function BroadcastPanel() {
  const [jobs, setJobs] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: "", message: "", audience: "all", channel: "telegram" });
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("broadcast_jobs" as any).select("*").order("created_at", { ascending: false }).limit(20);
    setJobs(((data || []) as unknown) as Broadcast[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function queue() {
    if (!draft.title || !draft.message) return toast.error("Title + message required");
    setSending(true);
    const { error } = await supabase.functions.invoke("telegram-broadcast", { body: { ...draft } });
    setSending(false);
    if (error) toast.error(error.message);
    else { toast.success("Broadcast queued"); setDraft({ title: "", message: "", audience: "all", channel: "telegram" }); load(); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold">Compose broadcast</div>
        <Input placeholder="Title (internal)" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
        <Textarea placeholder="Message body — supports HTML for Telegram" value={draft.message} onChange={e => setDraft({ ...draft, message: e.target.value })} rows={4} />
        <div className="grid md:grid-cols-3 gap-2">
          <Select value={draft.audience} onValueChange={v => setDraft({ ...draft, audience: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all","pro","elite","infinity","beta","affiliates"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={draft.channel} onValueChange={v => setDraft({ ...draft, channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={queue} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
            Queue broadcast
          </Button>
        </div>
      </Card>

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <Card className="p-0 overflow-hidden">
          {jobs.length === 0 && <EmptyState icon={Megaphone} title="No broadcasts yet" hint="Send your first internal announcement above." />}
          <div className="divide-y">
            {jobs.map(j => (
              <div key={j.id} className="p-3 flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{j.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{j.message}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{new Date(j.created_at).toLocaleString()}</div>
                </div>
                <Badge variant="outline">{j.audience}</Badge>
                <Badge variant="outline">{j.channel}</Badge>
                <Badge variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>{j.status}</Badge>
                <span className="text-xs text-muted-foreground">✓ {j.sent_count} · ✗ {j.failed_count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* -------------------- Links -------------------- */
function LinksPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("telegram_link_tokens" as any)
      .select("id, user_id, token, expires_at, used_at, created_at")
      .order("created_at", { ascending: false }).limit(50);
    setRows((data || []) as any[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    await supabase.from("telegram_link_tokens" as any).update({ used_at: new Date().toISOString() } as any).eq("id", id);
    toast.success("Token revoked");
    load();
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card className="p-0 overflow-hidden">
      {rows.length === 0 && <EmptyState icon={Link2} title="No link tokens" hint="Generated when users initiate a connect flow." />}
      <div className="divide-y">
        {rows.map(r => {
          const expired = new Date(r.expires_at) < new Date();
          const used = !!r.used_at;
          return (
            <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap text-sm">
              <code className="font-mono text-[11px] text-muted-foreground truncate max-w-[160px]">{r.token.slice(0, 12)}…</code>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{r.user_id}</span>
              <Badge variant={used ? "secondary" : expired ? "destructive" : "default"}>
                {used ? "used" : expired ? "expired" : "active"}
              </Badge>
              <span className="text-[11px] text-muted-foreground flex-1">exp {new Date(r.expires_at).toLocaleString()}</span>
              {!used && !expired && <Button size="sm" variant="ghost" onClick={() => revoke(r.id)}>Revoke</Button>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* -------------------- Helpers -------------------- */
function Stat({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-8 w-8 mx-auto text-muted-foreground/60" />
      <div className="mt-2 font-medium">{title}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
