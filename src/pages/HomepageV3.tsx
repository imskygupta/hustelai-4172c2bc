import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, AlertTriangle, Magnet, Cpu, Send, RotateCcw, Globe2, Box, Activity } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

/**
 * V3 — Mission Control. Narrative-first homepage.
 *
 * Five-scene transformation arc: Before → Capture → Automation → Delivery → Outcomes.
 * Dark Mission Control aesthetic. Story over feature listing. Nothing here
 * should be reusable on Homepage V1 — V3 owns its own personality.
 */

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

/** Desktop + WebGL + not-reduced-motion only. Mobile uses static narrative fallback. */
function useCanRender3D() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqDesktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () => setOk(mqDesktop.matches && !mqMotion.matches && detectWebGL());
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

const SCENES = [
  {
    n: 1,
    kicker: "Scene 01 · The Bottleneck",
    rail: "Bottleneck",
    title: "Your business works.\nBut only when you do.",
    body: "Every proposal, payment, follow-up and delivery depends on you remembering what happens next.",
    detail: "This isn't a workflow. It's a coping strategy held together by your memory.",
    accent: "#f43f5e",
    icon: AlertTriangle,
  },
  {
    n: 2,
    kicker: "Scene 02 · Capture",
    rail: "Capture",
    title: "Everything enters one\noperating layer.",
    body: "Messages, files, leads, requests — pulled into a single surface. The scatter becomes structure.",
    detail: "You stop being the queue.",
    accent: "#38bdf8",
    icon: Magnet,
  },
  {
    n: 3,
    kicker: "Scene 03 · Intelligence",
    rail: "Intelligence",
    title: "Work starts moving\nwithout permission.",
    body: "A proposal drafts itself. An invoice queues. A reminder schedules. The system stops waiting for you to click.",
    detail: "Your role shifts from doing to deciding.",
    accent: "#a78bfa",
    icon: Cpu,
  },
  {
    n: 4,
    kicker: "Scene 04 · Delivery",
    rail: "Delivery",
    title: "Work leaves the\nbuilding.",
    body: "Branded exports, portals, Telegram drops, shared links. Deliverables flow outward — the client sees a company, not a freelancer juggling tools.",
    detail: "Outputs ship without you copy-pasting into anything.",
    accent: "#f59e0b",
    icon: Send,
  },
  {
    n: 5,
    kicker: "Scene 05 · Revenue",
    rail: "Revenue",
    title: "The first payment is work.\nThe second is a system.",
    body: "Invoices clear. Approvals return. Retainers renew. Referrals compound. The loop closes itself, again and again.",
    detail: "Businesses don't grow linearly. They compound.",
    accent: "#10b981",
    icon: RotateCcw,
  },
  {
    n: 6,
    kicker: "Scene 06 · The Reveal",
    rail: "Reveal",
    title: "You stopped running tasks.\nYou started running an OS.",
    body: "Zoom out. The machine you've been watching is the same machine that will run your business at 3am, on a Sunday, in another timezone, without you.",
    detail: "This is what an operating system feels like.",
    accent: "#60a5fa",
    icon: Globe2,
  },
] as const;

/** Environmental storytelling — looks like the platform is actually running. */
const TELEMETRY = [
  "Proposal #4821 approved by Patel & Co.",
  "Invoice INV-0231 paid · ₹48,000 settled",
  "AI Workspace drafted contract v3 (1.2s)",
  "Telegram drop delivered to @studio.north",
  "Client portal viewed · Mehta Architects",
  "Roadmap milestone closed · Brand Sprint",
  "Retainer auto-renewed · Aurora Labs",
  "Export rendered · 14 pages · branded",
  "HustleBot replied to 3 client threads",
  "Approval received · Logo system v2",
  "Workflow paused · waiting on Stripe ✓",
  "New lead captured · referred by Singh",
];

function TelemetryStream() {
  const [head, setHead] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setHead((h) => (h + 1) % TELEMETRY.length), 1800);
    return () => window.clearInterval(id);
  }, []);
  const visible = useMemo(
    () => Array.from({ length: 6 }, (_, i) => TELEMETRY[(head + i) % TELEMETRY.length]),
    [head],
  );
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-4 font-mono text-[11px] leading-relaxed">
      <div className="flex items-center gap-2 text-emerald-400/80 mb-2">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="uppercase tracking-[0.22em]">Live · ops feed</span>
      </div>
      <ul className="space-y-1.5">
        {visible.map((line, i) => (
          <li
            key={`${head}-${i}`}
            className="text-white/55 truncate"
            style={{ opacity: 0.35 + (i / visible.length) * 0.6 }}
          >
            <span className="text-white/30 mr-2">›</span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Static "Before" visual for the hero — scattered chaos a freelancer recognizes instantly. */
function ChaosCanvas() {
  const items = [
    "Re: proposal v2 (final FINAL).docx",
    "WhatsApp · 4 unread · Patel",
    "Invoice draft · not sent",
    "Approval pending · 11 days",
    "Drive › Untitled folder (3)",
    "Email follow-up · forgot",
    "Contract.pdf · v7",
    "Stripe link · expired",
  ];
  return (
    <div className="relative h-[380px] md:h-[460px] w-full rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur overflow-hidden">
      <div className="absolute inset-0 p-4 grid grid-cols-2 md:grid-cols-3 gap-2 content-start">
        {items.map((t, i) => (
          <div
            key={t}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55 font-mono truncate"
            style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (1 + (i % 3))}deg)` }}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 text-center text-[11px] uppercase tracking-[0.22em] text-rose-400/80 font-semibold">
        This is what HustleAI replaces
      </div>
    </div>
  );
}

/**
 * Desktop 3D Mission Control with scroll-scrubbed 5-scene transformation arc.
 * Phase 1..5 maps to Before → Capture → Automation → Delivery → Outcomes.
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
      const next = 0.4 + p * 5.8;
      phaseRef.current = next;
      setPhaseLabel(Math.max(1, Math.min(6, Math.round(next))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scene = SCENES[phaseLabel - 1];

  return (
    <section
      ref={sectionRef}
      className="relative bg-slate-950 text-white"
      style={{ height: "680vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* 3D Canvas */}
        <div className="absolute inset-0">
          {mounted && (
            <Suspense fallback={null}>
              <MissionControlScene phaseRef={phaseRef} />
            </Suspense>
          )}
          {/* Per-scene color wash — environmental storytelling */}
          <div
            className="pointer-events-none absolute inset-0 transition-[background] duration-[1200ms] ease-out"
            style={{
              background: `radial-gradient(ellipse at 30% 40%, ${scene.accent}22 0%, transparent 55%), radial-gradient(ellipse at center, transparent 35%, rgba(2,6,23,0.92) 100%)`,
            }}
          />
          {/* Subtle grid floor for depth */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "linear-gradient(to top, black, transparent)",
            }}
          />
        </div>

        {/* Narrative overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-10 pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur text-[11px] uppercase tracking-[0.2em] text-white/70">
              <Box className="w-3.5 h-3.5" /> Mission Control
            </div>
            <div className="hidden md:flex items-center gap-3 text-[11px] text-white/55 font-mono">
              <span className="text-white/40">Scene</span>
              <span className="text-white tabular-nums">{String(phaseLabel).padStart(2, "0")}</span>
              <span className="text-white/40">/ 06</span>
            </div>
          </div>

          <div key={phaseLabel} className="max-w-2xl space-y-3 animate-[fade-in_0.6s_ease-out]">
            <div
              className="text-[11px] uppercase tracking-[0.24em] font-semibold"
              style={{ color: scene.accent }}
            >
              {scene.kicker}
            </div>
            <h2 className="text-3xl md:text-6xl font-display font-semibold tracking-tight leading-[1.02] whitespace-pre-line">
              {scene.title}
            </h2>
            <p className="text-white/70 text-sm md:text-lg max-w-xl leading-relaxed">
              {scene.body}
            </p>
            <p className="text-white/40 text-xs md:text-sm italic">{scene.detail}</p>
          </div>
        </div>

        {/* Right-side progress rail — premium, no bouncing arrows */}
        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 z-10 flex-col gap-3 pointer-events-none">
          {SCENES.map((s) => {
            const active = phaseLabel === s.n;
            const past = phaseLabel > s.n;
            return (
              <div key={s.n} className="flex items-center gap-3 justify-end">
                <span
                  className={`text-[10px] font-mono uppercase tracking-[0.18em] transition-all duration-500 ${
                    active ? "text-white" : past ? "text-white/40" : "text-white/20"
                  }`}
                  style={{ transform: active ? "translateX(0)" : "translateX(8px)" }}
                >
                  {s.rail}
                </span>
                <span
                  className="block rounded-full transition-all duration-500"
                  style={{
                    width: active ? 18 : 6,
                    height: 2,
                    background: active
                      ? s.accent
                      : past
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(255,255,255,0.12)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Subtle scroll guidance — only scene 1, no bouncing arrows */}
        {phaseLabel === 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[10px] uppercase tracking-[0.32em] text-white/40 font-mono animate-[fade-in_1s_ease-out]">
            Keep scrolling — six scenes
          </div>
        )}
      </div>
    </section>
  );
}

/** Static narrative for mobile / reduced-motion / no-WebGL. Same arc, no canvas. */
function NarrativeFallback() {
  return (
    <section className="relative bg-slate-950 text-white py-20 px-4 border-t border-white/5">
      <div className="container mx-auto max-w-3xl space-y-10">
        {SCENES.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.n} className="relative pl-10 border-l border-white/10">
              <div
                className="absolute -left-[11px] top-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: s.accent, boxShadow: `0 0 24px ${s.accent}99` }}
              >
                <Icon className="w-2.5 h-2.5 text-slate-950" />
              </div>
              <div
                className="text-[11px] uppercase tracking-[0.24em] font-semibold mb-2"
                style={{ color: s.accent }}
              >
                {s.kicker}
              </div>
              <h3 className="text-2xl font-display font-semibold leading-tight mb-2">{s.title}</h3>
              <p className="text-white/65 text-sm leading-relaxed">{s.body}</p>
              <p className="text-white/35 text-xs italic mt-1">{s.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Transformation contrast — Before vs After. This is V3's identity, not a feature grid. */
function BeforeAfter() {
  const rows = [
    { before: "Re-draft proposals from scratch", after: "AI ships v1 in 5 seconds, branded" },
    { before: "Chase invoices over WhatsApp", after: "Auto-reminders, status visible in portal" },
    { before: "Files scattered across drives", after: "Single workspace, one source of truth" },
    { before: "Approvals lost in email threads", after: "Tracked, timestamped, signed in portal" },
    { before: "Forget to send the follow-up", after: "Workflow does it while you sleep" },
    { before: "Looks like a freelancer", after: "Looks like a company" },
  ];
  return (
    <section className="bg-slate-950 text-white py-24 px-4 border-t border-white/5">
      <div className="container mx-auto max-w-5xl">
        <div className="max-w-2xl mb-12">
          <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-400 font-semibold mb-3">
            The shift
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight leading-[1.05]">
            You don't get new features. <br />
            <span className="text-white/50">You get a different business.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
          <div className="bg-slate-950 p-6 md:p-8">
            <div className="text-[10px] uppercase tracking-[0.24em] text-rose-400/80 font-semibold mb-5">
              Without HustleAI
            </div>
            <ul className="space-y-3.5">
              {rows.map((r) => (
                <li key={r.before} className="text-white/55 text-sm flex items-start gap-2">
                  <span className="text-rose-500/60 mt-1">·</span>
                  <span className="line-through decoration-rose-500/30">{r.before}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-950 p-6 md:p-8">
            <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-400 font-semibold mb-5">
              With HustleAI
            </div>
            <ul className="space-y-3.5">
              {rows.map((r) => (
                <li key={r.after} className="text-white text-sm flex items-start gap-2">
                  <span className="text-emerald-400 mt-1">→</span>
                  <span>{r.after}</span>
                </li>
              ))}
            </ul>
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
    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30">
      <SEO
        title="HustleAI — Run your business like software"
        description="Six scenes. One transformation. Watch a freelance practice stop depending on your memory and start running like an operating system."
        path="/homepage-3"
        noindex
      />
      <Navbar />

      {/* HERO — dark, narrative-first. No feature chips, no pricing language. */}
      <section className="relative overflow-hidden pt-28 md:pt-36 pb-20 md:pb-28 px-4">
        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            background:
              "radial-gradient(ellipse at 20% 10%, rgba(56,189,248,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(16,185,129,0.18) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(167,139,250,0.14) 0%, transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />

        <div className="relative container mx-auto max-w-6xl grid lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-16 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur text-[10px] uppercase tracking-[0.24em] text-white/70">
              <Activity className="w-3 h-3 text-emerald-400" /> Mission Control · V3
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[88px] font-display font-semibold tracking-[-0.02em] leading-[0.98]">
              Your business works. <br />
              <span className="text-white/40">But only when</span> <br />
              <span className="bg-gradient-to-br from-rose-300 via-amber-200 to-emerald-300 bg-clip-text text-transparent">
                you do.
              </span>
            </h1>
            <p className="text-white/65 text-lg md:text-xl max-w-xl leading-relaxed">
              Every proposal, payment, follow-up and delivery depends on you remembering what happens next.
              Scroll six scenes and watch that change.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="h-12 px-7 bg-white text-slate-950 hover:bg-white/90 text-base font-semibold"
              >
                Run my business as a system <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() =>
                  document.getElementById("v3-narrative")?.scrollIntoView({ behavior: "smooth" })
                }
                className="h-12 px-6 text-white/70 hover:text-white hover:bg-white/5 text-base"
              >
                Watch the six scenes ↓
              </Button>
            </div>
            <div className="pt-6 text-[11px] text-white/35 font-mono uppercase tracking-[0.2em]">
              No credit card · Workspace ready in 60 seconds
            </div>
          </div>

          <div className="space-y-4">
            <ChaosCanvas />
            <TelemetryStream />
          </div>
        </div>
      </section>

      {/* THE FIVE-SCENE NARRATIVE */}
      <div id="v3-narrative">
        {can3D ? <MissionControl3D /> : <NarrativeFallback />}
      </div>

      {/* TRANSFORMATION CONTRAST */}
      <BeforeAfter />

      {/* CLOSING — emotional, no pricing CTA, no feature recap */}
      <section className="relative bg-slate-950 text-white py-28 md:py-36 px-4 overflow-hidden border-t border-white/5">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(16,185,129,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="relative container mx-auto max-w-3xl text-center space-y-8">
          <div className="text-[11px] uppercase tracking-[0.32em] text-emerald-400 font-semibold">
            End of scene · your move
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-semibold tracking-tight leading-[1.02]">
            You've seen the system. <br />
            <span className="text-white/45">Now run yours on it.</span>
          </h2>
          <p className="text-white/55 text-base md:text-lg max-w-xl mx-auto">
            The first proposal ships in five seconds. The first invoice settles itself.
            From there, the business compounds without your hands on every keystroke.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-base font-semibold"
            >
              Open Mission Control <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="text-[11px] text-white/30 font-mono uppercase tracking-[0.22em] pt-4">
            Free workspace · Cancel any layer, any time
          </div>
        </div>
      </section>

      <div className="bg-slate-950 border-t border-white/5">
        <Footer />
      </div>
    </div>
  );
}