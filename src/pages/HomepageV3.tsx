import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Users, FileText, Sparkles, FileDown, ShieldCheck, Receipt, CreditCard, Box } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PersonalizedHeroCTA } from "@/components/home/PersonalizedHeroCTA";

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

export default function HomepageV3() {
  const navigate = useNavigate();
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
              Client, proposal, AI, export, approval, invoice, payment — every layer of the operating system, connected and visible in one frame.
            </p>
            <PersonalizedHeroCTA />
          </div>
          <IsometricFallback />
        </div>
      </section>

      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">Pipeline</div>
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight leading-[1.1]">
              Client → Payment. <span className="text-emerald-600">One pipeline.</span>
            </h2>
            <p className="text-slate-500 mt-3 text-sm md:text-base">
              Seven nodes. Every output threaded back to the client record. This is exactly what the 3D scene animates as you scroll.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {PIPELINE.map((n, i) => (
              <div key={n.label} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:-translate-y-0.5 transition">
                <div className="absolute"><span className="text-[10px] font-mono text-slate-300">{String(i + 1).padStart(2, "0")}</span></div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3">
                  <n.icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-semibold text-slate-900">{n.label}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">{n.note}</div>
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