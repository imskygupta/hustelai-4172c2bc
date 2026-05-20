// Phase 8F.3 — Boundary Map panel. Renders the authoritative table→DB
// contract from `src/lib/topology/authority-map.ts` so operators can audit
// which DB owns what at a glance. Also surfaces recent router-mismatch
// violations from the Admin DB (via `primary-detox-stats` edge fn).
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  DB_LABEL,
  DB_REFS,
  tablesByAuthority,
  type DbAuthority,
} from "@/lib/topology/authority-map";
import { failOpen, INFRA_SAFE_MODE, retryWithTimeout } from "@/lib/async/timeout";

const DB_TONE: Record<DbAuthority, string> = {
  primary: "destructive",
  admin: "default",
  blogs: "secondary",
  api_ai: "default",
  realtime: "secondary",
  workspace: "outline",
  owned: "outline",
};

export function BoundaryMapPanel() {
  const grouped = tablesByAuthority();
  const [violations, setViolations] = useState<{ table: string; count: number }[]>([]);

  useEffect(() => {
    if (INFRA_SAFE_MODE) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await failOpen(
          () => retryWithTimeout(
            () => supabase.functions.invoke("primary-detox-stats", { method: "GET" }),
            "infra.boundaryMapViolations",
          ),
          { data: { by_table: [] } } as any,
          "infra.boundaryMapViolations",
        );
        if (cancelled) return;
        const rows = (data as any)?.by_table ?? [];
        setViolations(rows.map((r: any) => ({ table: r.table, count: r.count })));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Platform Boundary Map</h3>
            <p className="text-xs text-muted-foreground">
              Authoritative table→DB contract. Any drift triggers a router-mismatch alert.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {Object.values(grouped).reduce((n, a) => n + a.length, 0)} tables tracked
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(grouped) as DbAuthority[]).map((db) => (
            <div key={db} className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={DB_TONE[db] as any}>{DB_LABEL[db]}</Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{DB_REFS[db]}</span>
                </div>
                <span className="text-xs text-muted-foreground">{grouped[db].length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {grouped[db].length === 0 ? (
                  <span className="text-xs text-muted-foreground">no tables</span>
                ) : grouped[db].map((t) => (
                  <code key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t}</code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Router Mismatch · last 24h</h3>
            <p className="text-xs text-muted-foreground">
              {INFRA_SAFE_MODE ? "Infra safe mode enabled; live polling paused." : "Forbidden-cross-DB writes attempted against the primary kernel."}
            </p>
          </div>
          <Badge variant={violations.length === 0 ? "default" : "destructive"}>
            {violations.length === 0 ? "0 drift" : `${violations.length} offenders`}
          </Badge>
        </div>
        {violations.length === 0 ? (
          <p className="text-xs text-muted-foreground">No boundary violations recorded. Topology is clean.</p>
        ) : (
          <div className="space-y-1">
            {violations.slice(0, 10).map((v) => (
              <div key={v.table} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                <code>{v.table}</code>
                <Badge variant="destructive">{v.count}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}