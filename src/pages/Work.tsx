import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { ArrowRight, Lock } from "lucide-react";
import { WORK_TOOLS } from "@/lib/work-tools";
import { useFeatureFlags, flagAccess, type Tier } from "@/lib/feature-flags";

export default function Work() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { byKey } = useFeatureFlags();
  const tier = (profile?.subscription_tier || "free") as Tier;
  const [s, setS] = useState({ revenue: 0, pending: 0, clients: 0, dueToday: 0, hoursToday: 0 });

  useEffect(() => { (async () => {
    if (!user?.id) return;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const dayStart = new Date(); dayStart.setHours(0,0,0,0);
    const todayISO = new Date().toISOString().slice(0,10);
    const [{ data: inv }, { data: cls }, { data: dl }, { data: te }] = await Promise.all([
      workspaceDb.from("work_invoices").select("amount,status,created_at").eq("owner_id", user.id),
      workspaceDb.from("work_clients").select("id").eq("owner_id", user.id),
      workspaceDb.from("work_deadlines").select("id").eq("owner_id", user.id).eq("due_date", todayISO),
      workspaceDb.from("work_time_entries").select("duration_seconds,started_at").eq("owner_id", user.id),
    ]);
    const invoices = (inv || []) as any[];
    const revenue = invoices.filter(i => i.status === "paid" && new Date(i.created_at) >= monthStart).reduce((a,b)=>a+Number(b.amount),0);
    const pending = invoices.filter(i => i.status !== "paid").reduce((a,b)=>a+Number(b.amount),0);
    const hoursToday = ((te || []) as any[]).filter(t => new Date(t.started_at) >= dayStart).reduce((a,b)=>a+b.duration_seconds,0)/3600;
    setS({ revenue, pending, clients: (cls||[]).length, dueToday: (dl||[]).length, hoursToday });
  })().catch(() => {}); }, [user?.id]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Work</h1>
          <p className="text-sm text-slate-600 mt-1">Your daily execution hub — clients, money, and momentum.</p>
        </div>

        {/* Hero KPIs */}
        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <div className="text-xs uppercase tracking-wider opacity-80">Freelancer OS</div>
          <div className="text-2xl md:text-3xl font-bold mt-1">Where your business actually lives.</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
            <Kpi label="Earned (mo)" value={`₹${s.revenue.toLocaleString()}`} />
            <Kpi label="Pending" value={`₹${s.pending.toLocaleString()}`} />
            <Kpi label="Clients" value={String(s.clients)} />
            <Kpi label="Due today" value={String(s.dueToday)} />
            <Kpi label="Hours today" value={s.hoursToday.toFixed(1)} />
          </div>
        </Card>

        {/* Tool grid */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-1">Tools</h2>
          <p className="text-xs text-slate-500 mb-3">Each tool has its own dedicated screen — no clutter.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORK_TOOLS.map(t => {
              const flag = byKey(`work.${t.slug}`);
              const acc = flagAccess(flag, tier);
              const locked = acc.locked;
              const lockLabel = acc.reason === "tier" ? `${flag?.min_tier?.toUpperCase()} only` : "Coming soon";
              return (
              <button
                key={t.slug}
                onClick={() => !locked && navigate(`/work/${t.slug}`)}
                disabled={locked}
                className={`group text-left rounded-xl border border-slate-200 bg-white p-4 transition-all ${locked ? "opacity-60 cursor-not-allowed" : "hover:border-emerald-300 hover:shadow-md"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.tone}`}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                        {t.label}
                        {locked && <Lock className="w-3 h-3 text-slate-400" />}
                      </h3>
                      {locked
                        ? <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{lockLabel}</span>
                        : <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}