// Phase 8A — Primary Detox Status admin card.
//
// Live read-out of `runtime_direct_write_violations` (Admin DB) via the
// `primary-detox-stats` edge fn. Shows whether the 24h zero-violation soak
// is clean enough to proceed to Phase 8B (physical DROP TABLE of extracted
// tables from the primary auth/billing kernel).
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PRIMARY_FORBIDDEN_TABLES } from "@/integrations/supabase/primary-guard";
import { failOpen, INFRA_SAFE_MODE, retryWithTimeout } from "@/lib/async/timeout";

type Stats = {
  ok: boolean;
  total: number;
  violations_per_hour: number;
  realtime_attempts: number;
  by_table: { table: string; count: number }[];
  by_path: { path: string; count: number }[];
  per_hour: { hour: string; count: number }[];
  recent: { table_name: string; path: string; reported_at: string }[];
  error?: string;
};

export function PrimaryDetoxStatusPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (INFRA_SAFE_MODE) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await failOpen(
        () => retryWithTimeout(
          () => supabase.functions.invoke("primary-detox-stats", { method: "GET" }),
          "infra.primaryDetoxStats",
        ),
        { data: null, error: new Error("Primary detox stats unavailable") } as any,
        "infra.primaryDetoxStats",
      );
      if (error) throw error;
      setStats(data as Stats);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (INFRA_SAFE_MODE) return;
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const clean = stats && stats.total === 0;
  const forbiddenCount = PRIMARY_FORBIDDEN_TABLES.size;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {clean ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          )}
          <h2 className="text-lg font-semibold">Primary Detox Status</h2>
          <Badge variant={clean ? "default" : "destructive"}>
            {clean ? "24h SOAK CLEAN" : `${stats?.total ?? "?"} violations / 24h`}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {err}
        </div>
      )}

      {INFRA_SAFE_MODE && (
        <div className="text-sm text-muted-foreground rounded-md border p-3">
          Infra safe mode is enabled. Detox polling is paused and this widget is running degraded.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Violations / hr" value={stats?.violations_per_hour ?? "—"} />
        <Metric label="Realtime attempts" value={stats?.realtime_attempts ?? "—"} />
        <Metric label="Forbidden tables" value={forbiddenCount} />
        <Metric
          label="Soak status"
          value={clean ? "READY for 8B" : "BLOCKED"}
          tone={clean ? "good" : "warn"}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Top forbidden-table attempts (24h)</h3>
        {stats?.by_table?.length ? (
          <div className="space-y-1 text-sm">
            {stats.by_table.map((r) => (
              <div key={r.table} className="flex justify-between font-mono">
                <span className="truncate">{r.table}</span>
                <Badge variant="outline">{r.count}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No forbidden-table access attempts in the last 24h. ✓
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Top offending paths</h3>
        {stats?.by_path?.length ? (
          <div className="space-y-1 text-sm">
            {stats.by_path.map((r) => (
              <div key={r.path} className="flex justify-between">
                <span className="truncate font-mono">{r.path}</span>
                <Badge variant="outline">{r.count}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No offending paths recorded.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Source: <code>runtime_direct_write_violations</code> on the Admin DB
        (rqqiujmiagauzohdqjmi). Reported by <code>primary-guard.ts</code> and
        edge <code>wrapPrimary()</code>. When this card reads 0 violations for
        24h, run step 2 of <code>scripts/primary-detox.sql</code> to drop
        extracted tables from the primary kernel.
      </p>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-semibold ${
          tone === "good" ? "text-green-500" : tone === "warn" ? "text-amber-500" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default PrimaryDetoxStatusPanel;