import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Receipt, ScrollText, ArrowRight, Sparkles, Lock, Zap, Calculator, UserCircle2, ClipboardList, CalendarRange, Timer, IdCard, Share2, FolderOpen, CheckCircle2, Star, FileEdit } from "lucide-react";
import { SEO, faqJsonLd } from "@/components/SEO";
import { DashboardReminderBanner } from "@/components/tools/DashboardReminderBanner";
import { TrustStrip } from "@/components/TrustStrip";
import { Send } from "lucide-react";

/**
 * Free Tools Hub — UI polish only.
 * Routes, registry, analytics and tool functionality are unchanged.
 * Cards now read like "mini products": illustration area, status badge,
 * outcome copy, mini metrics, strong CTA. Grouped into categories,
 * with Client Intake elevated as the hero capability.
 */
type Tool = {
  href: string;
  icon: any;
  label: string;
  outcome: string;       // one-line outcome
  badge: string;         // status badge
  badgeTone: string;     // tailwind classes for badge
  cta: string;           // CTA copy
  color: string;         // illustration gradient
  uses?: string;         // mini metric
  rating?: string;       // mini metric
  note?: string;         // extra mini metric
};

const HERO: Tool = {
  href: "/tools/onboarding-form",
  icon: ClipboardList,
  label: "Client Intake & Onboarding",
  outcome: "Public intake forms, file collection and approvals — clients actually finish them.",
  badge: "Client favorite",
  badgeTone: "bg-emerald-100 text-emerald-700",
  cta: "Build intake form",
  color: "from-emerald-500 via-teal-500 to-sky-600",
  uses: "9.1k forms shipped",
  rating: "4.9",
  note: "Public link · File uploads · Approvals",
};

const documents: Tool[] = [
  {
    href: "/tools/proposal-generator", icon: FileText, label: "Proposal Generator",
    outcome: "Create client-ready proposals automatically.",
    badge: "Auto routed", badgeTone: "bg-amber-100 text-amber-700",
    cta: "Create proposal", color: "from-violet-500 to-purple-600",
    uses: "12.4k uses", rating: "4.8",
  },
  {
    href: "/tools/contract-generator", icon: ScrollText, label: "Contract Generator",
    outcome: "Build contracts without legal guesswork.",
    badge: "Export ready", badgeTone: "bg-sky-100 text-sky-700",
    cta: "Build contract", color: "from-amber-500 to-orange-600",
    uses: "8.7k uses", rating: "4.9",
  },
  {
    href: "/tools/invoice-generator", icon: Receipt, label: "Invoice Generator",
    outcome: "Generate branded invoices in seconds.",
    badge: "Most used", badgeTone: "bg-emerald-100 text-emerald-700",
    cta: "Generate invoice", color: "from-emerald-500 to-teal-600",
    uses: "24.1k uses", rating: "4.9",
  },
  {
    href: "/dashboard/documents", icon: FileEdit, label: "Documents",
    outcome: "Upload any PDF — original look stays intact. AI revises on top, clients approve via link.",
    badge: "Pro+", badgeTone: "bg-violet-100 text-violet-700",
    cta: "Open Documents", color: "from-indigo-500 via-violet-600 to-fuchsia-600",
    uses: "Revise · Share · Approve", note: "Original formatting preserved",
  },
];

const clientOps: Tool[] = [
  {
    href: "/tools/business-card", icon: IdCard, label: "Business Card Generator",
    outcome: "Hand off a branded card in any meeting.",
    badge: "New", badgeTone: "bg-fuchsia-100 text-fuchsia-700",
    cta: "Design card", color: "from-fuchsia-500 to-pink-600",
    uses: "3.2k uses",
  },
  {
    href: "/tools/portfolio-bio", icon: UserCircle2, label: "Portfolio Bio Generator",
    outcome: "Bio variants for LinkedIn, agency or creator pages.",
    badge: "Popular", badgeTone: "bg-sky-100 text-sky-700",
    cta: "Write bio", color: "from-sky-500 to-indigo-600",
    uses: "5.6k uses",
  },
];

const planning: Tool[] = [
  {
    href: "/tools/pricing-calculator", icon: Calculator, label: "AI Pricing Calculator",
    outcome: "Hourly, agency rate, margin and SaaS — one calculator.",
    badge: "Async", badgeTone: "bg-violet-100 text-violet-700",
    cta: "Calculate pricing", color: "from-violet-500 to-fuchsia-600",
    uses: "6.8k uses",
  },
  {
    href: "/tools/content-calendar", icon: CalendarRange, label: "Social Content Calendar",
    outcome: "A 4-week, 5-post-per-week plan in seconds.",
    badge: "Export ready", badgeTone: "bg-sky-100 text-sky-700",
    cta: "Plan calendar", color: "from-rose-500 to-pink-600",
    uses: "4.4k plans",
  },
  {
    href: "/tools/pomodoro", icon: Timer, label: "Focus & Earnings Widget",
    outcome: "Pomodoro plus billable-hour tracker on top of any work.",
    badge: "New", badgeTone: "bg-orange-100 text-orange-700",
    cta: "Open widget", color: "from-orange-500 to-rose-600",
    uses: "2.1k sessions",
  },
];

const groups: Array<{ id: string; title: string; subtitle: string; items: Tool[] }> = [
  { id: "documents", title: "Documents", subtitle: "Send-to-client outputs.", items: documents },
  { id: "client-ops", title: "Client Operations", subtitle: "Identity and presence.", items: clientOps },
  { id: "planning", title: "Planning", subtitle: "Price, plan, focus.", items: planning },
];

const faqs = [
  { q: "Are these tools really free?", a: "Yes. You can build, preview and edit every document for free, no signup needed. We only ask you to create a free account when you want to download or save." },
  { q: "Do you store the data I enter?", a: "No. Everything happens in your browser. Your draft is auto-saved to your local device only — we never see it until you sign up and choose to save it to your workspace." },
  { q: "What's the catch?", a: "Honestly? We're betting you'll love the tools and want the full HustleAI Workspace OS — CRM, client portals, payments, automation. The free tools are a taste." },
  { q: "Can I use these for client work?", a: "Absolutely. Thousands of freelancers and agencies use them daily for invoices, proposals and contracts that actually get signed." },
];

function ToolCard({ t, i }: { t: Tool; i: number }) {
  const Icon = t.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.05 * i, duration: 0.35 }}
    >
      <Link
        to={t.href}
        className="group relative flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-emerald-400 hover:shadow-[0_18px_40px_-20px_rgba(16,185,129,0.35)] hover:-translate-y-1 transition-all duration-300"
      >
        {/* Illustration area (top ~40%) */}
        <div className={`relative h-36 bg-gradient-to-br ${t.color} flex items-center justify-center overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
          <div className="absolute -bottom-8 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Icon className="w-8 h-8 text-white drop-shadow" />
          </div>
          <span className={`absolute top-3 left-3 text-[10px] uppercase tracking-[0.14em] font-bold px-2.5 py-1 rounded-full ${t.badgeTone} shadow-sm`}>
            {t.badge}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col p-5">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">{t.label}</h3>
          <p className="text-sm text-slate-600 leading-relaxed mt-1.5 mb-4">{t.outcome}</p>

          {/* Mini metrics */}
          {(t.uses || t.rating || t.note) && (
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-4">
              {t.uses && (
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t.uses}</span>
              )}
              {t.rating && (
                <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {t.rating}</span>
              )}
              {t.note && <span className="text-slate-500">{t.note}</span>}
            </div>
          )}

          {/* CTA */}
          <div className="mt-auto">
            <span className="inline-flex items-center justify-center w-full gap-1.5 text-sm font-semibold text-white bg-slate-900 group-hover:bg-emerald-600 rounded-xl px-4 py-2.5 transition-colors">
              {t.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ToolsHub() {
  const HeroIcon = HERO.icon;
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
              Free tools that plug into your <span className="text-gradient bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">AI workspace</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Generate invoices, proposals and contracts in your browser — with one-click AI auto-fill. Save to your workspace, deliver via Telegram, share with secure links. Used by freelancers in the US, UK, EU, Australia and India.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-500">
              <Send className="w-3.5 h-3.5 text-sky-600" /> Every export is Telegram-ready and Workspace-saveable
            </div>
          </motion.div>

          {/* Featured hero card — Client Intake */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-14"
          >
            <Link
              to={HERO.href}
              className="group relative grid md:grid-cols-5 gap-0 bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-emerald-400 hover:shadow-[0_28px_60px_-30px_rgba(16,185,129,0.45)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`relative md:col-span-2 min-h-[220px] bg-gradient-to-br ${HERO.color} flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_30%,white,transparent_60%)]" />
                <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
                <span className={`absolute top-4 left-4 text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1 rounded-full ${HERO.badgeTone} shadow-sm`}>
                  {HERO.badge}
                </span>
                <div className="relative w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <HeroIcon className="w-12 h-12 text-white drop-shadow" />
                </div>
              </div>
              <div className="md:col-span-3 p-7 md:p-10 flex flex-col justify-center">
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-700 mb-2">Flagship · Client Intake OS</div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-900 mb-3">{HERO.label}</h2>
                <p className="text-base text-slate-600 leading-relaxed mb-5 max-w-xl">{HERO.outcome}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mb-6">
                  <span className="inline-flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-emerald-600" /> Public form link</span>
                  <span className="inline-flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5 text-sky-600" /> File collection</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approvals</span>
                  <span className="inline-flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {HERO.rating} · {HERO.uses}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-slate-900 group-hover:bg-emerald-600 rounded-xl px-5 py-3 transition-colors">
                    {HERO.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-xs text-slate-500">No signup to try · Public link in 60s</span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Category sections */}
          <div className="space-y-14 mb-20">
            {groups.map((g) => (
              <section key={g.id}>
                <div className="flex items-end justify-between mb-5 px-1">
                  <div>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-slate-900">{g.title}</h2>
                    <p className="text-sm text-slate-500">{g.subtitle}</p>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-400">
                    {g.items.length} tools
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {g.items.map((t, i) => <ToolCard key={t.href} t={t} i={i} />)}
                </div>
              </section>
            ))}
          </div>

          <TrustStrip className="mb-16 rounded-2xl !border" />

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
