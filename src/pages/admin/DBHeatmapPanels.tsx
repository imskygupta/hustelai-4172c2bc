import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type HeatRow = {
  table_name: string; schema_name: string;
  total_bytes: number; table_bytes: number; index_bytes: number;
  live_rows: number; n_tup_ins: number; n_tup_upd: number; n_tup_del: number;
  seq_scan: number; idx_scan: number;
  owning_module: string | null; cost_bucket: string | null; primary_runtime: string | null;
  is_auth_critical: boolean | null; is_async_safe: boolean | null; realtime_enabled: boolean | null;
  dependent_runtimes: string[] | null;
};

type Rank = {
  rank_position: number | null; table_name: string; total_score: number;
  cost_reduction_score: number; write_intensity: number; migration_safety_score: number;
  realtime_risk: number; rollback_difficulty: number; dependency_count: number;
  cost_bucket: string | null; owning_module: string | null;
  is_auth_critical: boolean | null; is_async_safe: boolean | null; realtime_enabled: boolean | null;
};

type Coupling = { kind: string; target: string; detail: string; severity: string };

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function useHeatmap() {
  const [rows, setRows] = useState<HeatRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.from("v_db_heatmap_latest" as any).select("*");
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { rows, busy, err, load };
}

export function DBHeatmapPanel() {
  const { rows, busy, err, load } = useHeatmap();
  const [running, setRunning] = useState(false);

  const capture = async () => {
    setRunning(true);
    try {
      await supabase.rpc("db_heatmap_capture" as any);
      await supabase.rpc("db_extraction_recompute" as any);
      await load();
    } finally { setRunning(false); }
  };

  const sorted = useMemo(() => [...rows].sort((a, b) => b.total_bytes - a.total_bytes), [rows]);
  const byBucket = useMemo(() => {
    const m = new Map<string, { count: number; bytes: number; writes: number }>();
    for (const r of rows) {
      const k = r.cost_bucket || "unattributed";
      const cur = m.get(k) || { count: 0, bytes: 0, writes: 0 };
      cur.count += 1; cur.bytes += r.total_bytes;
      cur.writes += r.n_tup_ins + r.n_tup_upd + r.n_tup_del;
      m.set(k, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].bytes - a[1].bytes);
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{rows.length} tables tracked</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload</Button>
          <Button size="sm" onClick={capture} disabled={running}><Play className="h-4 w-4 mr-1" />Capture snapshot</Button>
        </div>
      </div>
      {err && <Card className="p-3 border-destructive text-destructive text-sm">{err}</Card>}

      <Card>
        <div className="p-3 font-medium text-sm border-b border-border">Cost buckets</div>
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
          {byBucket.map(([k, v]) => (
            <div key={k} className="border border-border rounded p-2">
              <div className="text-xs font-medium">{k}</div>
              <div className="text-xs text-muted-foreground">{v.count} tables · {fmtBytes(v.bytes)} · {v.writes.toLocaleString()} writes</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm border-b border-border">Top tables by size</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Table</TableHead><TableHead>Size</TableHead><TableHead>Rows</TableHead>
            <TableHead>Ins/Upd/Del</TableHead><TableHead>Seq/Idx</TableHead>
            <TableHead>Bucket</TableHead><TableHead>Module</TableHead><TableHead>Flags</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {sorted.slice(0, 60).map((r) => (
              <TableRow key={r.table_name}>
                <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                <TableCell className="text-xs">{fmtBytes(r.total_bytes)}</TableCell>
                <TableCell className="text-xs">{r.live_rows.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.n_tup_ins}/{r.n_tup_upd}/{r.n_tup_del}</TableCell>
                <TableCell className="text-xs">{r.seq_scan}/{r.idx_scan}</TableCell>
                <TableCell className="text-xs">{r.cost_bucket || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-xs">{r.owning_module || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-xs space-x-1">
                  {r.is_auth_critical && <Badge variant="destructive">auth</Badge>}
                  {r.is_async_safe && <Badge>async</Badge>}
                  {r.realtime_enabled && <Badge variant="secondary">rt</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function QueryPressurePanel() {
  const { rows, busy, err } = useHeatmap();
  const writeSorted = useMemo(() => [...rows].sort((a, b) => (b.n_tup_ins + b.n_tup_upd + b.n_tup_del) - (a.n_tup_ins + a.n_tup_upd + a.n_tup_del)).slice(0, 30), [rows]);
  const readSorted = useMemo(() => [...rows].sort((a, b) => (b.seq_scan + b.idx_scan) - (a.seq_scan + a.idx_scan)).slice(0, 30), [rows]);
  return (
    <div className="space-y-4">
      {err && <Card className="p-3 border-destructive text-destructive text-sm">{err}</Card>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="overflow-auto">
          <div className="p-3 font-medium text-sm border-b border-border">Write-heavy tables</div>
          <Table>
            <TableHeader><TableRow><TableHead>Table</TableHead><TableHead>Total writes</TableHead><TableHead>Bucket</TableHead></TableRow></TableHeader>
            <TableBody>
              {writeSorted.map((r) => (
                <TableRow key={r.table_name}>
                  <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                  <TableCell className="text-xs">{(r.n_tup_ins + r.n_tup_upd + r.n_tup_del).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.cost_bucket || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="overflow-auto">
          <div className="p-3 font-medium text-sm border-b border-border">Read-heavy tables</div>
          <Table>
            <TableHeader><TableRow><TableHead>Table</TableHead><TableHead>Seq scans</TableHead><TableHead>Idx scans</TableHead></TableRow></TableHeader>
            <TableBody>
              {readSorted.map((r) => (
                <TableRow key={r.table_name}>
                  <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                  <TableCell className="text-xs">{r.seq_scan.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.idx_scan.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

export function GrowthTrendsPanel() {
  const [series, setSeries] = useState<{ table_name: string; captured_at: string; total_bytes: number; live_rows: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await supabase
      .from("db_heatmap_snapshots" as any)
      .select("table_name,captured_at,total_bytes,live_rows")
      .gte("captured_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .order("captured_at", { ascending: false })
      .limit(2000);
    setSeries((data as any) || []);
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const trends = useMemo(() => {
    const byTable = new Map<string, typeof series>();
    for (const r of series) {
      const arr = byTable.get(r.table_name) || [];
      arr.push(r); byTable.set(r.table_name, arr);
    }
    const out: { table: string; first: number; last: number; deltaBytes: number; samples: number }[] = [];
    for (const [t, arr] of byTable) {
      const sorted = arr.sort((a, b) => +new Date(a.captured_at) - +new Date(b.captured_at));
      const first = sorted[0].total_bytes;
      const last = sorted[sorted.length - 1].total_bytes;
      out.push({ table: t, first, last, deltaBytes: last - first, samples: sorted.length });
    }
    return out.sort((a, b) => b.deltaBytes - a.deltaBytes).slice(0, 40);
  }, [series]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{series.length} samples (last 14 days)</div>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload</Button>
      </div>
      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm border-b border-border">Top growth (Δ size since first sample)</div>
        <Table>
          <TableHeader><TableRow><TableHead>Table</TableHead><TableHead>First</TableHead><TableHead>Latest</TableHead><TableHead>Δ</TableHead><TableHead>Samples</TableHead></TableRow></TableHeader>
          <TableBody>
            {trends.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No snapshots yet — run a capture from the DB Heatmap tab.</TableCell></TableRow>
            ) : trends.map((t) => (
              <TableRow key={t.table}>
                <TableCell className="font-mono text-xs">{t.table}</TableCell>
                <TableCell className="text-xs">{fmtBytes(t.first)}</TableCell>
                <TableCell className="text-xs">{fmtBytes(t.last)}</TableCell>
                <TableCell className="text-xs">{t.deltaBytes >= 0 ? "+" : ""}{fmtBytes(Math.abs(t.deltaBytes))}</TableCell>
                <TableCell className="text-xs">{t.samples}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function ExtractionCandidatesPanel() {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [coup, setCoup] = useState<Coupling[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    const [r, c] = await Promise.all([
      supabase.from("v_db_extraction_ranking" as any).select("*"),
      supabase.rpc("db_dangerous_couplings" as any),
    ]);
    setRanks((r.data as any) || []);
    setCoup((c.data as any) || []);
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const best = ranks.filter((r) => !r.is_auth_critical).slice(0, 1)[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Best next extraction: <span className="font-mono">{best ? best.table_name : "—"}</span></div>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload</Button>
      </div>

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm border-b border-border">Extraction ranking</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>#</TableHead><TableHead>Table</TableHead><TableHead>Score</TableHead>
            <TableHead>Cost</TableHead><TableHead>Writes</TableHead><TableHead>Safety</TableHead>
            <TableHead>RT risk</TableHead><TableHead>Rollback</TableHead><TableHead>Bucket</TableHead><TableHead>Flags</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {ranks.slice(0, 40).map((r) => (
              <TableRow key={r.table_name}>
                <TableCell className="text-xs">{r.rank_position}</TableCell>
                <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                <TableCell><Badge variant={r.total_score > 60 ? "default" : r.total_score > 30 ? "secondary" : "outline"}>{r.total_score}</Badge></TableCell>
                <TableCell className="text-xs">{r.cost_reduction_score}</TableCell>
                <TableCell className="text-xs">{r.write_intensity}</TableCell>
                <TableCell className="text-xs">{r.migration_safety_score}</TableCell>
                <TableCell className="text-xs">{r.realtime_risk}</TableCell>
                <TableCell className="text-xs">{r.rollback_difficulty}</TableCell>
                <TableCell className="text-xs">{r.cost_bucket || "—"}</TableCell>
                <TableCell className="text-xs space-x-1">
                  {r.is_auth_critical && <Badge variant="destructive">auth</Badge>}
                  {r.is_async_safe && <Badge>async</Badge>}
                  {r.realtime_enabled && <Badge variant="secondary">rt</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="overflow-auto">
        <div className="p-3 font-medium text-sm border-b border-border">Dangerous couplings</div>
        {coup.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No dangerous couplings detected.</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Kind</TableHead><TableHead>Target</TableHead><TableHead>Detail</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader>
            <TableBody>
              {coup.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{c.kind}</TableCell>
                  <TableCell className="font-mono text-xs">{c.target}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.detail}</TableCell>
                  <TableCell><Badge variant={c.severity === "high" ? "destructive" : c.severity === "medium" ? "default" : "outline"}>{c.severity}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export function RealtimeLoadPanel() {
  const [subs, setSubs] = useState<{ table_name: string; schema_name: string; captured_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await supabase
      .from("db_realtime_subscriptions_snapshots" as any)
      .select("*")
      .order("captured_at", { ascending: false })
      .limit(500);
    setSubs((data as any) || []);
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const latest = useMemo(() => {
    const seen = new Set<string>();
    return subs.filter((s) => {
      const k = `${s.schema_name}.${s.table_name}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }, [subs]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{latest.length} tables on `supabase_realtime` publication</div>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload</Button>
      </div>
      <Card className="overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Schema</TableHead><TableHead>Table</TableHead><TableHead>Captured</TableHead></TableRow></TableHeader>
          <TableBody>
            {latest.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No realtime tables (or no snapshot yet).</TableCell></TableRow>
            ) : latest.map((s) => (
              <TableRow key={`${s.schema_name}.${s.table_name}`}>
                <TableCell className="text-xs">{s.schema_name}</TableCell>
                <TableCell className="font-mono text-xs">{s.table_name}</TableCell>
                <TableCell className="text-xs">{new Date(s.captured_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}