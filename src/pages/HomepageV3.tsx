import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Briefcase, Users, FileText, Sparkles, FileDown,
  ShieldCheck, Receipt, CreditCard, Box,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PersonalizedHeroCTA } from "@/components/home/PersonalizedHeroCTA";
import { LAYERS, PILLARS } from "@/components/home/v3/missionControlInventory";

// Lazy-load the 3D scene so the ~150 KB three.js bundle never reaches
// mobile visitors or anyone hitting the static fallback.
const MissionControlScene = lazy(
  () => import("@/components/home/v3/MissionControlScene"),
);

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Desktop + WebGL + not-reduced-motion only. Mobile uses static fallback. */
function useCanRender3D() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqDesktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () =>
      setOk(mqDesktop.matches && !mqMotion.matches && detectWebGL());
    evaluate();
    mqDesktop.addEventListener("change", evaluate);
    mqMotion.addEventListener("change", evaluate);
    return () => {
      mqDesktop.removeEventListener("change", evaluate);
      mqMotion.removeEventListener("change", evaluate);
    };
  }, []);
  return ok;
}

/**
 * V3 — 3D Operating Command Center (placeholder until R3F deps are installed).
 *
 * To enable the actual 3D pipeline scene, install:
 *   three@>=0.133  @react-three/fiber@^8.18  @react-three/drei@^9.122
 * and replace `<IsometricFallback />` below with the real `<CommandCenterCanvas />`.
 *
 * The static isometric layout below is the canonical reduced-motion / no-WebGL
 * fallback and visualizes the exact same pipeline the 3D scene will animate:
 * Client → Proposal → AI → Export → Approval → Invoice → Payment.
 */
const PIPELINE = [
  { icon: Users,       label: "Client",   note: "Single record" },
  { icon: FileText,    label: "Proposal", note: "Drafted in 5s" },
  { icon: Sparkles,    label: "AI",       note: "Async job runs" },
  { icon: FileDown,    label: "Export",   note: "Branded PDF" },
  { icon: ShieldCheck, label: "Approval", note: "Client signs off" },
  { icon: Receipt,     label: "Invoice",  note: "Auto-numbered" },
  { icon: CreditCard,  label: "Payment",  note: "Confirmed" },
];

function IsometricFallback() {
  return (
    <div className="relative h-[460px] md:h-[560px] w-full" style={{ perspective: "1400px" }}>
      <div
        className="absolute inset-0 mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)]"
        style={{ transform: "rotateX(48deg) rotateZ(-20deg) translateZ(0)" }}
      >
        <div className="absolute inset-6 grid grid-cols-7 gap-3">
          {PIPELINE.map((n, i) => (
            <div
              key={n.label}
              className="relative rounded-2xl border border-slate-200 bg-white shadow-md p-2 flex flex-col items-center justify-center text-center"
              style={{ transform: `translateZ(${20 + i * 14}px)` }}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <n.icon className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-semibold text-slate-900 mt-1">{n.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.18em] text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        Static fallback · 3D scene shipping next
      </div>
    </div>
  );
}

/**
 * Desktop 3D Mission Control with scroll-scrubbed 5-scene narrative.
 * Phase 1..5 maps to Inputs → Planning → Intelligence → Execution → Delivery+Outcomes.
 */
function MissionControl3D() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<number>(0.4);
  const [phaseLabel, setPhaseLabel] = useState(1);
  const [mounted, setMounted] = useState(false);

  // Lazy-mount canvas only when scrolled into view.
  useEffect(() => {
    if (!sectionRef.current || typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  // Drive phase from scroll progress through the pinned narrative section.
  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const total = rect.height - vh;
      const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const p = total > 0 ? passed / total : 0;
      // Map 0..1 → 0.4..5 (slight head start so scene 1 reads on entry).
      const next = 0.4 + p * 4.8;
      phaseRef.current = next;
      setPhaseLabel(Math.max(1, Math.min(5, Math.round(next))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scenes = useMemo(
    () => [
      { n: 1, title: "Incoming work", caption: "Clients, leads, and opportunities enter the system." },
      { n: 2, title: "Work gets organized", caption: "Workspace, projects, and roadmaps activate." },
      { n: 3, title: "AI assists execution", caption: "HustleBot, AI Workspace, and Document AI light up." },
      { n: 4, title: "Deliverables leave the system", caption: "Exports, contracts, and client portals ship outward." },
      { n: 5, title: "Revenue returns", caption: "Invoices clear, payments confirm, retention compounds." },
    ],
    [],
  );

  return (
    <section
      ref={sectionRef}
      className="relative bg-slate-950 text-white"
      style={{ height: "500vh" }} // 5 scenes worth of scroll
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* 3D Canvas */}
        <div className="absolute inset-0">
          {mounted && (
            <Suspense fallback={null}>
              <MissionControlScene phaseRef={phaseRef} />
            </Suspense>
          )}
          {/* Vignette */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,6,23,0.85)_100%)]" />
        </div>

        {/* Overlay narrative */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-10 pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur text-[11px] uppercase tracking-[0.2em] text-white/70">
              <Box className="w-3.5 h-3.5" /> Mission Control
            </div>
            <div className="hidden md:flex items-center gap-2 text-[11px] text-white/50 font-mono">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`w-6 h-[2px] rounded-full transition ${
                    phaseLabel >= n ? "bg-emerald-400" : "bg-white/15"
                  }`}
                />
              ))}
              <span className="ml-2">Scene {phaseLabel}/5</span>
            </div>
          </div>

          <div className="max-w-xl space-y-2">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-400 font-semibold">
              Scene {scenes[phaseLabel - 1].n}
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight leading-[1.05]">
              {scenes[phaseLabel - 1].title}
            </h2>
            <p className="text-white/60 text-sm md:text-base max-w-md">
              {scenes[phaseLabel - 1].caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomepageV3() {
  const navigate = useNavigate();
  const can3D = useCanRender3D();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="HustleAI — 3D command center (experimental V3)"
        description="Experimental 3D operating-system variant of the HustleAI homepage."
        path="/homepage-3"
        noindex
      />
      <Navbar />

      <section className="pt-28 md:pt-32 pb-16 md:pb-24 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="container mx-auto max-w-6xl grid md:grid-cols-2 gap-10 md:gap-14 items-center relative z-10">
          <div className="space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs shadow-sm">
              <Box className="w-3.5 h-3.5" /> 3D command center · Experimental V3
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight leading-[1.05]">
              Your business <span className="text-emerald-600">runs itself.</span>
            </h1>
            <p className="text-slate-500 text-base md:text-lg max-w-xl">
              Inputs, planning, intelligence, execution, delivery, outcomes — six layers of the HustleAI operating system, connected and visible in one frame.
            </p>
            <PersonalizedHeroCTA />
            <div className="flex flex-wrap gap-2 pt-2">
              {PILLARS.map((p) => (
                <span
                  key={p}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <IsometricFallback />
        </div>
      </section>

      {/* Real Mission Control scene — desktop + WebGL + motion-OK only. */}
      {can3D && <MissionControl3D />}

      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">Operating model</div>
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight leading-[1.1]">
              Six layers. <span className="text-emerald-600">One system.</span>
            </h2>
            <p className="text-slate-500 mt-3 text-sm md:text-base">
              Every node maps to a real HustleAI capability. This is the platform inventory the 3D scene above animates.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LAYERS.map((layer) => (
              <div
                key={layer.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-mono text-slate-300">
                    {String(layer.index + 1).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-600 font-semibold">
                    {layer.caption}
                  </div>
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {layer.title}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {layer.nodes.map((n) => (
                    <span
                      key={n.id}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                    >
                      {n.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Reference legacy 7-node pipeline so the constant stays meaningful. */}
          <div className="sr-only">
            {PIPELINE.map((n) => n.label).join(" → ")}
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] tracking-wide text-white/80 relative">
              <Briefcase className="w-3.5 h-3.5" /> Free to start
            </div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight relative leading-tight">
              See the whole system. <br className="hidden md:block" /> Then start running it.
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