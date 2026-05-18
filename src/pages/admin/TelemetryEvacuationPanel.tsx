import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, ShieldCheck, AlertTriangle, ArrowRightLeft } from "lucide-react";

type Toggle = {
  stream: string;
  enabled: boolean;
  owned_enabled: boolean;
  mirror_to_primary: boolean;
  notes: string | null;
  updated_at: string;
};
type StreamRow = {
  stream: string;
  routed_owned: number; routed_primary: number;
  mirrored: number; replayed: number; failed: number;
  total: number; evac_pct: number;
};
type Check = {
  id: string; stream: string; check_kind: string; status: "ok"|"warn"|"fail";
  primary_count: number | null; owned_count: number | null;
  delta_pct: number | null; lag_ms: number | null;
  details: any; checked_at: string;
};

const statusVariant: Record<string, "default"|"secondary"|"destructive"|"outline"> = {
  ok: "default", warn: "secondary", fail: "destructive",
};

export function TelemetryEvacuationPanel() {
  const [overview, setOverview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.rpc("telemetry_evacuation_overview");
      if (error) throw error;
      setOverview(data);
    } catch (e: any) {
      setErr(e.message || "load failed");
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const setToggle = async (stream: string, field: "enabled"|"owned_enabled"|"mirror_to_primary", value: boolean) => {
    try {
      const { error } = await supabase.rpc("telemetry_set_evacuation_toggle", {
        _stream: stream, _field: field, _value: value, _notes: null,
      });
      if (error) throw error;
      await load();
    } catch (e: any) { setErr(e.message || "toggle failed"); }
  };

  const runVerify = async () => {
    setVerifyBusy(true); setErr(null);
    try {
      const { error } = await supabase.functions.invoke("telemetry-evacuation-verify", { body: {} });
      if (error) throw error;
      await load();
    } catch (e: any) { setErr(e.message || "verify failed"); }
    finally { setVerifyBusy(false); }
  };

  const totals = overview?.totals ?? { routed_owned: 0, routed_primary: 0, mirrored: 0, replayed: 0, failed: 0, evac_pct: 0, est_billing_reduction_pct: 0 };
  const streams: StreamRow[] = overview?.streams ?? [];
  const toggles: Toggle[] = overview?.toggles ?? [];
  const checks: Check[] = overview?.checks ?? [];

  return (
    <div className="space-y-4">
      {err && <Card className="p-3 border-destructive text-destructive text-sm">{err}</Card>}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" /> Telemetry Evacuation Activation
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={busy}>
            <RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={runVerify} disabled={verifyBusy}>
            <ShieldCheck className="h-4 w-4 mr-1" /> {verifyBusy ? "Verifying…" : "Run Verification"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Routed → Owned</div><div className="text-2xl font-bold">{totals.routed_owned}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Routed → Primary</div><div className="text-2xl font-bold">{totals.routed_primary}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Mirrored</div><div className="text-2xl font-bold">{totals.mirrored}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Replayed</div><div className="text-2xl font-bold">{totals.replayed}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Failed</div><div className="text-2xl font-bold text-destructive">{totals.failed}</div></Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Evacuation %</div>
          <div className="text-2xl font-bold">{totals.evac_pct}%</div>
          <div className="text-[10px] text-muted-foreground">≈ {totals.est_billing_reduction_pct}% primary write reduction</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="font-medium mb-2">Per-stream traffic (last 24h)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream</TableHead>
              <TableHead className="text-right">Owned</TableHead>
              <TableHead className="text-right">Primary</TableHead>
              <TableHead className="text-right">Mirror</TableHead>
              <TableHead className="text-right">Replay</TableHead>
              <TableHead className="text-right">Fail</TableHead>
              <TableHead className="text-right">Evac%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No traffic recorded yet.</TableCell></TableRow>
            )}
            {streams.map((s) => (
              <TableRow key={s.stream}>
                <TableCell className="font-mono text-xs">{s.stream}</TableCell>
                <TableCell className="text-right">{s.routed_owned}</TableCell>
                <TableCell className="text-right">{s.routed_primary}</TableCell>
                <TableCell className="text-right">{s.mirrored}</TableCell>
                <TableCell className="text-right">{s.replayed}</TableCell>
                <TableCell className={`text-right ${s.failed > 0 ? "text-destructive" : ""}`}>{s.failed}</TableCell>
                <TableCell className="text-right"><Badge variant={s.evac_pct > 0 ? "default" : "outline"}>{s.evac_pct}%</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <div className="font-medium mb-2">Rollback switches</div>
        <p className="text-xs text-muted-foreground mb-3">
          Flip <code>owned_enabled</code> off for an instant, no-downtime rollback to primary.
          Enable <code>mirror_to_primary</code> for dual-write parity checks during cutover.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Route to Owned</TableHead>
              <TableHead>Mirror to Primary</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {toggles.map((t) => (
              <TableRow key={t.stream}>
                <TableCell className="font-mono text-xs">{t.stream}</TableCell>
                <TableCell><Switch checked={t.enabled} onCheckedChange={(v) => setToggle(t.stream, "enabled", v)} /></TableCell>
                <TableCell><Switch checked={t.owned_enabled} onCheckedChange={(v) => setToggle(t.stream, "owned_enabled", v)} /></TableCell>
                <TableCell><Switch checked={t.mirror_to_primary} onCheckedChange={(v) => setToggle(t.stream, "mirror_to_primary", v)} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <div className="font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Verification checks (last 24h)
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Stream</TableHead>
              <TableHead>Check</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Primary</TableHead>
              <TableHead className="text-right">Owned</TableHead>
              <TableHead className="text-right">Δ%</TableHead>
              <TableHead className="text-right">Lag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No checks yet — click "Run Verification".</TableCell></TableRow>
            )}
            {checks.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">{new Date(c.checked_at).toLocaleTimeString()}</TableCell>
                <TableCell className="font-mono text-xs">{c.stream}</TableCell>
                <TableCell className="text-xs">{c.check_kind}</TableCell>
                <TableCell><Badge variant={statusVariant[c.status] || "outline"}>{c.status}</Badge></TableCell>
                <TableCell className="text-right">{c.primary_count ?? "—"}</TableCell>
                <TableCell className="text-right">{c.owned_count ?? "—"}</TableCell>
                <TableCell className="text-right">{c.delta_pct != null ? `${c.delta_pct}%` : "—"}</TableCell>
                <TableCell className="text-right">{c.lag_ms != null ? `${c.lag_ms}ms` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}