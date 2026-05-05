import { useEffect, useState } from "react";
import { workspaceDb, type WorkDeadline, type WorkClient } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlarmClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return d;
}

export function DeadlinesTab({ userId }: { userId?: string }) {
  const [items, setItems] = useState<WorkDeadline[]>([]);
  const [clients, setClients] = useState<WorkClient[]>([]);
  const [form, setForm] = useState({ title: "", due_date: "", client_id: "none" });

  async function load() {
    if (!userId) return;
    const [{ data: d }, { data: c }] = await Promise.all([
      workspaceDb.from("work_deadlines").select("*").eq("owner_id", userId).order("due_date", { ascending: true }),
      workspaceDb.from("work_clients").select("*").eq("owner_id", userId),
    ]);
    setItems((d || []) as WorkDeadline[]);
    setClients((c || []) as WorkClient[]);
  }
  useEffect(() => { load(); }, [userId]);

  async function add() {
    if (!userId || !form.title || !form.due_date) return toast.error("Title + date");
    const { error } = await workspaceDb.from("work_deadlines").insert({
      owner_id: userId, title: form.title, due_date: form.due_date,
      client_id: form.client_id === "none" ? null : form.client_id,
    });
    if (error) return toast.error(error.message);
    setForm({ title: "", due_date: "", client_id: "none" }); load();
  }
  async function toggle(d: WorkDeadline) { await workspaceDb.from("work_deadlines").update({ is_done: !d.is_done }).eq("id", d.id); load(); }
  async function remove(id: string) { await workspaceDb.from("work_deadlines").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><AlarmClock className="w-4 h-4 text-rose-600" /><span className="font-semibold">Add deadline</span></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </Card>
      <div className="space-y-2">
        {items.map(d => {
          const left = daysLeft(d.due_date);
          const tone = d.is_done ? "text-emerald-600" : left < 0 ? "text-rose-700" : left <= 3 ? "text-amber-700" : "text-slate-700";
          const client = clients.find(c => c.id === d.client_id);
          return (
            <Card key={d.id} className="p-3 flex items-center gap-3">
              <input type="checkbox" checked={d.is_done} onChange={() => toggle(d)} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${d.is_done ? "line-through text-slate-400" : "text-slate-900"}`}>{d.title}</div>
                <div className="text-[11px] text-slate-500">{client?.name || "—"} · due {new Date(d.due_date).toLocaleDateString("en-IN")}</div>
              </div>
              <Badge variant="outline" className={`text-xs ${tone}`}>
                {d.is_done ? "done" : left < 0 ? `${Math.abs(left)}d overdue` : left === 0 ? "today" : `${left}d left`}
              </Badge>
              <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
            </Card>
          );
        })}
        {items.length === 0 && <Card className="p-12 text-center text-slate-500">No deadlines. Stay sharp.</Card>}
      </div>
    </div>
  );
}