import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

type Node = { id: string; node_key: string; node_type: string; display_name: string; owner: string; criticality: string; runtime: string | null; db_dependency: string | null; failure_impact: string | null; extraction_state: string; current_authority: string | null; last_heartbeat_at: string | null; is_active: boolean };
type Edge = { id: string; source_key: string; target_key: string; relation: string; criticality: string; notes: string | null };
type Blast = { node_key: string; direct_dependents: number; transitive_dependents: number; auth_impact: boolean; export_impact: boolean; ai_impact: boolean; billing_impact: boolean; notification_impact: boolean; user_facing_severity: string; affected_keys: string[]; computed_at: string };
type Sim = { id: string; scenario: string; target_node_key: string | null; predicted_impact: any; rollback_correct: boolean | null; replay_recovered: boolean | null; queue_pressure_pct: number | null; duplicate_exec_prevented: boolean | null; latency_impact_ms: number | null; dry_run: boolean; started_at: string; finished_at: string | null; notes: string | null };
type Finding = { id: string; finding_type: string; severity: string; source_kind: string | null; source_name: string | null; evidence: string | null; recommendation: string | null; status: string; detected_at: string };
type Forecast = { id: string; target_kind: string; target_name: string; rollback_difficulty: number; replay_risk: number; realtime_impact: number; auth_coupling: number; queue_instability: number; estimated_savings_pct: number; blast_radius: number; recommendation: string | null };
type Score = { id: string; operational_independence_pct: number; single_point_dependency_pct: number; recovery_readiness_pct: number; replay_resilience_pct: number; extraction_safety_pct: number; infra_fragmentation_pct: number; runtime_confidence_pct: number; overall_score: number; captured_at: string };

const sevColor: Record<string, any> = { high: "destructive", medium: "default", low: "secondary" };

export function TopologyGraphPanel() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    const [n, e] = await Promise.all([
      supabase.from("topology_nodes" as any).select("*").order("node_type").order("display_name"),
      supabase.from("topology_edges" as any).select("*").order("source_key"),
    ]);
    setNodes(((n.data as any) || []) as Node[]);
    setEdges(((e.data as any) || []) as Edge[]);
    setBusy(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const byType = nodes.reduce<Record<string, Node[]>>((acc, n) => { (acc[n.node_type] ||= []).push(n); return acc; }, {});
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(byType).map(([t, arr]) => (
          <Card key={t} className="p-4">
            <div className="font-medium mb-2 capitalize">{t} <span className="text-muted-foreground text-xs">({arr.length})</span></div>
            <ul className="text-xs space-y-2">
              {arr.map((n) => (
                <li key={n.id} className="border-b border-border/40 pb-2 last:border-b-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{n.display_name}</span>
                    <Badge variant={n.criticality === "critical" ? "destructive" : n.criticality === "operational" ? "default" : "secondary"}>{n.criticality}</Badge>
                  </div>
                  <div className="text-muted-foreground">owner: {n.owner} · state: {n.extraction_state}</div>
                  <div className="text-muted-foreground">authority: {n.current_authority || "—"} · runtime: {n.runtime || "—"}</div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Card className="p-4 overflow-auto">
        <div className="font-medium mb-2">Edges ({edges.length})</div>
        <Table>
          <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>→</TableHead><TableHead>Target</TableHead><TableHead>Relation</TableHead><TableHead>Criticality</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
          <TableBody>
            {edges.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.source_key}</TableCell>
                <TableCell>→</TableCell>
                <TableCell className="font-mono text-xs">{e.target_key}</TableCell>
                <TableCell><Badge variant="outline">{e.relation}</Badge></TableCell>
                <TableCell><Badge variant={e.criticality === "critical" ? "destructive" : "secondary"}>{e.criticality}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function BlastRadiusPanel() {
  const [rows, setRows] = useState<Blast[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("topology_blast_radius" as any).select("*").order("direct_dependents", { ascending: false });
    setRows(((data as any) || []) as Blast[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  const recompute = async () => {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc("topology_compute_blast_radius" as any);
    setMsg(error ? error.message : `Recomputed ${data} nodes`);
    await load();
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Per-node blast radius (auth/export/AI/billing/notification impact).</div>
        <Button size="sm" onClick={recompute} disabled={busy}>{busy ? "Computing…" : "Recompute"}</Button>
      </div>
      {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
      <Card className="overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Node</TableHead><TableHead>Dependents</TableHead><TableHead>Severity</TableHead><TableHead>Impacts</TableHead><TableHead>Affected</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.node_key}>
                <TableCell className="font-mono text-xs">{r.node_key}</TableCell>
                <TableCell>{r.direct_dependents}</TableCell>
                <TableCell><Badge variant={sevColor[r.user_facing_severity]}>{r.user_facing_severity}</Badge></TableCell>
                <TableCell className="text-xs space-x-1">
                  {r.auth_impact && <Badge variant="destructive">auth</Badge>}
                  {r.billing_impact && <Badge variant="destructive">billing</Badge>}
                  {r.export_impact && <Badge variant="default">export</Badge>}
                  {r.ai_impact && <Badge variant="default">ai</Badge>}
                  {r.notification_impact && <Badge variant="secondary">notif</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{r.affected_keys.join(", ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function FailureSimulationPanel() {
  const [sims, setSims] = useState<Sim[]>([]);
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState("owned-db-unavailable");
  const [target, setTarget] = useState("db:owned-telemetry");
  const load = useCallback(async () => {
    const { data } = await supabase.from("topology_outage_simulations" as any).select("*").order("started_at", { ascending: false }).limit(50);
    setSims(((data as any) || []) as Sim[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  const run = async () => {
    setBusy(true);
    await supabase.functions.invoke("topology-simulate-outage", { body: { scenario, target_node_key: target } });
    await load();
    setBusy(false);
  };
  const scenarios = [
    "owned-db-unavailable", "railway-worker-unavailable", "replay-queue-jam",
    "telegram-failure", "edge-timeout", "cron-duplication", "stale-leases", "realtime-disconnect",
  ];
  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <div className="font-medium">Run controlled dry-run simulation</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className="px-3 py-2 rounded-md border border-input bg-background text-sm" value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {scenarios.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="target node_key" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Button size="sm" onClick={run} disabled={busy}>{busy ? "Simulating…" : "Simulate (dry-run)"}</Button>
        </div>
        <div className="text-xs text-muted-foreground">Simulations are descriptive only; no production writes are affected.</div>
      </Card>
      <Card className="overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Scenario</TableHead><TableHead>Target</TableHead><TableHead>Rollback</TableHead><TableHead>Replay</TableHead><TableHead>Queue%</TableHead><TableHead>Dup prev.</TableHead><TableHead>Latency</TableHead><TableHead>Started</TableHead></TableRow></TableHeader>
          <TableBody>
            {sims.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs">{s.scenario}</TableCell>
                <TableCell className="font-mono text-xs">{s.target_node_key || "—"}</TableCell>
                <TableCell>{s.rollback_correct == null ? "—" : <Badge variant={s.rollback_correct ? "default" : "destructive"}>{s.rollback_correct ? "ok" : "fail"}</Badge>}</TableCell>
                <TableCell>{s.replay_recovered == null ? "—" : <Badge variant={s.replay_recovered ? "default" : "destructive"}>{s.replay_recovered ? "ok" : "fail"}</Badge>}</TableCell>
                <TableCell className="text-xs">{s.queue_pressure_pct ?? "—"}</TableCell>
                <TableCell>{s.duplicate_exec_prevented == null ? "—" : <Badge variant={s.duplicate_exec_prevented ? "default" : "destructive"}>{s.duplicate_exec_prevented ? "yes" : "no"}</Badge>}</TableCell>
                <TableCell className="text-xs">{s.latency_impact_ms ?? "—"} ms</TableCell>
                <TableCell className="text-xs">{new Date(s.started_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function CouplingFindingsPanel() {
  const [rows, setRows] = useState<Finding[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("topology_coupling_findings" as any).select("*").order("detected_at", { ascending: false });
    setRows(((data as any) || []) as Finding[]);
  })(); }, []);
  return (
    <Card className="overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Severity</TableHead><TableHead>Source</TableHead><TableHead>Evidence</TableHead><TableHead>Recommendation</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs"><Badge variant="outline">{r.finding_type}</Badge></TableCell>
              <TableCell><Badge variant={sevColor[r.severity]}>{r.severity}</Badge></TableCell>
              <TableCell className="text-xs">{r.source_kind}: <span className="font-mono">{r.source_name}</span></TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-md">{r.evidence}</TableCell>
              <TableCell className="text-xs">{r.recommendation}</TableCell>
              <TableCell><Badge variant={r.status === "open" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function ExtractionForecastPanel() {
  const [rows, setRows] = useState<Forecast[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("topology_extraction_forecasts" as any).select("*").order("estimated_savings_pct", { ascending: false });
    setRows(((data as any) || []) as Forecast[]);
  })(); }, []);
  return (
    <Card className="overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Target</TableHead><TableHead>Rollback diff</TableHead><TableHead>Replay risk</TableHead><TableHead>RT impact</TableHead><TableHead>Auth coupling</TableHead><TableHead>Queue inst.</TableHead><TableHead>Savings %</TableHead><TableHead>Blast</TableHead><TableHead>Rec.</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{r.target_kind}: <span className="font-mono">{r.target_name}</span></TableCell>
              <TableCell>{r.rollback_difficulty}</TableCell>
              <TableCell>{r.replay_risk}</TableCell>
              <TableCell>{r.realtime_impact}</TableCell>
              <TableCell>{r.auth_coupling}</TableCell>
              <TableCell>{r.queue_instability}</TableCell>
              <TableCell className="font-medium">{Number(r.estimated_savings_pct).toFixed(1)}%</TableCell>
              <TableCell>{r.blast_radius}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-xs">{r.recommendation}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-xs text-muted-foreground text-center py-4">No forecasts yet — run a simulation or extraction recompute.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

export function StabilityScorePanel() {
  const [rows, setRows] = useState<Score[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("topology_stability_scores" as any).select("*").order("captured_at", { ascending: false }).limit(20);
    setRows(((data as any) || []) as Score[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  const snap = async () => {
    setBusy(true);
    await supabase.rpc("stability_score_snapshot" as any);
    await load();
    setBusy(false);
  };
  const latest = rows[0];
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Global self-awareness score (rolling history).</div>
        <Button size="sm" onClick={snap} disabled={busy}>{busy ? "Snapshotting…" : "Snapshot now"}</Button>
      </div>
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Overall", latest.overall_score],
            ["Op. independence", latest.operational_independence_pct],
            ["Single-point dep.", latest.single_point_dependency_pct],
            ["Recovery readiness", latest.recovery_readiness_pct],
            ["Replay resilience", latest.replay_resilience_pct],
            ["Extraction safety", latest.extraction_safety_pct],
            ["Infra fragmentation", latest.infra_fragmentation_pct],
            ["Runtime confidence", latest.runtime_confidence_pct],
          ].map(([label, val]) => (
            <Card key={label as string} className="p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-semibold">{Number(val).toFixed(1)}%</div>
            </Card>
          ))}
        </div>
      )}
      <Card className="overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Captured</TableHead><TableHead>Overall</TableHead><TableHead>Op-Indep</TableHead><TableHead>SPD</TableHead><TableHead>Recovery</TableHead><TableHead>Replay</TableHead><TableHead>Extr-Safe</TableHead><TableHead>Frag</TableHead><TableHead>Confidence</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.captured_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{Number(r.overall_score).toFixed(1)}</TableCell>
                <TableCell>{Number(r.operational_independence_pct).toFixed(1)}</TableCell>
                <TableCell>{Number(r.single_point_dependency_pct).toFixed(1)}</TableCell>
                <TableCell>{Number(r.recovery_readiness_pct).toFixed(1)}</TableCell>
                <TableCell>{Number(r.replay_resilience_pct).toFixed(1)}</TableCell>
                <TableCell>{Number(r.extraction_safety_pct).toFixed(1)}</TableCell>
                <TableCell>{Number(r.infra_fragmentation_pct).toFixed(1)}</TableCell>
                <TableCell>{Number(r.runtime_confidence_pct).toFixed(1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}