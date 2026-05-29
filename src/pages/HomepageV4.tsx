import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Check, FileDown, Receipt, ShieldCheck, Send, Sparkles, Workflow } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PersonalizedHeroCTA } from "@/components/home/PersonalizedHeroCTA";
import { AsyncLane, SignalDot, OpsGrid } from "@/components/home/ops-primitives";

/**
 * V4 — Live Operations homepage.
 * The hero rotates an operational verb. The telemetry strip cycles realistic
 * delivery events (seeded; never fake counters). The pipeline visualizes
 * Generate → Export → Deliver → Continue with always-running lane motion.
 */

const HERO_VERBS = [
  "Proposal delivered.",
  "Invoice paid.",
  "Resume exported.",
  "Client approved.",
  "Contract signed.",
];

type Event = { icon: typeof FileDown; label: string; tone: string };
const EVENT_POOL: Event[] = [
  { icon: FileDown,    label: "Proposal exported",    tone: "text-sky-600 bg-sky-50 border-sky-200" },
  { icon: Receipt,     label: "Invoice paid",         tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { icon: Sparkles,    label: "Resume generated",     tone: "text-violet-600 bg-violet-50 border-violet-200" },
  { icon: ShieldCheck, label: "Contract signed",      tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { icon: Send,        label: "Telegram ping sent",   tone: "text-sky-600 bg-sky-50 border-sky-200" },
  { icon: Workflow,    label: "Workflow advanced",    tone: "text-amber-600 bg-amber-50 border-amber-200" },
  { icon: Briefcase,   label: "Client portal viewed", tone: "text-slate-700 bg-slate-100 border-slate-200" },
];

type Row = Event & { id: number; secondsAgo: number };

function makeSeed(): Row[] {
  return EVENT_POOL.slice(0, 6).map((e, i) => ({ ...e, id: i, secondsAgo: 2 + i * 6 }));
}

export default function HomepageV4() {
  const navigate = useNavigate();
  const [verbIdx, setVerbIdx] = useState(0);
  const [rows, setRows] = useState<Row[]>(() => makeSeed());

  // Rotate verb
  useEffect(() => {
    const id = setInterval(() => setVerbIdx((i) => (i + 1) % HERO_VERBS.length), 1700);
    return () => clearInterval(id);
  }, []);

  // Tick "secondsAgo" + push a new event every 4.5s
  useEffect(() => {
    const tick = setInterval(() => setRows((rs) => rs.map((r) => ({ ...r, secondsAgo: r.secondsAgo + 1 }))), 1000);
    let counter = 100;
    const push = setInterval(() => {
      setRows((rs) => {
        const next = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
        const row: Row = { ...next, id: counter++, secondsAgo: 1 };
        return [row, ...rs].slice(0, 8);
      });
    }, 4500);
    return () => { clearInterval(tick); clearInterval(push); };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="HustleAI — Live operations homepage (experimental V4)"
        description="Experimental live-operations variant of the HustleAI homepage."
        path="/homepage-4"
        noindex
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-28 md:pt-32 pb-16 md:pb-20 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <OpsGrid />
        <div className="container mx-auto max-w-4xl text-center space-y-7 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs shadow-sm">
            <SignalDot /> Live operations preview · Experimental V4
          </div>
          <h1 className="text-[2.4rem] sm:text-5xl md:text-6xl font-display font-semibold tracking-tight leading-[1.08] text-slate-900">
            <span className="block">
              <span key={verbIdx} className="inline-block animate-fade-in text-emerald-600">{HERO_VERBS[verbIdx]}</span>
            </span>
            <span className="block text-slate-900">While you slept.</span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
            HustleAI runs your delivery pipeline asynchronously — proposals, invoices, exports and client pings happen in the background, on your schedule.
          </p>
          <PersonalizedHeroCTA />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] md:text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Async-native</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Delivery-aware</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Operator-grade</span>
          </div>
        </div>
      </section>

      {/* Telemetry stream */}
      <section className="py-16 md:py-20 px-4 bg-slate-50/60">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
              <SignalDot /> Recent activity · representative sample
            </div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight mt-2">
              Async work, <span className="text-emerald-600">always running.</span>
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/60">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Operations log</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Streaming
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3 animate-fade-in">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border ${r.tone}`}>
                    <r.icon className="w-3.5 h-3.5" />
                  </span>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <div className="text-sm text-slate-900 flex-1 truncate">{r.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{r.secondsAgo}s ago</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Async delivery pipeline */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">Delivery pipeline</div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight">
              Generate · Export · Deliver · <span className="text-emerald-600">Continue.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            {[
              { label: "Generate", note: "AI drafts the work", tone: "violet" as const },
              { label: "Export",   note: "Branded PDF rendered", tone: "sky" as const },
              { label: "Deliver",  note: "Telegram or share link", tone: "emerald" as const },
              { label: "Continue", note: "Next step queued", tone: "amber" as const },
            ].map((s, i, arr) => (
              <div key={s.label} className="relative">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">{s.note}</div>
                  <div className="mt-3 h-1 rounded overflow-hidden">
                    <AsyncLane tone={s.tone} />
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-slate-300">→</div>
                )}
              </div>
            ))}
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
              Let the work run itself. <br className="hidden md:block" /> Start your async workspace.
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