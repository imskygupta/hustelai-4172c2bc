import { blogDb } from "@/integrations/blog/db";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, Plus, Send, Trash2, Edit3, Eye } from "lucide-react";

type Tpl = any;

const CATEGORIES = ["transactional", "marketing", "lifecycle"] as const;

export function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [editing, setEditing] = useState<Tpl | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await blogDb.from("email_templates" as any).select("*").order("category").order("name");
    setTemplates((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const blank = (): Tpl => ({
    slug: "", name: "", category: "transactional", subject: "", html: "", preview_text: "",
    preferred_provider: "auto", is_active: true, variables: [],
  });

  const save = async () => {
    if (!editing?.slug || !editing.name || !editing.subject || !editing.html) {
      toast.error("slug, name, subject, html required"); return;
    }
    setLoading(true);
    const payload = { ...editing };
    if (typeof payload.variables === "string") {
      try { payload.variables = JSON.parse(payload.variables); } catch { payload.variables = []; }
    }
    const { error } = editing.id
      ? await blogDb.from("email_templates" as any).update(payload).eq("id", editing.id)
      : await blogDb.from("email_templates" as any).insert(payload);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setEditing(null); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await blogDb.from("email_templates" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const sendTest = async (slug: string) => {
    if (!testEmail) { toast.error("Enter test email"); return; }
    const { error } = await supabase.functions.invoke("mailer-send", {
      body: { to: testEmail, template: slug, data: { name: "Test User", amount: 999, plan_label: "Pro Plan", invoice_number: "INV-TEST", tier: "PRO", perks_html: "<li>Test perk</li>", otp: "123456", reset_url: "#", resume_url: "#", tier_pitch: "Test pitch", subject_line: "Test", subject: "Test", title: "Hello", body_html: "<p>Test body</p>" } },
    });
    if (error) toast.error(error.message); else toast.success(`Test sent to ${testEmail}`);
  };

  const filtered = templates.filter(t => filter === "all" || t.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Mail className="w-5 h-5" /> Email Templates</h2>
          <p className="text-sm text-muted-foreground">Editable templates rendered with {`{{variables}}`}. Sent via Brevo → MailerSend fallback.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="test@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="w-56" />
          <Button onClick={() => setEditing(blank())}><Plus className="w-4 h-4 mr-1" /> New template</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map(t => (
          <Card key={t.id}>
            <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{t.name}</span>
                  <Badge variant="outline" className="text-xs">{t.slug}</Badge>
                  <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                  {t.preferred_provider && t.preferred_provider !== "auto" && (
                    <Badge className="text-xs">{t.preferred_provider}</Badge>
                  )}
                  {!t.is_active && <Badge variant="destructive" className="text-xs">disabled</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{t.subject}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setPreviewOpen(true); }}><Eye className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => sendTest(t.slug)}><Send className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...t, variables: JSON.stringify(t.variables || []) })}><Edit3 className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No templates yet.</p>}
      </div>

      {editing && !previewOpen && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-base">{editing.id ? "Edit template" : "New template"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Slug (unique key)</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="welcome" /></div>
              <div><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Category</Label>
                <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Preferred provider</Label>
                <Select value={editing.preferred_provider || "auto"} onValueChange={v => setEditing({ ...editing, preferred_provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (use default)</SelectItem>
                    <SelectItem value="brevo">Brevo</SelectItem>
                    <SelectItem value="mailersend">MailerSend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Subject (supports {`{{vars}}`})</Label><Input value={editing.subject} onChange={e => setEditing({ ...editing, subject: e.target.value })} /></div>
            <div><Label>Preview text</Label><Input value={editing.preview_text || ""} onChange={e => setEditing({ ...editing, preview_text: e.target.value })} /></div>
            <div><Label>HTML body</Label><Textarea rows={14} className="font-mono text-xs" value={editing.html} onChange={e => setEditing({ ...editing, html: e.target.value })} /></div>
            <div><Label>Variables (JSON array)</Label><Input value={typeof editing.variables === "string" ? editing.variables : JSON.stringify(editing.variables || [])} onChange={e => setEditing({ ...editing, variables: e.target.value })} placeholder='["name","amount"]' /></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={loading}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editing && previewOpen && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-base">Preview: {editing.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Subject: {editing.subject}</div>
            <iframe srcDoc={editing.html} className="w-full h-[500px] border rounded" sandbox="" />
            <Button variant="outline" className="mt-3" onClick={() => { setEditing(null); setPreviewOpen(false); }}>Close</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}