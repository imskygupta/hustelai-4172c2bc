import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Inbox, Plus, Power, Trash2 } from "lucide-react";
import { intakeApi, DEFAULT_INTAKE_FIELDS } from "@/lib/intake-os/api";
import { INTAKE_TEMPLATES } from "@/lib/intake-os/templates";
import { INTAKE_THEMES, IntakeThemeId } from "@/lib/intake-os/themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function IntakeForms() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [theme, setTheme] = useState<IntakeThemeId>("minimal");

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
      const tpl = INTAKE_TEMPLATES.find(t => t.id === templateId);
      const fields = tpl ? tpl.fields : DEFAULT_INTAKE_FIELDS;
      await intakeApi("form.create", {
        title, description, fields,
        settings: { theme },
      });
      setTitle(""); setDescription("");
      setTemplateId(""); setTheme("minimal");
      toast.success("Intake form created");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  const useTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = INTAKE_TEMPLATES.find(t => t.id === id);
    if (tpl && !title.trim()) setTitle(`${tpl.name} intake`);
    if (tpl && !description.trim()) setDescription(tpl.description);
  };

  const updateTheme = async (form: any, t: IntakeThemeId) => {
    try {
      await intakeApi("form.update", { id: form.id, settings: { ...(form.settings || {}), theme: t } });
      load();
    } catch (e: any) { toast.error(e.message); }
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

        <div>
          <p className="text-xs text-muted-foreground mb-2">Start from a template (optional)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {INTAKE_TEMPLATES.map(t => (
              <button key={t.id} type="button" onClick={() => useTemplate(t.id)}
                className={`text-left rounded-xl border p-3 transition ${
                  templateId === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}>
                <div className="text-lg leading-none">{t.icon}</div>
                <p className="text-xs font-medium mt-1">{t.name}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        <Input placeholder="Form title (e.g. New project intake)" value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea rows={2} placeholder="Short description shown to clients" value={description} onChange={e => setDescription(e.target.value)} />

        <div>
          <p className="text-xs text-muted-foreground mb-1">Visual theme</p>
          <Select value={theme} onValueChange={(v) => setTheme(v as IntakeThemeId)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INTAKE_THEMES.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name} — <span className="text-muted-foreground">{t.description}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            <Select value={f.settings?.theme || "minimal"} onValueChange={(v) => updateTheme(f, v as IntakeThemeId)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTAKE_THEMES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
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