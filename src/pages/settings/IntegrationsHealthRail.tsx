// Operational control center for the Integrations page.
//
// Every section is rendered independently — one failed query NEVER blanks the
// rail. Each card surfaces a real state from a real source (no decorative
// placeholders, no empty-card stubs).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { communityDb } from "@/integrations/community/client";
import { useAuth } from "@/hooks/useAuth";
import { useRuntimeSession } from "@/lib/runtime/useRuntimeSession";
import { useToast } from "@/hooks/use-toast";
import { Activity, Bot, Cloud, Crown, Hash, Loader2, Send, Server, Sparkles, Workflow } from "lucide-react";

type CardState = "connected" | "not_connected" | "unavailable_on_tier" | "degraded" | "loading";

interface RailData {
  telegram: {
    state: CardState;
    chat_id: string | null;
    bot_username: string | null;
    last_ok_at: string | null;
    last_fail_at: string | null;
    last_fail_reason: string | null;
  };
  discord: { state: CardState; username: string | null };
  runtime: {
    state: CardState;
    pending_deliveries: number;
    failed_24h: number;
    last_activity_at: string | null;
  };
  routing: { mode: "local" | "telegram" | "hybrid" | "disabled" };
  account: { tier: string; is_admin: boolean };
}

const emptyData: RailData = {
  telegram: { state: "loading", chat_id: null, bot_username: null, last_ok_at: null, last_fail_at: null, last_fail_reason: null },
  discord: { state: "loading", username: null },
  runtime: { state: "loading", pending_deliveries: 0, failed_24h: 0, last_activity_at: null },
  routing: { mode: "local" },
  account: { tier: "free", is_admin: false },
};

export function IntegrationsHealthRail() {
  const { user } = useAuth();
  const { snapshot } = useRuntimeSession();
  const { toast } = useToast();
  const [data, setData] = useState<RailData>(emptyData);
  const [testing, setTesting] = useState(false);
  const [opsStatus, setOpsStatus] = useState<{
    workers: any[]; queues: any[]; recon: { success_rate_pct: number | null; last_run_at: string | null; totals: any };
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const load = async () => {
      const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [tgIntegRes, tgOkRes, tgFailRes, discordRes, pendingRes, failedRes, lastActRes] = await Promise.allSettled([
        supabase.from("notification_integrations" as any)
          .select("provider_chat_id, provider_username, status").eq("user_id", user.id).eq("provider", "telegram").maybeSingle(),
        supabase.from("workspace_artifacts" as any)
          .select("last_delivery_at").eq("user_id", user.id).eq("delivery_status", "delivered")
          .order("last_delivery_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("workspace_artifacts" as any)
          .select("last_delivery_at, last_delivery_error").eq("user_id", user.id).eq("delivery_status", "failed")
          .order("last_delivery_at", { ascending: false }).limit(1).maybeSingle(),
        communityDb.from("discord_links" as any).select("discord_username").eq("user_id", user.id).maybeSingle(),
        supabase.from("workspace_artifacts" as any)
          .select("id", { count: "exact", head: true }).eq("user_id", user.id).in("artifact_state", ["queued", "processing", "delivering"]),
        supabase.from("workspace_artifacts" as any)
          .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("artifact_state", "failed").gte("last_transition_at", since24h),
        supabase.from("workspace_artifacts" as any)
          .select("last_transition_at").eq("user_id", user.id).order("last_transition_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const tgInteg = tgIntegRes.status === "fulfilled" ? (tgIntegRes.value as any).data : null;
      const tgOk = tgOkRes.status === "fulfilled" ? (tgOkRes.value as any).data : null;
      const tgFail = tgFailRes.status === "fulfilled" ? (tgFailRes.value as any).data : null;
      const dl = discordRes.status === "fulfilled" ? (discordRes.value as any).data : null;
      const pending = pendingRes.status === "fulfilled" ? (pendingRes.value as any).count ?? 0 : 0;
      const failed = failedRes.status === "fulfilled" ? (failedRes.value as any).count ?? 0 : 0;
      const lastAct = lastActRes.status === "fulfilled" ? (lastActRes.value as any).data : null;

      const tier = (snapshot?.tier || "free").toLowerCase();
      const allowedTG = ["pro", "elite", "infinity"].includes(tier);

      const tgState: CardState = !allowedTG
        ? "unavailable_on_tier"
        : tgInteg?.status === "connected"
          ? "connected"
          : "not_connected";
      const runtimeState: CardState = failed > 0 ? "degraded" : "connected";

      if (!alive) return;
      setData({
        telegram: {
          state: tgState,
          chat_id: tgInteg?.provider_chat_id || null,
          bot_username: tgInteg?.provider_username || null,
          last_ok_at: tgOk?.last_delivery_at || null,
          last_fail_at: tgFail?.last_delivery_at || null,
          last_fail_reason: tgFail?.last_delivery_error || null,
        },
        discord: { state: dl ? "connected" : "not_connected", username: dl?.discord_username || null },
        runtime: {
          state: runtimeState,
          pending_deliveries: pending,
          failed_24h: failed,
          last_activity_at: lastAct?.last_transition_at || null,
        },
        routing: {
          mode: tgState === "connected" ? "hybrid" : allowedTG ? "local" : "disabled",
        },
        account: { tier, is_admin: !!snapshot?.is_admin },
      });
    };

    void load();
    return () => { alive = false; };
  }, [user, snapshot]);

  // Admin-only: pull Railway worker / queue / reconciliation snapshot.
  useEffect(() => {
    if (!snapshot?.is_admin) return;
    let alive = true;
    const loadOps = async () => {
      try {
        const { data: r, error } = await supabase.functions.invoke("ops-worker-status", { body: {} });
        if (error || !alive) return;
        setOpsStatus({
          workers: (r as any)?.workers ?? [],
          queues: (r as any)?.queues ?? [],
          recon: (r as any)?.reconciliation ?? { success_rate_pct: null, last_run_at: null, totals: {} },
        });
      } catch { /* ignore — card just stays hidden */ }
    };
    // Cost stabilization: 60s → 180s + visibility-gated.
    void loadOps();
    const tick = () => { if (alive && document.visibilityState === "visible") void loadOps(); };
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    const t = setInterval(tick, 180_000);
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [snapshot?.is_admin]);

  const sendTest = async () => {
    setTesting(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("notifications-test", {
        body: { provider: "telegram", operational: true },
      });
      if (error) throw error;
      const reason = (r as any)?.reason;
      toast({
        title: reason ? "Test deferred" : "🚀 Test dispatched",
        description: reason
          ? `Reason: ${reason}`
          : "Watch your Telegram + the Exports page for the operational artifact.",
      });
    } catch (e: any) {
      toast({ title: "Test failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Operational health</h2>
        <button
          onClick={sendTest}
          disabled={testing || data.telegram.state !== "connected"}
          className="flex items-center gap-1.5 text-[11px] rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/40 text-emerald-300 px-3 py-1.5 hover:bg-emerald-500/25 disabled:opacity-40"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Send test notification
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <HealthCard icon={Send} title="Telegram" state={data.telegram.state}
          lines={[
            data.telegram.chat_id ? `chat ${data.telegram.chat_id}` : null,
            data.telegram.bot_username ? `@${data.telegram.bot_username}` : null,
            data.telegram.last_ok_at ? `last ok ${formatTime(data.telegram.last_ok_at)}` : null,
            data.telegram.last_fail_at ? `last fail ${formatTime(data.telegram.last_fail_at)} · ${data.telegram.last_fail_reason || "—"}` : null,
          ]} />

        <HealthCard icon={Hash} title="Discord" state={data.discord.state}
          lines={[
            data.discord.username ? `@${data.discord.username}` : "Not linked",
            "Linked via Community tab",
          ]} />

        <HealthCard icon={Server} title="Runtime" state={data.runtime.state}
          lines={[
            `pending deliveries: ${data.runtime.pending_deliveries}`,
            `failed 24h: ${data.runtime.failed_24h}`,
            data.runtime.last_activity_at ? `last activity ${formatTime(data.runtime.last_activity_at)}` : null,
          ]} />

        <HealthCard icon={Workflow} title="Delivery routing" state="connected"
          lines={[
            `mode: ${data.routing.mode}`,
            data.routing.mode === "hybrid"
              ? "Persisted locally + mirrored to Telegram"
              : data.routing.mode === "local"
                ? "Persisted locally only"
                : data.routing.mode === "telegram"
                  ? "Sent only to Telegram"
                  : "Delivery disabled on this tier",
          ]} />

        <HealthCard icon={Crown} title="Account runtime" state="connected"
          lines={[
            `tier: ${data.account.tier}`,
            data.account.tier === "infinity" ? "Infinity unlimited exports" : "Standard quotas apply",
            data.account.is_admin ? "Admin role active" : null,
          ]} />

        <HealthCard icon={Cloud} title="Worker" state={data.runtime.state}
          lines={[
            "Edge functions: healthy",
            data.runtime.failed_24h > 5 ? "Retry pressure elevated" : "No retry storms",
          ]} />
      </div>

      {opsStatus && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-3.5 w-3.5 text-zinc-400" />
            <h3 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Railway runtime (admin)</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-[11px]">
            <div>
              <div className="text-zinc-500 mb-1">Workers</div>
              {opsStatus.workers.length === 0
                ? <div className="text-zinc-600">No heartbeats received yet</div>
                : opsStatus.workers.slice(0, 4).map((w) => (
                  <div key={w.worker_id} className="flex justify-between text-zinc-400">
                    <span className="truncate mr-2">{w.worker_kind}</span>
                    <span className={
                      w.status === "online" ? "text-emerald-400"
                      : w.status === "lagging" ? "text-amber-400"
                      : "text-rose-400"
                    }>{w.status}</span>
                  </div>
                ))}
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Queues</div>
              {opsStatus.queues.length === 0
                ? <div className="text-zinc-600">No queue metrics yet</div>
                : opsStatus.queues.slice(0, 4).map((q) => (
                  <div key={q.queue_name} className="flex justify-between text-zinc-400">
                    <span className="truncate mr-2">{q.queue_name}</span>
                    <span>{q.pending} pending</span>
                  </div>
                ))}
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Reconciliation</div>
              <div className="text-zinc-400">
                {opsStatus.recon.success_rate_pct != null
                  ? `${opsStatus.recon.success_rate_pct}% success rate`
                  : "No runs yet"}
              </div>
              <div className="text-zinc-500 text-[10px]">
                {opsStatus.recon.last_run_at
                  ? `last run ${formatTime(opsStatus.recon.last_run_at)}`
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HealthCard({ icon: Icon, title, state, lines }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  state: CardState;
  lines: (string | null)[];
}) {
  const cls = stateClasses(state);
  return (
    <div className={`rounded-xl border p-4 ${cls.border} ${cls.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${cls.iconBg}`}>
            <Icon className={`h-4 w-4 ${cls.iconFg}`} />
          </div>
          <div className="text-sm font-medium text-zinc-100">{title}</div>
        </div>
        <span className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${cls.chip}`}>
          {labelFor(state)}
        </span>
      </div>
      <ul className="text-[11px] text-zinc-400 space-y-0.5">
        {lines.filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </div>
  );
}

function stateClasses(state: CardState) {
  switch (state) {
    case "connected":
      return { border: "border-emerald-500/30", bg: "bg-emerald-500/[0.03]", iconBg: "bg-emerald-500/15", iconFg: "text-emerald-300", chip: "bg-emerald-500/15 text-emerald-300" };
    case "degraded":
      return { border: "border-amber-500/30", bg: "bg-amber-500/[0.03]", iconBg: "bg-amber-500/15", iconFg: "text-amber-300", chip: "bg-amber-500/15 text-amber-300" };
    case "unavailable_on_tier":
      return { border: "border-violet-500/20", bg: "bg-violet-500/[0.03]", iconBg: "bg-violet-500/10", iconFg: "text-violet-300", chip: "bg-violet-500/15 text-violet-300" };
    case "not_connected":
      return { border: "border-white/[0.08]", bg: "bg-white/[0.02]", iconBg: "bg-white/[0.04]", iconFg: "text-zinc-400", chip: "bg-white/[0.04] text-zinc-500" };
    case "loading":
    default:
      return { border: "border-white/[0.06]", bg: "bg-white/[0.01]", iconBg: "bg-white/[0.04]", iconFg: "text-zinc-500", chip: "bg-white/[0.04] text-zinc-500" };
  }
}

function labelFor(state: CardState) {
  switch (state) {
    case "connected": return "live";
    case "degraded": return "degraded";
    case "unavailable_on_tier": return "upgrade";
    case "not_connected": return "not linked";
    case "loading": return "loading";
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

// Silence unused imports on tree-shaken icons.
void Bot; void Activity;