// QueuePressure — Mission Control widget summarizing live queue depth, DLQ
// size, archive throughput and retry pressure across ai_jobs, workflow_runs
// and notification_deliveries. Reads `queue_health_overview()` (admin-only).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, RefreshCw, Skull, Archive, Activity } from "lucide-react";

type QueueRow = {
  queue: string;
  depth: number;
  running: number;
  oldest_age_seconds: number;
  succeeded_24h: number;
  failed_24h: number;
  retried_24h: number;
  dlq_size: number;
  archive_24h: number;
};

function fmtAge(s: number): string {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

function pressureTone(row: QueueRow): "ok" | "warn" | "crit" {
  if (row.dlq_size > 25 || row.depth > 500 || row.oldest_age_seconds > 1800) return "crit";
  if (row.dlq_size > 5 || row.depth > 100 || row.oldest_age_seconds > 600) return "warn";
  return "ok";
}

export default function QueuePressure() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    const { data } = await supabase.rpc("queue_health_overview");
    setRows((data as QueueRow[]) ?? []);
    setLoading(false);
  }

  async function runCleanup() {
    setRunning(true);
    try {
      await supabase.functions.invoke("queue-cleanup");
      await load();
    } finally {
      setRunning(false);
    }
  }

  // Cost stabilization: 30s → 120s + visibility-gated.
  useEffect(() => {
    let alive = true;
    void load();
    const tick = () => { if (alive && document.visibilityState === "visible") void load(); };
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    const id = window.setInterval(tick, 120_000);
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const totalDepth = rows.reduce((a, r) => a + Number(r.depth || 0), 0);
  const totalDlq = rows.reduce((a, r) => a + Number(r.dlq_size || 0), 0);
  const totalArchive = rows.reduce((a, r) => a + Number(r.archive_24h || 0), 0);
  const totalRetries = rows.reduce((a, r) => a + Number(r.retried_24h || 0), 0);

  return (
    <Card className="bg-card/40 border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-primary" /> Queue pressure
        </CardTitle>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={runCleanup} disabled={running}>
          <RefreshCw className={`h-3 w-3 ${running ? "animate-spin" : ""}`} /> Run cleanup
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Mini icon={<Activity className="h-3 w-3" />} label="In flight" value={totalDepth} />
              <Mini icon={<RefreshCw className="h-3 w-3" />} label="Retries (24h)" value={totalRetries} tone="warn" />
              <Mini icon={<Archive className="h-3 w-3" />} label="Archived (24h)" value={totalArchive} tone="muted" />
              <Mini icon={<Skull className="h-3 w-3" />} label="Dead letter" value={totalDlq} tone={totalDlq > 0 ? "crit" : "ok"} />
            </div>

            <div className="rounded-md border border-border/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground bg-muted/20">
                  <tr>
                    <th className="text-left p-2 font-medium">Queue</th>
                    <th className="text-right p-2 font-medium">Depth</th>
                    <th className="text-right p-2 font-medium">Running</th>
                    <th className="text-right p-2 font-medium">Oldest</th>
                    <th className="text-right p-2 font-medium">OK 24h</th>
                    <th className="text-right p-2 font-medium">Fail 24h</th>
                    <th className="text-right p-2 font-medium">Retries</th>
                    <th className="text-right p-2 font-medium">Archive</th>
                    <th className="text-right p-2 font-medium">DLQ</th>
                    <th className="text-right p-2 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const tone = pressureTone(r);
                    return (
                      <tr key={r.queue} className="border-t border-border/30 hover:bg-muted/10">
                        <td className="p-2 font-mono">{r.queue}</td>
                        <td className="p-2 text-right tabular-nums">{r.depth}</td>
                        <td className="p-2 text-right tabular-nums text-muted-foreground">{r.running}</td>
                        <td className="p-2 text-right tabular-nums">{fmtAge(r.oldest_age_seconds)}</td>
                        <td className="p-2 text-right tabular-nums text-emerald-400">{r.succeeded_24h}</td>
                        <td className="p-2 text-right tabular-nums text-red-400">{r.failed_24h || ""}</td>
                        <td className="p-2 text-right tabular-nums text-amber-400">{r.retried_24h || ""}</td>
                        <td className="p-2 text-right tabular-nums text-muted-foreground">{r.archive_24h || ""}</td>
                        <td className="p-2 text-right tabular-nums text-red-400 font-medium">{r.dlq_size || ""}</td>
                        <td className="p-2 text-right">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] uppercase ${
                              tone === "crit" ? "border-red-500/40 text-red-400"
                              : tone === "warn" ? "border-amber-500/40 text-amber-400"
                              : "border-emerald-500/40 text-emerald-400"
                            }`}
                          >
                            {tone === "crit" ? "Pressure" : tone === "warn" ? "Watch" : "Healthy"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground/70 font-mono">
              Retention: free 7d · paid 30d · infinity 90d. Cleanup runs hourly via cron.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Mini({
  icon, label, value, tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "warn" | "crit" | "muted" | "ok";
}) {
  const color = {
    default: "text-foreground",
    warn: "text-amber-400",
    crit: "text-red-400",
    muted: "text-muted-foreground",
    ok: "text-emerald-400",
  }[tone];
  return (
    <div className="rounded-md border border-border/40 bg-muted/10 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}