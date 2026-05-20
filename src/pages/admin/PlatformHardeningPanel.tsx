// Phase 9A/9B/9C — Platform Hardening observability panel.
// One-pane operational visibility across all owned DBs:
//   • DB health heartbeats (latency, lag, conns, WAL, queue depth, storage)
//   • Drift findings (forbidden tables, unmapped tables, direct-write violations)
//   • Backup health (last schema/full dump per DB, verify status)
//
// Data sources live on the Admin DB and are populated by:
//   • supabase/functions/platform-drift-scan   → platform_drift_findings
//   • scripts/phase9-backup-dr.sh              → platform_backup_runs
//   • supabase/functions/provider-health-public (heartbeat) → platform_health_snapshots
//
// All reads go through the existing provider-health pattern via edge fn
// `platform-hardening-status`, so the panel never touches the Admin DB
// directly from the browser.
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Shield, Database, HardDrive, AlertTriangle, CheckCircle2 } from "lucide-react";
import { failOpen, INFRA_SAFE_MODE, retryWithTimeout } from "@/lib/async/timeout";

type Finding = { kind: string; detail: string; severity: string; scanned_at: string };
type BackupRun = { db_role: string; kind: string; started_at: string; finished_at: string | null; verify_ok: boolean | null; bytes: number | null };
type HealthSnap = { db_role: string; sampled_at: string; reachable: boolean | null; latency_ms: number | null; replication_lag_ms: number | null; active_connections: number | null; wal_bytes: number | null; queue_depth: number | null; storage_mb: number | null };

const DB_ROLES = ["primary","admin","blogs","api_ai","realtime","workspace","owned"];

const sevTone: Record<string, string> = {
  info: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  critical: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

function fmt(ts: string | null) { return ts ? new Date(ts).toLocaleString() : "—"; }
function ago(ts: string | null) {
  if (!ts) return "—";
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
function bytes(n: number | null) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function PlatformHardeningPanel() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [backups, setBackups] = useState<BackupRun[]>([]);
  const [health, setHealth] = useState<HealthSnap[]>([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [degraded, setDegraded] = useState<string | null>(INFRA_SAFE_MODE ? "Infra safe mode enabled; Phase 9 polling is paused." : null);

  const load = useCallback(async () => {
    if (INFRA_SAFE_MODE) return;
    setBusy(true);
    try {
      setDegraded(null);
      const r = await failOpen(
        () => retryWithTimeout(
          () => supabase.functions.invoke("platform-hardening-status", { body: {} }),
          "infra.platformHardeningStatus",
        ),
        { data: {}, error: new Error("Platform hardening status unavailable") } as any,
        "infra.platformHardeningStatus",
      );
      if ((r as any)?.error) setDegraded((r as any).error.message ?? "Platform hardening status unavailable");
      const d: any = r?.data ?? {};
      setFindings(d.findings ?? []);
      setBackups(d.backups ?? []);
      setHealth(d.health ?? []);
      setUpdatedAt(new Date());
    } finally { setBusy(false); }
  }, []);

  const runScan = useCallback(async () => {
    if (INFRA_SAFE_MODE) return;
    setScanning(true);
    try {
      await failOpen(
        () => retryWithTimeout(() => supabase.functions.invoke("platform-drift-scan", { body: {} }), "infra.platformDriftScan"),
        null,
        "infra.platformDriftScan",
      );
      await load();
    } finally { setScanning(false); }
  }, [load]);

  useEffect(() => {
    if (INFRA_SAFE_MODE) return;
    load();
    const i = setInterval(load, 60_000);
    return () => clearInterval(i);
  }, [load]);

  const latestByRole = new Map<string, HealthSnap>();
  for (const h of health) if (!latestByRole.has(h.db_role)) latestByRole.set(h.db_role, h);
  const lastBackupByRole = new Map<string, BackupRun>();
  for (const b of backups) {
    const k = `${b.db_role}/${b.kind}`;
    if (!lastBackupByRole.has(k)) lastBackupByRole.set(k, b);
  }

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const overall = criticalCount > 0 ? "critical" : findings.some((f) => f.severity === "warning") ? "warning" : "healthy";

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Phase 9 — Platform Hardening</h2>
              <Badge variant="outline" className={sevTone[overall === "healthy" ? "info" : overall]}>
                {overall === "healthy" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                {overall.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {degraded ? degraded : updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Waiting for background refresh…"} ·
              {" "}{criticalCount} critical · {findings.length} total findings
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={busy} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={runScan} disabled={scanning} className="gap-1.5">
              <Shield className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning…" : "Run drift scan"}
            </Button>
          </div>
        </div>
      </Card>

      {/* DB heartbeats */}
      <Card className="overflow-auto">
        <div className="p-3 border-b flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">DB health heartbeats</span>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>DB</TableHead><TableHead>Reachable</TableHead><TableHead>Latency</TableHead>
            <TableHead>Repl lag</TableHead><TableHead>Conns</TableHead>
            <TableHead>WAL</TableHead><TableHead>Queue</TableHead>
            <TableHead>Storage</TableHead><TableHead>Sampled</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {DB_ROLES.map((role) => {
              const h = latestByRole.get(role);
              return (
                <TableRow key={role}>
                  <TableCell className="font-medium">{role}</TableCell>
                  <TableCell>{h ? (h.reachable ? <Badge>up</Badge> : <Badge variant="destructive">down</Badge>) : <Badge variant="outline">—</Badge>}</TableCell>
                  <TableCell className="text-xs">{h?.latency_ms ?? "—"} ms</TableCell>
                  <TableCell className="text-xs">{h?.replication_lag_ms ?? "—"} ms</TableCell>
                  <TableCell className="text-xs">{h?.active_connections ?? "—"}</TableCell>
                  <TableCell className="text-xs">{bytes(h?.wal_bytes ?? null)}</TableCell>
                  <TableCell className="text-xs">{h?.queue_depth ?? "—"}</TableCell>
                  <TableCell className="text-xs">{h?.storage_mb != null ? `${h.storage_mb} MB` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ago(h?.sampled_at ?? null)} ago</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Drift findings */}
      <Card className="overflow-auto">
        <div className="p-3 border-b flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Drift findings (last 7 days)</span>
        </div>
        {findings.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            No drift detected. Topology is stable.
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Severity</TableHead><TableHead>Kind</TableHead>
              <TableHead>Detail</TableHead><TableHead>Scanned</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {findings.slice(0, 50).map((f, i) => (
                <TableRow key={i}>
                  <TableCell><Badge variant="outline" className={sevTone[f.severity] ?? sevTone.info}>{f.severity}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{f.kind}</TableCell>
                  <TableCell className="text-xs">{f.detail}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(f.scanned_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Backup health */}
      <Card className="overflow-auto">
        <div className="p-3 border-b flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Backup + DR status</span>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>DB</TableHead><TableHead>Last schema</TableHead>
            <TableHead>Last full</TableHead><TableHead>Verify</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {DB_ROLES.map((role) => {
              const s = lastBackupByRole.get(`${role}/schema`);
              const f = lastBackupByRole.get(`${role}/full`);
              return (
                <TableRow key={role}>
                  <TableCell className="font-medium">{role}</TableCell>
                  <TableCell className="text-xs">{ago(s?.started_at ?? null)} ago</TableCell>
                  <TableCell className="text-xs">{ago(f?.started_at ?? null)} ago</TableCell>
                  <TableCell>{s?.verify_ok || f?.verify_ok ? <Badge>ok</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}