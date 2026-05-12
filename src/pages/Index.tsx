import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { ArrowRight, Check, Sparkles, Send, FileDown, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SEO, softwareJsonLd, orgJsonLd } from "@/components/SEO";
import { TrustStrip } from "@/components/TrustStrip";
import {
  UnifiedWorkspaceSection,
  AsyncOperationsSection,
  RealDeliverablesSection,
  IntegrationsNotificationsSection,
  ControlGovernanceSection,
  FlexibleUsageSection,
  FreeToolsStrip,
} from "@/components/home/PlatformSections";
import { IntegrationsMarquee } from "@/components/home/IntegrationsMarquee";
import { OperatingSystemArchitecture } from "@/components/home/OperatingSystemArchitecture";
import { ConnectedWorkflowSection } from "@/components/home/ConnectedWorkflowSection";
import { WorkflowStorySection } from "@/components/home/WorkflowStorySection";
import { OperationalContinuitySection } from "@/components/home/OperationalContinuitySection";
import { WorkflowRibbon, SectionConnector } from "@/components/home/ops-primitives";
import { PersonalizedHeroCTA } from "@/components/home/PersonalizedHeroCTA";
import { OpsStats } from "@/components/seo/OpsStats";

gsap.registerPlugin(ScrollTrigger);

export default function Index() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    // Hero text entrance
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.querySelectorAll(".gsap-fade"),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power3.out" }
      );
    }
  }, []);

  // Sticky mobile CTA after the hero scrolls past
  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 520);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="HustleAI — AI Workspace Operating System for freelancers & operators"
        description="HustleAI is the AI Workspace Operating System for freelancers, creators and modern agencies — clients, deliverables, async AI workflows and branded exports in one operating layer."
        path="/"
        jsonLd={[softwareJsonLd, orgJsonLd]}
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-28 md:pt-32 pb-16 md:pb-24 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(226 232 240 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center top, black 30%, transparent 75%)",
          }}
        />
        {/* Soft accent glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-200/30 blur-3xl rounded-full pointer-events-none" />

        <div ref={heroRef} className="container mx-auto max-w-4xl text-center space-y-7 md:space-y-8 relative z-10">
          <div className="space-y-4 md:space-y-5">
            <div className="gsap-fade inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AI Workspace OS · async-native · delivery-aware
            </div>
            <h1 className="gsap-fade text-[2.6rem] leading-[1.05] sm:text-5xl md:text-7xl font-display font-semibold tracking-tight text-slate-900">
              Generate. Export. Deliver.<br className="hidden sm:block" />
              <span className="text-emerald-600">All in one operating layer.</span>
            </h1>
            <p className="gsap-fade text-[15px] md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              HustleAI runs the full async pipeline behind your work — proposals, exports, Telegram delivery and resumable workflows — so every job moves forward even when you don't.
            </p>

            {/* Live ops stage strip */}
            <div className="gsap-fade flex flex-wrap items-center justify-center gap-2 pt-1">
              {[
                { Icon: Sparkles, label: "Generate", tone: "bg-violet-50 text-violet-700 border-violet-200" },
                { Icon: FileDown, label: "Export",   tone: "bg-sky-50 text-sky-700 border-sky-200" },
                { Icon: Send,     label: "Deliver",  tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { Icon: Workflow, label: "Continue", tone: "bg-amber-50 text-amber-700 border-amber-200" },
              ].map(({ Icon, label, tone }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${tone}`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="gsap-fade">
            <PersonalizedHeroCTA />
          </div>

          <div className="gsap-fade flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] md:text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Free forever tier</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Telegram delivery built-in</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Resumable async workflows</span>
          </div>
        </div>
      </section>

      <TrustStrip />

      {/* Operational social proof — async ops, exports, Telegram pings */}
      <OpsStats />

      <WorkflowRibbon label="System rhythm" hint="Async · delivery-aware · operator-grade" />

      {/* Operational story — six-stage pipeline */}
      <WorkflowStorySection />
      <SectionConnector tone="emerald" />

      {/* Platform story */}
      <UnifiedWorkspaceSection />
      <AsyncOperationsSection />
      <OperatingSystemArchitecture />
      <ConnectedWorkflowSection />
      <SectionConnector tone="violet" />
      <OperationalContinuitySection />
      <WorkflowRibbon label="Deliverables lane" hint="Branded outputs · signed share links" tone="violet" />
      <RealDeliverablesSection />
      <IntegrationsNotificationsSection />
      <IntegrationsMarquee />
      <WorkflowRibbon label="Governance lane" hint="Roles · feature flags · usage" tone="sky" />
      <ControlGovernanceSection />
      <SectionConnector tone="amber" />
      <FreeToolsStrip />
      <FlexibleUsageSection />

      {/* Pricing */}
      <div className="bg-slate-50/50">
        <Pricing />
      </div>

      {/* Pricing CTA */}
      <section className="pb-12 px-4 bg-slate-50/50">
        <div className="container mx-auto text-center">
          <Button
            size="lg"
            className="bg-slate-900 hover:bg-slate-800 text-white text-base px-8 h-12"
            onClick={() => navigate("/plans")}
          >
            View all plans <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <div className="bg-white">
        <Testimonials />
      </div>

      {/* CTA */}
      <section className="py-20 md:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl p-8 md:p-12 text-center space-y-5 md:space-y-6 bg-slate-900 text-white relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] tracking-wide text-white/80 relative">
              <Sparkles className="w-3.5 h-3.5" /> Workspace OS · async-native · free to start
            </div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight relative leading-tight">
              Ship your first deliverable<br className="hidden md:block" /> in under five minutes.
            </h2>
            <p className="text-slate-300 relative text-sm md:text-base">
              Generate a proposal. Export it branded. Route it through Telegram. Pick the workflow back up tomorrow — the system holds the state.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8 h-12 w-full sm:w-auto"
                onClick={() => navigate("/signup")}
              >
                Ship your first export <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white text-base px-8 h-12 w-full sm:w-auto"
                onClick={() => navigate("/workspaces")}
              >
                Activate a workspace
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="bg-white">
        <Footer />
      </div>

      {/* Sticky mobile CTA */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 transition-all duration-300 ${
          showStickyCta ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="rounded-2xl bg-slate-900/95 backdrop-blur border border-white/10 shadow-2xl shadow-black/30 px-3 py-2.5 flex items-center gap-2">
          <div className="flex-1 min-w-0 pl-1">
            <div className="text-[11px] text-emerald-300 leading-tight">Free to start</div>
            <div className="text-sm font-medium text-white truncate leading-tight">Open your workspace</div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/signup")}
            className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-4 rounded-xl"
          >
            Start <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
