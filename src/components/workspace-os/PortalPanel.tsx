import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, Copy, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

function genToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export default function PortalPanel({ workspaceId, ownerId }: { workspaceId: string; ownerId: string }) {
  const [portals, setPortals] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const load = async () => {
    const [{ data: p }, { data: e }] = await Promise.all([
      (supabase as any).from("workspace_portals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
      (supabase as any).from("workspace_client_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    ]);
    setPortals(p || []); setEvents(e || []);
  };
  useEffect(() => { load(); }, [workspaceId]);

  const create = async () => {
    const { error } = await (supabase as any).from("workspace_portals").insert({
      workspace_id: workspaceId, owner_id: ownerId, token: genToken(),
    });
    if (error) return toast.error(error.message);
    load();
  };

  const updateFlag = async (p: any, key: string, value: boolean) => {
    await (supabase as any).from("workspace_portals").update({ [key]: value }).eq("id", p.id);
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("workspace_portals").delete().eq("id", id);
    load();
  };

  const copy = (token: string) => {
    const url = `${window.location.origin}/p/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Portal link copied");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Client portal</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Share a tokenized link. No login required for the client.</p>
          </div>
          <Button onClick={create}>Create portal link</Button>
        </div>

        {portals.map(p => (
          <div key={p.id} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs px-2 py-1.5 rounded bg-muted/50 truncate">{`${window.location.origin}/p/${p.token}`}</code>
              <Button size="sm" variant="outline" onClick={() => copy(p.token)}><Copy className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views || 0} views</span>
              {p.last_viewed_at && <span>Last viewed {formatDistanceToNow(new Date(p.last_viewed_at), { addSuffix: true })}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {[
                ["show_docs", "Show documents"],
                ["show_tasks", "Show tasks"],
                ["show_payments", "Show payments"],
                ["show_reminders", "Show reminders"],
                ["show_notes", "Show internal notes"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!p[key]} onChange={e => updateFlag(p, key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
        {portals.length === 0 && <p className="text-xs text-muted-foreground py-2">No portal links yet.</p>}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-3">Client engagement</h3>
        {events.length === 0 ? <p className="text-xs text-muted-foreground">No client activity yet.</p> : (
          <ul className="space-y-2">
            {events.map(e => (
              <li key={e.id} className="flex justify-between text-sm">
                <span className="capitalize">{e.event_type.replace(/_/g, " ")}{e.target_type ? ` · ${e.target_type}` : ""}</span>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}