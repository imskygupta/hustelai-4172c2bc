import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Inbox, Plus, Power, Trash2, ExternalLink, Sparkles, ArrowUpRight } from "lucide-react";
import { intakeApi, DEFAULT_INTAKE_FIELDS } from "@/lib/intake-os/api";
import { INTAKE_TEMPLATES } from "@/lib/intake-os/templates";
import { INTAKE_THEMES, IntakeThemeId } from "@/lib/intake-os/themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { marketingUrl, MARKETING_ORIGIN, isDualHost } from "@/lib/host";

// Public intake forms always live on the marketing host (hustlaiapp.in) — never
// behind workspace.hustlaiapp.in's PortalGate. On dual/preview hosts we keep
// the current origin so dev links stay clickable.
function publicIntakeUrl(slug: string) {
  if (isDualHost()) return `${window.location.origin}/intake/${slug}`;
  return `${MARKETING_ORIGIN}/intake/${slug}`;
}

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
    const url = publicIntakeUrl(slug);
    navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-amber-50/80 via-white to-rose-50/60 p-6">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-amber-200/40 to-rose-200/40 blur-3xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1">Client Intake OS</p>
            <h2 className="text-2xl font-semibold tracking-tight leading-tight">Turn cold leads into briefed projects — in one link.</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              Send a branded form. AI summarises the brief, scores the lead, and drops a fresh project into your pipeline. Zero copy-paste.
            </p>
          </div>
        </div>
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
        {!loading && forms.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">No intake forms yet — pick a template above to ship your first one.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {forms.map(f => {
            const theme = INTAKE_THEMES.find(t => t.id === (f.settings?.theme || "minimal"));
            const url = publicIntakeUrl(f.slug);
            return (
              <div key={f.id} className="group relative rounded-2xl border border-border/60 bg-white hover:border-foreground/25 hover:shadow-[0_8px_28px_-14px_rgba(0,0,0,0.12)] transition-all overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-rose-300 to-violet-300 opacity-70" aria-hidden />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold tracking-tight truncate">{f.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full ${
                          f.is_active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-muted text-muted-foreground"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${f.is_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                          {f.is_active ? "Live" : "Off"}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground/80 px-1.5 py-0.5 rounded-full bg-muted/60">
                          {f.submission_count || 0} submission{(f.submission_count || 0) === 1 ? "" : "s"}
                        </span>
                        {theme && <span className="text-[10.5px] text-muted-foreground/70 px-1.5 py-0.5 rounded-full bg-muted/40">{theme.name}</span>}
                      </div>
                    </div>
                    <Link to={`/intake/inbox/${f.id}`} className="opacity-60 group-hover:opacity-100 transition" aria-label="Open submissions">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40">
                    <code className="text-[11px] text-muted-foreground truncate flex-1">{url}</code>
                    <button onClick={() => copyLink(f.slug)} className="text-muted-foreground hover:text-foreground transition" aria-label="Copy link">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a href={url} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground transition" aria-label="Preview">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Select value={f.settings?.theme || "minimal"} onValueChange={(v) => updateTheme(f, v as IntakeThemeId)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INTAKE_THEMES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Link to={`/intake/inbox/${f.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1"><Inbox className="h-3.5 w-3.5" />Inbox</Button>
                      </Link>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggle(f)} aria-label="Toggle"><Power className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(f.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}