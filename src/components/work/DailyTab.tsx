import { useEffect, useMemo, useState } from "react";
import { workspaceDb, type WorkDailyLog } from "@/integrations/workspace/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export function DailyTab({ userId, onMissing, onReady }: { userId?: string; onMissing?: () => void; onReady?: () => void }) {
  const [logs, setLogs] = useState<WorkDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState({ proposals_sent: 0, leads_found: 0, clients_contacted: 0, notes: "" });

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await workspaceDb.from("work_daily_logs").select("*").eq("owner_id", userId).order("log_date", { ascending: false }).limit(30);
    if (error) { if (/relation .* does not exist|schema cache/i.test(error.message)) onMissing?.(); else toast.error(error.message); }
    else {
      onReady?.();
      const arr = (data || []) as WorkDailyLog[];
      setLogs(arr);
      const t = arr.find(l => l.log_date === todayISO());
      if (t) setToday({ proposals_sent: t.proposals_sent, leads_found: t.leads_found, clients_contacted: t.clients_contacted, notes: t.notes || "" });
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function save() {
    if (!userId) return;
    const { error } = await workspaceDb.from("work_daily_logs").upsert({ owner_id: userId, log_date: todayISO(), ...today }, { onConflict: "owner_id,log_date" });
    if (error) return toast.error(error.message);
    toast.success("Saved today's log 🔥"); load();
  }

  const streak = useMemo(() => {
    const set = new Set(logs.filter(l => l.proposals_sent + l.leads_found + l.clients_contacted > 0).map(l => l.log_date));
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (set.has(iso)) s++; else if (i > 0) break;
    }
    return s;
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-slate-500">Streak 🔥</div><div className="text-2xl font-bold text-orange-600 mt-1">{streak} <span className="text-sm text-slate-500">days</span></div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Proposals (today)</div><div className="text-2xl font-bold text-slate-900 mt-1">{today.proposals_sent}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Leads (today)</div><div className="text-2xl font-bold text-slate-900 mt-1">{today.leads_found}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Clients (today)</div><div className="text-2xl font-bold text-slate-900 mt-1">{today.clients_contacted}</div></Card>
      </div>
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Log today</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {([
            ["proposals_sent", "Proposals sent"],
            ["leads_found", "Leads found"],
            ["clients_contacted", "Clients contacted"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-slate-500 mb-1 block">{label}</label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setToday(t => ({ ...t, [k]: Math.max(0, (t[k] as number) - 1) }))}>−</Button>
                <Input type="number" value={today[k] as number} onChange={e => setToday(t => ({ ...t, [k]: Math.max(0, Number(e.target.value) || 0) }))} className="text-center" />
                <Button size="sm" variant="outline" onClick={() => setToday(t => ({ ...t, [k]: (t[k] as number) + 1 }))}>+</Button>
              </div>
            </div>
          ))}
        </div>
        <Textarea placeholder="Notes about today..." value={today.notes} onChange={e => setToday({ ...today, notes: e.target.value })} className="mb-3" />
        <Button onClick={save}>Save today</Button>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Last 30 days</h3>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
          logs.length === 0 ? <p className="text-sm text-slate-500">No logs yet — start your streak today.</p> :
          <div className="space-y-1.5">
            {logs.map(l => (
              <div key={l.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                <div className="w-24 text-slate-500 text-xs">{new Date(l.log_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                <div className="flex-1 flex gap-3 text-xs">
                  <span>📤 {l.proposals_sent}</span>
                  <span>🎯 {l.leads_found}</span>
                  <span>👥 {l.clients_contacted}</span>
                </div>
              </div>
            ))}
          </div>
        }
      </Card>
    </div>
  );
}