import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Sparkles, Zap, Calendar, Users, Send,
  Briefcase, Palette, Building2, GraduationCap, Mic2, Wrench,
  Inbox, Bot, FileCheck2, Wallet, MoonStar,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

/**
 * V3 — "The Quiet Machine". Bright editorial marketing experience.
 * The user (transformation) is the center of the page; the cinematic 3D
 * scene is one contained centerpiece, not the whole page.
 * See mem/product/v3-mission-control-contract.md.
 */

// ---------- Lazy 3D scene ----------
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

// ---------- Word-reveal heading (free SplitText equivalent) ----------
function RevealHeading({
  as: Tag = "h2",
  text,
  className = "",
  delay = 0,
}: {
  as?: keyof JSX.IntrinsicElements;
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = el.querySelectorAll("[data-word]");
    if (reduce) {
      gsap.set(words, { opacity: 1, y: 0, filter: "blur(0px)" });
      return;
    }
    gsap.set(words, { opacity: 0, y: 24, filter: "blur(8px)" });
    const tween = gsap.to(words, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.06,
      delay,
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [text, delay]);

  return (
    <Tag ref={ref as any} className={className}>
      {text.split(/(\s+)/).map((part, i) =>
        part.trim() === "" ? (
          <span key={i}> </span>
        ) : (
          <span key={i} data-word className="inline-block will-change-transform">
            {part}
          </span>
        ),
      )}
    </Tag>
  );
}

// ---------- 1. Floating glass navbar ----------
function V3Nav() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Audiences", href: "#audiences" },
    { label: "How it works", href: "#cinematic" },
    { label: "Workflows", href: "#workflows" },
    { label: "What's inside", href: "#proof" },
  ];

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-1 rounded-full border border-[#1A1A1F]/10 bg-white/70 backdrop-blur-xl px-2 py-2 transition-all duration-500 ${
          scrolled ? "shadow-[0_12px_40px_-20px_rgba(255,122,69,0.35)] scale-[0.98]" : "shadow-sm"
        }`}
      >
        <Link to="/" className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-[#1A1A1F] tracking-tight flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF7A45]" />
          HustleAI
        </Link>
        <div className="hidden md:flex items-center">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-full text-[13px] text-[#1A1A1F]/70 hover:text-[#1A1A1F] hover:bg-[#FBF7F1] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <button
          onClick={() => navigate("/login")}
          className="ml-1 px-3 py-1.5 rounded-full text-[13px] text-[#1A1A1F]/70 hover:text-[#1A1A1F] transition-colors hidden sm:block"
        >
          Sign in
        </button>
        <button
          onClick={() => navigate("/onboarding")}
          className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white bg-[#1A1A1F] hover:bg-[#FF7A45] transition-colors"
        >
          Get started
        </button>
      </div>
    </div>
  );
}

// ---------- 2. Hero ----------
function Hero() {
  return (
    <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 px-4 overflow-hidden">
      {/* warm sunrise glow */}
      <div className="absolute inset-x-0 top-0 h-[600px] -z-10 opacity-80 pointer-events-none"
           style={{
             background:
               "radial-gradient(60% 60% at 50% 0%, rgba(255,179,122,0.55) 0%, rgba(255,226,122,0.25) 40%, transparent 75%)",
           }} />
      <div className="container mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1A1A1F]/10 bg-white/60 backdrop-blur text-[11px] uppercase tracking-[0.18em] font-semibold text-[#1A1A1F]/70 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7A45]" />
          The operating system for independent businesses
        </div>
        <RevealHeading
          as="h1"
          text="Your business, running quietly in the background."
          className="font-display font-semibold tracking-tight text-[#1A1A1F] text-4xl md:text-7xl leading-[1.02] max-w-4xl mx-auto"
        />
        <p className="mt-6 text-[#1A1A1F]/65 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          HustleAI is the operating system for freelancers, creators, consultants
          and small agencies — so client work moves forward even when you don't.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            size="lg"
            className="bg-[#1A1A1F] hover:bg-[#FF7A45] text-white rounded-full px-6 h-12 text-[14px] font-semibold"
            asChild
          >
            <Link to="/onboarding">Start your system <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
          <a
            href="#cinematic"
            className="text-[14px] font-semibold text-[#1A1A1F] hover:text-[#FF7A45] transition-colors inline-flex items-center gap-1.5"
          >
            See it in motion <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[#1A1A1F]/40">
          Free to start · No card required · Built in India
        </p>
      </div>
    </section>
  );
}

// ---------- 3. Who it's for ----------
const AUDIENCES = [
  { icon: Briefcase, label: "Freelancers", flow: "Lead → Proposal → Invoice", tint: "#FF7A45" },
  { icon: Palette, label: "Creators", flow: "Idea → Content → Sponsor", tint: "#FFB37A" },
  { icon: Building2, label: "Small agencies", flow: "Client → Team → Delivery", tint: "#1A1A1F" },
  { icon: GraduationCap, label: "Consultants", flow: "Research → Proposal → Approval", tint: "#FF7A45" },
  { icon: Mic2, label: "Coaches", flow: "Booking → Session → Renewal", tint: "#E8DFF3" },
  { icon: Wrench, label: "Operators", flow: "Request → Workflow → Payment", tint: "#FFE27A" },
];

function WhoItsFor() {
  return (
    <section id="audiences" className="px-4 py-20 md:py-28">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            Who it's for
          </div>
          <RevealHeading
            text="Built for the people who run their own thing."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {AUDIENCES.map((a) => (
            <div
              key={a.label}
              className="group relative overflow-hidden rounded-3xl border border-[#1A1A1F]/8 bg-white p-5 md:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(255,122,69,0.35)]"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ background: `${a.tint}22`, color: a.tint === "#E8DFF3" || a.tint === "#FFE27A" ? "#1A1A1F" : a.tint }}
              >
                <a.icon className="w-5 h-5" />
              </div>
              <div className="text-[#1A1A1F] font-display text-xl font-semibold mb-1">
                {a.label}
              </div>
              <div className="text-[12px] text-[#1A1A1F]/55 font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {a.flow}
              </div>
              <div className="text-[12px] text-[#1A1A1F]/55 font-mono group-hover:opacity-0 transition-opacity duration-300 absolute bottom-5 md:bottom-6">
                Hover to see flow
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- 4. Problem → Emotion → Relief ----------
const STOPS = [
  {
    title: "Stop remembering everything.",
    body: "Every proposal, follow-up, invoice and approval lives in one place. Your memory stops being the backup.",
    icon: Inbox,
    tint: "#FF7A45",
  },
  {
    title: "Stop chasing approvals.",
    body: "Branded client portals where decisions happen — signed, timestamped, archived. No more 11-day silences.",
    icon: FileCheck2,
    tint: "#FFB37A",
  },
  {
    title: "Stop wondering what happens next.",
    body: "Workflows progress on their own. AI drafts, schedules, reminds, ships. You move from doing to deciding.",
    icon: Bot,
    tint: "#FFE27A",
  },
];

function ProblemEmotion() {
  return (
    <section className="px-4 py-20 md:py-28 bg-[#FBF7F1]">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-3xl mb-12 md:mb-16">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            The relief
          </div>
          <RevealHeading
            text="Three things you can finally stop doing."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
          />
        </div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {STOPS.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl bg-white border border-[#1A1A1F]/8 p-6 md:p-7"
              style={{ boxShadow: `0 24px 60px -40px ${s.tint}` }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: `${s.tint}33` }}
              >
                <s.icon className="w-5 h-5 text-[#1A1A1F]" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-[#1A1A1F] leading-tight mb-3">
                {s.title}
              </h3>
              <p className="text-[#1A1A1F]/65 text-[15px] leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- 5. Cinematic — contained 3D ----------
const SCENES = [
  { n: 1, label: "Bottleneck", title: "Everything depends on you.",
    body: "Inboxes, WhatsApp, follow-ups, invoices. The business runs on your memory." },
  { n: 2, label: "Capture", title: "Everything enters one place.",
    body: "Messages, files, leads and requests gather in a single operating layer." },
  { n: 3, label: "Automation", title: "Work begins moving on its own.",
    body: "AI drafts proposals, queues invoices, schedules follow-ups — without permission." },
  { n: 4, label: "Delivery", title: "Deliverables leave the building.",
    body: "Branded exports, portals, Telegram drops, shared links. Outputs ship themselves." },
  { n: 5, label: "Revenue", title: "Revenue starts repeating.",
    body: "Approvals return. Invoices clear. Retainers renew. The loop closes itself." },
  { n: 6, label: "Reveal", title: "You stopped running tasks.",
    body: "You started running an operating system. It runs at 3am, on Sundays, in other timezones." },
] as const;

function CinematicSection() {
  const can3D = useCanRender3D();
  const sectionRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<number>(0.4);
  const [phaseLabel, setPhaseLabel] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!can3D || !sectionRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
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
  }, [can3D]);

  useEffect(() => {
    if (!can3D) return;
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
  }, [can3D]);

  if (!can3D) {
    // Bright illustrated fallback for mobile / reduced-motion / no-WebGL
    return (
      <section id="cinematic" className="px-4 py-20 md:py-28">
        <div className="container mx-auto max-w-5xl">
          <div className="max-w-2xl mb-12">
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
              How it works
            </div>
            <RevealHeading
              text="From chaos to an operating system, in six moments."
              className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
            />
          </div>
          <div className="space-y-3">
            {SCENES.map((s, i) => (
              <div
                key={s.n}
                className="rounded-3xl bg-white border border-[#1A1A1F]/8 p-6 md:p-7 flex gap-4 md:gap-6 items-start"
              >
                <div className="text-[11px] font-mono tracking-[0.18em] text-[#FF7A45] mt-1 tabular-nums">
                  {String(s.n).padStart(2, "0")} / 06
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#1A1A1F]/40 font-semibold mb-2">
                    {s.label}
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-semibold text-[#1A1A1F] leading-tight mb-2">
                    {s.title}
                  </h3>
                  <p className="text-[#1A1A1F]/65 text-[15px] leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const scene = SCENES[phaseLabel - 1];

  return (
    <section id="cinematic" className="px-4 py-20 md:py-28">
      <div className="container mx-auto max-w-7xl">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            How it works
          </div>
          <RevealHeading
            text="From chaos to an operating system, in six moments."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
          />
        </div>

        {/* Scroll-scrubbed pinned cinematic */}
        <div
          ref={sectionRef}
          className="relative"
          style={{ height: "560vh" }}
        >
          <div className="sticky top-0 h-screen w-full flex items-center">
            <div className="grid grid-cols-12 gap-6 w-full">
              {/* Side rail copy */}
              <div className="col-span-4 pl-2">
                <div className="text-[11px] font-mono tracking-[0.18em] text-[#FF7A45] mb-4 tabular-nums">
                  {String(phaseLabel).padStart(2, "0")} / 06 · {scene.label}
                </div>
                <div key={phaseLabel} className="animate-[fade-in_0.6s_ease-out]">
                  <h3 className="font-display text-3xl xl:text-5xl font-semibold text-[#1A1A1F] leading-[1.05] mb-4">
                    {scene.title}
                  </h3>
                  <p className="text-[#1A1A1F]/65 text-base xl:text-lg leading-relaxed max-w-sm">
                    {scene.body}
                  </p>
                </div>
                {/* progress rail */}
                <div className="mt-10 space-y-2">
                  {SCENES.map((s) => {
                    const active = phaseLabel === s.n;
                    const past = phaseLabel > s.n;
                    return (
                      <div key={s.n} className="flex items-center gap-3">
                        <span
                          className="block rounded-full transition-all duration-500"
                          style={{
                            width: active ? 28 : 10,
                            height: 2,
                            background: active
                              ? "#FF7A45"
                              : past
                                ? "rgba(26,26,31,0.45)"
                                : "rgba(26,26,31,0.12)",
                          }}
                        />
                        <span
                          className={`text-[11px] font-mono uppercase tracking-[0.18em] transition-colors duration-500 ${
                            active ? "text-[#1A1A1F]" : past ? "text-[#1A1A1F]/45" : "text-[#1A1A1F]/25"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cinematic dark canvas frame */}
              <div className="col-span-8 relative">
                <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden border border-[#1A1A1F]/10 bg-slate-950 shadow-[0_40px_120px_-40px_rgba(255,122,69,0.45)]">
                  {mounted && (
                    <Suspense fallback={null}>
                      <MissionControlScene phaseRef={phaseRef} />
                    </Suspense>
                  )}
                  {/* warm overlay so canvas reads as editorial photo */}
                  <div
                    className="pointer-events-none absolute inset-0 transition-[background] duration-[1200ms]"
                    style={{
                      background: `radial-gradient(ellipse at 50% 100%, rgba(255,122,69,0.25) 0%, transparent 60%)`,
                    }}
                  />
                  <div className="absolute top-5 left-5 flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-[10px] uppercase tracking-[0.22em] text-white/80 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A45] animate-pulse" />
                    Live · the quiet machine
                  </div>
                </div>
                {phaseLabel === 1 && (
                  <div className="mt-4 text-center text-[10px] uppercase tracking-[0.32em] text-[#1A1A1F]/40 font-mono">
                    Keep scrolling — six scenes
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 6. Transformation strip ----------
function Transformation() {
  const rows = [
    { before: "Re-draft proposals from scratch", after: "AI ships v1 in 5 seconds, branded" },
    { before: "Chase invoices over WhatsApp", after: "Auto-reminders, status visible in portal" },
    { before: "Files scattered across drives", after: "One workspace, one source of truth" },
    { before: "Approvals lost in email threads", after: "Tracked, timestamped, signed in portal" },
    { before: "Forget to send the follow-up", after: "Workflow does it while you sleep" },
    { before: "Looks like a freelancer", after: "Looks like a company" },
  ];
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="container mx-auto max-w-5xl">
        <div className="max-w-2xl mb-12">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            The shift
          </div>
          <RevealHeading
            text="You don't get new features. You get a different business."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
          />
        </div>
        <div className="rounded-[2rem] border border-[#1A1A1F]/8 bg-white overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-[#1A1A1F]/8">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#1A1A1F]/40 font-semibold mb-5">
                Before
              </div>
              <ul className="space-y-3.5">
                {rows.map((r) => (
                  <li key={r.before} className="text-[#1A1A1F]/55 text-[14px] flex items-start gap-2">
                    <span className="text-[#1A1A1F]/30 mt-1">·</span>
                    <span className="line-through decoration-[#1A1A1F]/20">{r.before}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 md:p-8 bg-gradient-to-br from-[#FFF6E8] to-white">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#FF7A45] font-semibold mb-5">
                After
              </div>
              <ul className="space-y-3.5">
                {rows.map((r) => (
                  <li key={r.after} className="text-[#1A1A1F] text-[14px] flex items-start gap-2">
                    <span className="text-[#FF7A45] mt-1">→</span>
                    <span>{r.after}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 7. Workflows by audience ----------
const FLOWS = [
  { audience: "Freelancer", steps: ["Lead", "Proposal", "Approval", "Invoice", "Payment"] },
  { audience: "Creator", steps: ["Idea", "Research", "Content", "Distribution", "Sponsor"] },
  { audience: "Agency", steps: ["Client", "Workspace", "Team", "Delivery", "Retention"] },
  { audience: "Consultant", steps: ["Discovery", "Proposal", "Approval", "Engagement", "Renewal"] },
];

function WorkflowsByAudience() {
  const [active, setActive] = useState(0);
  const flow = FLOWS[active];
  return (
    <section id="workflows" className="px-4 py-20 md:py-28 bg-[#FBF7F1]">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            Real workflows
          </div>
          <RevealHeading
            text="Pick how you work. We've already built the flow."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {FLOWS.map((f, i) => (
            <button
              key={f.audience}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                active === i
                  ? "bg-[#1A1A1F] text-white shadow-sm"
                  : "bg-white border border-[#1A1A1F]/10 text-[#1A1A1F]/70 hover:text-[#1A1A1F]"
              }`}
            >
              {f.audience}
            </button>
          ))}
        </div>

        <div className="rounded-[2rem] bg-white border border-[#1A1A1F]/8 p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-3 md:gap-4 justify-center md:justify-between">
            {flow.steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3 md:gap-4">
                <div
                  key={`${active}-${step}`}
                  className="rounded-2xl bg-[#FBF7F1] border border-[#1A1A1F]/10 px-4 md:px-5 py-3 md:py-4 text-[13px] md:text-sm font-semibold text-[#1A1A1F] animate-[fade-in_0.6s_ease-out]"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                >
                  {step}
                </div>
                {i < flow.steps.length - 1 && (
                  <svg width="24" height="8" viewBox="0 0 24 8" className="text-[#FF7A45]">
                    <line x1="0" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
                    <path d="M18 1 L23 4 L18 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-[#1A1A1F]/8 text-center">
            <p className="text-[14px] text-[#1A1A1F]/60">
              Every step runs inside HustleAI. No glue scripts. No third tabs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 8. Proof — real capability feed ----------
const FEED = [
  { icon: FileCheck2, text: "Branded proposal generated and sent" },
  { icon: Send, text: "Telegram drop delivered to client" },
  { icon: Wallet, text: "Invoice paid · payment reconciled" },
  { icon: Bot, text: "AI Workspace drafted a contract v3" },
  { icon: Inbox, text: "New lead captured into pipeline" },
  { icon: Calendar, text: "Follow-up scheduled · 3 days" },
  { icon: Users, text: "Client portal viewed by Mehta Architects" },
  { icon: MoonStar, text: "Workflow ran while you were offline" },
];

function ProofFeed() {
  return (
    <section id="proof" className="px-4 py-20 md:py-28">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
              What it actually does
            </div>
            <RevealHeading
              text="One platform. Real capabilities. Not a wishlist."
              className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
            />
            <p className="mt-6 text-[#1A1A1F]/65 text-base md:text-lg leading-relaxed max-w-md">
              HustleAI combines a client workspace, AI tools, proposals, invoices,
              client portals and Telegram delivery in one operating layer — so
              your business stops being a stack of disconnected tabs.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Proposals", "Invoices", "AI Workspace", "Client Portal", "Telegram Delivery", "Workflow OS"].map((p) => (
                <span
                  key={p}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-[#1A1A1F]/10 text-[#1A1A1F]/70"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white border border-[#1A1A1F]/8 p-5 md:p-6 shadow-[0_30px_80px_-40px_rgba(255,122,69,0.35)]">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#1A1A1F]/40 font-semibold mb-4">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF7A45] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF7A45]" />
              </span>
              While you read this
            </div>
            <ul className="space-y-2.5">
              {FEED.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FBF7F1]/70 text-[13px] text-[#1A1A1F]"
                >
                  <span className="w-7 h-7 rounded-lg bg-white border border-[#1A1A1F]/8 flex items-center justify-center">
                    <f.icon className="w-3.5 h-3.5 text-[#FF7A45]" />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 9. CTA ----------
function V3CTA() {
  return (
    <section className="px-4 py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-90 pointer-events-none"
           style={{
             background:
               "radial-gradient(60% 60% at 50% 100%, rgba(255,122,69,0.35) 0%, rgba(255,226,122,0.15) 40%, transparent 75%)",
           }} />
      <div className="container mx-auto max-w-3xl text-center">
        <RevealHeading
          text="Run your business like software."
          className="font-display font-semibold tracking-tight text-[#1A1A1F] text-4xl md:text-6xl leading-[1.05]"
        />
        <p className="mt-5 text-[#1A1A1F]/65 text-lg max-w-xl mx-auto leading-relaxed">
          Stop being the bottleneck. Start being the architect. HustleAI is free
          to begin and grows with you.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            size="lg"
            className="bg-[#1A1A1F] hover:bg-[#FF7A45] text-white rounded-full px-7 h-12 text-[14px] font-semibold"
            asChild
          >
            <Link to="/onboarding">Start your system <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
          <Link
            to="/pricing"
            className="text-[14px] font-semibold text-[#1A1A1F]/70 hover:text-[#1A1A1F] transition-colors"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------- 10. Light footer ----------
function V3Footer() {
  return (
    <footer className="px-4 py-12 border-t border-[#1A1A1F]/8">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1A1F]">
          <span className="w-2 h-2 rounded-full bg-[#FF7A45]" />
          HustleAI
          <span className="text-[#1A1A1F]/40 font-normal ml-2">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap gap-5 text-[13px] text-[#1A1A1F]/55">
          <Link to="/about" className="hover:text-[#1A1A1F]">About</Link>
          <Link to="/pricing" className="hover:text-[#1A1A1F]">Pricing</Link>
          <Link to="/security" className="hover:text-[#1A1A1F]">Security</Link>
          <Link to="/privacy-policy" className="hover:text-[#1A1A1F]">Privacy</Link>
          <Link to="/terms" className="hover:text-[#1A1A1F]">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

// ---------- Top scroll progress bar ----------
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(h.scrollHeight - h.clientHeight, 1);
      el.style.transform = `scaleX(${p})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left bg-[#FF7A45]"
         ref={ref}
         style={{ transform: "scaleX(0)" }} />
  );
}

// ---------- Page ----------
export default function HomepageV3() {
  return (
    <div className="min-h-screen bg-[#FBF7F1] text-[#1A1A1F] selection:bg-[#FF7A45]/20">
      <SEO
        title="HustleAI — The quiet machine. Run your business like software."
        description="The operating system for freelancers, creators, consultants and small agencies. Proposals, invoices, AI workspace, client portals and Telegram delivery — in one place."
      />
      <ScrollProgress />
      <V3Nav />
      <Hero />
      <WhoItsFor />
      <ProblemEmotion />
      <CinematicSection />
      <Transformation />
      <WorkflowsByAudience />
      <ProofFeed />
      <V3CTA />
      <V3Footer />
    </div>
  );
}