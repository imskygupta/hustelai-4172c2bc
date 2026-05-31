import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// U1.5 — Observability cards. Read-only views over usage_events.
export default function UsageObservability() {
  const [loading, setLoading] = useState(true);
  const [byMeter, setByMeter] = useState<any[]>([]);
  const [byTool, setByTool] = useState<any[]>([]);
  const [nearLimit, setNearLimit] = useState<any[]>([]);
  const [topCost, setTopCost] = useState<any[]>([]);
  const [shadowSummary, setShadowSummary] = useState<any[]>([]);
  const [resets, setResets] = useState<any[]>([]);

  useEffect(() => { (async () => {
    const [m, t, n, c, s, r] = await Promise.all([
      (supabase as any).from("v_usage_by_meter").select("*").limit(50),
      (supabase as any).from("v_usage_by_tool").select("*").limit(50),
      (supabase as any).from("v_usage_free_near_upgrade").select("*").limit(50),
      (supabase as any).from("v_usage_top_expensive_tools").select("*").limit(20),
      (supabase as any).from("v_shadow_violation_summary").select("*").limit(50),
      (supabase as any).from("v_usage_reset_preview").select("*"),
    ]);
    setByMeter(m.data ?? []); setByTool(t.data ?? []);
    setNearLimit(n.data ?? []); setTopCost(c.data ?? []);
    setShadowSummary(s.data ?? []); setResets(r.data ?? []);
    setLoading(false);
  })(); }, []);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const totalEvents = byMeter.reduce((s, r) => s + Number(r.events ?? 0), 0);
  const totalShadow = byMeter.reduce((s, r) => s + Number(r.shadow_hits ?? 0), 0);
  const totalCostMicro = byMeter.reduce((s, r) => s + Number(r.cost_micro ?? 0), 0);
  const shadowRate = totalEvents ? ((totalShadow / totalEvents) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Executions (24h)" value={totalEvents.toLocaleString()} />
        <StatCard label="Users near limit" value={String(nearLimit.length)} />
        <StatCard label="Shadow hit rate" value={`${shadowRate}%`} />
        <StatCard label="Provider cost (24h)" value={`$${(totalCostMicro / 1_000_000).toFixed(2)}`} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {resets.map((r) => (
          <Card key={r.period}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{r.period} reset</CardTitle>
              <CardDescription className="text-xs">{new Date(r.window_end).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {formatSeconds(Number(r.seconds_remaining ?? 0))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top consumed tools (24h)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tool</TableHead><TableHead>Meter</TableHead>
              <TableHead className="text-right">Allowed</TableHead>
              <TableHead className="text-right">Shadow</TableHead>
              <TableHead className="text-right">Blocked</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {byTool.slice(0, 20).map((r) => (
                <TableRow key={r.tool_key}>
                  <TableCell className="font-medium"><code className="text-xs">{r.tool_key}</code></TableCell>
                  <TableCell><Badge variant="outline">{r.meter}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{r.allowed}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.shadow_hits}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.blocked}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.units_used}</TableCell>
                  <TableCell className="text-right tabular-nums">${(Number(r.cost_micro ?? 0)/1_000_000).toFixed(4)}</TableCell>
                </TableRow>
              ))}
              {!byTool.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No activity in the last 24h</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top expensive tools (30d)</CardTitle>
            <CardDescription>By provider cost.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tool</TableHead><TableHead className="text-right">Executions</TableHead><TableHead className="text-right">Cost</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topCost.slice(0, 10).map((r) => (
                  <TableRow key={r.tool_key}>
                    <TableCell><code className="text-xs">{r.tool_key}</code></TableCell>
                    <TableCell className="text-right tabular-nums">{r.executions}</TableCell>
                    <TableCell className="text-right tabular-nums">${(Number(r.total_cost_micro ?? 0)/1_000_000).toFixed(4)}</TableCell>
                  </TableRow>
                ))}
                {!topCost.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No cost-tracked executions yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Free users near limit (7d)</CardTitle>
            <CardDescription>≥80% capacity. Upgrade-CTA candidates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead><TableHead>Meter</TableHead><TableHead className="text-right">Used / Max</TableHead><TableHead className="text-right">%</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {nearLimit.slice(0, 10).map((r, i) => (
                  <TableRow key={`${r.user_id}-${r.meter}-${i}`}>
                    <TableCell><code className="text-xs">{String(r.user_id).slice(0,8)}…</code></TableCell>
                    <TableCell><Badge variant="outline">{r.meter}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{r.used}/{r.max_value}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.pct_used}%</TableCell>
                  </TableRow>
                ))}
                {!nearLimit.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No users near limit</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shadow violation summary (24h)</CardTitle>
          <CardDescription>Decisions that would have been blocked under hard enforcement.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tool</TableHead><TableHead>Tier</TableHead><TableHead>Meter</TableHead>
              <TableHead>Stage</TableHead><TableHead className="text-right">Count</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {shadowSummary.map((r, i) => (
                <TableRow key={i}>
                  <TableCell><code className="text-xs">{r.tool_key}</code></TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.tier}</Badge></TableCell>
                  <TableCell>{r.meter}</TableCell>
                  <TableCell><Badge variant="secondary">{r.blocked_stage ?? "—"}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                </TableRow>
              ))}
              {!shadowSummary.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No shadow violations</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader>
      <CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent>
    </Card>
  );
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`;
  return `${h}h ${m}m`;
}