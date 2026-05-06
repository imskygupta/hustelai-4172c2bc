import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import { type WorkspaceReminder } from "@/lib/workspace-os/types";
import { toast } from "sonner";

export default function RemindersList({ workspaceId, ownerId }: { workspaceId: string; ownerId: string }) {
  const [items, setItems] = useState<WorkspaceReminder[]>([]);
  const [form, setForm] = useState({ title: "", due_at: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("workspace_reminders").select("*").eq("workspace_id", workspaceId).order("due_at");
    setItems(data || []);
  };
  useEffect(() => { load(); }, [workspaceId]);

  const add = async () => {
    if (!form.title || !form.due_at) return toast.error("Title + due date required");
    const { error } = await (supabase as any).from("workspace_reminders").insert({
      workspace_id: workspaceId, owner_id: ownerId, title: form.title, due_at: new Date(form.due_at).toISOString(),
    });
    if (error) return toast.error(error.message);
    setForm({ title: "", due_at: "" }); load();
  };

  const toggle = async (r: WorkspaceReminder) => {
    await (supabase as any).from("workspace_reminders").update({ done: !r.done }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => {
    await (supabase as any).from("workspace_reminders").delete().eq("id", id);
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Reminders</h3>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Reminder title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <Input type="datetime-local" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} className="sm:w-56" />
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>

      <div className="space-y-1.5">
        {items.length === 0 && <p className="text-xs text-muted-foreground py-2">No reminders yet.</p>}
        {items.map(r => {
          const overdue = !r.done && new Date(r.due_at) < new Date();
          return (
            <div key={r.id} className={`flex items-center gap-2 rounded-lg border p-2 ${r.done ? "border-border/40 opacity-50" : overdue ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
              <button onClick={() => toggle(r)} className="h-5 w-5 rounded border border-border flex items-center justify-center hover:bg-muted">
                {r.done && <Check className="h-3 w-3 text-primary" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${r.done ? "line-through" : ""}`}>{r.title}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(r.due_at).toLocaleString()}</p>
              </div>
              {overdue && <span className="text-[10px] uppercase tracking-wider text-red-500">overdue</span>}
              <button onClick={() => remove(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}