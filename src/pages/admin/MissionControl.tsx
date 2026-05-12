// Mission Control — operational intelligence for HustleAI ops.
// Dark ops aesthetic: actionable, realtime-feeling, infra-focused.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, AlertTriangle, ArrowDownRight, CircleDollarSign, Flame,
  Gauge, Sparkles, TrendingDown, TrendingUp, Zap, CheckCircle2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QueuePressure from "@/components/admin/QueuePressure";

type FunnelRow = {
  step_order: number;
  step_name: string;
  event_name: string;
  users: number;
  events: number;
  conversion_pct: number;
};

type CapRow = {
  capability: string;
  opens: number;
  generations: number;
  quota_hits: number;
  unlock_prompts: number;
  unlock_purchases: number;
  upgrade_clicks: number;
  rage_signals: number;
  cost_micro: number;
};

type Alert = {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string | null;
  capability: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

const RANGES = [
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
] as const;

function fmtMicro(v: number) {
  return `₹${(v / 1_000_000).toFixed(2)}`;
}

export default function MissionControl() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [caps, setCaps] = useState<CapRow[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - range.hours * 3600_000).toISOString();
    const [f, c, a] = await Promise.all([
      supabase.rpc("analytics_funnel_summary", { _funnel_key: "monetization", _since: since }),
      supabase.rpc("analytics_capability_breakdown", { _since: since }),
      supabase.rpc("intelligence_open_alerts", { _limit: 50 }),
    ]);
    setFunnel((f.data as FunnelRow[]) ?? []);
    setCaps((c.data as CapRow[]) ?? []);
    setAlerts((a.data as Alert[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.key]);

  async function ack(id: string) {
    await supabase.rpc("ack_intelligence_alert", { _id: id });
    setAlerts((prev) => prev.filter((x) => x.id !== id));
  }

  const totalCost = caps.reduce((acc, c) => acc + Number(c.cost_micro || 0), 0);
  const totalOpens = caps.reduce((acc, c) => acc + Number(c.opens || 0), 0);
  const totalQuotaHits = caps.reduce((acc, c) => acc + Number(c.quota_hits || 0), 0);
  const totalUnlockBuys = caps.reduce((acc, c) => acc + Number(c.unlock_purchases || 0), 0);
  const conv = funnel.length ? funnel[funnel.length - 1].conversion_pct : 0;

  return (
    <div className="min-h-screen bg-[hsl(220_18%_8%)] text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Mission Control</h1>
              <p className="text-xs text-muted-foreground">Usage intelligence · Cost · Conversion · Alerts</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-md border border-border/50 p-0.5 bg-muted/20">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={range.key === r.key ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setRange(r)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<Gauge className="h-3.5 w-3.5" />} label="Tool opens" value={totalOpens.toLocaleString()} />
          <Kpi icon={<TrendingDown className="h-3.5 w-3.5" />} label="Quota hits" value={totalQuotaHits.toLocaleString()} accent="warning" />
          <Kpi icon={<Sparkles className="h-3.5 w-3.5" />} label="Unlock buys" value={totalUnlockBuys.toLocaleString()} accent="success" />
          <Kpi icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="Infra cost" value={fmtMicro(totalCost)} accent="muted" />
        </div>

        <Tabs defaultValue="funnel" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/50">
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="heatmap">Capability heatmap</TabsTrigger>
            <TabsTrigger value="queues">Queues</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              Alerts
              {alerts.length > 0 && <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">{alerts.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Funnel */}
          <TabsContent value="funnel">
            <Card className="bg-card/40 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>free → quota → unlock → upgrade</span>
                  <Badge variant="outline" className="font-mono text-[10px]">end-to-end {conv}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <Skeleton className="h-40" />
                ) : funnel.length === 0 ? (
                  <Empty label="No funnel data yet for this window." />
                ) : (
                  funnel.map((s, i) => {
                    const widthPct = Math.max(2, Math.min(100, s.conversion_pct));
                    return (
                      <div key={s.event_name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-mono">{i + 1}.</span>
                          <span className="flex-1 ml-2 truncate">{s.step_name}</span>
                          <span className="font-mono text-muted-foreground">{s.users.toLocaleString()} users</span>
                          <span className="ml-3 font-medium tabular-nums w-12 text-right">{s.conversion_pct}%</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Heatmap */}
          <TabsContent value="heatmap">
            <Card className="bg-card/40 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Capability heatmap</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4"><Skeleton className="h-64" /></div>
                ) : caps.length === 0 ? (
                  <Empty label="No capability events tracked yet." />
                ) : (
                  <ScrollArea className="h-[480px]">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur">
                        <tr>
                          <th className="text-left p-2 font-medium">Capability</th>
                          <th className="text-right p-2 font-medium">Opens</th>
                          <th className="text-right p-2 font-medium">Generated</th>
                          <th className="text-right p-2 font-medium">Quota</th>
                          <th className="text-right p-2 font-medium">Unlocks</th>
                          <th className="text-right p-2 font-medium">Upgrades</th>
                          <th className="text-right p-2 font-medium">Rage</th>
                          <th className="text-right p-2 font-medium">Cost</th>
                          <th className="text-right p-2 font-medium">Conv.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caps.map((c) => {
                          const promptToBuy =
                            c.unlock_prompts > 0 ? Math.round((c.unlock_purchases / c.unlock_prompts) * 100) : 0;
                          return (
                            <tr key={c.capability} className="border-b border-border/30 hover:bg-muted/10">
                              <td className="p-2 font-mono">{c.capability}</td>
                              <td className="p-2 text-right tabular-nums">{c.opens}</td>
                              <td className="p-2 text-right tabular-nums">{c.generations}</td>
                              <td className="p-2 text-right tabular-nums text-amber-400">{c.quota_hits || ""}</td>
                              <td className="p-2 text-right tabular-nums text-emerald-400">{c.unlock_purchases || ""}</td>
                              <td className="p-2 text-right tabular-nums">{c.upgrade_clicks || ""}</td>
                              <td className="p-2 text-right tabular-nums text-red-400">{c.rage_signals || ""}</td>
                              <td className="p-2 text-right tabular-nums text-muted-foreground">{fmtMicro(c.cost_micro)}</td>
                              <td className="p-2 text-right tabular-nums">{promptToBuy ? `${promptToBuy}%` : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queues */}
          <TabsContent value="queues">
            <QueuePressure />
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts">
            <Card className="bg-card/40 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Operational alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <Skeleton className="h-40" />
                ) : alerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> All systems nominal.
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border/50 p-3 flex items-start gap-3 bg-muted/10">
                      <div className={`h-7 w-7 rounded-md grid place-items-center shrink-0 ${
                        a.severity === "critical" ? "bg-red-500/15 text-red-400"
                        : a.severity === "warning" ? "bg-amber-500/15 text-amber-400"
                        : "bg-primary/10 text-primary"
                      }`}>
                        {a.severity === "critical" ? <Flame className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">{a.kind}</Badge>
                          {a.capability && <Badge variant="secondary" className="font-mono text-[10px]">{a.capability}</Badge>}
                        </div>
                        {a.message && <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>}
                        <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => ack(a.id)}>Acknowledge</Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Kpi({
  icon, label, value, accent = "default",
}: { icon: React.ReactNode; label: string; value: string; accent?: "default" | "warning" | "success" | "muted" }) {
  const tone = {
    default: "text-foreground",
    warning: "text-amber-400",
    success: "text-emerald-400",
    muted: "text-muted-foreground",
  }[accent];
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">
      <Zap className="h-5 w-5 mx-auto mb-2 opacity-40" />
      {label}
    </div>
  );
}