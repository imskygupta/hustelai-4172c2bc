import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Power, RefreshCw, ShieldAlert, ShieldCheck, Lock, History, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/integrations/analytics/client";
import {
  getRuntimeSnapshot,
  setKillSwitches,
  clearKillSwitches,
  loadServerRuntimeConfig,
  setServerConfigInMemory,
  type RuntimeSnapshot,
} from "@/config/runtime";

const SERVER_KILLS = [
  { key: "disable_ai",           label: "Disable AI" },
  { key: "disable_api",          label: "Disable API platform" },
  { key: "disable_console",      label: "Disable /console" },
  { key: "disable_exports",      label: "Disable exports" },
  { key: "disable_routing",      label: "Disable subdomain routing" },
  { key: "disable_docs",         label: "Disable docs subdomain" },
  { key: "disable_experimental", label: "Disable experimental tools" },
] as const;

const LOCAL_KILLS = ["routing", "ai", "api", "console", "exports", "docs", "experimental"];

type AuditRow = {
  id: string;
  config_key: string;
  old_value: any;
  new_value: any;
  action: string;
  created_at: string;
};

export default function AdminRuntime() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [snap, setSnap] = useState<RuntimeSnapshot>(() => getRuntimeSnapshot());
  const [server, setServer] = useState<Record<string, any>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [active, setActive] = useState<Set<string>>(() => new Set(snap.killSwitches));

  // Admin gate
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/imskygupta-admin"); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      if (!data) navigate("/");
    })();
  }, [user, loading, navigate]);

  const refresh = async () => {
    await loadServerRuntimeConfig();
    const s = getRuntimeSnapshot();
    setSnap(s);
    setServer(s.serverConfig);
    if (isAdmin) {
      const { data } = await (supabase as any)
        .from("api_runtime_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setAudit((data as AuditRow[]) || []);
    }
  };

  useEffect(() => { if (isAdmin) refresh(); /* eslint-disable-next-line */ }, [isAdmin]);

  const persist = async (key: string, next: boolean) => {
    setBusy(key);
    const old = server[key];
    try {
      const { error: upErr } = await (supabase as any)
        .from("api_runtime_config")
        .upsert({ key, value: next, updated_by: user?.id }, { onConflict: "key" });
      if (upErr) throw upErr;

      await (supabase as any).from("api_runtime_audit_logs").insert({
        admin_user_id: user?.id,
        config_key: key,
        old_value: old ?? null,
        new_value: next,
        action: "update",
      });

      // Mirror to analytics audit stream (fire-and-forget).
      logEvent("audit", "runtime_config_updated", {
        config_key: key,
        old_value: old ?? null,
        new_value: next,
        admin_user_id: user?.id,
      });

      const nextServer = { ...server, [key]: next };
      setServer(nextServer);
      setServerConfigInMemory(nextServer);
      setSnap(getRuntimeSnapshot());
      toast({ title: `${key} = ${next}`, description: "Applied globally." });
      refresh();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const enterSafeMode = () => persist("safe_mode", true);
  const exitSafeMode = () => persist("safe_mode", false);
  const toggleReadOnly = () => persist("readonly_mode", !server.readonly_mode);
  const toggleMaintenance = () => persist("maintenance_mode", !server.maintenance_mode);

  const persistString = async (key: string, next: string) => {
    setBusy(key);
    try {
      const { error: upErr } = await (supabase as any)
        .from("api_runtime_config")
        .upsert({ key, value: next, updated_by: user?.id }, { onConflict: "key" });
      if (upErr) throw upErr;
      const nextServer = { ...server, [key]: next };
      setServer(nextServer);
      setServerConfigInMemory(nextServer);
      toast({ title: `${key} updated` });
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleLocal = (k: string) => {
    const next = new Set(active);
    next.has(k) ? next.delete(k) : next.add(k);
    setActive(next);
    setKillSwitches([...next]);
    setSnap(getRuntimeSnapshot());
  };
  const resetLocal = () => { clearKillSwitches(); setActive(new Set()); setSnap(getRuntimeSnapshot()); };

  const flagRows = useMemo(() => Object.entries(snap.flags), [snap.flags]);

  if (loading || isAdmin === null) {
    return <div className="min-h-screen bg-[#07090d] grid place-items-center text-zinc-500 text-sm">Loading…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-7 w-7 rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30 grid place-items-center">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
            </span>
            Runtime Diagnostics
          </div>
          <Button size="sm" variant="outline" onClick={refresh} className="border-white/10 text-zinc-300">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Emergency actions */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Emergency</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={server.safe_mode ? exitSafeMode : enterSafeMode}
              disabled={busy === "safe_mode"}
              className={`rounded-xl p-4 text-left ring-1 transition ${
                server.safe_mode
                  ? "bg-amber-500/10 ring-amber-400/40 hover:bg-amber-500/15"
                  : "bg-red-500/5 ring-red-500/30 hover:bg-red-500/10"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                {server.safe_mode ? <ShieldCheck className="h-4 w-4 text-amber-400" /> : <ShieldAlert className="h-4 w-4 text-red-400" />}
                {server.safe_mode ? "EXIT SAFE MODE" : "ENTER SAFE MODE"}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Disables AI, exports, experimental tools, and subdomain routing globally. Root, status, and docs stay live.
              </p>
            </button>

            <button
              onClick={toggleReadOnly}
              disabled={busy === "readonly_mode"}
              className={`rounded-xl p-4 text-left ring-1 transition ${
                server.readonly_mode
                  ? "bg-sky-500/10 ring-sky-400/40 hover:bg-sky-500/15"
                  : "bg-white/[0.02] ring-white/10 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Lock className={`h-4 w-4 ${server.readonly_mode ? "text-sky-400" : "text-zinc-400"}`} />
                {server.readonly_mode ? "Read-only ON" : "Enable read-only mode"}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Blocks writes, key generation, and exports. Users can browse safely.
              </p>
            </button>

            <button
              onClick={toggleMaintenance}
              disabled={busy === "maintenance_mode"}
              className={`rounded-xl p-4 text-left ring-1 transition ${
                server.maintenance_mode
                  ? "bg-emerald-500/10 ring-emerald-400/40 hover:bg-emerald-500/15"
                  : "bg-white/[0.02] ring-white/10 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldAlert className={`h-4 w-4 ${server.maintenance_mode ? "text-emerald-400" : "text-zinc-400"}`} />
                {server.maintenance_mode ? "Maintenance ON" : "Enable maintenance mode"}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Shows a branded "shipping something new" page. status.* stays reachable.
              </p>
            </button>
          </div>
        </section>

        {/* Environment */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Environment</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Surface" value={snap.surface} />
            <Stat label="Hostname" value={snap.hostname || "—"} />
            <Stat label="Build" value={snap.buildVersion} />
            <Stat label="Server config" value={snap.serverConfigLoaded ? "Loaded" : "Defaults"} />
          </div>
        </section>

        {/* Payment Controls */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Payment Controls</h2>
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015]">
            {[
              { key: "payments_locked", label: "Global payment lock", icon: Lock, desc: "Blocks ALL new payments (subscriptions + wallet). Existing subs unaffected." },
              { key: "subscription_checkout_locked", label: "Subscription checkout lock", icon: CreditCard, desc: "Blocks new subscription checkouts only." },
              { key: "wallet_topup_locked", label: "Wallet top-up lock", icon: Wallet, desc: "Blocks wallet credit purchases only." },
              { key: "upi_manual_review_enabled", label: "UPI manual review mode", icon: Lock, desc: "TEMPORARY: All UPI payments require admin approval before entitlement is granted. Disable for fully automated flow." },
            ].map(({ key, label, icon: Icon, desc }) => {
              const on = server[key] === true;
              return (
                <div key={key} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 ${on ? "text-red-400" : "text-zinc-500"}`} />
                    <div>
                      <div className="text-zinc-200">{label}</div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => persist(key, !on)}
                    disabled={busy === key}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ring-1 transition ${
                      on
                        ? "bg-red-500/10 ring-red-500/40 text-red-300"
                        : "bg-white/[0.03] ring-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" /> {on ? "Locked" : "Unlocked"}
                  </button>
                </div>
              );
            })}
            <div className="px-4 py-3">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500">Maintenance message (shown to users)</label>
              <textarea
                defaultValue={typeof server.payment_maintenance_message === "string" ? server.payment_maintenance_message : ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (server.payment_maintenance_message || "")) persistString("payment_maintenance_message", v);
                }}
                rows={2}
                placeholder="e.g. Payment provider is performing scheduled maintenance. Please retry after 6 PM IST."
                className="mt-2 w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </section>

        {/* Server kill switches */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Server kill switches (global)</h2>
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015]">
            {SERVER_KILLS.map(({ key, label }) => {
              const on = !!server[key];
              return (
                <div key={key} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="text-zinc-200">{label}</div>
                    <code className="text-[10px] text-zinc-500">{key}</code>
                  </div>
                  <button
                    onClick={() => persist(key, !on)}
                    disabled={busy === key}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ring-1 transition ${
                      on
                        ? "bg-red-500/10 ring-red-500/40 text-red-300"
                        : "bg-white/[0.03] ring-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" /> {on ? "Disabled" : "Enabled"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Computed flags */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Computed feature flags</h2>
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015]">
            {flagRows.map(([flag, on]) => (
              <div key={flag} className="flex items-center justify-between px-4 py-3 text-sm">
                <code className="text-zinc-300">{flag}</code>
                <Badge variant="outline" className={on ? "border-emerald-400/30 text-emerald-400" : "border-zinc-600 text-zinc-500"}>
                  {on ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Priority: <code>?override</code> &gt; server config &gt; localStorage &gt; env defaults.
          </p>
        </section>

        {/* Domains */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Active domains</h2>
          <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015]">
            {Object.entries(snap.domains).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-zinc-400">{k}</span>
                <code className="text-emerald-400">{v}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Local browser overrides */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Local browser overrides</h2>
            <Button size="sm" variant="ghost" onClick={resetLocal} className="text-zinc-500 hover:text-zinc-300 text-xs">
              Clear all
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            Affects only this browser. Lower priority than server config — use for local testing.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {LOCAL_KILLS.map(k => {
              const on = active.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggleLocal(k)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                    on
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20"
                  }`}
                >
                  <span className="capitalize">{k}</span>
                  <Power className={`h-4 w-4 ${on ? "text-red-400" : "text-zinc-500"}`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* AI providers */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">AI provider chain</h2>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/runtime/providers")} className="border-white/10 text-zinc-300 text-xs">
              Open provider health →
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {snap.aiProviders.map((p, i) => (
              <div key={p} className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 capitalize">
                  {i + 1}. {p}
                </span>
                {i < snap.aiProviders.length - 1 && <span className="text-zinc-600">→</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Audit log */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3 flex items-center gap-2">
            <History className="h-3.5 w-3.5" /> Recent changes
          </h2>
          {audit.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-6 text-sm text-zinc-500">
              No changes recorded yet.
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.05] bg-white/[0.015] text-sm">
              {audit.map(a => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <code className="text-zinc-300">{a.config_key}</code>
                    <span className="mx-2 text-zinc-600">·</span>
                    <span className="text-zinc-500">{String(a.old_value)} → </span>
                    <span className="text-emerald-400 font-medium">{String(a.new_value)}</span>
                  </div>
                  <span className="text-[11px] text-zinc-600 tabular-nums shrink-0 ml-3">
                    {new Date(a.created_at).toLocaleString()}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.015] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="text-sm text-white mt-1 truncate">{value}</div>
    </div>
  );
}