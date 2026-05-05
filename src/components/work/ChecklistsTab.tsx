import { useEffect, useState } from "react";
import { workspaceDb, type WorkChecklist } from "@/integrations/workspace/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES: Record<string, string[]> = {
  "Website Project": ["Requirement gathering", "Wireframes", "Design mockups", "Development", "Client review", "Revisions", "Final delivery"],
  "Logo Design": ["Brief & moodboard", "Sketch concepts", "3 digital options", "Client feedback", "Refinement", "Deliver source files"],
  "Content Writing": ["Topic research", "Outline approval", "First draft", "SEO check", "Edits", "Publish"],
  "Video Editing": ["Footage review", "Rough cut", "Color & sound", "Client review", "Final export"],
  "Custom": ["New task"],
};

export function ChecklistsTab({ userId, onMissing, onReady }: { userId?: string; onMissing?: () => void; onReady?: () => void }) {
  const [items, setItems] = useState<WorkChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", template: "Website Project" });

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await workspaceDb.from("work_checklists").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    if (error) { if (/relation .* does not exist|schema cache/i.test(error.message)) onMissing?.(); else toast.error(error.message); }
    else { onReady?.(); setItems((data || []) as WorkChecklist[]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function create() {
    if (!userId || !form.title) return toast.error("Title required");
    const tasks = (TEMPLATES[form.template] || ["New task"]).map(label => ({ label, done: false }));
    const { error } = await workspaceDb.from("work_checklists").insert({ owner_id: userId, title: form.title, template: form.template, tasks });
    if (error) return toast.error(error.message);
    toast.success("Checklist created");
    setOpen(false); setForm({ title: "", template: "Website Project" }); load();
  }
  async function toggle(c: WorkChecklist, idx: number) {
    const tasks = c.tasks.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
    const { error } = await workspaceDb.from("work_checklists").update({ tasks }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setItems(prev => prev.map(p => p.id === c.id ? { ...p, tasks } : p));
  }
  async function remove(id: string) { await workspaceDb.from("work_checklists").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Project Checklists</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Project</Button>
      </div>
      {loading ? <div className="text-center py-12 text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div> :
        items.length === 0 ? <Card className="p-12 text-center text-slate-500">No projects yet. Pick a template and start.</Card> :
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(c => {
            const done = c.tasks.filter(t => t.done).length;
            const pct = c.tasks.length ? Math.round((done / c.tasks.length) * 100) : 0;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="text-[11px] text-slate-500">{c.template}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-slate-500 mb-2">{done}/{c.tasks.length} done · {pct}%</div>
                <div className="space-y-1.5">
                  {c.tasks.map((t, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={t.done} onChange={() => toggle(c, i)} className="rounded" />
                      <span className={t.done ? "line-through text-slate-400" : "text-slate-700"}>{t.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      }
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project title (e.g. Acme Corp Website)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Select value={form.template} onValueChange={v => setForm({ ...form, template: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(TEMPLATES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}