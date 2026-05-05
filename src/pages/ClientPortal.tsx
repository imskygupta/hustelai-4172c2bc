import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { workspaceDb } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Loader2, Globe, FileText, AlarmClock, FolderOpen } from "lucide-react";

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => { (async () => {
    if (!token) return;
    const { data: portal } = await workspaceDb.from("work_portals").select("*").eq("token", token).maybeSingle();
    if (!portal) { setLoading(false); return; }
    const [{ data: client }, { data: files }, { data: deadlines }, { data: invoices }] = await Promise.all([
      workspaceDb.from("work_clients").select("*").eq("id", portal.client_id).maybeSingle(),
      workspaceDb.from("work_files").select("*").eq("client_id", portal.client_id).order("created_at", { ascending: false }),
      workspaceDb.from("work_deadlines").select("*").eq("client_id", portal.client_id).order("due_date"),
      workspaceDb.from("work_invoices").select("*").eq("owner_id", portal.owner_id).eq("client_name", (await workspaceDb.from("work_clients").select("name").eq("id", portal.client_id).maybeSingle()).data?.name || "").order("created_at", { ascending: false }),
    ]);
    setData({ client, files: files || [], deadlines: deadlines || [], invoices: invoices || [] });
    setLoading(false);
  })(); }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  if (!data?.client) return <div className="min-h-screen flex items-center justify-center text-slate-500">Portal not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-emerald-600" />
          <span className="text-xs uppercase tracking-wider text-slate-500">Client Workspace</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Hello, {data.client.name} 👋</h1>
        <p className="text-sm text-slate-600 mt-1">Here's your project at a glance.</p>

        <div className="mt-8 space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><FolderOpen className="w-4 h-4" /> Files & Deliveries</h2>
            {data.files.length === 0 ? <p className="text-sm text-slate-500">Nothing shared yet.</p> :
              <div className="space-y-2">{data.files.map((f: any) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
                  <span className="flex-1">{f.name}</span>
                  <span className="text-xs text-slate-500">{f.version}{f.is_final ? " · final" : ""}</span>
                </a>
              ))}</div>}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><AlarmClock className="w-4 h-4" /> Upcoming</h2>
            {data.deadlines.length === 0 ? <p className="text-sm text-slate-500">No upcoming items.</p> :
              <div className="space-y-1.5">{data.deadlines.map((d: any) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className={d.is_done ? "line-through text-slate-400" : ""}>{d.title}</span>
                  <span className="text-slate-500">{new Date(d.due_date).toLocaleDateString("en-IN")}</span>
                </div>
              ))}</div>}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><FileText className="w-4 h-4" /> Invoices</h2>
            {data.invoices.length === 0 ? <p className="text-sm text-slate-500">No invoices yet.</p> :
              <div className="space-y-1.5">{data.invoices.map((i: any) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span>{i.service}</span>
                  <span className="font-semibold">₹{Number(i.amount).toLocaleString()} · <span className="text-xs uppercase text-slate-500">{i.status}</span></span>
                </div>
              ))}</div>}
          </Card>

          <p className="text-center text-xs text-slate-400 pt-4">Powered by HustleAI · hustlaiapp.in</p>
        </div>
      </div>
    </div>
  );
}