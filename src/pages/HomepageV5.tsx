import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Pricing } from "@/components/Pricing";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PersonalizedHeroCTA } from "@/components/home/PersonalizedHeroCTA";

gsap.registerPlugin(ScrollTrigger);

/**
 * V5 — "The Operating System for Independent Businesses"
 * Apple-style narrative: huge typography, massive breathing room, almost no cards.
 * Each section is one verb the system runs.
 */

const SECTIONS: { verb: string; sub: string; body: string; tone: string }[] = [
  {
    verb: "Run Clients.",
    sub: "One record per relationship.",
    body: "Every conversation, document, invoice, and delivery tied to a single client thread. No more pulling tabs apart to remember who got what.",
    tone: "text-emerald-600",
  },
  {
    verb: "Run Delivery.",
    sub: "Async pipelines that don't wait for you.",
    body: "Proposals generate. Exports render. Telegram pings fire. Approvals roll in. Your delivery layer runs while you do anything else.",
    tone: "text-sky-600",
  },
  {
    verb: "Run Payments.",
    sub: "Invoice → Paid → Reconciled.",
    body: "Branded invoices auto-numbered, sent, tracked, and confirmed against your client record. No spreadsheets. No follow-up shame.",
    tone: "text-violet-600",
  },
  {
    verb: "Run Growth.",
    sub: "Leads, pipelines, and trends as first-class citizens.",
    body: "A working CRM, lead discovery, and trend signal built for solo operators and agencies — not enterprise sales teams.",
    tone: "text-amber-600",
  },
  {
    verb: "Run Everything.",
    sub: "One operating layer. Your business on it.",
    body: "Clients, delivery, payments, growth — one workspace, one async runtime, one place where the work actually happens.",
    tone: "text-emerald-600",
  },
];

export default function HomepageV5() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      gsap.from(".v5-hero-line", { y: 80, opacity: 0, duration: 1.1, stagger: 0.12, ease: "power4.out" });
      if (reduce) return;
      gsap.utils.toArray<HTMLElement>(".v5-section").forEach((sec) => {
        const verb = sec.querySelector(".v5-verb");
        const sub = sec.querySelector(".v5-sub");
        const body = sec.querySelector(".v5-body");
        gsap.from([verb, sub, body], {
          y: 60,
          opacity: 0,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: sec, start: "top 75%" },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-white text-slate-900">
      <SEO
        title="HustleAI — The Operating System for Independent Businesses (V5)"
        description="Experimental Apple-style narrative variant of the HustleAI homepage."
        path="/homepage-5"
        noindex
      />
      <Navbar />

      {/* Hero — huge typography, massive air */}
      <section className="pt-40 md:pt-48 pb-32 md:pb-44 px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-5xl">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400 font-semibold mb-8 v5-hero-line">
            HustleAI · Operating System
          </div>
          <h1 className="font-display font-semibold tracking-[-0.03em] leading-[0.95] text-slate-900">
            <span className="block text-[3rem] sm:text-[4.5rem] md:text-[7rem] v5-hero-line">The operating system</span>
            <span className="block text-[3rem] sm:text-[4.5rem] md:text-[7rem] v5-hero-line">
              for <span className="text-emerald-600">independent businesses.</span>
            </span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-500 mt-10 max-w-2xl leading-relaxed v5-hero-line">
            Clients. Delivery. Payments. Growth. One workspace built for the people running everything themselves.
          </p>
          <div className="mt-12 v5-hero-line">
            <PersonalizedHeroCTA />
          </div>
        </div>
      </section>

      {/* Verb sections — one statement per screen, no cards */}
      {SECTIONS.map((s, i) => (
        <section
          key={s.verb}
          className={`v5-section py-32 md:py-44 px-6 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}`}
        >
          <div className="container mx-auto max-w-5xl">
            <h2 className={`v5-verb font-display font-semibold tracking-[-0.03em] leading-[0.95] text-[3rem] sm:text-[5rem] md:text-[7rem] ${s.tone}`}>
              {s.verb}
            </h2>
            <div className="v5-sub mt-8 text-2xl md:text-3xl text-slate-900 font-display font-medium tracking-tight max-w-3xl">
              {s.sub}
            </div>
            <p className="v5-body mt-6 text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed">
              {s.body}
            </p>
          </div>
        </section>
      ))}

      {/* Closing — bare CTA, no card */}
      <section className="py-40 md:py-56 px-6 bg-white text-center">
        <div className="container mx-auto max-w-4xl space-y-10">
          <h2 className="font-display font-semibold tracking-[-0.03em] leading-[0.95] text-[2.5rem] sm:text-[4rem] md:text-[6rem] text-slate-900">
            Run <span className="text-emerald-600">everything</span>.
          </h2>
          <p className="text-lg md:text-2xl text-slate-500 max-w-xl mx-auto">
            One workspace. Free to start. No credit card.
          </p>
          <div>
            <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white text-base px-10 h-14 rounded-full" onClick={() => navigate("/signup")}>
              Open your workspace <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing kept available */}
      <div className="bg-slate-50/50"><Pricing /></div>
      <section className="pb-12 px-4 bg-slate-50/50">
        <div className="container mx-auto text-center">
          <Button size="lg" variant="outline" className="text-base px-8 h-12 rounded-full" onClick={() => navigate("/plans")}>
            View all plans <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <div className="bg-white"><Footer /></div>
    </div>
  );
}