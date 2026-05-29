import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Briefcase, Check, FileText, Receipt, Users, Sparkles, FileDown, Send, Workflow, Cloud } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PersonalizedHeroCTA } from "@/components/home/PersonalizedHeroCTA";
import { IntegrationsMarquee } from "@/components/home/IntegrationsMarquee";
import { OpsGrid, SignalDot, AsyncLane } from "@/components/home/ops-primitives";

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  { icon: Sparkles, label: "Generate", note: "Brief in. Draft out.", tone: "from-violet-500 to-violet-600" },
  { icon: FileDown, label: "Export", note: "Branded PDF rendered with your kit.", tone: "from-sky-500 to-sky-600" },
  { icon: Send, label: "Deliver", note: "Auto-routed via Telegram or share link.", tone: "from-emerald-500 to-emerald-600" },
  { icon: Workflow, label: "Continue", note: "Suggested next step keeps the work moving.", tone: "from-amber-500 to-amber-600" },
  { icon: Cloud, label: "Async", note: "Workflows run while you do other things.", tone: "from-violet-500 to-violet-600" },
  { icon: Briefcase, label: "Workspace", note: "Every output lands in client context.", tone: "from-slate-600 to-slate-700" },
];

const FLOATING_MODULES = [
  { label: "CRM", note: "Single record per client", x: -180, y: -40, delay: 0 },
  { label: "Proposals", note: "AI-drafted, branded", x: 160, y: -60, delay: 0.1 },
  { label: "Invoices", note: "Auto-numbered", x: -200, y: 90, delay: 0.2 },
  { label: "AI", note: "Async job runner", x: 0, y: 0, delay: 0.05 },
  { label: "Portal", note: "Signed share links", x: 200, y: 100, delay: 0.15 },
  { label: "Telegram", note: "Live delivery pings", x: -40, y: 160, delay: 0.25 },
];

export default function HomepageV2() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const floatRef = useRef<HTMLDivElement>(null);

  // Hero entrance: per-word reveal + chip stagger
  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".v2-hero-word", {
        y: 60, opacity: 0, duration: 0.9, stagger: 0.07, ease: "power4.out",
      });
      gsap.from(".v2-hero-chip", {
        y: 14, opacity: 0, duration: 0.5, stagger: 0.05, ease: "power2.out", delay: 0.4,
      });
      gsap.from(".v2-hero-cta", {
        y: 14, opacity: 0, duration: 0.6, ease: "power2.out", delay: 0.7,
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Pinned workflow scroll: each stage activates in sequence
  useEffect(() => {
    if (!pinnedRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      stageRefs.current.forEach((el) => el?.setAttribute("data-active", "true"));
      return;
    }
    const ctx = gsap.context(() => {
      const stages = stageRefs.current.filter(Boolean) as HTMLDivElement[];
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinnedRef.current!,
          start: "top top",
          end: `+=${stages.length * 320}`,
          pin: true,
          scrub: 0.8,
        },
      });
      stages.forEach((stage, i) => {
        tl.to(stage, { duration: 0.5, onStart: () => stage.setAttribute("data-active", "true"), onReverseComplete: () => stage.setAttribute("data-active", "false") }, i * 0.5);
      });
    }, pinnedRef);
    return () => ctx.revert();
  }, []);

  // Floating module mouse parallax
  useEffect(() => {
    if (!floatRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const root = floatRef.current;
    const cards = root.querySelectorAll<HTMLElement>("[data-floating]");
    const onMove = (e: MouseEvent) => {
      const r = root.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      cards.forEach((c, i) => {
        const depth = ((i % 3) + 1) * 8;
        gsap.to(c, { x: `+=${0}`, rotateY: cx * 6, rotateX: -cy * 6, translateX: cx * depth, translateY: cy * depth, duration: 0.6, ease: "power2.out", overwrite: "auto" });
      });
    };
    root.addEventListener("mousemove", onMove);
    return () => root.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="HustleAI — Motion-first homepage (experimental V2)"
        description="Experimental motion-first variant of the HustleAI homepage."
        path="/homepage-2"
        noindex
      />
      <Navbar />

      {/* Hero */}
      <section ref={heroRef} className="pt-28 md:pt-32 pb-20 md:pb-28 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="absolute inset-0 pointer-events-none opacity-[0.5]" style={{
          backgroundImage: "linear-gradient(to right, rgb(226 232 240 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center top, black 30%, transparent 75%)",
        }} />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-200/30 blur-3xl rounded-full pointer-events-none" />

        <div className="container mx-auto max-w-5xl text-center space-y-7 md:space-y-8 relative z-10">
          <div className="v2-hero-chip inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs shadow-sm">
            <SignalDot />
            Motion-first preview · Experimental V2
          </div>
          <h1 className="text-[2.6rem] leading-[1.05] sm:text-5xl md:text-7xl font-display font-semibold tracking-tight text-slate-900">
            {["Run", "your", "freelance", "and", "client", "operations"].map((w, i) => (
              <span key={i} className="v2-hero-word inline-block mr-3">{w}</span>
            ))}
            <br className="hidden sm:block" />
            <span className="text-emerald-600">
              {["from", "one", "workspace."].map((w, i) => (
                <span key={i} className="v2-hero-word inline-block mr-3">{w}</span>
              ))}
            </span>
          </h1>
          <p className="v2-hero-chip text-[15px] md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Manage proposals, client onboarding, invoices, projects and async delivery without juggling multiple tools.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {[
              { Icon: FileText,  label: "Proposals",  tone: "bg-violet-50 text-violet-700 border-violet-200" },
              { Icon: Users,     label: "Onboarding", tone: "bg-sky-50 text-sky-700 border-sky-200" },
              { Icon: Receipt,   label: "Invoices",   tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { Icon: Briefcase, label: "Delivery",   tone: "bg-amber-50 text-amber-700 border-amber-200" },
            ].map(({ Icon, label, tone }) => (
              <span key={label} className={`v2-hero-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${tone}`}>
                <Icon className="w-3 h-3" /> {label}
              </span>
            ))}
          </div>

          <div className="v2-hero-cta">
            <PersonalizedHeroCTA />
          </div>

          <div className="v2-hero-chip flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] md:text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Free forever tier</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Client portals & invoices</span>
          </div>
        </div>
      </section>

      {/* Pinned scroll-driven workflow */}
      <section ref={pinnedRef} className="relative bg-white overflow-hidden">
        <OpsGrid />
        <div className="min-h-screen flex items-center px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
                <SignalDot /> Pinned workflow · scroll to advance
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 mt-3">
                Six stages. <span className="text-emerald-600">One operating layer.</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {STAGES.map((s, i) => (
                <div
                  key={s.label}
                  ref={(el) => (stageRefs.current[i] = el)}
                  data-active="false"
                  className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-500 data-[active=true]:border-emerald-400 data-[active=true]:shadow-[0_8px_40px_-12px_rgba(16,185,129,0.35)] data-[active=true]:-translate-y-1 data-[active=false]:opacity-40"
                >
                  <div className="absolute top-2.5 right-3 text-[10px] font-mono text-slate-300">{String(i + 1).padStart(2, "0")}</div>
                  <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center mb-3 bg-gradient-to-br ${s.tone}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{s.note}</div>
                  <div className="mt-3 h-[2px] rounded bg-slate-100 overflow-hidden">
                    <div className="h-full w-0 group-data-[active=true]:w-full bg-emerald-500 transition-[width] duration-700 ease-out" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
              <div className="flex-1 h-[2px]"><AsyncLane tone="emerald" /></div>
              Async-native pipeline
              <div className="flex-1 h-[2px]"><AsyncLane tone="violet" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating module stack */}
      <section className="py-24 px-4 bg-slate-50/60 relative overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">Modules</div>
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
              Six modules. <span className="text-emerald-600">One nervous system.</span>
            </h2>
          </div>
          <div ref={floatRef} className="relative h-[460px] md:h-[520px] mx-auto max-w-3xl" style={{ perspective: "1200px" }}>
            {FLOATING_MODULES.map((m, i) => (
              <div
                key={m.label}
                data-floating
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] px-5 py-4 w-[200px]"
                style={{
                  transform: `translate3d(calc(-50% + ${m.x}px), calc(-50% + ${m.y}px), ${i === 3 ? 60 : 0}px)`,
                  animation: `v2-float ${4 + i * 0.4}s ease-in-out ${m.delay}s infinite alternate`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <div className="text-sm font-semibold text-slate-900">{m.label}</div>
                </div>
                <div className="text-[12px] text-slate-500 mt-1">{m.note}</div>
              </div>
            ))}
            <style>{`@keyframes v2-float { from { transform: translate3d(var(--tw-translate-x, 0), 0, 0); } to { transform: translate3d(var(--tw-translate-x, 0), -10px, 0); } }`}</style>
          </div>
        </div>
      </section>

      <IntegrationsMarquee />

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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl p-8 md:p-12 text-center space-y-5 md:space-y-6 bg-slate-900 text-white relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full" />
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight relative leading-tight">
              Send your first proposal<br className="hidden md:block" /> in under five minutes.
            </h2>
            <div className="relative">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8 h-12" onClick={() => navigate("/signup")}>
                Open your workspace <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="bg-white"><Footer /></div>
    </div>
  );
}