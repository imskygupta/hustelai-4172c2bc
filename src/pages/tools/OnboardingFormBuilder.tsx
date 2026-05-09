import { useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2, Copy, Link2, Sparkles, Loader2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { useToolGate } from "@/components/tools/ToolGate";
import { SignupCTADialog } from "@/components/SignupCTADialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const faqs = [
  { q: "Is the form builder really free?", a: "Yes. You can pick a template, edit fields, preview and copy a share-link in your browser — no signup. Sign up free to publish a real public form, collect replies, and route them into your HustleAI workspace inbox." },
  { q: "What templates are included?", a: "Three battle-tested intake templates used by US, UK, EU, AU and Indian freelancers — Design Project Intake, Video Editor Intake and Consulting Discovery. Edit any field or add your own." },
  { q: "Can clients fill the form on mobile?", a: "Yes. The published form is mobile-first, accessible (WCAG-aligned), and works on every browser including iOS Safari and Android Chrome." },
  { q: "Where do replies go?", a: "Once you sign up and publish, replies land in your HustleAI Workspace → Intake Inbox. From there you can convert any reply into a CRM contact, proposal or invoice in one click." },
  { q: "Is the form GDPR / DPDP friendly?", a: "Yes. We don't sell or share data, store replies in your private workspace, and export-on-demand is one click — meeting GDPR (EU/UK) and India's DPDP requirements." },
];

/**
 * Client Onboarding Form Builder — browser-only, template-driven.
 * Pro+ unlocks editing & generated share links (mock — uses base64 URL).
 * Free tier sees the templates as a preview.
 */

type FieldType = "text" | "textarea" | "email" | "select" | "url";
interface Field { id: string; label: string; type: FieldType; required: boolean; options?: string }
interface Template { id: string; name: string; tagline: string; fields: Field[] }

const newId = () => Math.random().toString(36).slice(2, 9);

const TEMPLATES: Template[] = [
  {
    id: "design", name: "Design Project Intake", tagline: "Brand, scope, deliverables, timeline",
    fields: [
      { id: newId(), label: "Brand / company name", type: "text", required: true },
      { id: newId(), label: "Email", type: "email", required: true },
      { id: newId(), label: "Project type", type: "select", options: "Logo, Website, App, Branding kit", required: true },
      { id: newId(), label: "Tell us about your goals", type: "textarea", required: true },
      { id: newId(), label: "Inspiration links (Figma, Dribbble)", type: "url", required: false },
      { id: newId(), label: "Deadline", type: "text", required: false },
    ],
  },
  {
    id: "video", name: "Video Editor Intake", tagline: "Footage, brand, cuts, deadline",
    fields: [
      { id: newId(), label: "Channel / brand", type: "text", required: true },
      { id: newId(), label: "Email", type: "email", required: true },
      { id: newId(), label: "Footage drop link (Drive / Dropbox)", type: "url", required: true },
      { id: newId(), label: "Final length", type: "text", required: true },
      { id: newId(), label: "Style references", type: "textarea", required: false },
    ],
  },
  {
    id: "consult", name: "Consulting Discovery", tagline: "Goals, blockers, budget, timeline",
    fields: [
      { id: newId(), label: "Full name", type: "text", required: true },
      { id: newId(), label: "Email", type: "email", required: true },
      { id: newId(), label: "Company stage", type: "select", options: "Idea, Pre-seed, Seed, Series A+, Bootstrapped", required: true },
      { id: newId(), label: "Top 3 outcomes you want", type: "textarea", required: true },
      { id: newId(), label: "Monthly budget range", type: "select", options: "<25k, 25k–50k, 50k–1L, 1L+", required: true },
    ],
  },
];

export default function OnboardingFormBuilder() {
  const { guard, gate } = useToolGate("intake-form", "publish your intake form");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tpl, setTpl] = useState<Template>(TEMPLATES[0]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const updateField = (id: string, patch: Partial<Field>) =>
    setTpl({ ...tpl, fields: tpl.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  const removeField = (id: string) =>
    setTpl({ ...tpl, fields: tpl.fields.filter(f => f.id !== id) });
  const addField = () =>
    setTpl({ ...tpl, fields: [...tpl.fields, { id: newId(), label: "New question", type: "text", required: false }] });

  const runAI = async () => {
    if (aiPrompt.trim().length < 10) {
      toast.error("Describe your business in 10+ characters.");
      return;
    }
    if (!user) { setSignupOpen(true); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("workspace-doc-ai", {
        body: { task: "tool_intake_form", prompt: aiPrompt },
      });
      if (error) {
        const msg = (error as any)?.context?.responseText || error.message || "";
        if (msg.includes("quota") || msg.includes("limit")) {
          toast("AI quota reached", {
            description: "Upgrade to Pro for more daily AI generations.",
            action: { label: "Upgrade", onClick: () => navigate("/plans") },
          });
        } else toast.error("AI generation failed.");
        return;
      }
      const r = data?.result;
      if (!r?.fields?.length) { toast.error("AI returned no fields."); return; }
      setTpl({
        id: "ai-" + newId(),
        name: r.name || "AI Intake Form",
        tagline: "Generated by AI",
        fields: r.fields.map((f: any) => ({
          id: newId(),
          label: String(f.label || "Question"),
          type: (["text","textarea","email","url","select"].includes(f.type) ? f.type : "text") as FieldType,
          required: !!f.required,
          options: f.options || undefined,
        })),
      });
      toast.success("AI form ready — tweak any field below.");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setAiLoading(false);
    }
  };

  const shareLink = useMemo(() => {
    try {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ name: tpl.name, fields: tpl.fields }))));
      return `${window.location.origin}/intake/preview?d=${payload.slice(0, 80)}…`;
    } catch { return ""; }
  }, [tpl]);

  return (
    <ToolPageLayout
      title="Client Onboarding Form Builder"
      metaTitle="Free Client Onboarding Form Builder for Freelancers | HustleAI"
      metaDescription="Free client intake form builder for freelancers and agencies in the US, UK, EU, AU and India. 3 templates, drag-edit fields, share a public link, manage replies inside HustleAI."
      subtitle="Build a branded intake form, share a public link, manage replies inside HustleAI."
      icon={ClipboardList}
      path="/tools/onboarding-form"
      toolKey="intake-form"
      accent="from-emerald-500 to-teal-600"
      back={{ href: "/tools", label: "All tools" }}
      faqs={faqs}
    >
      <Card className="p-5 mb-4 border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-900">Let AI build your intake form</div>
            <div className="text-xs text-slate-600">Describe your service — we'll generate the right questions in seconds.</div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. I'm a wedding photographer in Mumbai. Need to ask about event date, venue, hours, package, deliverables and budget."
            className="min-h-[80px] bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500">
              {user ? "Uses your daily AI quota." : "Free preview — sign up to generate with AI."}
            </div>
            <Button onClick={runAI} disabled={aiLoading} className="bg-slate-900 hover:bg-slate-800 text-white">
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : user ? <Sparkles className="w-3.5 h-3.5 mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
              {user ? "Generate form with AI" : "Sign up to generate"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-12 gap-5">
        <Card className="p-4 lg:col-span-3 h-fit">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">Templates</div>
          <div className="space-y-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTpl(t)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition ${tpl.id === t.id ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200 hover:border-emerald-200"}`}
              >
                <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t.tagline}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-9 space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Input value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} className="text-base font-semibold" />
                <Button size="sm" variant="outline" onClick={addField}><Plus className="w-3.5 h-3.5 mr-1" /> Add field</Button>
              </div>

              <div className="space-y-3">
                {tpl.fields.map((f) => (
                  <div key={f.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} className="flex-1 min-w-[180px]" />
                      <select
                        value={f.type}
                        onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}
                        className="h-9 rounded-md border border-slate-200 text-sm px-2 bg-white"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Long text</option>
                        <option value="email">Email</option>
                        <option value="url">URL</option>
                        <option value="select">Select</option>
                      </select>
                      <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} />
                        Required
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => removeField(f.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {f.type === "select" && (
                      <div className="mt-2">
                        <Label className="text-[10px] text-slate-500">Options (comma-separated)</Label>
                        <Input value={f.options || ""} onChange={(e) => updateField(f.id, { options: e.target.value })} className="mt-1 text-xs" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 flex items-center gap-3">
                <Link2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Share link (preview)</div>
                  <div className="text-xs text-slate-700 truncate">{shareLink}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => guard(() => { navigator.clipboard.writeText(shareLink); toast.success("Link copied"); }, "publish & share your intake form")}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
              </div>

              <p className="mt-3 text-[11px] text-slate-500">
                Manage all replies inside <Badge variant="outline" className="ml-1">HustleAI Workspace</Badge> → Intake Inbox.
              </p>
            </Card>
        </div>
      </div>
      {gate}
      <SignupCTADialog open={signupOpen} onClose={() => setSignupOpen(false)} query={aiPrompt} />
    </ToolPageLayout>
  );
}