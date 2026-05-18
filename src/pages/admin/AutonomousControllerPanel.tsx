import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Bot, RefreshCw, Activity, Gauge, Shield, TrendingDown, Play } from "lucide-react";

type Mode = "observe" | "mirror" | "shadow-write" | "owned-primary" | "rollback";
const MODES: Mode[] = ["observe","mirror","shadow-write","owned-primary","rollback"];
const modeBadge: Record<Mode, "default"|"secondary"|"destructive"|"outline"> = {
  observe: "outline", mirror: "secondary", "shadow-write": "secondary",
  "owned-primary": "default", rollback: "destructive",
};

function scoreColor(v: number, invert = false) {
  const good = invert ? v < 30 : v >= 70;
  const warn = invert ? v < 60 : v >= 50;
  return good ? "default" : warn ? "secondary" : "destructive";
}

export function AutonomousControllerPanel() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.rpc("autonomous_controller_overview");
      if (error) throw error;
      setData(data);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const setMode = async (m: Mode) => {
    try {
      const { error } = await supabase.rpc("set_migration_mode", { _mode: m, _reason: "admin UI" });
      if (error) throw error;
      await load();
    } catch (e: any) { setErr(e.message); }
  };

  const tick = async () => {
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.functions.invoke("telemetry-autonomous-controller", { body: { op: "tick" } });
      if (error) throw error;
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const refreshReco = async () => {
    try {
      const { error } = await supabase.functions.invoke("telemetry-autonomous-controller", { body: { op: "recommend" } });
      if (error) throw error;
      await load();
    } catch (e: any) { setErr(e.message); }
  };

  const setCfg = async (stream: string, patch: Record<string, any>) => {
    try {
      const { error } = await supabase.from("telemetry_autonomous_config").update(patch).eq("stream", stream);
      if (error) throw error;
      await load();
    } catch (e: any) { setErr(e.message); }
  };

  const mode: any = data?.mode ?? { mode: "observe" };
  const cfg: any[] = data?.config ?? [];
  const conf: any[] = data?.confidence ?? [];
  const trends: any[] = data?.cost_trends ?? [];
  const reco: any[] = data?.recommendations ?? [];
  const guards: any[] = data?.rail_guards ?? [];
  const replay: any = data?.replay ?? {};

  const totalsLast24 = trends.reduce(
    (acc, t) => ({
      owned: acc.owned + (t.writes_routed_owned || 0),
      primary: acc.primary + (t.writes_routed_primary || 0),
      iops: acc.iops + (t.iops_saved_estimate || 0),
      bytes: acc.bytes + (t.storage_bytes_avoided || 0),
      rt: acc.rt + (t.realtime_emissions_saved || 0),
    }), { owned: 0, primary: 0, iops: 0, bytes: 0, rt: 0 },
  );
  const evacPct = totalsLast24.owned + totalsLast24.primary > 0
    ? Math.round((totalsLast24.owned / (totalsLast24.owned + totalsLast24.primary)) * 1000) / 10 : 0;

  return (
    <div className="space-y-4">
      {err && <Card className="p-3 border-destructive text-destructive text-sm">{err}</Card>}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" /> Autonomous Telemetry Controller
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Migration mode:</span>
          <Badge variant={modeBadge[mode.mode as Mode] || "outline"}>{mode.mode}</Badge>
          <Select value={mode.mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="w-[170px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>{MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load} disabled={busy}>
            <RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={tick} disabled={busy}>
            <Play className="h-4 w-4 mr-1" /> Run tick
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Evac% (48h)</div><div className="text-2xl font-bold">{evacPct}%</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">IOPS saved</div><div className="text-2xl font-bold">{totalsLast24.iops.toLocaleString()}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Storage avoided</div><div className="text-2xl font-bold">{Math.round(totalsLast24.bytes/1024)} KB</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Realtime saved</div><div className="text-2xl font-bold">{totalsLast24.rt.toLocaleString()}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Replay pending</div><div className="text-2xl font-bold">{replay.pending ?? 0}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Dead-lettered</div><div className={`text-2xl font-bold ${replay.dead > 0 ? "text-destructive" : ""}`}>{replay.dead ?? 0}</div></Card>
      </div>

      <Card className="p-4">
        <div className="font-medium mb-2 flex items-center gap-2"><Gauge className="h-4 w-4" /> Per-stream confidence & autopilot</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream</TableHead>
              <TableHead>Auto cutover</TableHead>
              <TableHead>Auto rollback</TableHead>
              <TableHead>Soak (min)</TableHead>
              <TableHead>Min conf</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Rollback risk</TableHead>
              <TableHead>Sink health</TableHead>
              <TableHead>Divergence</TableHead>
              <TableHead>Replay pressure</TableHead>
              <TableHead>Last action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cfg.map((c: any) => {
              const cf = conf.find((x: any) => x.stream === c.stream) || {};
              return (
                <TableRow key={c.stream}>
                  <TableCell className="font-mono text-xs">{c.stream}</TableCell>
                  <TableCell><Switch checked={c.auto_cutover_enabled} onCheckedChange={(v) => setCfg(c.stream, { auto_cutover_enabled: v })} /></TableCell>
                  <TableCell><Switch checked={c.auto_rollback_enabled} onCheckedChange={(v) => setCfg(c.stream, { auto_rollback_enabled: v })} /></TableCell>
                  <TableCell className="text-xs">{c.soak_window_minutes}</TableCell>
                  <TableCell className="text-xs">{c.min_confidence_to_cutover}</TableCell>
                  <TableCell><Badge variant={scoreColor(cf.evacuation_confidence || 0)}>{Math.round(cf.evacuation_confidence || 0)}%</Badge></TableCell>
                  <TableCell><Badge variant={scoreColor(cf.rollback_risk || 0, true)}>{Math.round(cf.rollback_risk || 0)}%</Badge></TableCell>
                  <TableCell><Badge variant={scoreColor(cf.sink_health || 0)}>{Math.round(cf.sink_health || 0)}</Badge></TableCell>
                  <TableCell><Badge variant={scoreColor(cf.divergence_risk || 0, true)}>{Math.round(cf.divergence_risk || 0)}</Badge></TableCell>
                  <TableCell><Badge variant={scoreColor(cf.replay_pressure || 0, true)}>{Math.round(cf.replay_pressure || 0)}</Badge></TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {c.last_action ? `${c.last_action} @ ${new Date(c.last_action_at).toLocaleTimeString()}` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Extraction recommendations</div>
          <Button size="sm" variant="outline" onClick={refreshReco}>Recompute</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead><TableHead>Table</TableHead>
              <TableHead>Safety</TableHead><TableHead>Cost↓</TableHead>
              <TableHead>Rollback risk</TableHead><TableHead>Realtime coupling</TableHead>
              <TableHead>Composite</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reco.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No recommendations yet — click "Recompute".</TableCell></TableRow>
            )}
            {reco.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.rank}</TableCell>
                <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                <TableCell>{Math.round(r.safety_score)}</TableCell>
                <TableCell>{Math.round(r.cost_reduction_score)}</TableCell>
                <TableCell>{Math.round(r.rollback_risk)}</TableCell>
                <TableCell>{Math.round(r.realtime_coupling)}</TableCell>
                <TableCell><Badge variant={r.composite_score > 40 ? "default" : "outline"}>{Math.round(r.composite_score)}</Badge></TableCell>
                <TableCell>{r.rail_guarded ? <Badge variant="destructive">rail-guarded</Badge> : <Badge variant="secondary">ok</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <div className="font-medium mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Rail guards (hard blocks)</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Table</TableHead><TableHead>Category</TableHead>
            <TableHead>Reason</TableHead><TableHead>Override</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {guards.map((g: any) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-xs">{g.table_name}</TableCell>
                <TableCell><Badge variant="outline">{g.category}</Badge></TableCell>
                <TableCell className="text-xs">{g.reason}</TableCell>
                <TableCell>{g.override ? <Badge variant="destructive">overridden</Badge> : <Badge variant="default">locked</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <div className="font-medium mb-2 flex items-center gap-2"><Activity className="h-4 w-4" /> Cost trend (last 48h)</div>
        <div className="grid grid-cols-12 gap-1 items-end h-24">
          {trends.slice(-48).map((t: any, i: number) => {
            const total = (t.writes_routed_owned || 0) + (t.writes_routed_primary || 0);
            const ownedH = total > 0 ? Math.max(2, Math.round((t.writes_routed_owned / Math.max(total, 1)) * 90)) : 2;
            const primH = total > 0 ? Math.max(2, 90 - ownedH) : 2;
            return (
              <div key={i} className="flex flex-col justify-end gap-px" title={`${new Date(t.bucket_hour).toLocaleString()} • owned:${t.writes_routed_owned} primary:${t.writes_routed_primary}`}>
                <div className="bg-primary" style={{ height: `${ownedH}%` }} />
                <div className="bg-muted" style={{ height: `${primH}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-primary" /> owned</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-muted" /> primary</span>
        </div>
      </Card>
    </div>
  );
}