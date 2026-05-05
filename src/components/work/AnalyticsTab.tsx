import { useEffect, useState } from "react";
import { workspaceDb, type WorkClient, type WorkInvoice, type WorkCommLog } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function AnalyticsTab({ userId }: { userId?: string }) {
  const [data, setData] = useState({ leads: 0, replies: 0, closed: 0, revenue: 0 });

  useEffect(() => { (async () => {
    if (!userId) return;
    const [{ data: cls }, { data: inv }, { data: comm }] = await Promise.all([
      workspaceDb.from("work_clients").select("*").eq("owner_id", userId),
      workspaceDb.from("work_invoices").select("*").eq("owner_id", userId),
      workspaceDb.from("work_comm_logs").select("*").eq("owner_id", userId),
    ]);
    const clients = (cls || []) as WorkClient[];
    const invoices = (inv || []) as WorkInvoice[];
    const comms = (comm || []) as WorkCommLog[];
    const closed = invoices.filter(i => i.status === "paid").length;
    const revenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
    const repliedClientIds = new Set(comms.map(c => c.client_id));
    setData({ leads: clients.length, replies: repliedClientIds.size, closed, revenue });
  })(); }, [userId]);

  const conv = data.leads ? Math.round((data.closed / data.leads) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-600" /><h2 className="font-semibold">Pipeline Analytics</h2></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-slate-500">Leads</div><div className="text-2xl font-bold mt-1">{data.leads}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Replied / engaged</div><div className="text-2xl font-bold mt-1">{data.replies}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Closed (paid)</div><div className="text-2xl font-bold text-emerald-700 mt-1">{data.closed}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Conversion</div><div className="text-2xl font-bold mt-1">{conv}%</div></Card>
      </div>
      <Card className="p-5">
        <div className="text-sm text-slate-600 mb-2">Total revenue (paid invoices)</div>
        <div className="text-3xl font-bold text-emerald-700">₹{data.revenue.toLocaleString()}</div>
      </Card>
    </div>
  );
}