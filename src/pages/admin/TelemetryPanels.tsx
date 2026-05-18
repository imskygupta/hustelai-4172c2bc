import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function fmt(ts?: string | null) { return ts ? new Date(ts).toLocaleString() : "—"; }

export function TelemetryPlanePanel() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.rpc("telemetry_health_overview" as any);
      if (error) throw error;
      setData(data);
    } catch (e: any) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  }, []);

  const snapshot = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.functions.invoke("telemetry-router", { body: { op: "snapshot" } });
      if (error) throw error;
      await load();
    } catch (e: any) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const snap = data?.snapshot ?? {};
  const drops = (data?.drops_24h ?? []) as any[];
  const states = (data?.router_state ?? []) as any[];
  const replay = data?.replay_queue ?? {};

  return (
    <div className="space-y-4">
      {err && <Card className="p-3 border-destructive text-destructive text-sm">{err}</Card>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={busy}>
          <RefreshCw className={`h-4 w-4 mr-1 ${busy?"animate-spin":""}`} />Reload
        </Button>
        <Button size="sm" onClick={snapshot} disabled={busy}>
          <Play className="h-4 w-4 mr-1" />Take snapshot
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Ingestion lag</div><div className="text-2xl font-semibold">{snap.ingestion_lag_ms ?? "—"} ms</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Ingested / 1m</div><div className="text-2xl font-semibold">{snap.events_ingested_1m ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Dropped / 1m</div><div className="text-2xl font-semibold">{snap.events_dropped_1m ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Sink</div><div>{snap.sink_reachable === false ? <Badge variant="destructive">down</Badge> : <Badge>up</Badge>}</div><div className="text-xs text-muted-foreground mt-1">{snap.notes ?? ""}</div></Card>
      </div>

      <Card className="p-3">
        <div className="font-medium mb-2 text-sm">Replay queue</div>
        <div className="flex gap-4 text-sm">
          <span>Pending: <strong>{replay.pending ?? 0}</strong></span>
          <span>Sent 24h: <strong>{replay.sent ?? 0}</strong></span>
          <span>Dead: <strong>{replay.dead ?? 0}</strong></span>
        </div>
      </Card>

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm">Router state per stream</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Stream</TableHead><TableHead>Last success</TableHead><TableHead>Last failure</TableHead>
            <TableHead>Ingested</TableHead><TableHead>Dropped</TableHead><TableHead>Last error</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {states.map((s) => (
              <TableRow key={s.stream}>
                <TableCell className="font-mono text-xs">{s.stream}</TableCell>
                <TableCell className="text-xs">{fmt(s.last_success_at)}</TableCell>
                <TableCell className="text-xs">{fmt(s.last_failure_at)}</TableCell>
                <TableCell className="text-xs">{s.total_ingested}</TableCell>
                <TableCell className="text-xs">{s.total_dropped}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{s.last_error || ""}</TableCell>
              </TableRow>
            ))}
            {states.length === 0 && <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground text-center">No router activity yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm">Drops (24h)</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Event</TableHead><TableHead>Reason</TableHead><TableHead>Count</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {drops.map((d, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{d.event_name}</TableCell>
                <TableCell><Badge variant="outline">{d.reason}</Badge></TableCell>
                <TableCell className="text-xs">{d.count}</TableCell>
              </TableRow>
            ))}
            {drops.length === 0 && <TableRow><TableCell colSpan={3} className="text-xs text-muted-foreground text-center">No drops in 24h.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function BlogAutomationPanel() {
  const [data, setData] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("blog_automation_overview" as any);
      setLatest(data);
    } catch { /* ignore */ }
  }, []);

  const live = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("blog-automation-audit", { method: "GET" } as any);
      if (error) throw error;
      setData(data);
    } catch (e: any) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  }, []);

  const snapshot = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.functions.invoke("blog-automation-audit", { body: { snapshot: true } });
      if (error) throw error;
      await Promise.all([live(), loadLatest()]);
    } catch (e: any) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  }, [live, loadLatest]);

  useEffect(() => { live(); loadLatest(); }, [live, loadLatest]);

  const d = data || latest?.details || {};

  return (
    <div className="space-y-4">
      {err && <Card className="p-3 border-destructive text-destructive text-sm">{err}</Card>}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={live} disabled={busy}><RefreshCw className={`h-4 w-4 mr-1 ${busy?"animate-spin":""}`} />Re-audit</Button>
        <Button size="sm" onClick={snapshot} disabled={busy}><Play className="h-4 w-4 mr-1" />Record snapshot</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Blog DB</div><div>{d.blog_db_reachable ? <Badge>up</Badge> : <Badge variant="destructive">down</Badge>}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Scheduler</div><div>{d.scheduler_endpoint_ok ? <Badge>ok</Badge> : <Badge variant="destructive">err</Badge>}</div><div className="text-xs text-muted-foreground mt-1">{d.scheduler_latency_ms ?? "—"} ms</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Sitemap</div><div>{d.sitemap_ok ? <Badge>ok</Badge> : <Badge variant="destructive">err</Badge>}</div><div className="text-xs text-muted-foreground mt-1">{d.sitemap_last_modified ?? ""}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Published today</div><div className="text-2xl font-semibold">{d.published_today ?? 0}</div></Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">In review</div><div className="text-xl font-semibold">{d.in_review ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Scheduled</div><div className="text-xl font-semibold">{d.scheduled ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Drafts in flight</div><div className="text-xl font-semibold">{d.drafts_in_flight ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Failed drafts 24h</div><div className="text-xl font-semibold">{d.failed_drafts_24h ?? 0}</div></Card>
      </div>

      <Card className="p-3 text-sm space-y-1">
        <div><span className="text-muted-foreground">Last published:</span> {fmt(d.last_published_at)} {d.last_published_slug && <code className="text-xs">{d.last_published_slug}</code>}</div>
        <div><span className="text-muted-foreground">Next scheduled:</span> {fmt(d.next_scheduled_at)} {d.next_scheduled_slug && <code className="text-xs">{d.next_scheduled_slug}</code>}</div>
        <div><span className="text-muted-foreground">Published last 7d:</span> {d.published_7d ?? 0}</div>
        <div><span className="text-muted-foreground">Provider errors 24h:</span> {d.provider_errors_24h ?? 0}</div>
      </Card>

      {d.error && <Card className="p-3 text-sm border-destructive text-destructive">{d.error}</Card>}
    </div>
  );
}