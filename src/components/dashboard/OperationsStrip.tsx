/**
 * OperationsStrip — Phase 1 of the Workspace Trust Sprint.
 *
 * Replaces the old "Welcome back" + persona-welcome card at the top of the
 * dashboard with operational state. Answers ONE question in <3 seconds:
 *
 *   "What needs my attention right now?"
 *
 * Four clickable metrics + three primary actions. No motivational copy,
 * no gradients, no new modules — just the command center.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, FileText, Truck, Wallet, Plus, FilePlus2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb } from "@/integrations/workspace/client";
import { supabase } from "@/integrations/supabase/client";
import { MARKETING_SURFACES, goCrossHost } from "@/lib/workspace/surfaces";
import { wp } from "@/lib/workspace/paths";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  leads: number | null;
  proposals: number | null;
  deliveries: number | null;
  outstandingAmount: number | null;
  overdueCount: number | null;
};

const EMPTY: Stats = { leads: null, proposals: null, deliveries: null, outstandingAmount: null, overdueCount: null };

export default function OperationsStrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      const safe = <T,>(p: PromiseLike<T>, fallback: any) =>
        Promise.resolve(p).then((r: any) => r).catch(() => fallback);

      const [leadsRes, propRes, delivRes, invRes] = await Promise.all([
        safe(
          workspaceDb.from("intake_submissions").select("id", { count: "exact", head: true })
            .eq("owner_id", user.id)
            .or("pipeline_stage.eq.lead,pipeline_stage.is.null"),
          { count: null },
        ),
        safe(
          (supabase as any).from("workspace_documents").select("id", { count: "exact", head: true })
            .eq("owner_id", user.id).eq("doc_type", "proposal"),
          { count: null },
        ),
        safe(
          workspaceDb.from("work_deliveries").select("id", { count: "exact", head: true })
            .eq("owner_id", user.id),
          { count: null },
        ),
        safe(
          workspaceDb.from("work_invoices").select("amount, status")
            .eq("owner_id", user.id).in("status", ["pending", "overdue"]),
          { data: null },
        ),
      ]);

      const rows: { amount: number; status: string }[] = invRes?.data || [];
      const outstanding = rows.length
        ? rows.reduce((sum, r) => sum + Number(r.amount || 0), 0)
        : (invRes?.data === null ? null : 0);
      const overdue = rows.length
        ? rows.filter(r => r.status === "overdue").length
        : (invRes?.data === null ? null : 0);

      if (!alive) return;
      setStats({
        leads: leadsRes?.count ?? (leadsRes?.count === 0 ? 0 : null),
        proposals: propRes?.count ?? (propRes?.count === 0 ? 0 : null),
        deliveries: delivRes?.count ?? (delivRes?.count === 0 ? 0 : null),
        outstandingAmount: outstanding,
        overdueCount: overdue,
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const fmtINR = (n: number) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
    if (n >= 1000)   return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return `₹${n.toLocaleString("en-IN")}`;
  };

  return (
    <section
      aria-label="Operations overview"
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-500">
            Operations overview
          </p>
          <h2 className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-900 mt-0.5">
            What needs your attention
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Metric
          icon={Inbox}
          label="Leads waiting"
          value={stats.leads}
          loading={loading}
          onClick={() => goCrossHost(navigate, "/problem-leads")}
        />
        <Metric
          icon={FileText}
          label="Proposals to review"
          value={stats.proposals}
          loading={loading}
          onClick={() => goCrossHost(navigate, MARKETING_SURFACES.proposalTool)}
        />
        <Metric
          icon={Truck}
          label="Active deliveries"
          value={stats.deliveries}
          loading={loading}
          onClick={() => navigate("/dashboard/deliveries")}
        />
        <Metric
          icon={Wallet}
          label="Outstanding"
          value={stats.outstandingAmount}
          format={fmtINR}
          sub={
            stats.overdueCount && stats.overdueCount > 0
              ? `${stats.overdueCount} overdue`
              : undefined
          }
          subTone="rose"
          loading={loading}
          onClick={() => navigate(wp("revenue"))}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 text-white"
          onClick={() => navigate(wp("clients") + "?new=1")}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add client
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-200"
          onClick={() => goCrossHost(navigate, MARKETING_SURFACES.proposalTool)}
        >
          <FilePlus2 className="w-4 h-4 mr-1.5" /> Create proposal
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-200"
          onClick={() => navigate(wp(""))}
        >
          Open workspace <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon, label, value, loading, onClick, format, sub, subTone,
}: {
  icon: any;
  label: string;
  value: number | null;
  loading: boolean;
  onClick: () => void;
  format?: (n: number) => string;
  sub?: string;
  subTone?: "rose" | "amber" | "slate";
}) {
  const display =
    value === null || value === undefined
      ? "—"
      : format
        ? format(value)
        : value.toLocaleString("en-IN");
  const subClass =
    subTone === "rose"  ? "text-rose-600" :
    subTone === "amber" ? "text-amber-600" :
                          "text-slate-500";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition px-3 py-3 sm:px-4 sm:py-3.5"
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            {display}
          </span>
        )}
        {!loading && sub && (
          <span className={`text-[11px] font-medium ${subClass}`}>{sub}</span>
        )}
      </div>
    </button>
  );
}