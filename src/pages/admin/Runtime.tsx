import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Power, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getRuntimeSnapshot,
  setKillSwitches,
  clearKillSwitches,
  type RuntimeSnapshot,
} from "@/config/runtime";

const KILL_KEYS = ["routing", "ai", "api", "console", "exports", "docs", "experimental"];

export default function AdminRuntime() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [snap, setSnap] = useState<RuntimeSnapshot>(() => getRuntimeSnapshot());
  const [active, setActive] = useState<Set<string>>(() => new Set(snap.killSwitches));

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

  const refresh = () => setSnap(getRuntimeSnapshot());

  const toggle = (k: string) => {
    const next = new Set(active);
    next.has(k) ? next.delete(k) : next.add(k);
    setActive(next);
    setKillSwitches([...next]);
    setTimeout(() => window.location.reload(), 200);
  };

  const reset = () => {
    clearKillSwitches();
    setActive(new Set());
    setTimeout(() => window.location.reload(), 200);
  };

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
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Environment</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Surface" value={snap.surface} />
            <Stat label="Hostname" value={snap.hostname || "—"} />
            <Stat label="Build" value={snap.buildVersion} />
            <Stat label="Mode" value={snap.environment} />
          </div>
          {snap.maintenance && (
            <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Maintenance mode is ACTIVE — root domain is showing the maintenance page.
            </div>
          )}
        </section>

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

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">Feature flags</h2>
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
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Kill switches</h2>
            <Button size="sm" variant="ghost" onClick={reset} className="text-zinc-500 hover:text-zinc-300 text-xs">
              Clear all
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            Toggling a switch disables the related feature instantly across this browser, no redeploy needed.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {KILL_KEYS.map(k => {
              const on = active.has(k);
              return (
                <button
                  key={k}
                  onClick={() => toggle(k)}
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

        <section>
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">AI provider chain</h2>
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
          <p className="text-xs text-zinc-500 mt-3">
            Edge functions try providers in order. If one returns 5xx / 429 / 402, the next provider in the chain is used.
          </p>
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