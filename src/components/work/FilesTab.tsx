import { useEffect, useState } from "react";
import { workspaceDb, type WorkFile, type WorkClient } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ExternalLink, Star, FolderOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function FilesTab({ userId }: { userId?: string }) {
  const [items, setItems] = useState<WorkFile[]>([]);
  const [clients, setClients] = useState<WorkClient[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", version: "v1", client_id: "none" });

  async function load() {
    if (!userId) return;
    const [{ data: f }, { data: c }] = await Promise.all([
      workspaceDb.from("work_files").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
      workspaceDb.from("work_clients").select("*").eq("owner_id", userId),
    ]);
    setItems((f || []) as WorkFile[]);
    setClients((c || []) as WorkClient[]);
  }
  useEffect(() => { load(); }, [userId]);

  async function save() {
    if (!userId || !form.name || !form.url) return toast.error("Name & link required");
    const { error } = await workspaceDb.from("work_files").insert({
      owner_id: userId, name: form.name, url: form.url, version: form.version,
      client_id: form.client_id === "none" ? null : form.client_id,
    });
    if (error) return toast.error(error.message);
    toast.success("File added"); setOpen(false); setForm({ name: "", url: "", version: "v1", client_id: "none" }); load();
  }
  async function toggleFinal(f: WorkFile) {
    await workspaceDb.from("work_files").update({ is_final: !f.is_final }).eq("id", f.id); load();
  }
  async function remove(id: string) { await workspaceDb.from("work_files").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Delivery Hub</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add file link</Button>
      </div>
      {items.length === 0 ? <Card className="p-12 text-center text-slate-500">No deliveries yet. Drop your Drive / Figma / Dropbox links here.</Card> :
        <div className="space-y-2">
          {items.map(f => {
            const client = clients.find(c => c.id === f.client_id);
            return (
              <Card key={f.id} className="p-3 flex items-center gap-3">
                <Button size="icon" variant="ghost" onClick={() => toggleFinal(f)}><Star className={`w-4 h-4 ${f.is_final ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></Button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{f.name}</div>
                  <div className="text-[11px] text-slate-500">{client?.name || "—"} · {f.version}{f.is_final && " · final"}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{f.version}</Badge>
                <a href={f.url} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost"><ExternalLink className="w-4 h-4" /></Button></a>
                <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
              </Card>
            );
          })}
        </div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add delivery link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="File name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="URL (Drive, Figma, Dropbox…) *" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
            <Input placeholder="Version" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={save}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}