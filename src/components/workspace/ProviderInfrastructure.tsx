import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Layers, Zap, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PROVIDER_DISPLAY } from "@/lib/workspace/toolsCatalog";
import { profileOf, LANE_LABEL } from "@/lib/workspace/tierIntel";
import { PossibilityHint } from "@/components/workspace/PossibilityHint";

/**
 * Provider infrastructure strip — surfaces the workspace as operational
 * infrastructure, not a generator. Reads the user's recent workspace_outputs
 * to derive provider mix + throughput, and frames concurrency / lane by tier.
 *
 * Quiet on purpose. No alarms, no spinners — this is ambient telemetry.
 */
export function ProviderInfrastructure() {
  const { user, profile } = useAuth();
  const tier = profile?.subscription_tier ?? "free";
  const prof = profileOf(tier);
  const [rows, setRows] = useState<Array<{ provider: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const { data } = await (supabase as any)
          .from("workspace_outputs")
          .select("provider, created_at")
          .eq("user_id", user.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200);
        if (!cancelled) setRows((data || []) as any[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = rows.length;
    const today = rows.filter(r => +new Date(r.created_at) > Date.now() - 86_400_000).length;
    const byProvider = new Map<string, number>();
    for (const r of rows) {
      const p = r.provider || "platform";
      byProvider.set(p, (byProvider.get(p) || 0) + 1);
    }
    const mix = Array.from(byProvider.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, count]) => ({
        id,
        label: PROVIDER_DISPLAY[id]?.label || id,
        tint: PROVIDER_DISPLAY[id]?.tint || "border-border bg-muted text-muted-foreground",
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
      }));
    return { total, today, mix };
  }, [rows]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">Provider infrastructure</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight mt-1">Workspace load</h3>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-50/40 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
          <Zap className="h-3 w-3" /> {LANE_LABEL[prof.lane]} · {prof.aiConcurrency}× concurrent
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Gauge} label="Generations · 7d" value={loading ? "—" : String(stats.total)} />
        <Stat icon={Activity} label="Today" value={loading ? "—" : String(stats.today)} />
        <Stat icon={Cpu} label="Providers used" value={loading ? "—" : String(stats.mix.length)} />
        <Stat icon={Layers} label="Memory window" value={prof.memoryDays < 0 ? "Unlimited" : `${prof.memoryDays}d`} />
      </div>

      {/* Provider mix bar */}
      {stats.mix.length > 0 && (
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted flex">
            {stats.mix.map(m => (
              <div
                key={m.id}
                style={{ width: `${m.pct}%` }}
                className="h-full bg-gradient-to-r from-emerald-400/70 to-emerald-500/70 first:rounded-l-full last:rounded-r-full"
                title={`${m.label} · ${m.count}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.mix.map(m => (
              <span key={m.id} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${m.tint}`}>
                <Cpu className="h-2.5 w-2.5" /> {m.label}
                <span className="opacity-60 font-normal ml-0.5">· {m.pct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <PossibilityHint surface="providers" />
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-lg font-bold tracking-tight mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}