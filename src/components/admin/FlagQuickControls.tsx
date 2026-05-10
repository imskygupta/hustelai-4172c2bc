import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Power, Flag, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearFlagCache, resolveFlags } from "@/lib/flags";

const QUICK = [
  { key: "payments.dodo_checkout",       label: "All Dodo payments" },
  { key: "payments.upi_manual_review",   label: "UPI manual flow" },
  { key: "payments.wallet_topups",       label: "Wallet top-ups" },
  { key: "exports.ai_exports",           label: "All exports" },
  { key: "telegram.broadcasts",          label: "Telegram broadcasts" },
  { key: "telegram.exports",             label: "Telegram delivery" },
  { key: "system.signup",                label: "New signups" },
  { key: "system.onboarding",            label: "Onboarding" },
  { key: "system.maintenance_banner",    label: "Maintenance banner" },
] as const;

type Row = { id: string; feature_key: string; label: string; kill_switch: boolean; enabled: boolean; maintenance: boolean };

export function FlagQuickControls() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("feature_flags")
      .select("id,feature_key,label,kill_switch,enabled,maintenance")
      .in("feature_key", QUICK.map(q => q.key));
    setRows((data as Row[]) || []);
  };
  useEffect(() => { load(); }, []);

  const toggleKill = async (row: Row) => {
    setBusy(row.id);
    const next = !row.kill_switch;
    const { error } = await (supabase as any).from("feature_flags")
      .update({ kill_switch: next }).eq("id", row.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      clearFlagCache(); resolveFlags(true);
      toast({ title: `${row.label} ${next ? "killed" : "restored"}` });
      load();
    }
    setBusy(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 flex items-center gap-2">
          <Flag className="h-3 w-3" /> Feature flag quick controls
        </h2>
        <Link to="/admin/feature-flags"
          className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5">
          Open full control center <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {QUICK.map(q => {
          const row = rows.find(r => r.feature_key === q.key);
          if (!row) return null;
          const killed = row.kill_switch;
          return (
            <button
              key={q.key}
              onClick={() => toggleKill(row)}
              disabled={busy === row.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                killed
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : row.maintenance
                  ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
                  : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20"
              }`}
            >
              <div className="text-left">
                <div className="text-xs font-medium">{q.label}</div>
                <code className="text-[10px] text-zinc-500">{q.key}</code>
              </div>
              {killed ? (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              ) : (
                <Power className="h-4 w-4 text-zinc-500" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-500 mt-2">
        Quick toggle = kill switch. For rollout %, tier gating, overrides and audit, open the full control center.
      </p>
    </section>
  );
}