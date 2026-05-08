import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Receipt, ScrollText, ArrowRight, Sparkles, Lock, Zap } from "lucide-react";
import { SEO, faqJsonLd } from "@/components/SEO";
import { DashboardReminderBanner } from "@/components/tools/DashboardReminderBanner";

const tools = [
  {
    href: "/tools/invoice-generator",
    icon: Receipt,
    label: "Invoice Generator",
    desc: "Free GST-ready invoice maker. Add your logo, line items, taxes — download as PDF.",
    tag: "Most popular",
    color: "from-emerald-500 to-teal-600",
  },
  {
    href: "/tools/proposal-generator",
    icon: FileText,
    label: "Proposal Generator",
    desc: "Win more clients with polished proposals. 4 pre-built scopes — web, social, consulting, video.",
    tag: "New",
    color: "from-violet-500 to-purple-600",
  },
  {
    href: "/tools/contract-generator",
    icon: ScrollText,
    label: "Contract Generator",
    desc: "Freelance agreements, NDAs, web-dev contracts. Lawyer-style clauses, ready to sign.",
    tag: "Free",
    color: "from-amber-500 to-orange-600",
  },
];

const faqs = [
  { q: "Are these tools really free?", a: "Yes. You can build, preview and edit every document for free, no signup needed. We only ask you to create a free account when you want to download or save." },
  { q: "Do you store the data I enter?", a: "No. Everything happens in your browser. Your draft is auto-saved to your local device only — we never see it until you sign up and choose to save it to your workspace." },
  { q: "What's the catch?", a: "Honestly? We're betting you'll love the tools and want the full HustleAI Workspace OS — CRM, client portals, payments, automation. The free tools are a taste." },
  { q: "Can I use these for client work?", a: "Absolutely. Thousands of freelancers and agencies use them daily for invoices, proposals and contracts that actually get signed." },
];

export default function ToolsHub() {
  return (
    <>
      <SEO
        title="Free AI Tools for Freelancers & Agencies — Invoice, Proposal & Contract Generator | HustleAI"
        description="Free AI-powered tools for freelancers and agencies in the US, UK, EU, AU, CA and India. Generate invoices (USD/GBP/EUR/INR), client proposals, and freelance contracts in minutes. No signup to try."
        path="/tools"
        jsonLd={faqJsonLd(faqs)}
      />
      <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto"><DashboardReminderBanner />
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-5">
              <Sparkles className="w-3.5 h-3.5" /> 100% free · AI auto-fill · No signup to try
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4 tracking-tight">
              Free tools for the <span className="text-gradient bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">work you already do</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Stop juggling spreadsheets and Word docs. Generate invoices, proposals and contracts in your browser — with one-click AI auto-fill. Used by freelancers in the US, UK, EU, Australia and India.
            </p>
          </motion.div>

          {/* Tool cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {tools.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div
                  key={t.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.4 }}
                >
                  <Link
                    to={t.href}
                    className="group block bg-white border border-slate-200/80 rounded-2xl p-6 h-full hover:border-emerald-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">{t.tag}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition">{t.label}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{t.desc}</p>
                    <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      Open tool <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-10">How our free tools work</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Fill the form", desc: "Type your details right in the browser. Preview updates live." },
                { icon: Sparkles, title: "Edit & polish", desc: "Switch templates, tweak text, change branding. All free, no limit." },
                { icon: Lock, title: "Sign up to download", desc: "Create a free account once to download PDFs, save drafts and sync to your workspace." },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="text-xs uppercase tracking-wider font-bold text-emerald-700 mb-2">Step {i + 1}</div>
                    <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                    <p className="text-sm text-slate-600">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-8">Frequently asked</h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details key={i} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 transition">
                  <summary className="font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                    {f.q}
                    <span className="text-emerald-600 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
