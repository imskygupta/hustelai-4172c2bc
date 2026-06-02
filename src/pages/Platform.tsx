import { Link } from "react-router-dom";
import {
  ArrowRight, Inbox, FileSignature, Users, Briefcase, Wallet,
  Receipt, FolderOpen, Globe, ClipboardList, Clock, MessageSquare, FileText, Sparkles, Workflow, Brain
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const TONE_GRADIENT: Record<string, string> = {
  sky:     "from-sky-500 via-cyan-500 to-sky-600",
  violet:  "from-violet-500 via-fuchsia-500 to-violet-600",
  indigo:  "from-indigo-500 via-blue-500 to-indigo-600",
  amber:   "from-amber-500 via-orange-500 to-amber-600",
  emerald: "from-emerald-500 via-teal-500 to-emerald-600",
};

const STAGES = [
  { key: "lead",       label: "Lead",       desc: "Capture new client inquiries through intake forms or your website.",   icon: Inbox,         tone: "sky"     as const, anchor: "#cat-onboarding",   badge: "Capture" },
  { key: "proposal",   label: "Proposal",   desc: "Draft, brand and send proposals or quotations clients can sign off on.", icon: FileSignature, tone: "violet"  as const, anchor: "#cat-proposals",    badge: "Send" },
  { key: "onboarding", label: "Onboarding", desc: "Collect briefs, contracts and assets through structured forms.",          icon: Users,         tone: "indigo"  as const, anchor: "#cat-onboarding",   badge: "Brief" },
  { key: "delivery",   label: "Delivery",   desc: "Run projects, share files and keep clients updated as work progresses.", icon: Briefcase,     tone: "amber"   as const, anchor: "#cat-delivery",     badge: "Deliver" },
  { key: "billing",    label: "Billing",    desc: "Issue invoices, track payments and stay on top of recurring work.",      icon: Wallet,        tone: "emerald" as const, anchor: "#cat-billing",      badge: "Invoice" },
];

const CATEGORIES = [
  {
    id: "cat-onboarding",
    label: "Client Onboarding",
    desc: "Turn an inbound inquiry into a properly briefed, contracted client.",
    icon: Users,
    tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    g: "indigo" as const,
    badge: "Brief",
    items: [
      { label: "Intake forms",       to: "/workspaces/intake" },
      { label: "Onboarding builder", to: "/tools/onboarding-form" },
      { label: "Client profiles",    to: "/workspaces/clients" },
      { label: "Client portals",     to: "/work/portals" },
    ],
  },
  {
    id: "cat-proposals",
    label: "Proposals & Documents",
    desc: "Produce branded client documents without leaving your workspace.",
    icon: FileSignature,
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    g: "violet" as const,
    badge: "Send",
    items: [
      { label: "Proposal generator",  to: "/proposal-generator" },
      { label: "Quotation generator", to: "/quotation-generator" },
      { label: "Contract & NDA",      to: "/tools/contract-generator" },
      { label: "Reusable blocks",     to: "/workspaces/blocks" },
    ],
  },
  {
    id: "cat-delivery",
    label: "Client Delivery",
    desc: "Track work, share deliverables and keep clients in the loop.",
    icon: Briefcase,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    g: "amber" as const,
    badge: "Deliver",
    items: [
      { label: "Files & deliverables", to: "/work/files" },
      { label: "Checklists",           to: "/work/checklists" },
      { label: "Deadlines",            to: "/work/deadlines" },
      { label: "Client communication", to: "/work/comm" },
    ],
  },
  {
    id: "cat-operations",
    label: "Operations & CRM",
    desc: "Run the operational side of your business from one cockpit.",
    icon: Workflow,
    tone: "bg-sky-50 text-sky-700 border-sky-200",
    g: "sky" as const,
    badge: "Operate",
    items: [
      { label: "Clients (CRM)",   to: "/work/clients" },
      { label: "Pipeline",        to: "/workspaces/pipeline" },
      { label: "Time tracker",    to: "/work/time" },
      { label: "Revenue overview",to: "/workspaces/revenue" },
    ],
  },
  {
    id: "cat-billing",
    label: "Billing & Invoicing",
    desc: "Send professional invoices, track payments and reconcile expenses.",
    icon: Receipt,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    g: "emerald" as const,
    badge: "Bill",
    items: [
      { label: "Invoices",         to: "/work/invoices" },
      { label: "Expenses",         to: "/work/expenses" },
      { label: "Pricing calculator", to: "/tools/pricing-calculator" },
      { label: "Billing settings", to: "/settings/billing" },
    ],
  },
  {
    id: "cat-templates",
    label: "Templates & Systems",
    desc: "Reusable systems so the same setup work isn't repeated for every client.",
    icon: ClipboardList,
    tone: "bg-teal-50 text-teal-700 border-teal-200",
    g: "emerald" as const,
    badge: "Reuse",
    items: [
      { label: "Brand kit",            to: "/workspaces/brand-kit" },
      { label: "Operational systems",  to: "/systems" },
      { label: "Operator stories",     to: "/stories" },
      { label: "Free tool library",    to: "/tools" },
    ],
  },
];

export default function Platform() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="The HustleAI Platform — Client Operations from Lead to Invoice"
        description="See how HustleAI organizes client onboarding, proposals, delivery, operations and billing into one connected workspace for freelancers and agencies."
        path="/platform"
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-28 md:pt-32 pb-12 md:pb-16 px-4 bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="container mx-auto max-w-4xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs">
            <Sparkles className="w-3 h-3 text-emerald-600" /> The platform
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight leading-[1.05]">
            One connected workspace for the <span className="text-emerald-600">full client lifecycle.</span>
          </h1>
          <p className="text-slate-500 md:text-lg max-w-2xl mx-auto">
            HustleAI organizes the day-to-day of independent client work — from the first inquiry to the final invoice — into a single, calm operational system.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">
              <Link to="/signup">Open your workspace <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300">
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Lifecycle map */}
      <section className="py-16 md:py-20 px-4 border-t border-slate-100">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 font-semibold">Client lifecycle</div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight">
              Lead → Proposal → Onboarding → Delivery → Billing
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              Each stage of a client engagement has a clear home in HustleAI — no more juggling docs, sheets and chats across five different tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {STAGES.map((s, i) => (
              <div key={s.key} className={`relative rounded-2xl border bg-gradient-to-b ${s.tone} p-5`}>
                <div className="flex items-center justify-between">
                  <s.icon className="w-5 h-5" />
                  <span className="text-[10px] font-mono text-slate-400">0{i + 1}</span>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">{s.label}</div>
                <div className="text-[12.5px] text-slate-600 mt-1 leading-snug">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categorized capabilities */}
      <section className="py-16 md:py-20 px-4 bg-slate-50/60 border-t border-slate-100">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">What's in the workspace</div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight">Organized by workflow, not by feature</h2>
            <p className="text-slate-500 text-sm md:text-base">
              HustleAI groups capabilities into the operational categories you actually work in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow">
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${c.tone}`}>
                  <c.icon className="w-3.5 h-3.5" /> {c.label}
                </div>
                <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">{c.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {c.items.map((i) => (
                    <li key={i.to}>
                      <Link
                        to={i.to}
                        className="group flex items-center justify-between text-sm text-slate-700 hover:text-slate-900 px-2 py-1.5 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <span>{i.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI as infrastructure */}
      <section className="py-16 md:py-20 px-4 border-t border-slate-100">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-violet-700 font-semibold">AI inside the workspace</div>
              <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight">
                AI as quiet infrastructure — not magic.
              </h2>
              <p className="text-slate-500 text-sm md:text-base leading-relaxed">
                AI in HustleAI is used to assist with concrete operational tasks: drafting a proposal from a brief, suggesting onboarding questions, summarizing client conversations or formatting an invoice. You stay in control — every output is editable, reviewable and tied to a real client record.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2"><FileText className="w-4 h-4 text-violet-600 mt-0.5" /> AI-assisted proposal & document drafts</li>
                <li className="flex gap-2"><Brain className="w-4 h-4 text-violet-600 mt-0.5" /> Suggested next steps based on workspace activity</li>
                <li className="flex gap-2"><MessageSquare className="w-4 h-4 text-violet-600 mt-0.5" /> Client communication summaries</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-violet-50/40 p-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-3">Notification & delivery integrations</div>
              <p className="text-sm text-slate-600 leading-relaxed">
                HustleAI integrates with the channels you already use to keep clients in the loop — including email, Telegram and webhooks. These are utility integrations on top of the core workspace, not the product itself.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: Globe, label: "Email" },
                  { icon: MessageSquare, label: "Telegram" },
                  { icon: Workflow, label: "Webhooks" },
                ].map(({ icon: I, label }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <I className="w-4 h-4 mx-auto text-slate-500" />
                    <div className="text-[11px] mt-1 text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 bg-slate-50/60 border-t border-slate-100">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">
            See the full platform in your own workspace
          </h2>
          <p className="text-slate-500 text-sm md:text-base">
            Free to start. No credit card needed. Bring one client and try a full lifecycle end-to-end.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Link to="/signup">Open your workspace <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
