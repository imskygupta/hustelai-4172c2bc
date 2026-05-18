import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, AlertOctagon, CheckCircle2, ShieldAlert } from "lucide-react";

type Overview = {
  incidents: any[];
  sweeps: any[];
  link_state_counts: Record<string, number>;
  explore_deps: any[];
};

function sevBadge(s: string) {
  const map: Record<string, any> = { info: "secondary", warn: "outline", degraded: "default", critical: "destructive" };
  return <Badge variant={map[s] ?? "secondary"}>{s}</Badge>;
}

export function ProductionIncidentsPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("production-incidents", { body: { op: "overview" } });
      if (error) throw error;
      setData(data as Overview);
    } catch (e: any) { setErr(e.message ?? String(e)); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(op: "ack" | "resolve", id: string) {
    await supabase.functions.invoke("production-incidents", { body: { op, id } });
    load();
  }
  async function runAudit() {
    setBusy(true);
    await supabase.functions.invoke("production-audit", { body: {} });
    load();
  }
  async function scanLinks(repair = false) {
    setBusy(true);
    await supabase.functions.invoke("shared-link-repair", { body: { op: repair ? "repair" : "scan", limit: 100 } });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2"><AlertOctagon className="w-5 h-5" /> Production NOC</h3>
          <p className="text-sm text-muted-foreground">Stability plane lives on the OWNED DB (wguuipsikboqqinqeehv). Primary DB is auth/billing/AI only.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>} Refresh</Button>
          <Button size="sm" onClick={runAudit} disabled={busy}>Run Audit</Button>
          <Button size="sm" variant="secondary" onClick={() => scanLinks(false)} disabled={busy}>Scan Links</Button>
          <Button size="sm" variant="secondary" onClick={() => scanLinks(true)} disabled={busy}>Repair Links</Button>
        </div>
      </div>
      {err && <Card className="p-3 border-destructive/40 text-destructive text-sm">{err}</Card>}

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Open Incidents</div>
          <div className="text-2xl font-bold">{data?.incidents.length ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Recent Sweeps</div>
          <div className="text-2xl font-bold">{data?.sweeps.length ?? "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Shared-link States (24h)</div>
          <div className="text-xs mt-1 space-y-0.5">
            {data && Object.entries(data.link_state_counts).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><span className="font-mono">{v}</span></div>
            ))}
            {data && Object.keys(data.link_state_counts).length === 0 && <span className="text-muted-foreground">no data — run a scan</span>}
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-3 py-2 text-sm font-semibold border-b">Active Incidents</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Severity</TableHead><TableHead>Surface</TableHead><TableHead>Component</TableHead>
            <TableHead>Class</TableHead><TableHead>Detected</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data?.incidents ?? []).map((i) => (
              <TableRow key={i.id}>
                <TableCell>{sevBadge(i.severity)}</TableCell>
                <TableCell className="font-mono text-xs">{i.surface}</TableCell>
                <TableCell className="font-mono text-xs">{i.component}</TableCell>
                <TableCell className="text-xs">{i.failure_class ?? "—"}</TableCell>
                <TableCell className="text-xs">{new Date(i.detected_at).toLocaleString()}</TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => act("ack", i.id)}>Ack</Button>
                  <Button size="sm" onClick={() => act("resolve", i.id)}><CheckCircle2 className="w-3.5 h-3.5"/></Button>
                </TableCell>
              </TableRow>
            ))}
            {data && data.incidents.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-4">All clear.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-3 py-2 text-sm font-semibold border-b flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> Latest Runtime Sweeps</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Kind</TableHead><TableHead>Target</TableHead><TableHead>OK</TableHead>
            <TableHead>Latency</TableHead><TableHead>Error</TableHead><TableHead>When</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data?.sweeps ?? []).slice(0, 40).map((s, idx) => (
              <TableRow key={idx}>
                <TableCell className="text-xs">{s.target_kind}</TableCell>
                <TableCell className="font-mono text-xs">{s.target_name}</TableCell>
                <TableCell>{s.ok ? <Badge variant="default">ok</Badge> : <Badge variant="destructive">fail</Badge>}</TableCell>
                <TableCell className="text-xs">{s.latency_ms ?? "—"} ms</TableCell>
                <TableCell className="text-xs">{s.error_class ?? "—"}</TableCell>
                <TableCell className="text-xs">{new Date(s.sampled_at).toLocaleTimeString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-3 py-2 text-sm font-semibold border-b">Explore Dependency Trace</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Kind</TableHead><TableHead>Name</TableHead><TableHead>DB</TableHead>
            <TableHead>Coupling</TableHead><TableHead>Quota-sensitive</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data?.explore_deps ?? []).map((d, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">{d.dep_kind}</TableCell>
                <TableCell className="font-mono text-xs">{d.dep_name}</TableCell>
                <TableCell><Badge variant={d.target_db === "primary" ? "destructive" : "secondary"}>{d.target_db ?? "?"}</Badge></TableCell>
                <TableCell>{d.hard_coupling ? <Badge variant="destructive">hard</Badge> : <Badge variant="outline">soft</Badge>}</TableCell>
                <TableCell>{d.quota_sensitive ? <Badge variant="destructive">yes</Badge> : <Badge variant="secondary">no</Badge>}</TableCell>
              </TableRow>
            ))}
            {data && data.explore_deps.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">No traces yet — seed by running the explore tracer.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}