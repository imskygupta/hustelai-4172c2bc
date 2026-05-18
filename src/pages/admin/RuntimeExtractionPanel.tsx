import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ShieldAlert, Activity, Database, AlertTriangle, Zap, DollarSign } from "lucide-react";

type Overview = {
  primary_dependency_pct: number;
  operational_independence_pct: number;
  writes_avoided_per_hour: number;
  writes_to_primary_per_hour: number;
  projected_monthly_savings_usd: number;
  critical_dependency_count: number;
  unsafe_direct_write_count: number;
  total_streams: number;
  evacuated_streams: number;
};

type Stream = {
  id: string; stream: string; category: string; posture: string;
  owner_db: string | null; confidence: number; rail_guarded: boolean;
  critical: boolean; est_writes_per_hour: number; notes: string | null;
};
type Finding = {
  id: string; kind: string; location: string; detail: string | null;
  severity: string; resolved: boolean; first_seen_at: string;
};
type Sweeper = {
  id: string; sweeper_name: string; kind: string; authority_owner: string;
  schedule: string | null; target_db: string | null; replay_aware: boolean;
  enabled: boolean; last_tick_at: string | null; last_status: string | null;
};
type Circuit = {
  id: string; circuit: string; state: string; threshold: number;
  current_count: number; cools_at: string | null; notes: string | null;
};

const POSTURES = ["primary","owned","mirror","shadow","rollback","blocked"];
const postureVariant: Record<string, "default"|"destructive"|"secondary"|"outline"> = {
  primary: "destructive", rollback: "destructive", blocked: "outline",
  owned: "default", mirror: "secondary", shadow: "secondary",
};

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${tone || ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

export function RuntimeExtractionPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [sweepers, setSweepers] = useState<Sweeper[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const [ov, st, fd, sw, ci] = await Promise.all([
        supabase.rpc("runtime_extraction_overview"),
        supabase.from("runtime_extraction_streams").select("*").order("category").order("stream"),
        supabase.from("runtime_hard_dependency_findings").select("*").order("severity", { ascending: false }).order("first_seen_at", { ascending: false }).limit(100),
        supabase.from("runtime_sweeper_registry").select("*").order("sweeper_name"),
        supabase.from("runtime_recovery_circuits").select("*").order("circuit"),
      ]);
      if (ov.error) throw ov.error;
      setOverview(ov.data as any);
      setStreams((st.data as any) || []);
      setFindings((fd.data as any) || []);
      setSweepers((sw.data as any) || []);
      setCircuits((ci.data as any) || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updatePosture = useCallback(async (s: Stream, posture: string) => {
    if (s.rail_guarded && posture !== "primary" && posture !== "rollback") {
      setError(`${s.stream} is rail-guarded — posture change blocked`);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("runtime_extraction_streams")
        .update({ posture, updated_at: new Date().toISOString() })
        .eq("id", s.id);
      if (error) throw error;
      await load();
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }, [load]);

  const runScan = useCallback(async () => {
    setBusy(true);
    try {
      await supabase.functions.invoke("runtime-extraction-router", { body: { op: "scan" } });
      await load();
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }, [load]);

  const closeCircuit = useCallback(async (c: Circuit) => {
    setBusy(true);
    try {
      await supabase.functions.invoke("runtime-extraction-router", {
        body: { op: "circuit", circuit: c.circuit, action: "close" },
      });
      await load();
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Runtime Extraction — Wave 1</h2>
          <p className="text-xs text-muted-foreground">Systematic evacuation of operational workloads off the Lovable-owned primary.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runScan} disabled={busy}>
            <ShieldAlert className="h-4 w-4 mr-1" />Run hard-dep scan
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload
          </Button>
        </div>
      </div>

      {error && <Card className="p-3 border-destructive text-destructive text-sm">{error}</Card>}

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi icon={Database} label="Primary dep" value={`${overview.primary_dependency_pct}%`}
               sub={`${overview.total_streams - overview.evacuated_streams}/${overview.total_streams} streams`}
               tone={overview.primary_dependency_pct > 50 ? "text-destructive" : ""}/>
          <Kpi icon={Activity} label="Independence" value={`${overview.operational_independence_pct}%`}
               sub={`${overview.evacuated_streams} evacuated`}
               tone={overview.operational_independence_pct >= 50 ? "text-emerald-500" : ""}/>
          <Kpi icon={Zap} label="Writes avoided/hr" value={overview.writes_avoided_per_hour.toLocaleString()}
               sub={`primary: ${overview.writes_to_primary_per_hour.toLocaleString()}/hr`}/>
          <Kpi icon={DollarSign} label="Monthly savings" value={`$${overview.projected_monthly_savings_usd}`}
               sub="projected at current rate"/>
          <Kpi icon={ShieldAlert} label="Critical deps" value={overview.critical_dependency_count}
               sub="rail-guarded on primary" tone="text-amber-500"/>
          <Kpi icon={AlertTriangle} label="Unsafe writes" value={overview.unsafe_direct_write_count}
               sub="direct-write findings"
               tone={overview.unsafe_direct_write_count > 0 ? "text-destructive" : ""}/>
        </div>
      )}

      <Card className="overflow-auto">
        <div className="px-4 py-3 border-b border-border font-medium text-sm">Stream registry</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream</TableHead><TableHead>Category</TableHead>
              <TableHead>Posture</TableHead><TableHead>Owner DB</TableHead>
              <TableHead>Confidence</TableHead><TableHead>Est w/hr</TableHead>
              <TableHead>Guarded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.stream}</TableCell>
                <TableCell className="text-xs">{s.category}</TableCell>
                <TableCell>
                  <Select value={s.posture} onValueChange={(v) => updatePosture(s, v)} disabled={busy || s.rail_guarded}>
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSTURES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="font-mono text-xs">{s.owner_db || "—"}</TableCell>
                <TableCell><Badge variant={s.confidence >= 80 ? "default" : "outline"}>{s.confidence}</Badge></TableCell>
                <TableCell className="text-xs">{s.est_writes_per_hour.toLocaleString()}</TableCell>
                <TableCell>
                  {s.rail_guarded
                    ? <Badge variant="destructive">rail</Badge>
                    : s.critical ? <Badge variant="secondary">critical</Badge>
                    : <Badge variant="outline">no</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="overflow-auto">
          <div className="px-4 py-3 border-b border-border font-medium text-sm flex items-center justify-between">
            <span>Hard dependency findings</span>
            <Badge variant="outline">{findings.filter(f=>!f.resolved).length} open</Badge>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Severity</TableHead><TableHead>Kind</TableHead>
              <TableHead>Location</TableHead><TableHead>Detail</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {findings.map((f) => (
                <TableRow key={f.id} className={f.resolved ? "opacity-50" : ""}>
                  <TableCell>
                    <Badge variant={f.severity === "critical" || f.severity === "high" ? "destructive" : "outline"}>{f.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{f.kind}</TableCell>
                  <TableCell className="font-mono text-xs">{f.location}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{f.detail}</TableCell>
                </TableRow>
              ))}
              {findings.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-6">No findings yet — run scan</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-auto">
          <div className="px-4 py-3 border-b border-border font-medium text-sm">Unified sweeper registry</div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Sweeper</TableHead><TableHead>Kind</TableHead>
              <TableHead>Authority</TableHead><TableHead>Target</TableHead>
              <TableHead>Replay</TableHead><TableHead>Enabled</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {sweepers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.sweeper_name}</TableCell>
                  <TableCell className="text-xs">{s.kind}</TableCell>
                  <TableCell className="text-xs">{s.authority_owner}</TableCell>
                  <TableCell className="text-xs">{s.target_db}</TableCell>
                  <TableCell>{s.replay_aware ? <Badge>yes</Badge> : <Badge variant="outline">no</Badge>}</TableCell>
                  <TableCell>{s.enabled ? <Badge>on</Badge> : <Badge variant="outline">off</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card className="overflow-auto">
        <div className="px-4 py-3 border-b border-border font-medium text-sm">Recovery circuits</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Circuit</TableHead><TableHead>State</TableHead>
            <TableHead>Threshold</TableHead><TableHead>Current</TableHead>
            <TableHead>Cools at</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {circuits.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.circuit}</TableCell>
                <TableCell>
                  <Badge variant={c.state === "open" ? "destructive" : c.state === "half_open" ? "secondary" : "default"}>
                    {c.state}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{c.threshold}</TableCell>
                <TableCell className="text-xs">{c.current_count}</TableCell>
                <TableCell className="text-xs">{c.cools_at ? new Date(c.cools_at).toLocaleTimeString() : "—"}</TableCell>
                <TableCell>
                  {c.state !== "closed" && (
                    <Button variant="outline" size="sm" onClick={() => closeCircuit(c)} disabled={busy}>Close</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}