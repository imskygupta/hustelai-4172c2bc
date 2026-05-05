import { useEffect, useState } from "react";
import { workspaceDb, type WorkCommLog, type WorkClient } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = ["call", "whatsapp", "email", "meeting", "note"];

export function CommTab({ userId }: { userId?: string }) {
  const [items, setItems] = useState<WorkCommLog[]>([]);
  const [clients, setClients] = useState<WorkClient[]>([]);
  const [form, setForm] = useState({ client_id: "", channel: "call", summary: "" });

  async function load() {
    if (!userId) return;
    const [{ data: l }, { data: c }] = await Promise.all([
      workspaceDb.from("work_comm_logs").select("*").eq("owner_id", userId).order("occurred_at", { ascending: false }).limit(100),
      workspaceDb.from("work_clients").select("*").eq("owner_id", userId),
    ]);
    setItems((l || []) as WorkCommLog[]);
    setClients((c || []) as WorkClient[]);
  }
  useEffect(() => { load(); }, [userId]);

  async function add() {
    if (!userId || !form.client_id || !form.summary) return toast.error("Pick client + summary");
    const { error } = await workspaceDb.from("work_comm_logs").insert({
      owner_id: userId, client_id: form.client_id, channel: form.channel, summary: form.summary,
    });
    if (error) return toast.error(error.message);
    setForm({ ...form, summary: "" }); load(); toast.success("Logged");
  }
  async function remove(id: string) { await workspaceDb.from("work_comm_logs").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-sky-600" /><span className="font-semibold">Log communication</span></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Client *" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="What happened?" className="md:col-span-1" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Log</Button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Timeline</h3>
        {items.length === 0 ? <div className="text-sm text-slate-500">No interactions logged yet.</div> :
          <div className="space-y-2">
            {items.map(l => {
              const c = clients.find(x => x.id === l.client_id);
              return (
                <div key={l.id} className="flex items-start gap-3 border-l-2 border-sky-300 pl-3 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900"><span className="font-semibold">{c?.name || "—"}</span> · <span className="text-slate-500 capitalize">{l.channel}</span></div>
                    <div className="text-sm text-slate-700">{l.summary}</div>
                    <div className="text-[10px] text-slate-400">{new Date(l.occurred_at).toLocaleString("en-IN")}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                </div>
              );
            })}
          </div>}
      </Card>
    </div>
  );
}