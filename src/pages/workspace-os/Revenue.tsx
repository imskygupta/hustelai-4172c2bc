import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, AlertCircle, Crown } from "lucide-react";

export default function Revenue() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ totals: {}, monthly: [], topClients: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ws }, { data: payments }] = await Promise.all([
        (supabase as any).from("workspaces").select("*").eq("owner_id", user.id),
        (supabase as any).from("workspace_payments").select("*").eq("owner_id", user.id),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const totals = (payments || []).reduce((acc: any, p: any) => {
        const amt = Number(p.amount) || 0;
        acc.invoiced += amt;
        if (p.status === "paid") acc.paid += amt;
        else if (p.status === "partial") acc.paid += Number(p.paid_amount) || 0;
        else if (p.due_date && p.due_date < today) acc.overdue += amt;
        else acc.pending += amt;
        return acc;
      }, { invoiced: 0, paid: 0, pending: 0, overdue: 0 });

      // monthly grouping (last 6 months)
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = d.toISOString().slice(0, 7);
        months[k] = 0;
      }
      (payments || []).forEach((p: any) => {
        if (p.status === "paid" && p.paid_at) {
          const k = p.paid_at.slice(0, 7);
          if (k in months) months[k] += Number(p.amount) || 0;
        }
      });

      // top clients by total_paid
      const topClients = [...(ws || [])].sort((a, b) => (Number(b.total_paid) || 0) - (Number(a.total_paid) || 0)).slice(0, 5);

      const activeClients = (ws || []).filter((w: any) => ["active", "retainer", "negotiation"].includes(w.status)).length;
      const avg = ws?.length ? totals.invoiced / ws.length : 0;

      setData({
        totals: { ...totals, totalClients: ws?.length || 0, activeClients, avg },
        monthly: Object.entries(months).map(([k, v]) => ({ month: k, amount: v })),
        topClients,
      });
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="animate-pulse h-96 rounded-2xl bg-muted/30" />;
  const max = Math.max(1, ...data.monthly.map((m: any) => m.amount));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Revenue</h2>
        <p className="text-sm text-muted-foreground mt-1">Your freelancer P&amp;L at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={DollarSign} label="Total invoiced" value={`₹${data.totals.invoiced?.toLocaleString()}`} />
        <Stat icon={TrendingUp} label="Paid" value={`₹${data.totals.paid?.toLocaleString()}`} accent="text-emerald-500" />
        <Stat icon={AlertCircle} label="Overdue" value={`₹${data.totals.overdue?.toLocaleString()}`} accent="text-red-500" />
        <Stat icon={Users} label="Active clients" value={data.totals.activeClients} />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4">Monthly revenue (last 6 months)</h3>
        <div className="flex items-end gap-3 h-40">
          {data.monthly.map((m: any) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-gradient-to-t from-primary/60 to-primary/20 rounded-t-md transition-all" style={{ height: `${(m.amount / max) * 100}%`, minHeight: m.amount > 0 ? 4 : 2 }} />
              <span className="text-[10px] text-muted-foreground">{m.month.slice(5)}</span>
              <span className="text-[10px] font-medium">₹{m.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Top clients</h3>
        {data.topClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No paid clients yet.</p>
        ) : (
          <div className="space-y-2">
            {data.topClients.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <span className="text-sm">{c.client_name}</span>
                <span className="text-sm font-semibold text-primary">₹{Number(c.total_paid || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={`text-xl font-semibold mt-1 ${accent || ""}`}>{value}</p>
    </div>
  );
}