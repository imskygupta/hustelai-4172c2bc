import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CRM_STATUSES, type Workspace } from "@/lib/workspace-os/types";
import { toast } from "sonner";
import { Building2, Mail, Phone, Globe, Tag, FileText } from "lucide-react";

export default function CRMPanel({ workspace, onUpdate }: { workspace: Workspace; onUpdate: (w: Workspace) => void }) {
  const [form, setForm] = useState<any>(workspace);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(workspace), [workspace.id]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const patch = {
      company_name: form.company_name,
      logo_url: form.logo_url,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      timezone: form.timezone,
      source: form.source,
      tags: typeof form.tags === "string" ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : form.tags,
      notes: form.notes,
      status: form.status,
      lifetime_value: Number(form.lifetime_value) || 0,
    };
    const { data, error } = await (supabase as any).from("workspaces").update(patch).eq("id", workspace.id).select().maybeSingle();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Client updated");
    if (data) onUpdate(data);
  };

  const tagsValue = Array.isArray(form.tags) ? form.tags.join(", ") : (form.tags || "");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
          {form.logo_url ? <img src={form.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-primary" />}
        </div>
        <div>
          <h3 className="text-base font-semibold">Client profile</h3>
          <p className="text-xs text-muted-foreground">Full CRM record for {workspace.client_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Company"><Input value={form.company_name || ""} onChange={e => set("company_name", e.target.value)} placeholder="Acme Inc." /></Field>
        <Field label="Logo URL"><Input value={form.logo_url || ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." /></Field>
        <Field label="Contact email" icon={Mail}><Input type="email" value={form.contact_email || ""} onChange={e => set("contact_email", e.target.value)} /></Field>
        <Field label="Phone" icon={Phone}><Input value={form.contact_phone || ""} onChange={e => set("contact_phone", e.target.value)} /></Field>
        <Field label="Timezone" icon={Globe}><Input value={form.timezone || ""} onChange={e => set("timezone", e.target.value)} placeholder="Asia/Kolkata" /></Field>
        <Field label="Source"><Input value={form.source || ""} onChange={e => set("source", e.target.value)} placeholder="Twitter / Upwork / Referral" /></Field>
        <Field label="Status">
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.status || "active"} onChange={e => set("status", e.target.value)}>
            {CRM_STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Lifetime value (₹)"><Input type="number" value={form.lifetime_value || 0} onChange={e => set("lifetime_value", e.target.value)} /></Field>
        <Field label="Tags (comma separated)" icon={Tag}><Input value={tagsValue} onChange={e => set("tags", e.target.value)} /></Field>
      </div>

      <Field label="Internal notes" icon={FileText}>
        <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={4} placeholder="Anything important to remember about this client..." />
      </Field>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </Label>
      {children}
    </div>
  );
}