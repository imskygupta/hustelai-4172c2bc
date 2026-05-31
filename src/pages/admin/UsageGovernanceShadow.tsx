import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";

// U1 shadow-mode admin widget. Shows what authorizeExecution() WOULD have
// blocked in the last 24h per tool, plus the live mode (none/shadow/hard)
// and a quick toggle for the global kill switch.

type Mode = { tool_key: string; mode: "none" | "shadow" | "hard"; enabled: boolean; notes: string | null };
type Row = { tool_key: string; mode: Mode["mode"]; enabled: boolean;
  executions: number; shadow_violations: number; blocked: number;
  by_stage: Record<string, number>; last_seen: string | null };

export default function UsageGovernanceShadow() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [globalOn, setGlobalOn] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: modes }, { data: events }, { data: settings }] = await Promise.all([
      (supabase as any).rpc("list_tool_execution_modes"),
      (supabase as any).from("usage_events")
        .select("capability_key, decision, blocked_stage, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
        .not("capability_key", "is", null)
        .limit(5000),
      (supabase as any).from("auth_settings").select("execution_authorize_enabled").limit(1).maybeSingle(),
    ]);

    setGlobalOn(settings?.execution_authorize_enabled !== false);

    const byTool = new Map<string, Row>();
    for (const m of (modes ?? []) as Mode[]) {
      byTool.set(m.tool_key, {
        tool_key: m.tool_key, mode: m.mode, enabled: m.enabled,
        executions: 0, shadow_violations: 0, blocked: 0,
        by_stage: {}, last_seen: null,
      });
    }
    for (const e of (events ?? []) as any[]) {
      const k = e.capability_key as string;
      if (!k) continue;
      const r = byTool.get(k) ?? {
        tool_key: k, mode: "shadow" as const, enabled: true,
        executions: 0, shadow_violations: 0, blocked: 0, by_stage: {}, last_seen: null,
      };
      r.executions++;
      if (e.decision === "shadow") r.shadow_violations++;
      if (e.decision === "blocked") r.blocked++;
      if (e.blocked_stage) r.by_stage[e.blocked_stage] = (r.by_stage[e.blocked_stage] ?? 0) + 1;
      if (!r.last_seen || r.last_seen < e.created_at) r.last_seen = e.created_at;
      byTool.set(k, r);
    }
    setRows([...byTool.values()].sort((a, b) =>
      (b.shadow_violations + b.blocked) - (a.shadow_violations + a.blocked)
    ));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleGlobal() {
    const next = !globalOn;
    await (supabase as any).from("auth_settings").update({
      execution_authorize_enabled: next,
    }).gt("id", 0);
    setGlobalOn(next);
  }

  async function setMode(tool: string, mode: Mode["mode"]) {
    await (supabase as any).from("tool_execution_modes").upsert({ tool_key: tool, mode });
    await load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Execution Trust — Shadow Results (24h)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Global kill switch:{" "}
              <Badge variant={globalOn ? "default" : "destructive"}>{globalOn ? "ON" : "OFF"}</Badge>
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={toggleGlobal}>
              {globalOn ? "Disable" : "Enable"} global gate
            </Button>
            <Button size="sm" variant="ghost" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No execution events yet. Trigger an AI chat, export, or roadmap to see shadow data appear here.
            </p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Executions</TableHead>
                <TableHead className="text-right">Shadow (would-block)</TableHead>
                <TableHead className="text-right">Hard-blocked</TableHead>
                <TableHead>Top blocking stage</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const topStage = Object.entries(r.by_stage).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <TableRow key={r.tool_key}>
                      <TableCell className="font-mono text-xs">{r.tool_key}</TableCell>
                      <TableCell><Badge variant={r.mode === "hard" ? "destructive" : r.mode === "shadow" ? "secondary" : "outline"}>{r.mode}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{r.executions}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">{r.shadow_violations}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">{r.blocked}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{topStage ? `${topStage[0]} (${topStage[1]})` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.last_seen ? new Date(r.last_seen).toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(["none", "shadow", "hard"] as const).map((m) => (
                            <Button key={m} size="sm" variant={r.mode === m ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setMode(r.tool_key, m)}>
                              {m}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}