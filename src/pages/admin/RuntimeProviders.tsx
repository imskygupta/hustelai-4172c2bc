import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Power, RefreshCw, Zap, AlertTriangle, CheckCircle2, XCircle, Pause, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchProviderHealth, type ProviderHealth } from "@/lib/aiProviderRouter";

type FallbackRow = {
  id: string;
  original_provider: string;
  replacement_provider: string | null;
  reason: string;
  feature: string | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export default function RuntimeProviders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [fallbacks, setFallbacks] = useState<FallbackRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/imskygupta-admin"); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      if (!data) navigate("/");
    })();
  }, [user, loading, navigate]);

  const refresh = async () => {
    const h = await fetchProviderHealth();
    setProviders(h);
    const { data } = await (supabase as any)
      .from("api_provider_fallback_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    setFallbacks((data as FallbackRow[]) ?? []);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("provider-health-check", { body: { trigger: "manual" } });
      if (error) throw error;
      toast({ title: "Health check ran", description: "Latest results loaded." });
      await refresh();
    } catch (e: any) {
      toast({ title: "Health check failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const toggleManual = async (p: ProviderHealth) => {
    setBusy(p.provider);
    try {
      const next = !p.manually_disabled;
      const { error } = await (supabase as any)
        .from("api_provider_health")
        .update({
          manually_disabled: next,
          status: next ? "disabled" : "unknown",
          disabled_until: next ? null : null,
        })
        .eq("provider", p.provider);
      if (error) throw error;
      toast({ title: `${p.provider}: ${next ? "Disabled" : "Re-enabled"}` });
      await refresh();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    const healthy = providers.filter((p) => p.status === "healthy").length;
    const degraded = providers.filter((p) => p.status === "degraded").length;
    const down = providers.filter((p) => p.status === "unhealthy" || p.status === "disabled").length;
    const avgLatency = providers.length
      ? Math.round(providers.reduce((s, p) => s + (p.latency_ms ?? 0), 0) / providers.length)
      : 0;
    return { healthy, degraded, down, avgLatency };
  }, [providers]);

  if (loading || isAdmin === null) {
    return <div className="min-h-screen bg-[#07090d] grid place-items-center text-zinc-500 text-sm">Loading…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-7 w-7 rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30 grid place-items-center">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
            </span>
            AI Provider Health
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/runtime")} className="border-white/10 text-zinc-300">
              ← Runtime
            </Button>
            <Button size="sm" onClick={runHealthCheck} disabled={running} className="bg-emerald-500 hover:bg-emerald-600 text-black">
              <Zap className="h-3.5 w-3.5 mr-1.5" /> {running ? "Checking…" : "Run check"}
            </Button>
            <Button size="sm" variant="outline" onClick={refresh} className="border-white/10 text-zinc-300">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Healthy" value={String(stats.healthy)} tone="emerald" />
          <Stat label="Degraded" value={String(stats.degraded)} tone="amber" />
          <Stat label="Down / Disabled" value={String(stats.down)} tone="red" />
          <Stat label="Avg latency" value={`${stats.avgLatency} ms`} tone="zinc" />
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Providers</h2>
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015]">
            {providers.length === 0 && (
              <div className="p-6 text-sm text-zinc-500">No providers recorded yet. Run a check.</div>
            )}
            {providers.map((p) => {
              const cooldown = p.disabled_until && new Date(p.disabled_until) > new Date();
              return (
                <div key={p.provider} className="px-4 py-4 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 md:col-span-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={p.status} />
                      <span className="text-sm font-semibold text-white capitalize">{p.provider}</span>
                      <Badge variant="outline" className={statusClass(p.status)}>{p.status}</Badge>
                    </div>
                    {p.last_check_at && (
                      <div className="text-[11px] text-zinc-500 mt-1">
                        last check {new Date(p.last_check_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  <Cell label="Latency" value={p.latency_ms != null ? `${p.latency_ms} ms` : "—"} />
                  <Cell label="Success" value={`${Number(p.success_rate ?? 0).toFixed(1)}%`} />
                  <Cell label="Fails" value={String(p.consecutive_failures)} />
                  <Cell label="Tokens 24h" value={p.tokens_used_24h?.toLocaleString() ?? "0"} />
                  <Cell label="Cost (USD)" value={`$${Number(p.estimated_cost_usd ?? 0).toFixed(2)}`} />

                  <div className="col-span-12 md:col-span-2 flex md:justify-end">
                    <button
                      onClick={() => toggleManual(p)}
                      disabled={busy === p.provider}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ring-1 transition ${
                        p.manually_disabled
                          ? "bg-red-500/10 ring-red-500/40 text-red-300"
                          : "bg-white/[0.03] ring-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {p.manually_disabled ? "Disabled" : "Disable"}
                    </button>
                  </div>

                  {(p.last_error || cooldown) && (
                    <div className="col-span-12 text-[11px] text-zinc-500 flex items-center gap-2">
                      {cooldown && (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Pause className="h-3 w-3" /> cooldown until {new Date(p.disabled_until!).toLocaleTimeString()}
                        </span>
                      )}
                      {p.last_error && (
                        <span className="inline-flex items-center gap-1 text-red-400 truncate">
                          <AlertTriangle className="h-3 w-3" /> {p.last_error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3 flex items-center gap-2">
            <History className="h-3.5 w-3.5" /> Recent fallbacks
          </h2>
          {fallbacks.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-6 text-sm text-zinc-500">
              No fallback events recorded.
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015] text-sm">
              {fallbacks.map((f) => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-zinc-300 capitalize">{f.original_provider}</span>
                    <span className="mx-2 text-zinc-600">→</span>
                    <span className="text-emerald-400 font-medium capitalize">{f.replacement_provider ?? "none"}</span>
                    <span className="mx-2 text-zinc-600">·</span>
                    <span className="text-amber-400">{f.reason}</span>
                    {f.feature && <span className="ml-2 text-zinc-500">({f.feature})</span>}
                    {f.error_message && <div className="text-[11px] text-zinc-500 truncate mt-0.5">{f.error_message}</div>}
                  </div>
                  <span className="text-[11px] text-zinc-600 tabular-nums shrink-0 ml-3">
                    {new Date(f.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" | "red" | "zinc" }) {
  const map = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    zinc: "text-zinc-200",
  } as const;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.015] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${map[tone]}`}>{value}</div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-6 md:col-span-1">
      <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-200 tabular-nums">{value}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "healthy" ? "bg-emerald-400"
    : status === "degraded" ? "bg-amber-400"
    : status === "unhealthy" ? "bg-red-400"
    : status === "disabled" ? "bg-zinc-500"
    : "bg-zinc-600";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function statusClass(status: string) {
  if (status === "healthy") return "border-emerald-400/30 text-emerald-400";
  if (status === "degraded") return "border-amber-400/30 text-amber-400";
  if (status === "unhealthy") return "border-red-400/30 text-red-400";
  if (status === "disabled") return "border-zinc-500/30 text-zinc-400";
  return "border-zinc-600 text-zinc-500";
}

// keep imports used
void CheckCircle2; void XCircle;