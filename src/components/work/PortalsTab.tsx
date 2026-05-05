import { useEffect, useState } from "react";
import { workspaceDb, type WorkPortal, type WorkClient } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Copy, Globe } from "lucide-react";
import { toast } from "sonner";

function genToken() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
}

export function PortalsTab({ userId }: { userId?: string }) {
  const [items, setItems] = useState<WorkPortal[]>([]);
  const [clients, setClients] = useState<WorkClient[]>([]);
  const [pick, setPick] = useState<string>("");

  async function load() {
    if (!userId) return;
    const [{ data: p }, { data: c }] = await Promise.all([
      workspaceDb.from("work_portals").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
      workspaceDb.from("work_clients").select("*").eq("owner_id", userId),
    ]);
    setItems((p || []) as WorkPortal[]);
    setClients((c || []) as WorkClient[]);
  }
  useEffect(() => { load(); }, [userId]);

  async function create() {
    if (!userId || !pick) return toast.error("Pick a client");
    const { error } = await workspaceDb.from("work_portals").insert({ owner_id: userId, client_id: pick, token: genToken() });
    if (error) return toast.error(error.message);
    setPick(""); load(); toast.success("Portal link generated");
  }
  async function remove(id: string) { await workspaceDb.from("work_portals").delete().eq("id", id); load(); }

  function url(token: string) { return `${window.location.origin}/portal/${token}`; }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><Globe className="w-4 h-4 text-indigo-600" /><span className="font-semibold">Generate client portal</span></div>
        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Pick client" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={create}><Plus className="w-4 h-4 mr-1" /> Create</Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Public link clients can open — shows their files, deadlines, and latest invoice.</p>
      </Card>
      <div className="space-y-2">
        {items.map(p => {
          const c = clients.find(x => x.id === p.client_id);
          return (
            <Card key={p.id} className="p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{c?.name || "—"}</div>
                <div className="text-[11px] text-slate-500 truncate">{url(p.token)}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(url(p.token)); toast.success("Link copied"); }}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
            </Card>
          );
        })}
        {items.length === 0 && <Card className="p-12 text-center text-slate-500">No portals yet.</Card>}
      </div>
    </div>
  );
}