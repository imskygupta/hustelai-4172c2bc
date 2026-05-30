import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingDown } from "lucide-react";

interface FunnelStep {
  step_order: number;
  step_name: string;
  event_name: string;
  description: string | null;
}

interface StepStat {
  step: FunnelStep;
  uniqueUsers: number;
  totalEvents: number;
}

const RANGE_OPTIONS = [
  { id: "24h",  label: "Last 24h",   hours: 24 },
  { id: "7d",   label: "Last 7d",    hours: 24 * 7 },
  { id: "30d",  label: "Last 30d",   hours: 24 * 30 },
  { id: "all",  label: "All time",   hours: null as number | null },
] as const;

export function ActivationFunnelPanel() {
  const [range, setRange] = useState<typeof RANGE_OPTIONS[number]>(RANGE_OPTIONS[2]);
  const [stats, setStats] = useState<StepStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRouteSample, setLastRouteSample] = useState<Array<{ route: string; count: number }>>([]);
  const [medianMs, setMedianMs] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: steps, error: stepErr } = await (supabase as any)
        .from("analytics_funnel_steps")
        .select("step_order, step_name, event_name, description")
        .eq("funnel_key", "activation_v1")
        .order("step_order", { ascending: true });
      if (stepErr) throw stepErr;

      const sinceIso = range.hours == null
        ? null
        : new Date(Date.now() - range.hours * 3600_000).toISOString();

      const eventNames = (steps || []).map((s: FunnelStep) => s.event_name);
      let rows: Array<{ event_name: string; user_id: string | null; created_at: string }> = [];
      if (eventNames.length) {
        let q: any = (supabase as any)
          .from("analytics_events")
          .select("event_name, user_id, created_at")
          .in("event_name", eventNames)
          .order("created_at", { ascending: true })
          .limit(20000);
        if (sinceIso) q = q.gte("created_at", sinceIso);
        const { data, error: evErr } = await q;
        if (evErr) throw evErr;
        rows = (data || []) as any[];
      }

      const perEvent = new Map<string, { users: Set<string>; total: number; firstTs: Map<string, number> }>();
      for (const ev of eventNames) perEvent.set(ev, { users: new Set(), total: 0, firstTs: new Map() });
      for (const r of rows) {
        const bucket = perEvent.get(r.event_name);
        if (!bucket) continue;
        bucket.total += 1;
        if (r.user_id) {
          bucket.users.add(r.user_id);
          const ts = Date.parse(r.created_at);
          if (!bucket.firstTs.has(r.user_id)) bucket.firstTs.set(r.user_id, ts);
        }
      }

      const computed: StepStat[] = (steps || []).map((s: FunnelStep) => ({
        step: s,
        uniqueUsers: perEvent.get(s.event_name)?.users.size ?? 0,
        totalEvents: perEvent.get(s.event_name)?.total ?? 0,
      }));
      setStats(computed);

      // Median time-to-win: signup_completed → portal_link_created
      const signupFirst = perEvent.get("signup_completed")?.firstTs;
      const portalFirst = perEvent.get("portal_link_created")?.firstTs;
      if (signupFirst && portalFirst && portalFirst.size > 0) {
        const deltas: number[] = [];
        for (const [uid, ts] of portalFirst.entries()) {
          const start = signupFirst.get(uid);
          if (start && ts > start) deltas.push(ts - start);
        }
        if (deltas.length) {
          deltas.sort((a, b) => a - b);
          setMedianMs(deltas[Math.floor(deltas.length / 2)]);
        } else setMedianMs(null);
      } else setMedianMs(null);

      // Last-route distribution (Patch D): where users sit before disappearing
      let routeQ: any = (supabase as any)
        .from("analytics_events")
        .select("route, created_at")
        .eq("event_name", "route_view")
        .not("route", "is", null)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (sinceIso) routeQ = routeQ.gte("created_at", sinceIso);
      const { data: routeRows } = await routeQ;
      const counts = new Map<string, number>();
      for (const r of (routeRows || []) as any[]) {
        const path = (r.route as string).split("?")[0] || "/";
        counts.set(path, (counts.get(path) || 0) + 1);
      }
      const top = Array.from(counts.entries())
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
      setLastRouteSample(top);
    } catch (e: any) {
      setError(e?.message || "Failed to load funnel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range.id]);

  const top = stats[0]?.uniqueUsers || 0;

  const fmtDuration = (ms: number) => {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 48) return `${h}h`;
    return `${Math.round(h / 24)}d`;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card/40 border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">activation_v1</div>
            <h3 className="text-lg font-semibold">Activation Funnel · live from analytics_events</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border/50 overflow-hidden">
              {RANGE_OPTIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-xs ${range.id === r.id ? "bg-emerald-500/10 text-emerald-300" : "text-muted-foreground hover:text-foreground"}`}
                >{r.label}</button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 mb-3">Error: {error}</div>
        )}

        <div className="space-y-2">
          {stats.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground p-4 text-center">
              No funnel steps defined.
            </div>
          )}
          {stats.map((s, i) => {
            const prev = i > 0 ? stats[i - 1].uniqueUsers : top;
            const conv = prev > 0 ? (s.uniqueUsers / prev) * 100 : 0;
            const fromTop = top > 0 ? (s.uniqueUsers / top) * 100 : 0;
            const drop = i > 0 && prev > 0 ? 100 - conv : 0;
            return (
              <div key={s.step.step_order} className="rounded-md border border-border/40 bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground tabular-nums w-6">#{s.step.step_order}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.step.step_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{s.step.event_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {i > 0 && drop > 20 && (
                      <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">
                        <TrendingDown className="h-3 w-3 mr-1" /> -{drop.toFixed(0)}%
                      </Badge>
                    )}
                    <div className="text-right">
                      <div className="text-lg font-semibold tabular-nums">{s.uniqueUsers}</div>
                      <div className="text-[10px] text-muted-foreground">users · {s.totalEvents} events</div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-violet-500"
                    style={{ width: `${Math.max(2, fromTop)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{conv.toFixed(1)}% from previous step</span>
                  <span className="text-[10px] text-muted-foreground">{fromTop.toFixed(1)}% of top</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-3 bg-background/40 border-border/40">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Top of funnel</div>
            <div className="text-xl font-semibold tabular-nums">{top}</div>
            <div className="text-[10px] text-muted-foreground">unique users in window</div>
          </Card>
          <Card className="p-3 bg-background/40 border-border/40">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">End-to-end</div>
            <div className="text-xl font-semibold tabular-nums">
              {top > 0 ? `${(((stats[stats.length - 1]?.uniqueUsers || 0) / top) * 100).toFixed(2)}%` : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">signup_started → payment_recorded</div>
          </Card>
          <Card className="p-3 bg-background/40 border-border/40">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Median time-to-portal</div>
            <div className="text-xl font-semibold tabular-nums">
              {medianMs == null ? "—" : fmtDuration(medianMs)}
            </div>
            <div className="text-[10px] text-muted-foreground">signup_completed → portal_link_created</div>
          </Card>
        </div>
      </Card>

      <Card className="p-4 bg-card/40 border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">route_view</div>
            <h3 className="text-lg font-semibold">Where users sit (last 2,000 route views)</h3>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">Patch D</Badge>
        </div>
        {lastRouteSample.length === 0 ? (
          <div className="text-sm text-muted-foreground p-3 text-center">
            No route_view events yet — the tracker has just been wired. Data will accrue as users navigate.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lastRouteSample.map(r => (
              <div key={r.route} className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-3 py-2">
                <span className="text-xs font-mono truncate mr-2">{r.route}</span>
                <span className="text-sm tabular-nums">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default ActivationFunnelPanel;