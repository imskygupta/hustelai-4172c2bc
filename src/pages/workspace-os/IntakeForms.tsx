import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Inbox, Plus, Power, Trash2 } from "lucide-react";
import { intakeApi, DEFAULT_INTAKE_FIELDS } from "@/lib/intake-os/api";

export default function IntakeForms() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try { const r = await intakeApi("form.list"); setForms(r.rows || []); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) return toast.error("Add a title");
    setCreating(true);
    try {
      await intakeApi("form.create", { title, description, fields: DEFAULT_INTAKE_FIELDS });
      setTitle(""); setDescription("");
      toast.success("Intake form created");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  const toggle = async (f: any) => {
    try { await intakeApi("form.update", { id: f.id, is_active: !f.is_active }); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this form? Submissions remain.")) return;
    try { await intakeApi("form.delete", { id }); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/intake/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Client Intake OS</h2>
        <p className="text-sm text-muted-foreground">Magic public forms → AI analysis → workspace.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-medium">New intake form</h3>
        <Input placeholder="Form title (e.g. New project intake)" value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea rows={2} placeholder="Short description shown to clients" value={description} onChange={e => setDescription(e.target.value)} />
        <Button onClick={create} disabled={creating}><Plus className="h-4 w-4 mr-1" />{creating ? "Creating..." : "Create form"}</Button>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && forms.length === 0 && <p className="text-sm text-muted-foreground">No forms yet.</p>}
        {forms.map(f => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{f.title}</p>
                <Badge variant={f.is_active ? "default" : "secondary"}>{f.is_active ? "Live" : "Off"}</Badge>
                <Badge variant="outline">{f.submission_count || 0} submissions</Badge>
              </div>
              <code className="text-[11px] text-muted-foreground">/intake/{f.slug}</code>
            </div>
            <Button size="sm" variant="outline" onClick={() => copyLink(f.slug)}><Copy className="h-3.5 w-3.5" /></Button>
            <Link to={`/workspaces/intake/${f.id}`}><Button size="sm" variant="outline"><Inbox className="h-3.5 w-3.5" /></Button></Link>
            <Button size="sm" variant="ghost" onClick={() => toggle(f)}><Power className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}