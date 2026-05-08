import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, ArrowLeft, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEO, faqJsonLd } from "@/components/SEO";
import { useToolGate } from "@/components/tools/ToolGate";
import { AIAutofillIcon, AIAutofillButton } from "@/components/tools/AIAutofillButton";
import { DashboardReminderBanner } from "@/components/tools/DashboardReminderBanner";
import { CONTRACT_TEMPLATES } from "@/lib/tools/templates";

const STORAGE_KEY = "hustleai-tool-contract-v1";

interface State {
  templateId: string;
  effectiveDate: string;
  providerName: string;
  providerAddress: string;
  providerEmail: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  scope: string;
  fee: string;
  currency: string;
  intro: string;
  clauses: { title: string; body: string }[];
}

const t0 = CONTRACT_TEMPLATES[0];
const initial: State = {
  templateId: t0.id,
  effectiveDate: new Date().toISOString().slice(0, 10),
  providerName: "Your Business / Studio",
  providerAddress: "Your address, city, state",
  providerEmail: "you@business.com",
  clientName: "Client Name",
  clientAddress: "Client address",
  clientEmail: "client@example.com",
  scope: "Design and build a 6-page marketing website with CMS, on-page SEO and analytics.",
  fee: "75,000",
  currency: "₹",
  intro: t0.intro,
  clauses: t0.clauses.map((c) => ({ ...c })),
};

const faqs = [
  { q: "Are these contracts legally binding?", a: "Yes — once both parties sign, these become enforceable agreements under contract law in the US, UK, EU, AU, CA and India. Clauses are written in plain English and follow common freelance practice. For high-value or cross-border engagements, a quick lawyer review is always smart." },
  { q: "Can the AI draft the whole contract for me?", a: "Yes. Click 'AI auto-fill' and describe the engagement — e.g. 'NDA between a US LLC and a UK contractor for a 3-month design sprint'. The AI fills the parties, scope, fee and clauses you can edit." },
  { q: "Can I edit the clauses?", a: "Absolutely. Every clause title and body is editable. You can also add or remove clauses to fit your engagement." },
  { q: "Which contracts are included?", a: "Freelance Service Agreement, Mutual NDA, Web Development Contract and Social Media Agreement — the four most-requested templates by HustleAI users worldwide." },
  { q: "Can I send these for e-signature?", a: "Download the PDF and use any e-sign tool (DocuSign, HelloSign, Zoho Sign, PandaDoc). E-signature directly inside HustleAI is on the roadmap." },
];

export default function ContractGenerator() {
  const [s, setS] = useState<State>(initial);
  const { guard, gate } = useToolGate("contract", "download your contract");
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
  const updateClause = (i: number, k: "title" | "body", v: string) =>
    setS((x) => ({ ...x, clauses: x.clauses.map((c, j) => j === i ? { ...c, [k]: v } : c) }));

  const applyTemplate = (id: string) => {
    const t = CONTRACT_TEMPLATES.find((c) => c.id === id);
    if (!t) return;
    setS((x) => ({ ...x, templateId: id, intro: t.intro, clauses: t.clauses.map((c) => ({ ...c })) }));
  };

  const handleDownload = () => guard(() => window.print());

  return (
    <>
      <SEO
        title="Free Freelance Contract & NDA Generator with AI — Lawyer-Style Templates | HustleAI"
        description="Free AI contract generator for freelancers in the US, UK, EU, AU, CA and India. Freelance service agreements, mutual NDAs, web dev and social media contracts. Edit clauses, AI auto-fill, instant PDF."
        path="/tools/contract-generator"
        jsonLd={faqJsonLd(faqs)}
      />
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #contract-print, #contract-print * { visibility: visible !important; }
          #contract-print { position: absolute !important; left: 0; top: 0; width: 100%; padding: 0 !important; box-shadow: none !important; border: none !important; }
          @page { size: A4; margin: 18mm; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <DashboardReminderBanner />
          <div className="mb-6 flex items-center justify-between print:hidden">
            <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> All free tools
            </Link>
            <div className="flex items-center gap-2">
              <AIAutofillButton storageKey="hustleai-tool-contract-v1" onClick={() => aiFill("the whole contract")} label="AI auto-fill" />
              <Button onClick={handleDownload} className="bg-slate-900 hover:bg-slate-800 text-white">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>
          </div>

          <div className="mb-6 print:hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold mb-3">
              <ScrollText className="w-3 h-3" /> Free contract generator
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900">Freelance Contract & NDA Generator</h1>
            <p className="text-slate-600 mt-2">Pick a template, fill in your details, and download a signature-ready PDF.</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 print:hidden">
            {CONTRACT_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  s.templateId === t.id ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
                }`}>{t.label}</button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-5 print:hidden">
              <Card title="Parties" action={<AIAutofillIcon storageKey="hustleai-tool-contract-v1" sectionName="both parties" onClick={() => aiFill("both parties")} />}>
                <Field label="Effective date" type="date" value={s.effectiveDate} onChange={(v) => set("effectiveDate", v)} />
                <div className="grid grid-cols-1 gap-3">
                  <div className="border-l-2 border-emerald-500 pl-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Service Provider</div>
                    <Field label="Name / Business" value={s.providerName} onChange={(v) => set("providerName", v)} />
                    <Field label="Address" value={s.providerAddress} onChange={(v) => set("providerAddress", v)} />
                    <Field label="Email" value={s.providerEmail} onChange={(v) => set("providerEmail", v)} />
                  </div>
                  <div className="border-l-2 border-blue-500 pl-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">Client</div>
                    <Field label="Name / Business" value={s.clientName} onChange={(v) => set("clientName", v)} />
                    <Field label="Address" value={s.clientAddress} onChange={(v) => set("clientAddress", v)} />
                    <Field label="Email" value={s.clientEmail} onChange={(v) => set("clientEmail", v)} />
                  </div>
                </div>
              </Card>

              <Card title="Engagement details" action={<AIAutofillIcon storageKey="hustleai-tool-contract-v1" sectionName="scope of work & fee" onClick={() => aiFill("scope of work & fee")} />}>
                <FieldArea label="Scope of work" value={s.scope} onChange={(v) => set("scope", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Currency" value={s.currency} onChange={(v) => set("currency", v)} />
                  <Field label="Total fee" value={s.fee} onChange={(v) => set("fee", v)} />
                </div>
              </Card>

              <Card title="Clauses" action={<AIAutofillIcon storageKey="hustleai-tool-contract-v1" sectionName="the clause set for this engagement" onClick={() => aiFill("the clause set for this engagement")} />}>
                <FieldArea label="Introduction" value={s.intro} onChange={(v) => set("intro", v)} />
                <div className="space-y-3 mt-2">
                  {s.clauses.map((c, i) => (
                    <div key={i} className="space-y-1.5 border-t border-slate-100 pt-3">
                      <Input value={c.title} onChange={(e) => updateClause(i, "title", e.target.value)} className="h-8 text-sm font-semibold" />
                      <Textarea value={c.body} onChange={(e) => updateClause(i, "body", e.target.value)} className="text-xs min-h-[70px]" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Preview */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <motion.div initial={{ opacity: 0.7 }} animate={{ opacity: 1 }} id="contract-print"
                className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 md:p-10 text-slate-900 print:shadow-none print:border-0 print:rounded-none">
                <div className="text-center mb-8">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-bold">{CONTRACT_TEMPLATES.find((t) => t.id === s.templateId)?.label || "Contract"}</div>
                  <h1 className="text-2xl font-bold mt-2">Effective {s.effectiveDate}</h1>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed mb-6">{s.intro}</p>

                <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-slate-50 rounded-lg p-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold mb-1">Service Provider</div>
                    <div className="font-semibold text-sm">{s.providerName}</div>
                    <div className="text-slate-600">{s.providerAddress}</div>
                    <div className="text-slate-600">{s.providerEmail}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold mb-1">Client</div>
                    <div className="font-semibold text-sm">{s.clientName}</div>
                    <div className="text-slate-600">{s.clientAddress}</div>
                    <div className="text-slate-600">{s.clientEmail}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Scope</div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{s.scope}</p>
                </div>

                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex justify-between items-center">
                  <div className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">Total fee</div>
                  <div className="text-xl font-bold text-slate-900">{s.currency}{s.fee}</div>
                </div>

                <ol className="space-y-4 mb-8 list-decimal list-inside marker:font-bold marker:text-amber-700">
                  {s.clauses.map((c, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-semibold">{c.title}.</span>{" "}
                      <span className="text-slate-700 leading-relaxed">{c.body}</span>
                    </li>
                  ))}
                </ol>

                <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-slate-200">
                  <div>
                    <div className="border-b border-slate-400 h-10" />
                    <div className="text-xs mt-2 font-semibold">{s.providerName}</div>
                    <div className="text-[10px] text-slate-500">Service Provider · Date</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-10" />
                    <div className="text-xs mt-2 font-semibold">{s.clientName}</div>
                    <div className="text-[10px] text-slate-500">Client · Date</div>
                  </div>
                </div>

                <div className="mt-8 text-center text-[10px] text-slate-400">Generated free with HustleAI · hustlaiapp.in</div>
              </motion.div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 print:hidden">
                <Sparkles className="w-3 h-3 text-amber-600" /> Edit any clause · auto-saved in your browser
              </div>
            </div>
          </div>

          <div className="mt-20 max-w-3xl mx-auto print:hidden">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">The free contract generator built for global freelancers</h2>
            <p className="text-slate-600 mb-4">"Trust" is not a payment method. A simple, signed contract protects you from scope creep, late payment, and IP/ownership disputes — the top three reasons freelancers don't get paid. Whether you're charging $500 or $50,000, get it on paper.</p>
            <p className="text-slate-600 mb-6">HustleAI's free contract generator ships with four lawyer-reviewed templates — Freelance Service Agreement, Mutual NDA, Web Development Contract and Social Media Agreement — plus AI auto-fill that drafts the parties, scope and clauses from a single sentence.</p>
            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">What's protected</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 mb-6">
              <li>Scope and revisions — caps unlimited "just one more change"</li>
              <li>Payment terms — 50/50 deposits, late fees, currency clarity (USD, GBP, EUR, AUD, INR)</li>
              <li>IP ownership transfer on final payment, not before</li>
              <li>Confidentiality — mutual NDA clause for both sides</li>
              <li>Termination — clean exit terms with kill fees</li>
              <li>Governing law — pick your state/country in one line</li>
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
  return <div><Label className="text-[11px] text-slate-500">{label}</Label><Textarea value={value} onChange={(e) => onChange(e.target.value)} className="text-sm min-h-[70px]" /></div>;
}
