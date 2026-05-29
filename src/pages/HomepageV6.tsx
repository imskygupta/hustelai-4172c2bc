import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Sparkles, Workflow, Send, FileText, Receipt, Briefcase, Brain, ShieldCheck, MessageSquare } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PersonalizedHeroCTA } from "@/components/home/PersonalizedHeroCTA";
import { SignalDot } from "@/components/home/ops-primitives";

/**
 * V6 — "Live Product".
 * Homepage structured as a public changelog. Visitor's first impression is:
 * this company actually ships. Each entry maps to a real HustleAI capability.
 */

type Entry = { icon: typeof Sparkles; label: string; note: string; tone: string };

const RELEASES: { period: string; entries: Entry[] }[] = [
  {
    period: "This week",
    entries: [
      { icon: Brain,     label: "Workspace Memory",    note: "Every action remembered across sessions.",  tone: "from-violet-500 to-violet-600" },
      { icon: Workflow,  label: "Async Workflow OS",   note: "Six-stage pipeline runs in the background.", tone: "from-emerald-500 to-emerald-600" },
      { icon: ShieldCheck, label: "Client Portals",   note: "Signed share links and approval flows.",      tone: "from-sky-500 to-sky-600" },
    ],
  },
  {
    period: "Last week",
    entries: [
      { icon: Sparkles,  label: "AI Hustle Tools",      note: "Tier-gated AI grid with wallet credits.",  tone: "from-amber-500 to-amber-600" },
      { icon: FileText,  label: "Proposal Templates",   note: "Branded drafts in under five seconds.",     tone: "from-violet-500 to-violet-600" },
      { icon: Send,      label: "Telegram Delivery",    note: "Live pings the moment work is ready.",      tone: "from-sky-500 to-sky-600" },
    ],
  },
  {
    period: "Earlier this month",
    entries: [
      { icon: Receipt,   label: "Invoice Engine",       note: "Auto-numbered, branded, tracked.",          tone: "from-emerald-500 to-emerald-600" },
      { icon: Briefcase, label: "Lead Pipeline (CRM)",  note: "Discovery, pipelines, trend signal.",       tone: "from-slate-600 to-slate-700" },
      { icon: MessageSquare, label: "HustleBot Mentor", note: "AI mentor with admin intervention.",        tone: "from-violet-500 to-violet-600" },
    ],
  },
];

export default function HomepageV6() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="HustleAI — Live Product (V6)"
        description="Experimental changelog-style variant of the HustleAI homepage."
        path="/homepage-6"
        noindex
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-28 md:pt-32 pb-12 md:pb-16 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="container mx-auto max-w-4xl text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs shadow-sm">
            <SignalDot /> Live product · Experimental V6
          </div>
          <h1 className="text-[2.4rem] sm:text-5xl md:text-6xl font-display font-semibold tracking-tight leading-[1.05]">
            HustleAI ships. <br className="hidden sm:block" />
            <span className="text-emerald-600">Every week.</span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
            This homepage is a changelog. Everything below is a real capability shipped to your workspace — proposals, invoices, AI, portals, async delivery, lead pipelines.
          </p>
          <PersonalizedHeroCTA />
        </div>
      </section>

      {/* Changelog feed */}
      <section className="py-12 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <div className="relative">
            {/* vertical rail */}
            <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-300 via-slate-200 to-transparent" />
            {RELEASES.map((release) => (
              <div key={release.period} className="relative mb-12 last:mb-0">
                <div className="flex items-center gap-3 mb-5">
                  <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-semibold">{release.period}</div>
                </div>
                <ul className="space-y-3 pl-10">
                  {release.entries.map((e) => (
                    <li key={e.label} className="group relative rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:shadow-[0_4px_24px_-6px_rgba(16,185,129,0.18)] transition">
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-9 h-9 rounded-xl text-white flex items-center justify-center bg-gradient-to-br ${e.tone}`}>
                          <e.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-emerald-500" />
                            <div className="text-sm font-semibold text-slate-900">{e.label}</div>
                          </div>
                          <div className="text-[13px] text-slate-500 mt-1 leading-snug">{e.note}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center text-[12px] text-slate-400">
            Updated as we ship. All entries map to live capabilities in your workspace.
          </div>
        </div>
      </section>

      <div className="bg-slate-50/50"><Pricing /></div>
      <section className="pb-12 px-4 bg-slate-50/50">
        <div className="container mx-auto text-center">
          <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white text-base px-8 h-12" onClick={() => navigate("/plans")}>
            View all plans <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
      <div className="bg-white"><Testimonials /></div>

      <section className="py-20 md:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <div className="rounded-3xl p-8 md:p-12 text-center space-y-5 md:space-y-6 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full" />
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight relative leading-tight">
              A product that moves. <br className="hidden md:block" /> Start using everything we've shipped.
            </h2>
            <div className="relative">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8 h-12" onClick={() => navigate("/signup")}>
                Open your workspace <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-white"><Footer /></div>
    </div>
  );
}