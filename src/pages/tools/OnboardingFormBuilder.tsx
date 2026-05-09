import { useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2, Copy, Link2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { TierLockOverlay } from "@/components/tools/TierLockOverlay";
import { useAuth } from "@/hooks/useAuth";
import type { Tier } from "@/lib/feature-flags";
import { toast } from "sonner";

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
  const { profile } = useAuth();
  const tier = ((profile?.subscription_tier as Tier) || "free");
  const [tpl, setTpl] = useState<Template>(TEMPLATES[0]);

  const updateField = (id: string, patch: Partial<Field>) =>
    setTpl({ ...tpl, fields: tpl.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  const removeField = (id: string) =>
    setTpl({ ...tpl, fields: tpl.fields.filter(f => f.id !== id) });
  const addField = () =>
    setTpl({ ...tpl, fields: [...tpl.fields, { id: newId(), label: "New question", type: "text", required: false }] });

  const shareLink = useMemo(() => {
    try {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ name: tpl.name, fields: tpl.fields }))));
      return `${window.location.origin}/intake/preview?d=${payload.slice(0, 80)}…`;
    } catch { return ""; }
  }, [tpl]);

  return (
    <ToolPageLayout
      title="Client Onboarding Form Builder"
      subtitle="Build a branded intake form, share a public link, manage replies inside HustleAI."
      icon={ClipboardList}
      path="/tools/onboarding-form"
      accent="from-emerald-500 to-teal-600"
      back={{ href: "/tools", label: "All tools" }}
    >
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
          <TierLockOverlay toolName="Form Builder" requiredTier="pro" userTier={tier}>
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
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shareLink); toast.success("Link copied"); }}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
              </div>

              <p className="mt-3 text-[11px] text-slate-500">
                Manage all replies inside <Badge variant="outline" className="ml-1">HustleAI Workspace</Badge> → Intake Inbox.
              </p>
            </Card>
          </TierLockOverlay>
        </div>
      </div>
    </ToolPageLayout>
  );
}