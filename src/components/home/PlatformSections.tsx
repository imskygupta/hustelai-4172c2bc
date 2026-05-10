import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Layers,
  Workflow,
  FileText,
  Bell,
  Settings2,
  Boxes,
  Wallet,
  Receipt,
  ScrollText,
  Calculator,
  IdCard,
  CalendarRange,
  Timer,
  FileSignature,
  Zap,
  Users,
  Inbox,
  CheckCircle2,
  TrendingUp,
  Flame,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/* ---------------------------------------------------------------- *
 * Shared kinetic primitives — used across the homepage to keep
 * the visual rhythm consistent without relying on video assets.
 * ---------------------------------------------------------------- */
function CornerAccents() {
  return (
    <>
      <span className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-t border-l border-emerald-400/0 group-hover:border-emerald-400/70 transition-colors duration-300" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-emerald-400/0 group-hover:border-emerald-400/70 transition-colors duration-300" />
    </>
  );
}

function LivePulse({ color = "emerald" }: { color?: "emerald" | "amber" | "sky" | "violet" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
  };
  const ring: Record<string, string> = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    sky: "bg-sky-400",
    violet: "bg-violet-400",
  };
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full rounded-full ${ring[color]} animate-ping-slow`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${map[color]}`} />
    </span>
  );
}

/* ---------------------------------------------------------------- *
 * 1. Unified Workspace
 * ---------------------------------------------------------------- */
export function UnifiedWorkspaceSection() {
  const navigate = useNavigate();
  const items = [
    {
      icon: Users,
      title: "Clients & pipelines",
      desc: "Every lead, deal and conversation in one calm timeline.",
      meta: "12 active",
      accent: "emerald" as const,
    },
    {
      icon: FileText,
      title: "Documents & deliverables",
      desc: "Invoices, proposals, contracts, resumes — all branded.",
      meta: "Branded · synced",
      accent: "sky" as const,
    },
    {
      icon: Workflow,
      title: "Workflows & AI assists",
      desc: "Generation, approvals and routine work in one surface.",
      meta: "3 running",
      accent: "violet" as const,
    },
  ];
  return (
    <section className="py-20 md:py-28 px-4 bg-white relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/4 w-[420px] h-[260px] bg-emerald-100/40 blur-3xl rounded-full" />
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
            <LivePulse /> One operating layer
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Run client work from one<br className="hidden md:block" /> calm operating layer.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
            Clients, documents, AI assists and deliveries — wired into a single workspace. No tab juggling. No copy-paste loops.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
              viewport={{ once: true }}
              className="group relative rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 md:p-6 hover:border-emerald-300/80 hover:shadow-[0_20px_40px_-20px_rgba(16,185,129,0.35)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Hover gradient sheen */}
              <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-emerald-50/0 via-emerald-50/40 to-emerald-100/30" />
              <CornerAccents />
              <div className="relative flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-[-4deg] transition-transform duration-300">
                  <it.icon className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <LivePulse color={it.accent} /> {it.meta}
                </span>
              </div>
              <h3 className="relative font-display font-semibold text-base md:text-lg text-slate-900 mb-1.5">{it.title}</h3>
              <p className="relative text-sm text-slate-500 leading-relaxed">{it.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button onClick={() => navigate("/workspaces")} className="bg-slate-900 hover:bg-slate-800 text-white group">
            Explore the workspace <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * 2. Async Operations
 * ---------------------------------------------------------------- */
export function AsyncOperationsSection() {
  return (
    <section className="py-20 md:py-28 px-4 bg-gradient-to-b from-slate-50/70 to-white">
      <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 md:gap-14 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-medium">
            <LivePulse color="violet" /> Async operations
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Long jobs run in the background. <br className="hidden md:block" /> You don't babysit a tab.
          </h2>
          <p className="text-slate-500 leading-relaxed text-sm md:text-base">
            Generations, exports, deliveries and follow-ups happen quietly in the background. Get a live activity feed and a notification when a deliverable is ready.
          </p>
          <ul className="space-y-2.5 text-sm text-slate-600">
            {[
              "Background generation queue with live progress",
              "Activity feed across documents, exports and deliveries",
              "Notifications when files are ready or links are opened",
              "Re-run, retry and cancel without losing context",
            ].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{t}</li>
            ))}
          </ul>
          <div className="pt-2">
            <a href="/workspaces" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 group">
              See async workflow
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="relative rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 p-5 md:p-6">
          <div className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-semibold tracking-wide shadow">LIVE</div>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-400 font-medium mb-3">Activity</div>
          <div className="space-y-2.5">
            {[
              { name: "Proposal · Acme Co.", state: "Ready · delivered", color: "emerald" },
              { name: "Invoice · INV-20260509", state: "Sent to client", color: "sky" },
              { name: "Resume · Designer (v2)", state: "Generating · 84%", color: "amber" },
              { name: "Contract · NDA template", state: "Queued", color: "slate" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
                  <div className="text-[11px] text-slate-500">just now</div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                  f.color === "emerald" ? "bg-emerald-50 text-emerald-700"
                  : f.color === "sky" ? "bg-sky-50 text-sky-700"
                  : f.color === "amber" ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
                }`}>{f.state}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * 3. Real Deliverables
 * ---------------------------------------------------------------- */
export function RealDeliverablesSection() {
  const navigate = useNavigate();
  const items = [
    { icon: Receipt, label: "Invoices", desc: "Branded, GST-ready, paid faster.", state: "Sent · paid", color: "emerald" as const },
    { icon: FileText, label: "Proposals", desc: "Win-shaped scopes in minutes.", state: "Opened 4×", color: "sky" as const },
    { icon: ScrollText, label: "Contracts", desc: "Lawyer-style clauses, signed.", state: "Signed", color: "emerald" as const },
    { icon: IdCard, label: "Resumes & bios", desc: "Themed PDFs, ready to share.", state: "Exported", color: "violet" as const },
    { icon: Boxes, label: "Client portals", desc: "Status, files, approvals.", state: "Live", color: "emerald" as const },
    { icon: Layers, label: "AI deliverables", desc: "Plans, briefs, roadmaps.", state: "Generating", color: "amber" as const },
  ];
  return (
    <section className="py-20 md:py-28 px-4 bg-white relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 -left-32 w-[360px] h-[360px] bg-violet-100/40 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[360px] h-[360px] bg-emerald-100/40 blur-3xl rounded-full" />
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
            <LivePulse /> Real deliverables
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Outputs your clients<br className="hidden md:block" /> actually pay you for.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
            Not just chat — branded documents, portals and plans you can hand off the same day they ship.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 relative">
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: "easeOut" }}
              viewport={{ once: true }}
              className="group relative rounded-2xl border border-slate-200 bg-white p-4 md:p-5 hover:border-emerald-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_-18px_rgba(15,23,42,0.25)] transition-all duration-300 overflow-hidden"
            >
              <CornerAccents />
              {/* Hover sheen */}
              <span className="pointer-events-none absolute -inset-y-2 -left-1/2 w-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-emerald-100/40 to-transparent skew-x-12 group-hover:animate-shimmer-x" />
              <div className="relative flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors duration-300">
                  <it.icon className="w-4 h-4" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <LivePulse color={it.color} /> {it.state}
                </span>
              </div>
              <div className="relative text-sm md:text-base font-display font-semibold text-slate-900">{it.label}</div>
              <p className="relative text-xs md:text-sm text-slate-500 mt-1 leading-relaxed">{it.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button onClick={() => navigate("/signup")} className="bg-slate-900 hover:bg-slate-800 text-white">
            Generate your first deliverable <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * 4. Integrations & Notifications
 * ---------------------------------------------------------------- */
export function IntegrationsNotificationsSection() {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-28 px-4 bg-slate-50/60">
      <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 md:gap-14 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-5 order-2 lg:order-1">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400 font-medium mb-3">Inbox</div>
            <div className="space-y-2.5">
              {[
                { i: Bell, t: "Acme Co. opened your proposal", s: "2m ago" },
                { i: Inbox, t: "New intake reply · Studio Forte", s: "12m ago" },
                { i: Receipt, t: "Invoice INV-20260509 marked paid", s: "1h ago" },
                { i: FileText, t: "Resume export ready · delivered", s: "2h ago" },
              ].map((r) => (
                <div key={r.t} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50/60">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700"><r.i className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-800 truncate">{r.t}</div>
                    <div className="text-[11px] text-slate-400">{r.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-5 order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-medium">
            <Bell className="w-3.5 h-3.5" /> Integrations &amp; alerts
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Connected to where your work already lives.
          </h2>
          <p className="text-slate-500 leading-relaxed text-sm md:text-base">
            Get deliverables and alerts on the channels you actually check — chat, email, calendar — with secure share links and signed approvals.
          </p>
          <ul className="space-y-2.5 text-sm text-slate-600">
            {[
              "Chat-style delivery for exports and updates",
              "Calendar, email and document integrations",
              "Signed share links with expiry and revoke",
              "Operational alerts when something needs you",
            ].map((t) => (
              <li key={t} className="flex gap-2"><Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{t}</li>
            ))}
          </ul>
          <Button onClick={() => navigate("/settings/integrations")} className="bg-slate-900 hover:bg-slate-800 text-white">
            Connect a channel <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * 5. Control & Governance
 * ---------------------------------------------------------------- */
export function ControlGovernanceSection() {
  const items = [
    { icon: Settings2, title: "Workspace settings", desc: "Branding, voice, defaults — applied everywhere.", tag: "Synced" },
    { icon: Layers, title: "Feature controls", desc: "Toggle modules per workspace. Roll out at your pace.", tag: "Live" },
    { icon: Boxes, title: "Roles & access", desc: "Calm, role-aware access without an IT project.", tag: "Secure" },
    { icon: Wallet, title: "Usage you can see", desc: "Clear limits, history and a quiet upgrade path.", tag: "Real-time" },
  ];
  return (
    <section className="py-20 md:py-28 px-4 bg-white relative overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
            <LivePulse /> Control &amp; governance
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Built like infrastructure.<br className="hidden md:block" /> Used like a workspace.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
            Feature controls, roles and transparent usage — your workspace scales with you, never against you.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.5, ease: "easeOut" }}
              viewport={{ once: true }}
              className="group relative rounded-2xl border border-slate-200 bg-white p-4 md:p-5 hover:border-emerald-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_-18px_rgba(15,23,42,0.2)] transition-all duration-300 overflow-hidden"
            >
              <CornerAccents />
              <div className="relative flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <it.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{it.tag}</span>
              </div>
              <div className="relative text-sm md:text-base font-display font-semibold text-slate-900">{it.title}</div>
              <p className="relative text-xs md:text-sm text-slate-500 mt-1 leading-relaxed">{it.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * 6. Flexible Usage
 * ---------------------------------------------------------------- */
export function FlexibleUsageSection() {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-24 px-4 bg-gradient-to-b from-white to-slate-50/60">
      <div className="container mx-auto max-w-4xl text-center space-y-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">Flexible usage</div>
        <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
          Upgrade only when your workflow grows.
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
          A generous free tier, scalable plans for active operators, and small top-ups if you ever need a temporary boost. No surprises, no per-seat traps.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button onClick={() => navigate("/pricing")} className="bg-slate-900 hover:bg-slate-800 text-white">
            See pricing <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/plans")} className="border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300">
            Compare plans
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * Free tools strip (kept lightweight to avoid “generator-directory” feel)
 * ---------------------------------------------------------------- */
export function FreeToolsStrip() {
  const navigate = useNavigate();
  const tools = [
    { icon: Receipt, label: "Invoice", path: "/tools/invoice-generator", uses: "12.4k", badge: "Popular", color: "emerald" as const },
    { icon: FileText, label: "Proposal", path: "/tools/proposal-generator", uses: "8.1k", badge: "Trending", color: "violet" as const },
    { icon: ScrollText, label: "Contract", path: "/tools/contract-generator", uses: "6.7k", badge: null, color: "sky" as const },
    { icon: Calculator, label: "Pricing", path: "/tools/pricing-calculator", uses: "4.2k", badge: null, color: "amber" as const },
    { icon: CalendarRange, label: "Content calendar", path: "/tools/content-calendar", uses: "3.8k", badge: null, color: "emerald" as const },
    { icon: IdCard, label: "Business card", path: "/tools/business-card-generator", uses: "2.9k", badge: null, color: "sky" as const },
    { icon: Timer, label: "Pomodoro", path: "/tools/pomodoro", uses: "2.4k", badge: null, color: "violet" as const },
    { icon: FileSignature, label: "Intake forms", path: "/tools/onboarding-form-builder", uses: "1.9k", badge: "New", color: "amber" as const },
  ];
  // Featured (first one)
  const featured = tools[0];
  return (
    <section className="py-20 md:py-24 px-4 bg-gradient-to-b from-slate-50/40 to-white relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 right-1/4 w-[420px] h-[260px] bg-emerald-100/40 blur-3xl rounded-full" />
      <div className="container mx-auto max-w-6xl relative">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">
              <LivePulse /> Free utilities · live
            </div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight text-slate-900 leading-tight">
              Lightweight tools that plug<br className="hidden md:block" /> into your workspace.
            </h2>
          </div>
          <Button variant="link" onClick={() => navigate("/tools")} className="text-emerald-700 hover:text-emerald-800 group">
            Browse all tools <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
          {/* Featured spotlight */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate(featured.path)}
            className="group relative lg:row-span-2 rounded-2xl p-6 text-left bg-slate-900 text-white overflow-hidden border border-slate-800 hover:border-emerald-400/40 transition-all duration-300"
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/20 blur-3xl rounded-full group-hover:bg-emerald-500/30 transition-colors duration-500" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <Flame className="w-3 h-3" /> Most used
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-white/60">
                <Activity className="w-3 h-3" /> {featured.uses} this month
              </span>
            </div>
            <div className="relative w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
              <featured.icon className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="relative font-display text-2xl md:text-3xl font-semibold mb-2">{featured.label} generator</div>
            <p className="relative text-sm text-white/60 leading-relaxed mb-5">
              Create branded, GST-ready invoices in under a minute. Export, share or send straight from your workspace.
            </p>
            <span className="relative inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300 group-hover:text-emerald-200">
              Run it now <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </motion.button>

          {/* Other tools */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
            {tools.slice(1).map((t, i) => (
              <motion.button
                key={t.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                viewport={{ once: true }}
                onClick={() => navigate(t.path)}
                className="group relative flex flex-col rounded-xl border border-slate-200 bg-white px-3.5 py-3.5 hover:border-emerald-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-16px_rgba(15,23,42,0.25)] transition-all duration-300 text-left overflow-hidden"
              >
                <CornerAccents />
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <t.icon className="w-4 h-4" />
                  </div>
                  {t.badge && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t.badge === "Popular" && <TrendingUp className="w-2.5 h-2.5" />}
                      {t.badge === "Trending" && <Flame className="w-2.5 h-2.5" />}
                      {t.badge}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-slate-800 group-hover:text-emerald-700 transition-colors truncate">{t.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                  <LivePulse color={t.color} /> {t.uses} runs
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}