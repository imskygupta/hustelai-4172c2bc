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
import { Activity, Users, Send, Zap, ArrowRight, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb } from "@/integrations/workspace/client";
import { useTelegramConnection } from "@/lib/usage/useTelegramConnection";

export default function OperationsTodayCard() {
  const { user } = useAuth();
  const tg = useTelegramConnection();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    deliveriesToday: 0,
    clientsTotal: 0,
    automationsActive: 0,
    invoicesUnpaid: 0,
    deadlinesDueWeek: 0,
  });

  useEffect(() => { (async () => {
    if (!user?.id) return;
    const todayISO = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); })();
    const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
    const todayDate = new Date().toISOString().slice(0, 10);
    const [{ data: dl }, { data: cls }, { data: inv }, { data: dd }] = await Promise.all([
      workspaceDb.from("work_deliveries").select("id, created_at").eq("owner_id", user.id).gte("created_at", todayISO),
      workspaceDb.from("work_clients").select("id").eq("owner_id", user.id),
      workspaceDb.from("work_invoices").select("id, status").eq("owner_id", user.id).in("status", ["pending", "overdue"]),
      workspaceDb.from("work_deadlines").select("id, due_date, is_done").eq("owner_id", user.id).eq("is_done", false).gte("due_date", todayDate).lte("due_date", weekEnd),
    ]);
    setStats({
      deliveriesToday: (dl || []).length,
      clientsTotal:    (cls || []).length,
      automationsActive: 0, // wired later via /dashboard/automations
      invoicesUnpaid:   (inv || []).length,
      deadlinesDueWeek: (dd || []).length,
    });
    setLoading(false);
  })().catch(() => setLoading(false)); }, [user?.id]);

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
        <Tile icon={Send}  label="Deliveries"     value={stats.deliveriesToday} suffix="today" loading={loading} />
        <Tile icon={Users} label="Clients"        value={stats.clientsTotal}    suffix="total" loading={loading} />
        <TileBool
          icon={Send}
          label="Telegram"
          ok={tg.connected}
          okText="Connected"
          offText="Not connected"
          to="/settings/telegram"
        />
        <Tile icon={Zap}   label="Automations"    value={stats.automationsActive} suffix="active" loading={loading} />
      </div>

      {(loading || stats.invoicesUnpaid > 0 || stats.deadlinesDueWeek > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
          {loading ? (
            <span className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
          ) : (
            <>
              {stats.invoicesUnpaid > 0 && (
                <Link to="/work/invoices" className="inline-flex items-center gap-1 hover:text-rose-700">
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span className="font-medium text-slate-900 tabular-nums">{stats.invoicesUnpaid}</span>
                  {stats.invoicesUnpaid === 1 ? "invoice unpaid" : "invoices unpaid"}
                </Link>
              )}
              {stats.deadlinesDueWeek > 0 && (
                <Link to="/work/deadlines" className="inline-flex items-center gap-1 hover:text-amber-700">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="font-medium text-slate-900 tabular-nums">{stats.deadlinesDueWeek}</span>
                  {stats.deadlinesDueWeek === 1 ? "deadline this week" : "deadlines this week"}
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, suffix, loading }: { icon: any; label: string; value: number; suffix: string; loading?: boolean }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        {loading ? (
          <span className="my-0.5 h-4 w-8 rounded bg-slate-100 animate-pulse" />
        ) : (
          <>
            <span className="text-lg font-bold text-slate-900 tabular-nums">{value}</span>
            <span className="text-[10px] text-slate-400">{suffix}</span>
          </>
        )}
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