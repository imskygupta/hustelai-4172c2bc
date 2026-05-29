/**
 * OperationsTodayCard
 *
 * Compact "operations layer" card surfaced near the top of the dashboard.
 * Reinforces the OS positioning: Deliveries · Clients · Telegram ·
 * Automations, with a single "View activity →" out to /dashboard/deliveries.
 *
 * Reads from DB2 (`work_deliveries`, `work_clients`) — the same source the
 * Deliveries page uses, so the counts stay consistent.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Users, Send, Zap, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb } from "@/integrations/workspace/client";
import { useTelegramConnection } from "@/lib/usage/useTelegramConnection";

export default function OperationsTodayCard() {
  const { user } = useAuth();
  const tg = useTelegramConnection();
  const [stats, setStats] = useState({ deliveriesToday: 0, clientsTotal: 0, automationsActive: 0 });

  useEffect(() => { (async () => {
    if (!user?.id) return;
    const todayISO = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); })();
    const [{ data: dl }, { data: cls }] = await Promise.all([
      workspaceDb.from("work_deliveries").select("id, created_at").eq("owner_id", user.id).gte("created_at", todayISO),
      workspaceDb.from("work_clients").select("id").eq("owner_id", user.id),
    ]);
    setStats({
      deliveriesToday: (dl || []).length,
      clientsTotal:    (cls || []).length,
      automationsActive: 0, // wired later via /dashboard/automations
    });
  })().catch(() => {}); }, [user?.id]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Operations today</div>
            <div className="text-sm font-semibold text-slate-900">Your workspace in motion</div>
          </div>
        </div>
        <Link
          to="/dashboard/deliveries"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          View activity <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile icon={Send}  label="Deliveries"     value={stats.deliveriesToday} suffix="today" />
        <Tile icon={Users} label="Clients"        value={stats.clientsTotal}    suffix="total" />
        <TileBool
          icon={Send}
          label="Telegram"
          ok={tg.connected}
          okText="Connected"
          offText="Not connected"
          to="/settings/telegram"
        />
        <Tile icon={Zap}   label="Automations"    value={stats.automationsActive} suffix="active" />
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, suffix }: { icon: any; label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-lg font-bold text-slate-900 tabular-nums">{value}</span>
        <span className="text-[10px] text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

function TileBool({ icon: Icon, label, ok, okText, offText, to }: {
  icon: any; label: string; ok: boolean; okText: string; offText: string; to: string;
}) {
  return (
    <Link to={to} className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 hover:border-emerald-300 transition">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`} />
        <span className={`text-sm font-semibold ${ok ? "text-emerald-700" : "text-slate-500"}`}>{ok ? okText : offText}</span>
      </div>
    </Link>
  );
}