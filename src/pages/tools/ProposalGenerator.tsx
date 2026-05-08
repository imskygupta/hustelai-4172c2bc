import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, ArrowLeft, FileText, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEO, faqJsonLd } from "@/components/SEO";
import { useToolGate } from "@/components/tools/ToolGate";
import { AIAutofillIcon, AIAutofillButton } from "@/components/tools/AIAutofillButton";
import { DashboardReminderBanner } from "@/components/tools/DashboardReminderBanner";
import { DashboardToolAIPanel } from "@/components/tools/DashboardToolAIPanel";
import { PROPOSAL_TEMPLATES } from "@/lib/tools/templates";
import { useAuth } from "@/hooks/useAuth";
import { printWithMeta, watermarkModeForTier } from "@/lib/tools/print-meta";
import { emitDelight, pickDelight, bumpDelightCount } from "@/lib/delight-bus";

const STORAGE_KEY = "hustleai-tool-proposal-v1";

interface State {
  templateId: string;
  proposalNo: string;
  date: string;
  bizName: string;
  bizEmail: string;
  clientName: string;
  clientCompany: string;
  projectTitle: string;
  scope: string;
  deliverables: string[];
  timeline: string;
  pricing: string;
  pricingNote: string;
  currency: string;
  notes: string;
}

const initial: State = {
  templateId: "web-design",
  proposalNo: "PRO-001",
  date: new Date().toISOString().slice(0, 10),
  bizName: "Your Studio",
  bizEmail: "you@studio.com",
  clientName: "Client Name",
  clientCompany: "Client Co.",
  projectTitle: "Marketing Website Redesign",
  scope: PROPOSAL_TEMPLATES[0].scope,
  deliverables: PROPOSAL_TEMPLATES[0].deliverables,
  timeline: PROPOSAL_TEMPLATES[0].timeline,
  pricing: "75,000",
  pricingNote: PROPOSAL_TEMPLATES[0].pricingNote,
  currency: "₹",
  notes: "Looking forward to working together.",
};

const faqs = [
  { q: "What's included in the free proposal generator?", a: "Four pre-built scopes (web design, social media, consulting, video), AI auto-fill for scope and deliverables, live A4 preview and instant PDF download after a free signup." },
  { q: "Can the AI write the whole proposal for me?", a: "Yes. Click 'AI auto-fill' and describe the project in one line — e.g. 'Shopify redesign for a DTC skincare brand, 6-week timeline, $8k budget'. The AI drafts scope, deliverables, timeline and pricing notes you can edit." },
  { q: "Does it work for US, UK, EU and Australian clients?", a: "Yes — switch the currency to USD, GBP, EUR or AUD, edit the timeline in days/weeks, and the proposal renders on A4 + Letter. Layout is accepted by most enterprise procurement teams." },
  { q: "Can I use these proposals for actual client work?", a: "Yes — the templates are written by working freelancers and used to win real projects. Tweak the scope and pricing for your engagement." },
  { q: "Is the data I enter saved on your servers?", a: "No. Everything stays in your browser via localStorage. Sign up only when you want to save proposals, generate PDFs, and reuse client data across drafts." },
];

export default function ProposalGenerator() {
  const [s, setS] = useState<State>(initial);
  const { guard, gate } = useToolGate("proposal", "download your proposal");
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const tier = (profile?.subscription_tier as string) || "free";
  const wm = watermarkModeForTier(tier);
  const inDashboard = pathname.startsWith("/dashboard/tools");
  const aiFill = (section: string) =>
    guard(() => {
      // TODO: wire to AI gateway for signed-in users
    }, `auto-fill ${section} with AI`);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setS({ ...initial, ...JSON.parse(saved) }); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }, [s]);

  const set = (k: keyof State, v: any) => setS((x) => ({ ...x, [k]: v }));
  const patchState = (patch: Partial<State>) =>
    setS((x) => ({
      ...x,
      ...patch,
      deliverables: Array.isArray(patch.deliverables) && patch.deliverables.length ? patch.deliverables.map(String) : x.deliverables,
    }));
  const setDel = (i: number, v: string) => setS((x) => ({ ...x, deliverables: x.deliverables.map((d, j) => j === i ? v : d) }));
  const addDel = () => setS((x) => ({ ...x, deliverables: [...x.deliverables, "New deliverable"] }));
  const removeDel = (i: number) => setS((x) => ({ ...x, deliverables: x.deliverables.filter((_, j) => j !== i) }));

  const applyTemplate = (id: string) => {
    const t = PROPOSAL_TEMPLATES.find((p) => p.id === id);
    if (!t) return;
    setS((x) => ({ ...x, templateId: id, scope: t.scope, deliverables: [...t.deliverables], timeline: t.timeline, pricingNote: t.pricingNote }));
  };

  const handleDownload = () =>
    guard(() =>
      printWithMeta({
        docTitle: `Proposal ${s.proposalNo} — ${s.projectTitle}`,
        afterPrint: () => {
          bumpDelightCount();
          emitDelight(pickDelight("proposal_pdf"));
        },
      }),
    );

  return (
    <>
      <SEO
        title="Free Freelance Proposal Generator with AI — Win More Clients | HustleAI"
        description="Free AI proposal generator for freelancers and agencies in the US, UK, EU, AU and India. Pre-built scopes for web design, social media, consulting and video. Live preview, instant PDF, no credit card."
        path="/tools/proposal-generator"
        jsonLd={faqJsonLd(faqs)}
      />
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #proposal-print, #proposal-print * { visibility: visible !important; }
          #proposal-print { position: absolute !important; left: 0; top: 0; width: 100%; padding: 0 !important; box-shadow: none !important; border: none !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <DashboardReminderBanner />
          {inDashboard && (
            <DashboardToolAIPanel
              kind="proposal"
              state={s}
              onPatch={patchState}
              templates={PROPOSAL_TEMPLATES.map((t) => ({ id: t.id, label: t.label }))}
              currentTemplateId={s.templateId}
              onTemplateChange={applyTemplate}
              featureKey="proposal"
            />
          )}
          <div className="mb-6 flex items-center justify-between print:hidden">
            <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> All free tools
            </Link>
            <div className="flex items-center gap-2">
              {!inDashboard && (
                <AIAutofillButton storageKey="hustleai-tool-proposal-v1" onClick={() => aiFill("the whole proposal")} label="AI auto-fill" />
              )}
              <Button onClick={handleDownload} className="bg-slate-900 hover:bg-slate-800 text-white">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>
          </div>

          <div className="mb-6 print:hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold mb-3">
              <FileText className="w-3 h-3" /> Free proposal generator
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900">Freelance Proposal Generator</h1>
            <p className="text-slate-600 mt-2">Pick a template, customize, and download a client-ready proposal.</p>
          </div>

          {/* Template chips */}
          <div className="flex flex-wrap gap-2 mb-6 print:hidden">
            {PROPOSAL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  s.templateId === t.id
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-5 print:hidden">
              <Card title="Header" action={inDashboard ? null : <AIAutofillIcon storageKey="hustleai-tool-proposal-v1" sectionName="your business header" onClick={() => aiFill("your business header")} />}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Proposal #" value={s.proposalNo} onChange={(v) => set("proposalNo", v)} />
                  <Field label="Date" type="date" value={s.date} onChange={(v) => set("date", v)} />
                </div>
                <Field label="Your business" value={s.bizName} onChange={(v) => set("bizName", v)} />
                <Field label="Your email" value={s.bizEmail} onChange={(v) => set("bizEmail", v)} />
              </Card>

              <Card title="Prepared for" action={inDashboard ? null : <AIAutofillIcon storageKey="hustleai-tool-proposal-v1" sectionName="the client block" onClick={() => aiFill("the client block")} />}>
                <Field label="Client name" value={s.clientName} onChange={(v) => set("clientName", v)} />
                <Field label="Client company" value={s.clientCompany} onChange={(v) => set("clientCompany", v)} />
                <Field label="Project title" value={s.projectTitle} onChange={(v) => set("projectTitle", v)} />
              </Card>

              <Card title="Scope" action={inDashboard ? null : <AIAutofillIcon storageKey="hustleai-tool-proposal-v1" sectionName="project scope from a one-line brief" onClick={() => aiFill("project scope from a one-line brief")} />}>
                <FieldArea label="Project overview" value={s.scope} onChange={(v) => set("scope", v)} />
              </Card>

              <Card title="Deliverables" action={inDashboard ? null : <AIAutofillIcon storageKey="hustleai-tool-proposal-v1" sectionName="deliverables list" onClick={() => aiFill("deliverables list")} />}>
                <div className="space-y-2">
                  {s.deliverables.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={d} onChange={(e) => setDel(i, e.target.value)} className="h-9 text-sm" />
                      <button onClick={() => removeDel(i)} className="text-slate-400 hover:text-red-600 px-2 text-xs">✕</button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addDel} className="w-full">+ Add deliverable</Button>
                </div>
              </Card>

              <Card title="Timeline & investment" action={inDashboard ? null : <AIAutofillIcon storageKey="hustleai-tool-proposal-v1" sectionName="timeline & pricing" onClick={() => aiFill("timeline & pricing")} />}>
                <FieldArea label="Timeline" value={s.timeline} onChange={(v) => set("timeline", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Currency" value={s.currency} onChange={(v) => set("currency", v)} />
                  <Field label="Total fee" value={s.pricing} onChange={(v) => set("pricing", v)} />
                </div>
                <FieldArea label="Payment terms" value={s.pricingNote} onChange={(v) => set("pricingNote", v)} />
                <FieldArea label="Closing notes" value={s.notes} onChange={(v) => set("notes", v)} />
              </Card>
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <motion.div
                initial={{ opacity: 0.7 }} animate={{ opacity: 1 }}
                id="proposal-print"
                className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 md:p-10 text-slate-900 print:shadow-none print:border-0 print:rounded-none"
              >
                <div className="text-[10px] uppercase tracking-[0.25em] text-violet-600 font-bold mb-2">Proposal · {s.proposalNo}</div>
                <h1 className="text-3xl font-bold leading-tight mb-2">{s.projectTitle}</h1>
                <div className="text-sm text-slate-500 mb-8">Prepared for {s.clientName}{s.clientCompany ? `, ${s.clientCompany}` : ""} · {s.date}</div>

                <Section title="Overview"><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{s.scope}</p></Section>

                <Section title="What you get">
                  <ul className="space-y-2">
                    {s.deliverables.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" /><span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Timeline"><p className="text-sm text-slate-700 whitespace-pre-line">{s.timeline}</p></Section>

                <Section title="Investment">
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-violet-700 font-semibold">Project total</div>
                      <div className="text-3xl font-bold text-slate-900 mt-1">{s.currency}{s.pricing}</div>
                    </div>
                    <div className="text-xs text-slate-600 max-w-[55%] text-right whitespace-pre-line">{s.pricingNote}</div>
                  </div>
                </Section>

                {s.notes && <Section title="Closing"><p className="text-sm text-slate-700 whitespace-pre-line">{s.notes}</p></Section>}

                <div className="mt-10 pt-5 border-t border-slate-200 flex items-end justify-between text-sm">
                  <div>
                    <div className="font-semibold">{s.bizName}</div>
                    <div className="text-xs text-slate-500">{s.bizEmail}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Sign to accept</div>
                    <div className="border-b border-slate-300 w-40 mt-6" />
                  </div>
                </div>

                {wm !== "none" && (
                  <div className="mt-6 text-center text-[10px] text-slate-400">
                    {wm === "full"
                      ? "Generated free with HustleAI · hustlaiapp.in"
                      : `Generated ${new Date().toLocaleString()}`}
                  </div>
                )}
              </motion.div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 print:hidden">
                <Sparkles className="w-3 h-3 text-violet-600" /> Auto-saved · switches templates instantly
              </div>
            </div>
          </div>

          <div className="mt-20 max-w-3xl mx-auto print:hidden">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">The AI proposal generator built to close clients</h2>
            <p className="text-slate-600 mb-4">A clear, well-structured proposal is the difference between "let me think about it" and "where do I sign?". HustleAI's free generator gives you battle-tested scopes for the most common freelance engagements — web design, social media, consulting and video — and an <strong>AI auto-fill</strong> that drafts the entire document from a single line about the project.</p>
            <p className="text-slate-600 mb-6">Used by freelancers and agencies across the US, UK, EU, Australia and India to win five and six-figure retainers. No watermarks, no email walls, no credit card.</p>
            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">Built around what actually closes deals</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 mb-6">
              <li>One-line problem statement before scope (anchors the buyer)</li>
              <li>Concrete deliverables with quantities, not vague promises</li>
              <li>Timeline in weeks with milestones, not "ASAP"</li>
              <li>Single price + clear payment terms (50/50 or 30/40/30)</li>
              <li>Signature line — gives the buyer a next action, not a question</li>
            </ul>
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">FAQ</h3>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details key={i} className="bg-white border border-slate-200 rounded-lg p-4">
                  <summary className="font-semibold text-slate-900 cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-sm text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
        {gate}
      </div>
    </>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider font-bold text-slate-500">{title}</div>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div><Label className="text-[11px] text-slate-500">{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" /></div>;
}
function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><Label className="text-[11px] text-slate-500">{label}</Label><Textarea value={value} onChange={(e) => onChange(e.target.value)} className="text-sm min-h-[80px]" /></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-6"><h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-3">{title}</h2>{children}</div>;
}
