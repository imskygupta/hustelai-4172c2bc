import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Loader2, Save, Sparkles, Wand2, Users, ArrowRight, Library } from "lucide-react";
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
import {
  applyBrandToDoc, applyClientToDoc, getBrandKit,
  listBlocks, listClients, setDocStatus, convertDocument,
  CONVERSION_TARGETS, DOC_STATUSES, STATUS_LABELS, STATUS_TONE,
  type ClientProfile, type DocBlock, type DocStatus,
} from "@/lib/workspace-docs/infra";
import { BigScreenHint } from "@/components/BigScreenHint";
import { continueWorkflow } from "@/lib/nextActions/continueWorkflow";
import { wpProjectDoc, wpProjectDocs } from "@/lib/workspace/paths";
import { Deliver } from "@/components/delivery/Deliver";

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
  const [status, setStatus] = useState<DocStatus>("draft");
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [converting, setConverting] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const tier = (profile as any)?.subscription_tier || "free";
  const watermark = !PAID_TIERS.includes(tier);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: ws } = await (supabase as any).from("workspaces").select("*").eq("id", id).maybeSingle();
      const kit = await getBrandKit(user.id);
      const [cs, bs] = await Promise.all([listClients(user.id), listBlocks(user.id)]);
      setClients(cs); setBlocks(bs);
      if (docId && docId !== "new") {
        const { data: row } = await (supabase as any).from("workspace_documents").select("*").eq("id", docId).maybeSingle();
        if (row) {
          setDocRow(row);
          setDocType(row.doc_type);
          setData(row.data);
          setThemeId(row.theme as ThemeId);
          setTitle(row.title);
          setStatus((row.status || "draft") as DocStatus);
        }
      } else if (typeParam) {
        const t = typeParam as DocType;
        setDocType(t);
        const base = defaultDoc(t, profile, ws);
        const withBrand = applyBrandToDoc(base, kit);
        setData(withBrand);
        if (kit?.default_theme) setThemeId(kit.default_theme as ThemeId);
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
      status,
      client_profile_id: data.client_profile_id || null,
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
    if (!docRow) nav(wpProjectDoc(id!, res.data.id), { replace: true });
  }

  async function changeStatus(s: DocStatus) {
    setStatus(s);
    if (docRow?.id) {
      try { await setDocStatus(docRow.id, s); toast.success(`Marked as ${STATUS_LABELS[s]}`); }
      catch (e: any) { toast.error(e?.message || "Status update failed"); }
    }
  }

  function pickClient(c: ClientProfile) {
    setData((d: any) => applyClientToDoc(d, c));
    toast.success(`Loaded ${c.name}`);
  }

  async function doConvert(target: DocType) {
    if (!docRow?.id) { toast.error("Save the document first"); return; }
    setConverting(true);
    try {
      const row = await convertDocument(docRow.id, target);
      toast.success(`Converted to ${target}`);
      nav(wpProjectDoc(id!, row.id));
    } catch (e: any) { toast.error(e?.message || "Conversion failed"); }
    finally { setConverting(false); }
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
      continueWorkflow({
        trigger: "doc_exported",
        surface: "workspace.doc_editor",
        headline: "Doc exported",
        description: "Send it to a client or open another doc.",
      });
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
      <BigScreenHint pageKey="doc-editor" label="PDFs render best on desktop" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => nav(wpProjectDocs(id!))} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All documents
        </button>
        <div className="flex items-center gap-2">
          {/* Status */}
          <select
            value={status}
            onChange={e => changeStatus(e.target.value as DocStatus)}
            className={`text-xs uppercase tracking-wider rounded-full px-3 py-1.5 border-0 cursor-pointer ${STATUS_TONE[status]}`}
          >
            {DOC_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>

          {/* Convert */}
          {(CONVERSION_TARGETS[docType] || []).length > 0 && docRow && (
            <div className="relative">
              <button
                onClick={() => setConvertOpen(o => !o)}
                disabled={converting}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              >
                {converting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />} Convert
              </button>
              {convertOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setConvertOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[180px] z-20">
                    {CONVERSION_TARGETS[docType].map(t => (
                      <button
                        key={t}
                        onClick={() => { setConvertOpen(false); doConvert(t); }}
                        className="block w-full text-left px-3 py-2 text-xs hover:bg-muted capitalize"
                      >
                        → {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
          <button onClick={exportPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30 disabled:opacity-50">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export PDF
          </button>
          {/* Deliver — appears once the doc is saved. Routes through the
              Universal Delivery Layer (WhatsApp / Telegram / Save to client)
              so intake → proposal → client timeline stays one continuous chain. */}
          {docRow && (
            <Deliver
              toolSlug={`workspace-doc:${docType}`}
              title={title}
              text={buildDeliveryText(title, data)}
            />
          )}
        </div>
      </div>

      <Input value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent" />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
        {/* Form panel */}
        <div className="space-y-5">
          <Section title="Theme">
            <ThemePicker value={themeId} onChange={setThemeId} />
          </Section>

          {clients.length > 0 && (
            <Section title="Load client">
              <select
                onChange={e => {
                  const c = clients.find(x => x.id === e.target.value);
                  if (c) pickClient(c);
                  e.target.value = "";
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>Pick a saved client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
              </select>
            </Section>
          )}

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
            blocks={blocks}
          />
        </div>

        {/* Live preview */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="overflow-auto rounded-2xl border border-border bg-muted/30 p-3 sm:p-6 max-h-[80vh]"
        >
          <div className="origin-top-left scale-[0.4] sm:scale-[0.6] lg:scale-[0.75]">
            <DocPreview type={docType} data={data} themeId={themeId} watermark={watermark} refEl={el => (previewRef.current = el)} />
          </div>
        </motion.div>
      </div>

      <UpgradePrompt
        open={!!upsell}
        onClose={() => setUpsell(null)}
        entitlement={upsell || "remove_watermark"}
        context="Workspace OS"
      />
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

/** Render a short, copy-pasteable summary of the doc for WhatsApp / Telegram. */
function buildDeliveryText(title: string, d: any): string {
  if (!d) return title;
  const client = d.client?.name || d.client?.company || "";
  const lines = [
    `📄 ${title}`,
    client ? `For: ${client}` : "",
    d.number ? `Ref: ${d.number}` : "",
    d.summary ? `\n${d.summary}` : "",
    d.scope ? `\n${d.scope}` : "",
    d.investment ? `\nInvestment: ${d.investment}` : "",
    d.timeline ? `Timeline: ${d.timeline}` : "",
    Array.isArray(d.deliverables) && d.deliverables.length
      ? `\nDeliverables:\n- ${d.deliverables.slice(0, 8).join("\n- ")}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
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

function BlockPicker({ blocks, kind, onPick }: { blocks: any[]; kind: string; onPick: (text: string) => void }) {
  const filtered = (blocks || []).filter(b => b.kind === kind);
  if (filtered.length === 0) return null;
  return (
    <select
      onChange={e => {
        const b = filtered.find(x => x.id === e.target.value);
        if (b) onPick(b.body);
        e.target.value = "";
      }}
      defaultValue=""
      className="text-[10px] rounded border border-border bg-transparent px-1.5 py-0.5 text-muted-foreground"
      title="Insert reusable block"
    >
      <option value="" disabled>+ Block</option>
      {filtered.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
    </select>
  );
}

function DocForm({ type, data, setData, aiBusy, aiAssist, blocks }: any) {
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
              <div className="flex items-center gap-2">
                <BlockPicker blocks={blocks} kind="payment_terms" onPick={t => update("paymentStructure", t)} />
                <AIBtn busy={aiBusy === "payment_structure"} label="Suggest" onClick={() => aiAssist("payment_structure", { apply: (r: any) => update("paymentStructure", r.structure || data.paymentStructure) })} />
              </div>
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
                <div className="flex items-center gap-2">
                  <BlockPicker
                    blocks={blocks}
                    kind={k === "paymentTerms" ? "payment_terms" : k === "ipOwnership" ? "ip" : k}
                    onPick={t => update(k, t)}
                  />
                  <AIBtn
                    busy={aiBusy === "draft_agreement_clause" + k}
                    label="Draft"
                    onClick={() => aiAssist("draft_agreement_clause", { section: k, apply: (r: any) => update(k, r.text || data[k]) })}
                  />
                </div>
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