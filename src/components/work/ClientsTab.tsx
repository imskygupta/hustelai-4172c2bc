import { useEffect, useState } from "react";
import { workspaceDb, type WorkClient } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

export function ClientsTab({ userId }: { userId?: string }) {
  const [items, setItems] = useState<WorkClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", hourly_rate: "", notes: "" });

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await workspaceDb.from("work_clients").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setItems((data || []) as WorkClient[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function save() {
    if (!userId || !form.name) return toast.error("Name required");
    const { error } = await workspaceDb.from("work_clients").insert({
      owner_id: userId, name: form.name, email: form.email || null, phone: form.phone || null,
      company: form.company || null, hourly_rate: Number(form.hourly_rate) || 0, notes: form.notes || null, status: "active",
    });
    if (error) return toast.error(error.message);
    toast.success("Client added");
    setOpen(false); setForm({ name: "", email: "", phone: "", company: "", hourly_rate: "", notes: "" }); load();
  }
  async function remove(id: string) { await workspaceDb.from("work_clients").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4" /> Clients</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Client</Button>
      </div>
      {loading ? <div className="text-center py-12 text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div> :
        items.length === 0 ? <Card className="p-12 text-center text-slate-500">No clients yet — your CRM starts here.</Card> :
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(c => (
            <Card key={c.id} className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">{c.name[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500 truncate">{c.company || c.email || "—"}</div>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {c.status && <Badge variant="outline" className="text-[10px]">{c.status}</Badge>}
                  {c.hourly_rate > 0 && <Badge variant="outline" className="text-[10px]">₹{c.hourly_rate}/hr</Badge>}
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
            </Card>
          ))}
        </div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input type="number" placeholder="Hourly rate (INR)" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} />
            <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}