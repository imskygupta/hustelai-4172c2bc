import { createElement, lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Sparkles, Zap, Calendar, Users, Send,
  Briefcase, Palette, Building2, GraduationCap, Mic2, Wrench,
  Inbox, Bot, FileCheck2, Wallet, MoonStar,
  Boxes, BookOpen, FileText, Receipt, MessageSquare, Database, Layers,
  PenLine, Search, Image as ImageIcon, Newspaper, ChevronRight,
  Mail, Twitter, Linkedin, Github, Check, Menu, Brain, Truck, BadgeDollarSign,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Footer } from "@/components/Footer";
import { HomepageExperienceToggle } from "@/components/home/HomepageExperienceToggle";
import { getLatestBlogPosts, type LatestBlogPost } from "@/integrations/blog/latest";

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
  as = "h2",
  text,
  className = "",
  delay = 0,
}: {
  as?: "h1" | "h2" | "h3";
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
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

  return createElement(
    as,
    { ref, className },
    text.split(/(\s+)/).map((part, i) =>
      part.trim() === "" ? (
        <span key={i}> </span>
      ) : (
        <span key={i} data-word className="inline-block will-change-transform">
          {part}
        </span>
      ),
    ),
  );
}

// ---------- 1. Floating glass navbar ----------
function V3Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const sheetLinks = [
    { label: "Audiences", href: "#audiences" },
    { label: "How it works", href: "#cinematic" },
    { label: "Workflows", href: "#workflows" },
    { label: "What's inside", href: "#inside" },
    { label: "Free tools", href: "/tools" },
    { label: "Docs", href: "https://docs.hustlaiapp.in/", external: true },
    { label: "Blog", href: "https://blogs.hustlaiapp.in/", external: true },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-1 rounded-full border border-[#1A1A1F]/10 bg-white/80 backdrop-blur-xl pl-2 pr-1.5 py-1.5 md:py-2 md:px-2 transition-all duration-500 ${
          scrolled ? "shadow-[0_12px_40px_-20px_rgba(255,122,69,0.35)] scale-[0.98]" : "shadow-sm"
        }`}
      >
        <Link to="/" className="px-2.5 md:px-3 py-1.5 rounded-full text-[13px] font-semibold text-[#1A1A1F] tracking-tight flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF7A45]" />
          HustleAI
        </Link>
        <span
          aria-hidden
          className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] bg-emerald-50 border border-emerald-200 text-emerald-700"
        >
          Preview <Sparkles className="w-2.5 h-2.5" />
        </span>
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
          className="px-3 md:px-3.5 py-1.5 rounded-full text-[12px] md:text-[13px] font-semibold text-white bg-[#1A1A1F] hover:bg-[#FF7A45] transition-colors whitespace-nowrap"
        >
          Get started
        </button>

        {/* Mobile hamburger */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden ml-1 w-8 h-8 rounded-full flex items-center justify-center text-[#1A1A1F]/70 hover:text-[#1A1A1F] hover:bg-[#FBF7F1] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-[#FBF7F1] border-l border-[#1A1A1F]/10 p-0 w-[85vw] max-w-sm">
            <div className="flex flex-col h-full">
              <div className="px-5 pt-6 pb-4 border-b border-[#1A1A1F]/10">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1A1A1F]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A45]" />
                  HustleAI
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] bg-emerald-50 border border-emerald-200 text-emerald-700">
                    Preview <Sparkles className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto px-2 py-4">
                {sheetLinks.map((l) =>
                  l.external ? (
                    <a
                      key={l.href}
                      href={l.href}
                      rel="noopener"
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-2xl text-[15px] font-medium text-[#1A1A1F] hover:bg-white transition-colors"
                    >
                      {l.label}
                      <ArrowUpRight className="w-4 h-4 text-[#1A1A1F]/40" />
                    </a>
                  ) : l.href.startsWith("#") ? (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-2xl text-[15px] font-medium text-[#1A1A1F] hover:bg-white transition-colors"
                    >
                      {l.label}
                      <ChevronRight className="w-4 h-4 text-[#1A1A1F]/40" />
                    </a>
                  ) : (
                    <Link
                      key={l.href}
                      to={l.href}
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-2xl text-[15px] font-medium text-[#1A1A1F] hover:bg-white transition-colors"
                    >
                      {l.label}
                      <ChevronRight className="w-4 h-4 text-[#1A1A1F]/40" />
                    </Link>
                  ),
                )}
              </nav>
              <div className="px-5 py-5 border-t border-[#1A1A1F]/10 space-y-2 bg-white/60">
                <Button
                  asChild
                  className="w-full bg-[#1A1A1F] hover:bg-[#FF7A45] text-white rounded-full h-11 text-[14px] font-semibold"
                >
                  <Link to="/onboarding" onClick={() => setSheetOpen(false)}>
                    Get started <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
                <Link
                  to="/login"
                  onClick={() => setSheetOpen(false)}
                  className="block text-center text-[13px] text-[#1A1A1F]/65 hover:text-[#1A1A1F] py-2"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

// ---------- 2. Hero ----------
function Hero() {
  return (
    <section className="relative pt-24 md:pt-40 pb-12 md:pb-24 px-4 overflow-hidden">
      {/* warm sunrise glow */}
      <div className="absolute inset-x-0 top-0 h-[600px] -z-10 opacity-80 pointer-events-none"
           style={{
             background:
               "radial-gradient(60% 60% at 50% 0%, rgba(255,179,122,0.55) 0%, rgba(255,226,122,0.25) 40%, transparent 75%)",
           }} />
      <div className="container mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1A1A1F]/10 bg-white/60 backdrop-blur text-[10px] md:text-[11px] uppercase tracking-[0.18em] font-semibold text-[#1A1A1F]/70 mb-4 md:mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7A45]" />
          <span className="hidden sm:inline">The operating system for independent businesses</span>
          <span className="sm:hidden">Operating system for indie businesses</span>
        </div>
        <RevealHeading
          as="h1"
          text="Your business, running quietly in the background."
          className="font-display font-semibold tracking-tight text-[#1A1A1F] text-[2.25rem] sm:text-5xl md:text-7xl leading-[1.05] md:leading-[1.02] max-w-[18ch] sm:max-w-3xl md:max-w-4xl mx-auto text-balance"
        />
        <p className="mt-4 md:mt-6 text-[#1A1A1F]/65 text-[15px] md:text-xl max-w-xl md:max-w-2xl mx-auto leading-relaxed">
          HustleAI is the operating system for freelancers, creators, consultants
          and small agencies — so client work moves forward even when you don't.
        </p>
        <div className="mt-6 md:mt-8 flex items-center justify-center gap-3">
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
  // active = index of the in-progress step (●). Earlier = ✓, later = ○.
  { icon: Briefcase,     label: "Freelancers",    steps: ["Lead", "Proposal", "Approval", "Invoice", "Payment"],         tint: "#FF7A45", active: 2, size: "lg" as const, automations: 3, pending: 1, outcome: "Proposal → Payment, all tracked in one portal." },
  { icon: Palette,       label: "Creators",       steps: ["Idea", "Script", "Content", "Distribution", "Sponsor"],       tint: "#FFB37A", active: 1, size: "md" as const, automations: 2, pending: 2, outcome: "Idea to publish — without losing the thread." },
  { icon: Building2,     label: "Small agencies", steps: ["Client", "Workspace", "Team", "Delivery", "Retention"],       tint: "#1A1A1F", active: 3, size: "md" as const, automations: 4, pending: 1, outcome: "Multi-client workspace that scales with you." },
  { icon: GraduationCap, label: "Consultants",    steps: ["Research", "Proposal", "Approval", "Engagement", "Renewal"],  tint: "#FF7A45", active: 2, size: "md" as const, automations: 3, pending: 1, outcome: "Engagements that renew themselves." },
  { icon: Mic2,          label: "Coaches",        steps: ["Booking", "Session", "Notes", "Follow-up", "Renewal"],        tint: "#E8DFF3", active: 1, size: "md" as const, automations: 2, pending: 1, outcome: "Bookings to renewals on autopilot." },
  { icon: Wrench,        label: "Operators",      steps: ["Request", "Workflow", "Action", "Delivery", "Payment"],       tint: "#FFE27A", active: 2, size: "md" as const, automations: 5, pending: 0, outcome: "Every request becomes a billable workflow." },
];

function WhoItsFor() {
  const ink = (tint: string) => (tint === "#E8DFF3" || tint === "#FFE27A" ? "#1A1A1F" : tint);
  return (
    <section id="audiences" className="px-4 py-14 md:py-28">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-3xl mb-8 md:mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            Who it's for
          </div>
          <RevealHeading
            text="Different businesses. Same operating system."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-[1.65rem] sm:text-3xl md:text-5xl leading-[1.05]"
          />
          <p className="mt-3 md:mt-4 text-[#1A1A1F]/55 text-[14px] md:text-lg leading-relaxed">
            You run the business. The system runs the process.
          </p>
        </div>
        {/* Editorial bento grid — featured card spans 2 cols on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4 auto-rows-fr">
          {AUDIENCES.map((a, idx) => {
            const color = ink(a.tint);
            const featured = a.size === "lg";
            const progress = Math.min(100, ((a.active + 1) / a.steps.length) * 100);
            return (
              <div
                key={a.label}
                className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border border-[#1A1A1F]/8 bg-white p-3.5 md:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(255,122,69,0.35)] ${
                  featured ? "md:col-span-2 md:row-span-1" : ""
                }`}
              >
                {/* ambient corner wash in audience tint */}
                <div
                  className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-0 group-hover:opacity-70 transition-opacity duration-700 blur-2xl"
                  style={{ background: a.tint }}
                />

                <div className="relative flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div
                      className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0"
                      style={{ background: `${a.tint}22`, color }}
                    >
                      <a.icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="text-[#1A1A1F] font-display text-[15px] md:text-xl font-semibold leading-tight truncate">
                      {a.label}
                    </div>
                  </div>
                  <span
                    className="hidden md:inline text-[10px] font-mono uppercase tracking-[0.18em] text-[#1A1A1F]/30 group-hover:text-[#1A1A1F]/55 transition-colors"
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Persistent ambient workflow — always visible at low opacity, lights up on hover */}
                <ul
                  className={`relative mt-3 md:mt-5 space-y-1 md:space-y-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-500 ${
                    featured ? "md:grid md:grid-cols-5 md:gap-3 md:space-y-0" : ""
                  }`}
                >
                  {a.steps.map((s, i) => {
                    const done = i < a.active;
                    const live = i === a.active;
                    return (
                      <li
                        key={s}
                        className={`flex items-center justify-between gap-2 text-[11px] md:text-[12px] font-mono leading-none ${
                          featured ? "md:flex-col md:items-start md:gap-2 md:justify-start" : ""
                        }`}
                        style={{ color: live ? color : "#1A1A1F" }}
                      >
                        <span className={live ? "font-semibold" : done ? "" : "opacity-70"}>
                          {s}
                        </span>
                        <span className="flex items-center justify-center w-3 h-3 shrink-0">
                          {done ? (
                            <Check className="w-3 h-3" style={{ color }} strokeWidth={3} />
                          ) : live ? (
                            <span className="relative flex w-2 h-2">
                              <span
                                className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
                                style={{ background: color }}
                              />
                              <span
                                className="relative inline-flex w-2 h-2 rounded-full"
                                style={{ background: color }}
                              />
                            </span>
                          ) : (
                            <span
                              className="block w-2 h-2 rounded-full border"
                              style={{ borderColor: "#1A1A1F33" }}
                            />
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Tiny timeline strip */}
                <div className="relative mt-3 h-[3px] rounded-full bg-[#1A1A1F]/8 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 group-hover:opacity-100 opacity-70"
                    style={{ width: `${progress}%`, background: color }}
                  />
                </div>

                {/* Micro-state summary */}
                <div className="relative mt-2 flex items-center gap-2 text-[10px] md:text-[11px] font-mono uppercase tracking-[0.12em] text-[#1A1A1F]/55">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                    {a.automations} auto
                  </span>
                  <span className="text-[#1A1A1F]/20">·</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#1A1A1F]/30" />
                    {a.pending} pending
                  </span>
                </div>

                {/* Outcome reveal on desktop hover */}
                <div className="hidden md:block relative mt-3 max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 transition-all duration-500 overflow-hidden">
                  <div className="pt-3 border-t border-[#1A1A1F]/8 text-[12px] text-[#1A1A1F]/65 leading-snug">
                    {a.outcome}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- 3b. What actually happens inside HustleAI ----------
const CLARITY = [
  { icon: Inbox,            label: "Capture", desc: "Everything enters one place" },
  { icon: Brain,            label: "Think",   desc: "AI drafts, researches and organizes" },
  { icon: Truck,            label: "Deliver", desc: "Exports, portals, approvals" },
  { icon: BadgeDollarSign,  label: "Earn",    desc: "Invoices, payments, retention" },
];

function ClarityStrip() {
  return (
    <section className="px-4 pt-2 pb-14 md:pb-20">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-2xl mb-6 md:mb-10">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            What actually happens inside HustleAI
          </div>
          <h2 className="font-display font-semibold tracking-tight text-[#1A1A1F] text-2xl md:text-4xl leading-[1.1]">
            Four moves. Every business runs on them.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
          {CLARITY.map((c, i) => (
            <div
              key={c.label}
              className="group relative rounded-2xl border border-[#1A1A1F]/8 bg-white p-4 md:p-6 transition-all hover:-translate-y-0.5 hover:border-[#FF7A45]/30"
            >
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#FBF7F1] flex items-center justify-center group-hover:bg-[#FF7A45]/10 transition-colors">
                  <c.icon className="w-4 h-4 md:w-5 md:h-5 text-[#FF7A45]" />
                </div>
                <span className="text-[10px] font-mono tracking-[0.18em] text-[#1A1A1F]/30 tabular-nums">
                  0{i + 1}
                </span>
              </div>
              <div className="font-display text-base md:text-xl font-semibold text-[#1A1A1F] leading-tight">{c.label}</div>
              <div className="text-[12px] md:text-[13px] text-[#1A1A1F]/60 mt-1 leading-snug">{c.desc}</div>
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
    { icon: FileText,   before: "Re-draft proposals from scratch", after: "AI ships v1 in 5 seconds, branded" },
    { icon: Wallet,     before: "Chase invoices over WhatsApp",    after: "Auto-reminders, status visible in portal" },
    { icon: Boxes,      before: "Files scattered across drives",   after: "One workspace, one source of truth" },
    { icon: FileCheck2, before: "Approvals lost in email threads", after: "Tracked, timestamped, signed in portal" },
    { icon: MoonStar,   before: "Forget to send the follow-up",    after: "Workflow does it while you sleep" },
    { icon: Building2,  before: "Looks like a freelancer",         after: "Looks like a company" },
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
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li key={r.before} className="text-[#1A1A1F]/55 text-[14px] flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#1A1A1F]/[0.04] flex items-center justify-center shrink-0 grayscale">
                      <r.icon className="w-4 h-4 text-[#1A1A1F]/40" />
                    </span>
                    <span className="line-through decoration-[#1A1A1F]/20">{r.before}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 md:p-8 bg-gradient-to-br from-[#FFF6E8] to-white">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#FF7A45] font-semibold mb-5">
                After
              </div>
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li key={r.after} className="text-[#1A1A1F] text-[14px] flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#FF7A45]/15 flex items-center justify-center shrink-0">
                      <r.icon className="w-4 h-4 text-[#FF7A45]" />
                    </span>
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
// Single source of truth shared with the dashboard PersonaFlowCard so a
// visitor sees IDENTICAL workflow labels before and after signup.
import { HOMEPAGE_FLOWS as FLOWS } from "@/lib/workspace/persona-flow";

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
              onClick={() => {
                setActive(i);
                // Persona handoff: persist the click so signup/login lands the
                // user directly in their cockpit (Freelancer / Creator / Agency /
                // Consultant). See src/lib/operator-mode.ts applyPendingModeOnSignup.
                try {
                  const slug = f.audience.toLowerCase() as
                    | "freelancer" | "creator" | "agency" | "consultant";
                  import("@/lib/operator-mode").then(({ setPendingMode }) =>
                    setPendingMode(slug),
                  );
                } catch { /* ignore */ }
              }}
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
          <div className="relative flex flex-wrap items-center gap-3 md:gap-4 justify-center md:justify-between">
            {flow.steps.map((step, i) => (
              <div key={step} className="relative flex items-center gap-3 md:gap-4">
                <div
                  key={`${active}-${step}`}
                  className="relative rounded-2xl bg-[#FBF7F1] border border-[#1A1A1F]/10 px-4 md:px-5 py-3 md:py-4 text-[13px] md:text-sm font-semibold text-[#1A1A1F] animate-[fade-in_0.6s_ease-out] overflow-hidden"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                >
                  {step}
                  <span
                    className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px] bg-[#FF7A45]/70"
                    style={{
                      animation: `flowPulse 2.4s ease-in-out ${i * 0.25}s infinite`,
                    }}
                  />
                </div>
                {i < flow.steps.length - 1 && (
                  <div className="relative w-8 md:w-12 h-2 overflow-hidden">
                    <svg width="100%" height="8" viewBox="0 0 48 8" preserveAspectRatio="none" className="text-[#FF7A45]/60 absolute inset-0">
                      <line x1="0" y1="4" x2="44" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
                      <path d="M40 1 L46 4 L40 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span
                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FF7A45] shadow-[0_0_8px_#FF7A45]"
                      style={{ animation: `packetTravel 2.2s linear ${i * 0.35}s infinite` }}
                    />
                  </div>
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
      <style>{`
        @keyframes packetTravel {
          0%   { left: -8%;  opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes flowPulse {
          0%, 100% { opacity: 0.35; transform: scaleX(0.6); }
          50%      { opacity: 1;    transform: scaleX(1); }
        }
      `}</style>
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

// ---------- 8b. What's Inside — product ecosystem bento ----------
const INSIDE_TILES: {
  label: string;
  desc: string;
  icon: any;
  span: string;
  tint: string;
  href: string;
  badge?: string;
  external?: boolean;
}[] = [
  { label: "AI Workspace",     desc: "One desk for client work, drafts, and async tasks.",                icon: Bot,         span: "md:col-span-3 md:row-span-2", tint: "#FF7A45", href: "https://workspace.hustlaiapp.in", external: true },
  { label: "Client Portal",    desc: "Branded space where decisions get signed and archived.",            icon: Users,       span: "md:col-span-3 md:row-span-1", tint: "#FFB37A", href: "https://workspace.hustlaiapp.in/client", external: true },
  { label: "Proposal Engine",  desc: "Polished proposals in 5 seconds. Brand applied.",                  icon: FileText,    span: "md:col-span-2 md:row-span-1", tint: "#FF7A45", href: "/tools/proposal-generator" },
  { label: "Invoice Engine",   desc: "GST-ready, multi-currency, paid in one click.",                    icon: Receipt,     span: "md:col-span-2 md:row-span-1", tint: "#FFE27A", href: "/tools/invoice-generator" },
  { label: "Telegram Delivery",desc: "Every deliverable can drop straight into a chat.",                 icon: Send, span: "md:col-span-2 md:row-span-1", tint: "#E8DFF3", href: "/onboarding" },
  { label: "Documents",        desc: "Contracts, NDAs, briefs — versioned and signable.",                icon: FileCheck2,  span: "md:col-span-2 md:row-span-1", tint: "#1A1A1F", href: "/tools/contract-generator" },
  { label: "Knowledge Base",   desc: "Your prompts, SOPs and templates in one library.",                 icon: BookOpen,    span: "md:col-span-2 md:row-span-1", tint: "#FFB37A", href: "https://docs.hustlaiapp.in/", external: true },
  { label: "Workflow OS",      desc: "Sequences that move work forward while you're offline.",           icon: Layers,      span: "md:col-span-3 md:row-span-1", tint: "#FF7A45", href: "https://workspace.hustlaiapp.in", external: true },
  { label: "AI Tools",         desc: "12+ AI utilities for content, pricing, research and ops.",         icon: Sparkles,    span: "md:col-span-3 md:row-span-1", tint: "#FFE27A", href: "/tools" },
];

function WhatsInside() {
  return (
    <section id="inside" className="px-4 py-20 md:py-28">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            What's inside
          </div>
          <RevealHeading
            text="Not one product. A small operating system."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
          />
          <p className="mt-5 text-[#1A1A1F]/65 text-[15px] md:text-lg max-w-xl leading-relaxed">
            Nine pieces, designed to work as one. Hover any tile to see what
            lives inside.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 md:auto-rows-[180px] gap-3 md:gap-4">
          {INSIDE_TILES.map((t) => {
            const isDark = t.tint === "#1A1A1F";
            const cls = `group relative overflow-hidden rounded-3xl border border-[#1A1A1F]/8 p-5 md:p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(255,122,69,0.35)] ${t.span} ${isDark ? "bg-[#1A1A1F] text-white" : "bg-white text-[#1A1A1F]"}`;
            const inner = (
              <>
                {/* Soft parallax tint blob */}
                <div
                  className="pointer-events-none absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-60 transition-transform duration-700 group-hover:scale-125"
                  style={{ background: `${t.tint}55` }}
                />
                <div className="relative flex h-full flex-col">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${isDark ? "bg-white/10" : ""}`}
                    style={isDark ? {} : { background: `${t.tint}22` }}
                  >
                    <t.icon className={`w-5 h-5 ${isDark ? "text-white" : ""}`} style={isDark ? {} : { color: t.tint === "#FFE27A" || t.tint === "#E8DFF3" ? "#1A1A1F" : t.tint }} />
                  </div>
                  <div className="font-display text-lg md:text-xl font-semibold leading-tight">{t.label}</div>
                  <div className={`mt-1 text-[13px] leading-relaxed ${isDark ? "text-white/65" : "text-[#1A1A1F]/60"}`}>{t.desc}</div>
                  <div className={`mt-auto pt-4 text-[12px] font-semibold inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "text-white" : "text-[#FF7A45]"}`}>
                    Open <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </>
            );
            return t.external ? (
              <a key={t.label} href={t.href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
            ) : (
              <Link key={t.label} to={t.href} className={cls}>{inner}</Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- 8c. Free Tools ecosystem ----------
const FREE_TOOLS = [
  { label: "Invoice Generator",  desc: "GST-ready, USD/INR/EUR/GBP",       icon: Receipt,     href: "/tools/invoice-generator",  tag: "Most loved" },
  { label: "Proposal Generator", desc: "4 scope templates, AI auto-fill",  icon: FileText,    href: "/tools/proposal-generator", tag: "Popular" },
  { label: "Contract Generator", desc: "Lawyer-style freelance clauses",   icon: FileCheck2,  href: "/tools/contract-generator", tag: "Free" },
  { label: "Pricing Calculator", desc: "Hourly, retainer, SaaS, margin",   icon: Wallet,      href: "/tools/pricing-calculator", tag: "New" },
  { label: "Portfolio Bio",      desc: "Taglines for any platform",        icon: PenLine,     href: "/tools/portfolio-bio",      tag: "New" },
  { label: "Onboarding Form",    desc: "Branded intake → workspace",       icon: Inbox,       href: "/tools/onboarding-form",    tag: "New" },
  { label: "Content Calendar",   desc: "4-week social plan, CSV export",   icon: Calendar,    href: "/tools/content-calendar",   tag: "New" },
  { label: "Pomodoro Widget",    desc: "Focus + earnings tracker",         icon: Zap,         href: "/tools/pomodoro",           tag: "New" },
  { label: "Business Card",      desc: "4 themes · vCard download",        icon: ImageIcon,   href: "/tools/business-card",      tag: "New" },
  { label: "Red Flag Scanner",   desc: "Clients that don't pay",           icon: Search,      href: "/red-flag-scanner",         tag: "AI" },
];

function FreeToolsEcosystem() {
  const [count, setCount] = useState(0);
  const target = FREE_TOOLS.length;
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / 900, 1);
      setCount(Math.round(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && (raf = requestAnimationFrame(tick)),
      { threshold: 0.4 },
    );
    const node = document.getElementById("free-tools");
    if (node) io.observe(node);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <section id="free-tools" className="px-4 py-20 md:py-28 bg-[#FBF7F1]">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-10 mb-10 md:mb-14 items-end">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
              Free tools, no signup
            </div>
            <RevealHeading
              text="A growing toolkit you can use today."
              className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
            />
          </div>
          <div className="flex items-end gap-6 md:justify-end">
            <div>
              <div className="font-display text-5xl md:text-6xl font-semibold text-[#1A1A1F] tabular-nums">{count}+</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#1A1A1F]/40 font-semibold">Tools shipping</div>
            </div>
            <Link
              to="/tools"
              className="text-[13px] font-semibold text-[#1A1A1F] hover:text-[#FF7A45] inline-flex items-center gap-1"
            >
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Featured tool */}
        <Link
          to={FREE_TOOLS[0].href}
          className="group block rounded-[2rem] border border-[#1A1A1F]/8 bg-white overflow-hidden mb-5"
        >
          <div className="grid md:grid-cols-5">
            <div className="md:col-span-3 p-7 md:p-10">
              <span className="inline-block text-[10px] uppercase tracking-[0.22em] font-bold text-[#FF7A45] bg-[#FF7A45]/10 px-2 py-1 rounded-full mb-4">
                Featured · {FREE_TOOLS[0].tag}
              </span>
              <div className="font-display text-3xl md:text-4xl font-semibold text-[#1A1A1F] leading-tight mb-2">
                {FREE_TOOLS[0].label}
              </div>
              <p className="text-[#1A1A1F]/65 max-w-md">
                Build, preview and export GST-ready invoices in minutes. Saved
                to your workspace, delivered via Telegram or share link.
              </p>
              <div className="mt-5 text-[13px] font-semibold text-[#1A1A1F] group-hover:text-[#FF7A45] inline-flex items-center gap-1.5">
                Try it free <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="md:col-span-2 relative bg-gradient-to-br from-[#FFF6E8] to-[#FFE27A]/30 p-6 md:p-8 flex items-center justify-center">
              <div className="rounded-2xl bg-white border border-[#1A1A1F]/8 w-full max-w-xs p-4 shadow-[0_30px_80px_-40px_rgba(255,122,69,0.5)] group-hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#1A1A1F]/40 font-semibold mb-3">
                  <span>Invoice · INV-2034</span><span>Paid</span>
                </div>
                <div className="space-y-1.5">
                  {["Discovery sprint", "Design system", "Frontend build", "Support · Q3"].map((row, i) => (
                    <div key={row} className="flex justify-between text-[11px] text-[#1A1A1F]/70">
                      <span>{row}</span>
                      <span className="tabular-nums">₹{[45000, 90000, 120000, 30000][i].toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-[#1A1A1F]/10 flex justify-between text-[12px] font-semibold text-[#1A1A1F]">
                  <span>Total</span><span className="tabular-nums">₹2,85,000</span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Horizontal scrolling rail */}
        <div className="relative -mx-4 px-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-3 min-w-max">
            {FREE_TOOLS.slice(1).map((t) => (
              <Link
                key={t.label}
                to={t.href}
                className="group w-[260px] rounded-2xl border border-[#1A1A1F]/8 bg-white p-5 hover:-translate-y-1 hover:border-[#FF7A45]/40 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FF7A45]/10 flex items-center justify-center">
                    <t.icon className="w-4 h-4 text-[#FF7A45]" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1F]/40">{t.tag}</span>
                </div>
                <div className="font-display text-lg font-semibold text-[#1A1A1F] leading-snug">{t.label}</div>
                <div className="text-[12px] text-[#1A1A1F]/55 mt-1">{t.desc}</div>
                <div className="mt-3 text-[12px] font-semibold text-[#FF7A45] inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open tool <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 8d. Documentation Pathway ----------
const WORKFLOW_GUIDES = [
  { audience: "Freelancer", icon: Briefcase,     guide: "Client onboarding guide",       desc: "Lead → portal → first invoice, in one playbook.",     href: "https://docs.hustlaiapp.in/first-roadmap", external: true },
  { audience: "Creator",    icon: Palette,       guide: "Content production workflow",   desc: "Idea capture → script → distribution, with AI inline.", href: "https://docs.hustlaiapp.in/", external: true },
  { audience: "Agency",     icon: Building2,     guide: "Multi-client operations",       desc: "Run multiple workspaces without losing the thread.",    href: "https://docs.hustlaiapp.in/", external: true },
  { audience: "Consultant", icon: GraduationCap, guide: "Proposal to payment system",    desc: "From research to renewal — every stage scripted.",      href: "https://docs.hustlaiapp.in/", external: true },
];

function DocumentationPathway() {
  return (
    <section id="learn" className="px-4 py-16 md:py-28">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-12 gap-8 md:gap-10 items-start">
          <div className="md:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
              Start with your workflow
            </div>
            <RevealHeading
              text="Pick your business. We'll show you the playbook."
              className="font-display font-semibold tracking-tight text-[#1A1A1F] text-[1.65rem] sm:text-3xl md:text-[2.75rem] leading-[1.05]"
            />
            <p className="mt-4 md:mt-5 text-[#1A1A1F]/65 text-[14px] md:text-lg leading-relaxed">
              Every tool ships with a guide, a template and a workflow you can
              copy. Read once, run forever.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://docs.hustlaiapp.in/"
                rel="noopener"
                className="px-4 py-2 rounded-full bg-[#1A1A1F] text-white text-[13px] font-semibold inline-flex items-center gap-1.5"
              >
                Open docs <ArrowRight className="w-4 h-4" />
              </a>
              <Link to="/how-it-works" className="px-4 py-2 rounded-full border border-[#1A1A1F]/10 text-[#1A1A1F] text-[13px] font-semibold hover:bg-white">
                How it works
              </Link>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {WORKFLOW_GUIDES.map((g) => (
                <a
                  key={g.audience}
                  href={g.href}
                  rel="noopener"
                  className="group rounded-2xl border border-[#1A1A1F]/8 bg-white p-5 hover:-translate-y-0.5 hover:border-[#FF7A45]/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FBF7F1] flex items-center justify-center group-hover:bg-[#FF7A45]/15 transition-colors">
                      <g.icon className="w-4 h-4 text-[#1A1A1F]" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#1A1A1F]/40">
                      {g.audience}
                    </span>
                  </div>
                  <div className="font-display text-[16px] md:text-[17px] font-semibold text-[#1A1A1F] leading-snug">
                    → {g.guide}
                  </div>
                  <div className="mt-1.5 text-[12px] md:text-[13px] text-[#1A1A1F]/60 leading-relaxed">
                    {g.desc}
                  </div>
                  <div className="mt-3 text-[11px] font-semibold text-[#FF7A45] inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read guide <ArrowUpRight className="w-3 h-3" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- 8e. Blog & Knowledge Network ----------
const BLOG_FALLBACK_FEATURED = {
  slug: "",
  category: "Field guide",
  title: "The freelancer's operating system — a 30-day blueprint",
  excerpt: "How to install repeatable rhythms across client work, content and revenue so the business compounds while you sleep.",
  read: "12 min read",
};
const BLOG_FALLBACK_LIST = [
  { slug: "", tag: "Trending", title: "Why every freelancer needs a client portal in 2026",         read: "6 min" },
  { slug: "", tag: "AI",        title: "How to use AI to write proposals that convert at 60%+",      read: "9 min" },
  { slug: "", tag: "Workflow",  title: "Turning Telegram into a delivery channel for client work",   read: "7 min" },
  { slug: "", tag: "Pricing",   title: "The retainer math that turns one client into recurring revenue", read: "8 min" },
];
const BLOG_CATEGORIES = ["Workflows", "AI", "Pricing", "Client work", "Tools", "Updates"];

function postHref(slug: string) {
  return slug ? `/blog/${slug}` : "/blog";
}
function readingLabel(min: number | null | undefined) {
  return min && min > 0 ? `${min} min` : "5 min";
}

function BlogKnowledge() {
  const [posts, setPosts] = useState<LatestBlogPost[]>([]);
  useEffect(() => {
    const cancel = getLatestBlogPosts(5, (data) => {
      if (Array.isArray(data) && data.length) setPosts(data);
    });
    return () => { try { (cancel as any)?.(); } catch {} };
  }, []);

  const featured = posts[0]
    ? {
        slug: posts[0].slug,
        category: posts[0].category || "Field guide",
        title: posts[0].title,
        excerpt: posts[0].excerpt || "Operator-grade systems for independent businesses.",
        read: `${readingLabel(posts[0].reading_time)} read`,
      }
    : BLOG_FALLBACK_FEATURED;

  const list = posts.length > 1
    ? posts.slice(1, 5).map((p) => ({
        slug: p.slug,
        tag: p.category || "Insight",
        title: p.title,
        read: readingLabel(p.reading_time),
      }))
    : BLOG_FALLBACK_LIST;

  return (
    <section id="learn-more" className="px-4 py-16 md:py-28 bg-[#FBF7F1]">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-2xl mb-8 md:mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            Learn while your system runs
          </div>
          <RevealHeading
            text="A living publication for people who run quiet businesses."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-[1.65rem] sm:text-3xl md:text-5xl leading-[1.05]"
          />
          <div className="mt-5 flex flex-wrap gap-1.5">
            {BLOG_CATEGORIES.map((c) => (
              <Link
                key={c}
                to="/blog"
                className="text-[11px] font-mono uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border border-[#1A1A1F]/10 bg-white text-[#1A1A1F]/65 hover:text-[#FF7A45] hover:border-[#FF7A45]/40 transition-colors"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-5">
          {/* Featured */}
          <Link
            to={postHref(featured.slug)}
            className="group md:col-span-7 rounded-[2rem] bg-gradient-to-br from-[#1A1A1F] to-[#2a1f1a] text-white p-7 md:p-10 overflow-hidden relative hover:-translate-y-1 transition-transform"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl bg-[#FF7A45]/40" />
            <div className="relative">
              <span className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[#FFB37A]">{featured.category}</span>
              <h3 className="mt-3 font-display text-2xl md:text-4xl font-semibold leading-tight">{featured.title}</h3>
              <p className="mt-4 text-white/70 text-[14px] md:text-[15px] leading-relaxed max-w-md line-clamp-3">{featured.excerpt}</p>
              <div className="mt-6 flex items-center gap-3 text-[12px] text-white/60">
                <span>{featured.read}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-white group-hover:text-[#FFB37A]">
                  Read article <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>

          {/* Stacked list */}
          <div className="md:col-span-5 space-y-3">
            {list.map((b, i) => (
              <Link
                key={i}
                to={postHref(b.slug)}
                className="group block rounded-2xl bg-white border border-[#1A1A1F]/8 p-5 hover:-translate-y-0.5 hover:border-[#FF7A45]/40 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45]">{b.tag}</span>
                  <span className="text-[11px] text-[#1A1A1F]/45">{b.read}</span>
                </div>
                <div className="font-display text-[15px] font-semibold text-[#1A1A1F] leading-snug group-hover:text-[#FF7A45] transition-colors line-clamp-2">
                  {b.title}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Template spotlight + view all */}
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          <Link
            to="/tools"
            className="group rounded-2xl bg-gradient-to-br from-[#FFF6E8] to-[#FFE27A]/40 border border-[#1A1A1F]/8 p-5 hover:-translate-y-0.5 transition-all"
          >
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#FF7A45]">Template spotlight</span>
            <div className="mt-2 font-display text-[17px] font-semibold text-[#1A1A1F] leading-snug">
              The 30-day operator system
            </div>
            <div className="mt-1 text-[12px] text-[#1A1A1F]/60">Free Notion-style workspace template</div>
            <div className="mt-3 text-[11px] font-semibold text-[#1A1A1F] inline-flex items-center gap-1 group-hover:text-[#FF7A45]">
              Copy template <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>
          <a
            href="https://docs.hustlaiapp.in/"
            rel="noopener"
            className="group rounded-2xl bg-white border border-[#1A1A1F]/8 p-5 hover:-translate-y-0.5 hover:border-[#FF7A45]/30 transition-all"
          >
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#FF7A45]">Documentation</span>
            <div className="mt-2 font-display text-[17px] font-semibold text-[#1A1A1F] leading-snug">
              The complete HustleAI manual
            </div>
            <div className="mt-1 text-[12px] text-[#1A1A1F]/60">Every workflow, written down.</div>
            <div className="mt-3 text-[11px] font-semibold text-[#1A1A1F] inline-flex items-center gap-1 group-hover:text-[#FF7A45]">
              Open docs <ArrowUpRight className="w-3 h-3" />
            </div>
          </a>
          <Link
            to="/blog"
            className="group rounded-2xl bg-[#1A1A1F] text-white p-5 hover:-translate-y-0.5 transition-all flex flex-col"
          >
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#FFB37A]">All articles</span>
            <div className="mt-2 font-display text-[17px] font-semibold leading-snug">
              View the full publication
            </div>
            <div className="mt-1 text-[12px] text-white/55">Browse 29+ operator essays.</div>
            <div className="mt-3 text-[11px] font-semibold inline-flex items-center gap-1 group-hover:text-[#FFB37A]">
              All blog posts <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------- 8f. Pricing preview ----------
const PRICING_TIERS = [
  { name: "Starter",      price: "Free",      sub: "forever",   highlight: false, perks: ["Workspace + 1 portal", "Free tools + AI drafts", "Telegram delivery"] },
  { name: "Professional", price: "₹499",      sub: "/month",    highlight: true,  perks: ["Unlimited portals", "AI Workspace + workflows", "Proposals · Invoices · Docs"] },
  { name: "Business",     price: "₹1,499",    sub: "/month",    highlight: false, perks: ["Team seats", "Advanced automation", "Priority support · SLA"] },
];

function PricingPreview() {
  return (
    <section id="pricing" className="px-4 py-20 md:py-28">
      <div className="container mx-auto max-w-6xl">
        <div className="max-w-2xl mb-10 md:mb-14">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FF7A45] mb-3">
            Pricing
          </div>
          <RevealHeading
            text="Start free. Pay only when the system pays you back."
            className="font-display font-semibold tracking-tight text-[#1A1A1F] text-3xl md:text-5xl leading-[1.05]"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {PRICING_TIERS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl p-7 md:p-8 transition-all hover:-translate-y-1 ${
                p.highlight
                  ? "bg-[#1A1A1F] text-white border border-[#1A1A1F] shadow-[0_30px_80px_-30px_rgba(255,122,69,0.6)]"
                  : "bg-white text-[#1A1A1F] border border-[#1A1A1F]/8"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.22em] font-bold bg-[#FF7A45] text-white">
                  Most popular
                </span>
              )}
              <div className="text-[11px] uppercase tracking-[0.22em] font-semibold opacity-60">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl md:text-5xl font-semibold">{p.price}</span>
                <span className={`text-[13px] ${p.highlight ? "text-white/55" : "text-[#1A1A1F]/55"}`}>{p.sub}</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {p.perks.map((perk) => (
                  <li key={perk} className={`flex items-start gap-2 text-[13px] ${p.highlight ? "text-white/85" : "text-[#1A1A1F]/75"}`}>
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.highlight ? "text-[#FFB37A]" : "text-[#FF7A45]"}`} />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#1A1A1F] hover:text-[#FF7A45] transition-colors"
          >
            View full pricing <ArrowRight className="w-4 h-4" />
          </Link>
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

// ---------- 10. Destination footer ----------
function V3Footer() {
  const cols: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Workspace",        href: "https://workspace.hustlaiapp.in", external: true },
        { label: "AI Tools",         href: "/tools" },
        { label: "Client Portal",    href: "https://workspace.hustlaiapp.in/client", external: true },
        { label: "Invoices",         href: "/tools/invoice-generator" },
        { label: "Proposals",        href: "/tools/proposal-generator" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog",       href: "/blog" },
        { label: "Docs",       href: "https://docs.hustlaiapp.in/", external: true },
        { label: "Templates",  href: "/tools" },
        { label: "Guides",     href: "/how-it-works" },
        { label: "Changelog",  href: "/blog" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About",    href: "/about" },
        { label: "Pricing",  href: "/pricing" },
        { label: "Contact",  href: "/contact" },
        { label: "Security", href: "/security" },
        { label: "Privacy",  href: "/privacy-policy" },
      ],
    },
  ];
  return (
    <footer className="relative px-4 pt-20 pb-10 bg-[#1A1A1F] text-white overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-3xl bg-[#FF7A45]/25" />
      <div className="container mx-auto max-w-6xl relative">
        {/* Newsletter band */}
        <div className="grid md:grid-cols-12 gap-10 pb-14 border-b border-white/10">
          <div className="md:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-[#FFB37A] mb-3">Stay in the loop</div>
            <div className="font-display text-3xl md:text-4xl font-semibold leading-tight">
              Product updates and operator notes, once a week.
            </div>
            <p className="text-white/55 mt-3 text-[14px] max-w-md">
              No noise. Just what shipped, what changed, and what to do with it.
            </p>
          </div>
          <form
            className="md:col-span-7 flex flex-col sm:flex-row gap-3 md:self-end"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/onboarding";
            }}
          >
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-3 focus-within:border-[#FF7A45]/60 transition-colors">
              <Mail className="w-4 h-4 text-white/40" />
              <input
                type="email"
                required
                placeholder="you@yourbusiness.com"
                className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/35 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[#FF7A45] hover:bg-white hover:text-[#1A1A1F] text-white font-semibold text-[13px] px-6 py-3 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              Subscribe <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Columns */}
        <div className="grid md:grid-cols-12 gap-10 py-14">
          <div className="md:col-span-3">
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#FF7A45]" />
              HustleAI
            </div>
            <p className="mt-3 text-white/55 text-[13px] leading-relaxed max-w-xs">
              The operating system for independent businesses. Built in India,
              shipping worldwide.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[
                { icon: Twitter,      href: "https://twitter.com" },
                { icon: Linkedin,     href: "https://linkedin.com" },
                { icon: Send, href: "https://t.me" },
                { icon: Github,       href: "https://github.com" },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF7A45] hover:border-[#FF7A45] transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title} className="md:col-span-3">
              <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-white/40 mb-4">{c.title}</div>
              <ul className="space-y-2.5">
                {c.links.map((l) => {
                  const cls = "text-[13px] text-white/75 hover:text-[#FFB37A] inline-flex items-center gap-1 transition-colors";
                  return (
                    <li key={l.href}>
                      {l.external ? (
                        <a href={l.href} target="_blank" rel="noreferrer" className={cls}>
                          {l.label}
                          <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 transition-all" />
                        </a>
                      ) : (
                        <Link to={l.href} className={cls}>
                          {l.label}
                          <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 transition-all" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6 border-t border-white/10 text-[12px] text-white/45">
          <div>© {new Date().getFullYear()} HustleAI · Run your business like software.</div>
          <div className="flex gap-5">
            <Link to="/terms-conditions" className="hover:text-white">Terms</Link>
            <Link to="/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-white">Refunds</Link>
            <Link to="/acceptable-use" className="hover:text-white">Acceptable use</Link>
          </div>
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
      <ClarityStrip />
      <ProblemEmotion />
      <CinematicSection />
      <Transformation />
      <WorkflowsByAudience />
      <WhatsInside />
      <FreeToolsEcosystem />
      <DocumentationPathway />
      <BlogKnowledge />
      <ProofFeed />
      <PricingPreview />
      <V3CTA />
      <Footer />
      <HomepageExperienceToggle variant="v3" />
    </div>
  );
}