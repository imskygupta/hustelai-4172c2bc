import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Download, ArrowLeft, Receipt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEO, faqJsonLd } from "@/components/SEO";
import { useToolGate } from "@/components/tools/ToolGate";

interface LineItem { id: string; desc: string; qty: number; rate: number; }

const STORAGE_KEY = "hustleai-tool-invoice-v1";

const defaultState = {
  bizName: "Your Business Name",
  bizEmail: "you@business.com",
  bizAddress: "Your address line 1\nCity, State - PIN",
  bizGstin: "",
  clientName: "Client Name",
  clientEmail: "client@example.com",
  clientAddress: "Client address",
  clientGstin: "",
  invoiceNo: "INV-001",
  date: new Date().toISOString().slice(0, 10),
  dueDate: "",
  currency: "₹",
  taxLabel: "GST",
  taxRate: 18,
  notes: "Thank you for your business!",
  terms: "Payment due within 7 days.",
  items: [
    { id: "1", desc: "Website Design — Landing page", qty: 1, rate: 25000 },
    { id: "2", desc: "Revisions (2 rounds)", qty: 1, rate: 5000 },
  ] as LineItem[],
};

const faqs = [
  { q: "Is this invoice generator really free?", a: "Yes — fully free to design and preview. You'll need a free HustleAI account to download the PDF." },
  { q: "Does it support GST invoices for India?", a: "Yes. You can add your GSTIN, your client's GSTIN, and configure the tax rate (default 18% GST). The PDF is GST-ready." },
  { q: "Can I add my logo?", a: "Logo upload is available once you sign up free. The browser version supports your business name, address and GSTIN." },
  { q: "Can I save invoices and reuse client data?", a: "Yes — saved drafts, recurring invoices, client auto-fill and payment tracking are unlocked when you create a free workspace." },
];

export default function InvoiceGenerator() {
  const [state, setState] = useState(defaultState);
  const { guard, gate } = useToolGate("invoice", "download your invoice");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) try { setState({ ...defaultState, ...JSON.parse(saved) }); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const update = (k: keyof typeof state, v: any) => setState((s) => ({ ...s, [k]: v }));
  const updateItem = (id: string, k: keyof LineItem, v: any) =>
    setState((s) => ({ ...s, items: s.items.map((i) => i.id === id ? { ...i, [k]: v } : i) }));
  const addItem = () => setState((s) => ({ ...s, items: [...s.items, { id: Date.now().toString(), desc: "", qty: 1, rate: 0 }] }));
  const removeItem = (id: string) => setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));

  const subtotal = useMemo(() => state.items.reduce((s, i) => s + i.qty * i.rate, 0), [state.items]);
  const tax = useMemo(() => Math.round(subtotal * state.taxRate) / 100, [subtotal, state.taxRate]);
  const total = subtotal + tax;
  const fmt = (n: number) => `${state.currency}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const handleDownload = () => guard(() => window.print());

  return (
    <>
      <SEO
        title="Free GST Invoice Generator for Freelancers — Make Invoices in Minutes | HustleAI"
        description="Free, easy-to-use GST invoice generator for Indian freelancers and agencies. Add line items, taxes and your business details. Download a clean PDF in seconds."
        path="/tools/invoice-generator"
        jsonLd={faqJsonLd(faqs)}
      />
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: absolute !important; left: 0; top: 0; width: 100%; padding: 0 !important; box-shadow: none !important; border: none !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 pt-20 pb-16 px-4 print:p-0 print:bg-white">
        <div className="max-w-7xl mx-auto print:max-w-none">
          {/* Toolbar (hidden in print) */}
          <div className="mb-6 flex items-center justify-between print:hidden">
            <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> All free tools
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">Auto-saved to your browser</span>
              <Button onClick={handleDownload} className="bg-slate-900 hover:bg-slate-800 text-white">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>
          </div>

          {/* Header (hidden in print) */}
          <div className="mb-8 print:hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-3">
              <Receipt className="w-3 h-3" /> Free invoice generator
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900">GST Invoice Generator</h1>
            <p className="text-slate-600 mt-2">Fill the form on the left — your invoice updates live on the right.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 print:block">
            {/* Form */}
            <div className="space-y-5 print:hidden">
              <Card title="Your business">
                <Field label="Business name" value={state.bizName} onChange={(v) => update("bizName", v)} />
                <Field label="Email" value={state.bizEmail} onChange={(v) => update("bizEmail", v)} />
                <FieldArea label="Address" value={state.bizAddress} onChange={(v) => update("bizAddress", v)} />
                <Field label="GSTIN (optional)" value={state.bizGstin} onChange={(v) => update("bizGstin", v)} />
              </Card>

              <Card title="Bill to">
                <Field label="Client name" value={state.clientName} onChange={(v) => update("clientName", v)} />
                <Field label="Client email" value={state.clientEmail} onChange={(v) => update("clientEmail", v)} />
                <FieldArea label="Client address" value={state.clientAddress} onChange={(v) => update("clientAddress", v)} />
                <Field label="Client GSTIN (optional)" value={state.clientGstin} onChange={(v) => update("clientGstin", v)} />
              </Card>

              <Card title="Invoice details">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Invoice #" value={state.invoiceNo} onChange={(v) => update("invoiceNo", v)} />
                  <Field label="Currency" value={state.currency} onChange={(v) => update("currency", v)} />
                  <Field label="Date" type="date" value={state.date} onChange={(v) => update("date", v)} />
                  <Field label="Due date" type="date" value={state.dueDate} onChange={(v) => update("dueDate", v)} />
                  <Field label="Tax label" value={state.taxLabel} onChange={(v) => update("taxLabel", v)} />
                  <Field label="Tax %" type="number" value={String(state.taxRate)} onChange={(v) => update("taxRate", Number(v))} />
                </div>
              </Card>

              <Card title="Line items">
                <div className="space-y-2">
                  {state.items.map((it) => (
                    <div key={it.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6">
                        <Label className="text-[11px] text-slate-500">Description</Label>
                        <Input value={it.desc} onChange={(e) => updateItem(it.id, "desc", e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[11px] text-slate-500">Qty</Label>
                        <Input type="number" value={it.qty} onChange={(e) => updateItem(it.id, "qty", Number(e.target.value))} className="h-9 text-sm" />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-[11px] text-slate-500">Rate</Label>
                        <Input type="number" value={it.rate} onChange={(e) => updateItem(it.id, "rate", Number(e.target.value))} className="h-9 text-sm" />
                      </div>
                      <div className="col-span-1">
                        <button onClick={() => removeItem(it.id)} className="w-9 h-9 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addItem} className="w-full mt-2">
                    <Plus className="w-3 h-3 mr-1" /> Add line item
                  </Button>
                </div>
              </Card>

              <Card title="Notes & terms">
                <FieldArea label="Notes (visible to client)" value={state.notes} onChange={(v) => update("notes", v)} />
                <FieldArea label="Terms" value={state.terms} onChange={(v) => update("terms", v)} />
              </Card>
            </div>

            {/* Live preview */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <motion.div
                key={JSON.stringify(state).length}
                initial={{ opacity: 0.7 }} animate={{ opacity: 1 }}
                id="invoice-print"
                className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 md:p-10 text-slate-900 print:shadow-none print:border-0 print:rounded-none"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-5 mb-6">
                  <div>
                    <div className="text-3xl font-bold tracking-tight">{state.bizName}</div>
                    <div className="text-xs text-slate-500 mt-1 whitespace-pre-line">{state.bizAddress}</div>
                    {state.bizEmail && <div className="text-xs text-slate-500">{state.bizEmail}</div>}
                    {state.bizGstin && <div className="text-xs text-slate-500">GSTIN: {state.bizGstin}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-700">INVOICE</div>
                    <div className="text-sm text-slate-700 mt-1">{state.invoiceNo}</div>
                    <div className="text-xs text-slate-500 mt-2">Date: {state.date}</div>
                    {state.dueDate && <div className="text-xs text-slate-500">Due: {state.dueDate}</div>}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Bill to</div>
                  <div className="font-semibold">{state.clientName}</div>
                  <div className="text-xs text-slate-600 whitespace-pre-line">{state.clientAddress}</div>
                  {state.clientEmail && <div className="text-xs text-slate-600">{state.clientEmail}</div>}
                  {state.clientGstin && <div className="text-xs text-slate-600">GSTIN: {state.clientGstin}</div>}
                </div>

                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="text-left py-2 px-3 font-semibold">Description</th>
                      <th className="text-right py-2 px-3 font-semibold w-16">Qty</th>
                      <th className="text-right py-2 px-3 font-semibold w-24">Rate</th>
                      <th className="text-right py-2 px-3 font-semibold w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.items.map((it) => (
                      <tr key={it.id} className="border-b border-slate-100">
                        <td className="py-3 px-3">{it.desc || <span className="text-slate-300">—</span>}</td>
                        <td className="py-3 px-3 text-right">{it.qty}</td>
                        <td className="py-3 px-3 text-right">{fmt(it.rate)}</td>
                        <td className="py-3 px-3 text-right font-medium">{fmt(it.qty * it.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mb-8">
                  <div className="w-64 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">{state.taxLabel} ({state.taxRate}%)</span><span>{fmt(tax)}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 text-base font-bold text-emerald-700"><span>Total</span><span>{fmt(total)}</span></div>
                  </div>
                </div>

                {(state.notes || state.terms) && (
                  <div className="border-t border-slate-200 pt-5 grid sm:grid-cols-2 gap-5 text-xs text-slate-600">
                    {state.notes && <div><div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Notes</div><div className="whitespace-pre-line">{state.notes}</div></div>}
                    {state.terms && <div><div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Terms</div><div className="whitespace-pre-line">{state.terms}</div></div>}
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 print:text-slate-300">
                  Generated free with HustleAI · hustlaiapp.in
                </div>
              </motion.div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 print:hidden">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Live preview — your changes save automatically
              </div>
            </div>
          </div>

          {/* SEO content */}
          <div className="mt-20 max-w-3xl mx-auto print:hidden">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Free GST invoice generator for freelancers in India</h2>
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
              <p>Most invoice tools in India are either bloated accounting suites or paywalled after the first download. HustleAI's free invoice generator runs entirely in your browser — fill in your business details, add line items, set GST, and generate a clean PDF that's ready to send to clients.</p>
              <p>It's built for freelancers, agencies, consultants, designers and developers who don't want to learn Tally just to bill ₹25,000 for a website project.</p>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-10 mb-4">Frequently asked</h3>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
    </div>
  );
}
function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="text-sm min-h-[60px]" />
    </div>
  );
}
