import { useEffect, useMemo, useRef, useState } from "react";
import { workspaceDb, type WorkTimeEntry, type WorkClient } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Loader2, Trash2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

function fmt(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TimeTab({ userId }: { userId?: string }) {
  const [entries, setEntries] = useState<WorkTimeEntry[]>([]);
  const [clients, setClients] = useState<WorkClient[]>([]);
  const [running, setRunning] = useState<{ startedAt: number; clientId: string | null; description: string; rate: number } | null>(null);
  const [tick, setTick] = useState(0);
  const [desc, setDesc] = useState("");
  const [clientId, setClientId] = useState<string>("none");
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  async function load() {
    if (!userId) return;
    setLoading(true);
    const [{ data: ents }, { data: cls }] = await Promise.all([
      workspaceDb.from("work_time_entries").select("*").eq("owner_id", userId).order("started_at", { ascending: false }).limit(50),
      workspaceDb.from("work_clients").select("*").eq("owner_id", userId),
    ]);
    setEntries((ents || []) as WorkTimeEntry[]);
    setClients((cls || []) as WorkClient[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  useEffect(() => {
    if (running) { timer.current = window.setInterval(() => setTick(t => t + 1), 1000); }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  function start() {
    const c = clients.find(x => x.id === clientId);
    setRunning({ startedAt: Date.now(), clientId: clientId === "none" ? null : clientId, description: desc, rate: c?.hourly_rate || 0 });
  }
  async function stop() {
    if (!running || !userId) return;
    const dur = Math.floor((Date.now() - running.startedAt) / 1000);
    const { error } = await workspaceDb.from("work_time_entries").insert({
      owner_id: userId, client_id: running.clientId, description: running.description || null,
      started_at: new Date(running.startedAt).toISOString(), ended_at: new Date().toISOString(),
      duration_seconds: dur, hourly_rate: running.rate,
    });
    if (error) return toast.error(error.message);
    setRunning(null); setDesc(""); load(); toast.success(`Logged ${fmt(dur)}`);
  }
  async function remove(id: string) { await workspaceDb.from("work_time_entries").delete().eq("id", id); load(); }

  async function invoiceFromEntry(e: WorkTimeEntry) {
    if (!userId) return;
    const hours = e.duration_seconds / 3600;
    const amount = Math.round(hours * (e.hourly_rate || 0));
    if (amount <= 0) return toast.error("Set hourly rate on the client first");
    const client = clients.find(c => c.id === e.client_id);
    const { error } = await workspaceDb.from("work_invoices").insert({
      owner_id: userId, client_name: client?.name || "Untitled",
      service: `${hours.toFixed(2)} hrs · ${e.description || "Work"}`,
      amount, currency: "INR", status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success(`Invoice ₹${amount} drafted`);
  }

  const totalToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return entries.filter(e => new Date(e.started_at) >= start).reduce((s, e) => s + e.duration_seconds, 0);
  }, [entries]);

  const elapsed = running ? Math.floor((Date.now() + tick * 0 - running.startedAt) / 1000) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white">
        <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-emerald-600" /><span className="font-semibold text-slate-900">Time Tracker</span></div>
        <div className="flex flex-col md:flex-row gap-3">
          <Input placeholder="What are you working on?" value={desc} onChange={e => setDesc(e.target.value)} disabled={!!running} />
          <Select value={clientId} onValueChange={setClientId} disabled={!!running}>
            <SelectTrigger className="md:w-[200px]"><SelectValue placeholder="Client (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {!running ? (
            <Button onClick={start} className="bg-emerald-600 hover:bg-emerald-700"><Play className="w-4 h-4 mr-1" /> Start</Button>
          ) : (
            <Button onClick={stop} variant="destructive"><Square className="w-4 h-4 mr-1" /> Stop · {fmt(elapsed)}</Button>
          )}
        </div>
        <div className="mt-3 text-xs text-slate-500">Today: <span className="font-semibold text-slate-900">{fmt(totalToday)}</span></div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Recent entries</h3>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
          entries.length === 0 ? <p className="text-sm text-slate-500">No time logged yet.</p> :
          <div className="space-y-2">
            {entries.map(e => {
              const client = clients.find(c => c.id === e.client_id);
              const earned = (e.duration_seconds / 3600) * e.hourly_rate;
              return (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50">
                  <div className="w-20 font-mono text-sm text-slate-700">{fmt(e.duration_seconds)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900 truncate">{e.description || "Untitled"}</div>
                    <div className="text-[11px] text-slate-500">{client?.name || "—"} · {new Date(e.started_at).toLocaleString("en-IN")}</div>
                  </div>
                  {earned > 0 && <div className="text-sm font-semibold text-emerald-700">₹{Math.round(earned)}</div>}
                  <Button size="icon" variant="ghost" onClick={() => invoiceFromEntry(e)} title="Create invoice"><FileText className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                </div>
              );
            })}
          </div>}
      </Card>
    </div>
  );
}