import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Loader2, Save, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DocPreview } from "@/components/workspace-docs/DocPreview";
import { ThemePicker } from "@/components/workspace-docs/ThemePicker";
import { defaultDoc } from "@/lib/workspace-docs/defaults";
import { exportNodeToPdf } from "@/lib/workspace-docs/export-pdf";
import { DOC_META } from "@/lib/workspace-docs/types";
import type { DocType, ThemeId } from "@/lib/workspace-docs/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import UpgradePrompt from "@/components/workspace-os/UpgradePrompt";
import type { EntitlementKey } from "@/lib/workspace-os/entitlements";

const PAID_TIERS = ["pro", "elite", "infinity"];

export default function DocEditor() {
  const { id, docId, type: typeParam } = useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();

  const [docType, setDocType] = useState<DocType>("quotation");
  const [docRow, setDocRow] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [themeId, setThemeId] = useState<ThemeId>("minimal-dark");
  const [title, setTitle] = useState("Untitled");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [upsell, setUpsell] = useState<EntitlementKey | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const tier = (profile as any)?.subscription_tier || "free";
  const watermark = !PAID_TIERS.includes(tier);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: ws } = await (supabase as any).from("workspaces").select("*").eq("id", id).maybeSingle();
      if (docId && docId !== "new") {
        const { data: row } = await (supabase as any).from("workspace_documents").select("*").eq("id", docId).maybeSingle();
        if (row) {
          setDocRow(row);
          setDocType(row.doc_type);
          setData(row.data);
          setThemeId(row.theme as ThemeId);
          setTitle(row.title);
        }
      } else if (typeParam) {
        const t = typeParam as DocType;
        setDocType(t);
        const d = defaultDoc(t, profile, ws);
        setData(d);
        setTitle(`${DOC_META[t].label.slice(0, -1)} for ${ws?.client_name || "client"}`);
      }
      setLoaded(true);
    })();
  }, [user, id, docId, typeParam, profile]);

  async function save() {
    if (!user || !id || !data) return;
    setSaving(true);
    const payload = {
      workspace_id: id,
      owner_id: user.id,
      doc_type: docType,
      title,
      data,
      theme: themeId,
      doc_number: data.number || null,
      due_at: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    };
    let res;
    if (docRow) {
      res = await (supabase as any).from("workspace_documents").update(payload).eq("id", docRow.id).select("*").single();
    } else {
      res = await (supabase as any).from("workspace_documents").insert(payload).select("*").single();
    }
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    setDocRow(res.data);
    toast.success("Saved");
    if (!docRow) nav(`/workspaces/${id}/docs/${res.data.id}`, { replace: true });
  }

  async function exportPdf() {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      // Server-side daily quota check
      const { data: q } = await supabase.rpc("consume_export_quota" as any, { _user_id: user!.id });
      if (q && (q as any).allowed === false) {
        setExporting(false);
        toast.error(`Daily export limit reached (${(q as any).used}/${(q as any).max} on ${(q as any).tier})`);
        setUpsell("unlimited_proposals");
        return;
      }
      const fmt = docType === "service_card" ? "square" : docType === "business_card" ? "card" : "a4";
      const filename = `${title.replace(/\s+/g, "-")}.pdf`;
      await exportNodeToPdf(previewRef.current, filename, fmt as any);
      // Log the export (best-effort)
      try {
        await (supabase as any).from("workspace_doc_exports").insert({
          user_id: user!.id, workspace_id: id, document_id: docRow?.id || null,
          doc_type: docType, filename,
        });
      } catch { /* non-fatal */ }
      toast.success("PDF exported");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function aiAssist(task: string, opts: { section?: string; input?: string; apply?: (r: any) => void } = {}) {
    setAiBusy(task);
    try {
      const ctx = JSON.stringify({ docType, brand: data?.brand?.name, client: data?.client, scope: data?.scope || data?.service }).slice(0, 1500);
      const { data: res, error } = await supabase.functions.invoke("workspace-doc-ai", {
        body: { task, context: ctx, section: opts.section, input: opts.input },
      });
      if (error || !res?.ok) {
        const msg = res?.message || res?.error || error?.message || "AI failed";
        toast.error(msg, { duration: 6000 });
        return;
      }
      opts.apply?.(res.result);
      toast.success("AI updated draft");
    } finally {
      setAiBusy(null);
    }
  }

  if (!loaded || !data) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => nav(`/workspaces/${id}/docs`)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All documents
        </button>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
          <button onClick={exportPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30 disabled:opacity-50">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
          </button>
        </div>
      </div>

      <Input value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent" />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Form panel */}
        <div className="space-y-5">
          <Section title="Theme">
            <ThemePicker value={themeId} onChange={setThemeId} />
          </Section>

          {watermark && (
            <button
              onClick={() => setUpsell("remove_watermark")}
              className="w-full text-left rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 transition-colors"
            >
              Free plan exports include a HustleAI watermark. <span className="underline font-medium">Upgrade to remove →</span>
            </button>
          )}

          <DocForm
            type={docType} data={data} setData={setData}
            aiBusy={aiBusy} aiAssist={aiAssist}
          />
        </div>
      </div>

      <UpgradePrompt
        open={!!upsell}
        onClose={() => setUpsell(null)}
        entitlement={upsell || "remove_watermark"}
        context="Workspace OS"
      />

      {/* Live preview wrapper closing handled below */}
      <div className="hidden">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="overflow-auto rounded-2xl border border-border bg-muted/30 p-6 max-h-[80vh]"
        >
          <div className="origin-top-left scale-[0.6] sm:scale-[0.75]">
            <DocPreview type={docType} data={data} themeId={themeId} watermark={watermark} refEl={el => (previewRef.current = el)} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function AIBtn({ busy, onClick, label }: any) {
  return (
    <button onClick={onClick} disabled={busy} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50">
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {label}
    </button>
  );
}

function DocForm({ type, data, setData, aiBusy, aiAssist }: any) {
  const update = (path: string, value: any) => {
    setData((d: any) => {
      const next = structuredClone(d);
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Section title="Brand">
        <Field label="Name"><Input value={data.brand.name} onChange={e => update("brand.name", e.target.value)} /></Field>
        <Field label="Tagline / role"><Input value={data.brand.tagline || ""} onChange={e => update("brand.tagline", e.target.value)} /></Field>
        <Field label="Logo URL (optional)"><Input value={data.brand.logo || ""} placeholder="https://…" onChange={e => update("brand.logo", e.target.value)} /></Field>
      </Section>

      {type === "quotation" && (
        <>
          <Section title="Client">
            <Field label="Name"><Input value={data.client.name} onChange={e => update("client.name", e.target.value)} /></Field>
            <Field label="Company"><Input value={data.client.company || ""} onChange={e => update("client.company", e.target.value)} /></Field>
          </Section>
          <Section title="Project">
            <Field label="Service"><Input value={data.service} onChange={e => update("service", e.target.value)} /></Field>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Scope</label>
              <AIBtn busy={aiBusy === "improve_text"} label="Improve" onClick={() => aiAssist("improve_text", { input: data.scope, apply: (r: any) => update("scope", r.text || data.scope) })} />
            </div>
            <Textarea rows={3} value={data.scope} onChange={e => update("scope", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Revisions"><Input type="number" value={data.revisions} onChange={e => update("revisions", Number(e.target.value))} /></Field>
              <Field label="Timeline"><Input value={data.timeline} onChange={e => update("timeline", e.target.value)} /></Field>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Payment structure</label>
              <AIBtn busy={aiBusy === "payment_structure"} label="Suggest" onClick={() => aiAssist("payment_structure", { apply: (r: any) => update("paymentStructure", r.structure || data.paymentStructure) })} />
            </div>
            <Input value={data.paymentStructure} onChange={e => update("paymentStructure", e.target.value)} />
          </Section>
          <Section title="Items">
            {data.items.map((it: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_60px_80px_24px] gap-2">
                <Input value={it.title} onChange={e => update(`items.${i}.title`, e.target.value)} />
                <Input type="number" value={it.qty} onChange={e => update(`items.${i}.qty`, Number(e.target.value))} />
                <Input type="number" value={it.rate} onChange={e => update(`items.${i}.rate`, Number(e.target.value))} />
                <button className="text-destructive text-sm" onClick={() => update("items", data.items.filter((_: any, j: number) => j !== i))}>×</button>
              </div>
            ))}
            <button className="text-xs text-primary" onClick={() => update("items", [...data.items, { title: "New item", qty: 1, rate: 0 }])}>+ Add item</button>
          </Section>
        </>
      )}

      {type === "agreement" && (
        <>
          <Section title="Client">
            <Field label="Name"><Input value={data.client.name} onChange={e => update("client.name", e.target.value)} /></Field>
          </Section>
          {(["scope", "revisions", "paymentTerms", "delivery", "cancellation", "ipOwnership", "jurisdiction"] as const).map(k => (
            <div key={k}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</label>
                <AIBtn
                  busy={aiBusy === "draft_agreement_clause" + k}
                  label="Draft"
                  onClick={() => aiAssist("draft_agreement_clause", { section: k, apply: (r: any) => update(k, r.text || data[k]) })}
                />
              </div>
              <Textarea rows={2} value={data[k] || ""} onChange={e => update(k, e.target.value)} />
            </div>
          ))}
        </>
      )}

      {type === "invoice" && (
        <>
          <Section title="Client">
            <Field label="Name"><Input value={data.client.name} onChange={e => update("client.name", e.target.value)} /></Field>
            <Field label="Email"><Input value={data.client.email || ""} onChange={e => update("client.email", e.target.value)} /></Field>
          </Section>
          <Section title="Details">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Issued"><Input type="date" value={data.date} onChange={e => update("date", e.target.value)} /></Field>
              <Field label="Due"><Input type="date" value={data.dueDate} onChange={e => update("dueDate", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Currency"><Input value={data.currency} onChange={e => update("currency", e.target.value)} /></Field>
              <Field label="Tax %"><Input type="number" value={data.taxPercent || 0} onChange={e => update("taxPercent", Number(e.target.value))} /></Field>
            </div>
            <Field label="Status">
              <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={data.status || "draft"} onChange={e => update("status", e.target.value)}>
                {["draft", "sent", "paid", "overdue"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </Section>
          <Section title="Line items">
            {data.items.map((it: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_60px_80px_24px] gap-2">
                <Input value={it.title} onChange={e => update(`items.${i}.title`, e.target.value)} />
                <Input type="number" value={it.qty} onChange={e => update(`items.${i}.qty`, Number(e.target.value))} />
                <Input type="number" value={it.rate} onChange={e => update(`items.${i}.rate`, Number(e.target.value))} />
                <button className="text-destructive text-sm" onClick={() => update("items", data.items.filter((_: any, j: number) => j !== i))}>×</button>
              </div>
            ))}
            <button className="text-xs text-primary" onClick={() => update("items", [...data.items, { title: "New item", qty: 1, rate: 0 }])}>+ Add item</button>
          </Section>
        </>
      )}

      {type === "service_card" && (
        <>
          <Section title="Card">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">AI generate</label>
              <AIBtn busy={aiBusy === "service_card_copy"} label="Auto-fill" onClick={() => aiAssist("service_card_copy", { apply: (r: any) => setData((d: any) => ({ ...d, ...r })) })} />
            </div>
            <Field label="Service"><Input value={data.service} onChange={e => update("service", e.target.value)} /></Field>
            <Field label="Hook"><Textarea rows={2} value={data.hook} onChange={e => update("hook", e.target.value)} /></Field>
            <Field label="Bullets (one per line)">
              <Textarea rows={4} value={(data.bullets || []).join("\n")} onChange={e => update("bullets", e.target.value.split("\n").filter(Boolean))} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Price"><Input value={data.price} onChange={e => update("price", e.target.value)} /></Field>
              <Field label="CTA"><Input value={data.cta} onChange={e => update("cta", e.target.value)} /></Field>
            </div>
          </Section>
        </>
      )}

      {type === "business_card" && (
        <>
          <Section title="You">
            <Field label="Full name"><Input value={data.fullName} onChange={e => update("fullName", e.target.value)} /></Field>
            <Field label="Role"><Input value={data.role} onChange={e => update("role", e.target.value)} /></Field>
          </Section>
          <Section title="Contact">
            <Field label="Email"><Input value={data.brand.email || ""} onChange={e => update("brand.email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={data.brand.phone || ""} onChange={e => update("brand.phone", e.target.value)} /></Field>
            <Field label="Website"><Input value={data.brand.site || ""} onChange={e => update("brand.site", e.target.value)} /></Field>
          </Section>
          <Section title="Socials">
            {(data.socials || []).map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-[100px_1fr_24px] gap-2">
                <Input value={s.label} onChange={e => update(`socials.${i}.label`, e.target.value)} />
                <Input value={s.url} onChange={e => update(`socials.${i}.url`, e.target.value)} />
                <button className="text-destructive text-sm" onClick={() => update("socials", data.socials.filter((_: any, j: number) => j !== i))}>×</button>
              </div>
            ))}
            <button className="text-xs text-primary" onClick={() => update("socials", [...(data.socials || []), { label: "Link", url: "" }])}>+ Add link</button>
          </Section>
        </>
      )}

      {type === "proposal" && (
        <>
          <Section title="Client">
            <Field label="Name"><Input value={data.client.name} onChange={e => update("client.name", e.target.value)} /></Field>
            <Field label="Company"><Input value={data.client.company || ""} onChange={e => update("client.company", e.target.value)} /></Field>
          </Section>
          <Section title="Proposal">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Auto-fill all sections</label>
              <AIBtn busy={aiBusy === "proposal_full"} label="Generate full draft" onClick={() => aiAssist("proposal_full", { apply: (r: any) => setData((d: any) => ({ ...d, ...r })) })} />
            </div>
            <Field label="Title"><Input value={data.title} onChange={e => update("title", e.target.value)} /></Field>
            {(["summary", "problem", "approach", "timeline", "investment", "whyUs"] as const).map(k => (
              <div key={k}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</label>
                  <AIBtn
                    busy={aiBusy === "draft_proposal_section" + k}
                    label="Draft"
                    onClick={() => aiAssist("draft_proposal_section", { section: k, apply: (r: any) => update(k, r.text || data[k]) })}
                  />
                </div>
                <Textarea rows={2} value={data[k] || ""} onChange={e => update(k, e.target.value)} />
              </div>
            ))}
            <Field label="CTA"><Input value={data.cta} onChange={e => update("cta", e.target.value)} /></Field>
          </Section>
          <Section title="Deliverables (one per line)">
            <Textarea rows={4} value={(data.deliverables || []).join("\n")} onChange={e => update("deliverables", e.target.value.split("\n").filter(Boolean))} />
          </Section>
        </>
      )}
    </div>
  );
}