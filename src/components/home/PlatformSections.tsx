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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/* ---------------------------------------------------------------- *
 * 1. Unified Workspace
 * ---------------------------------------------------------------- */
export function UnifiedWorkspaceSection() {
  const navigate = useNavigate();
  const items = [
    { icon: Users, title: "Clients & pipelines", desc: "Every lead, deal and conversation in one calm timeline." },
    { icon: FileText, title: "Documents & deliverables", desc: "Invoices, proposals, contracts, resumes — all branded, all yours." },
    { icon: Workflow, title: "Workflows & AI assists", desc: "Generation, approvals and routine work wired into the same surface." },
  ];
  return (
    <section className="py-20 md:py-28 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16 space-y-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">Unified Workspace</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Clients, documents and AI<br className="hidden md:block" /> in one operating layer.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
            Stop switching between docs, sheets, drives and chat tabs. Run client work, generation and delivery from a single, calm workspace.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 md:p-6 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <it.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-base md:text-lg text-slate-900 mb-1.5">{it.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{it.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button onClick={() => navigate("/workspaces")} className="bg-slate-900 hover:bg-slate-800 text-white">
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
            <Zap className="w-3.5 h-3.5" /> Async operations
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Long jobs run in the background. <br className="hidden md:block" /> You don’t babysit a tab.
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
    { icon: Receipt, label: "Invoices", desc: "Branded, GST-ready, paid faster." },
    { icon: FileText, label: "Proposals", desc: "Win-shaped scopes in minutes." },
    { icon: ScrollText, label: "Contracts", desc: "Lawyer-style clauses, signed." },
    { icon: IdCard, label: "Resumes & bios", desc: "Themed PDFs, ready to share." },
    { icon: Boxes, label: "Client portals", desc: "Status, files, approvals." },
    { icon: Layers, label: "AI deliverables", desc: "Plans, briefs, roadmaps." },
  ];
  return (
    <section className="py-20 md:py-28 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16 space-y-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">Real deliverables</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Outputs your clients<br className="hidden md:block" /> actually pay you for.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
            Not just chat — branded documents, portals and plans you can hand off the same day.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3"><it.icon className="w-4 h-4" /></div>
              <div className="text-sm md:text-base font-display font-semibold text-slate-900">{it.label}</div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 leading-relaxed">{it.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button variant="outline" onClick={() => navigate("/tools")} className="border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300">
            See deliverables <ArrowRight className="w-4 h-4 ml-2" />
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
    { icon: Settings2, title: "Workspace settings", desc: "Branding, voice, defaults — applied everywhere." },
    { icon: Layers, title: "Feature controls", desc: "Toggle modules per workspace. Roll out at your pace." },
    { icon: Boxes, title: "Roles & access", desc: "Calm, role-aware access without an IT project." },
    { icon: Wallet, title: "Usage you can see", desc: "Clear limits, history and a quiet upgrade path." },
  ];
  return (
    <section className="py-20 md:py-28 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16 space-y-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">Control &amp; governance</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Built like infrastructure.<br className="hidden md:block" /> Used like a workspace.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base">
            Feature controls, roles and visible usage — so your workspace scales with you, not against you.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><it.icon className="w-4 h-4" /></div>
              <div className="text-sm md:text-base font-display font-semibold text-slate-900">{it.title}</div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 leading-relaxed">{it.desc}</p>
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
    { icon: Receipt, label: "Invoice" },
    { icon: FileText, label: "Proposal" },
    { icon: ScrollText, label: "Contract" },
    { icon: Calculator, label: "Pricing" },
    { icon: CalendarRange, label: "Content cal." },
    { icon: IdCard, label: "Business card" },
    { icon: Timer, label: "Pomodoro" },
    { icon: FileSignature, label: "Intake forms" },
  ];
  return (
    <section className="py-16 md:py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6 md:mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">Free utilities</div>
            <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-slate-900 leading-tight">
              Quick utilities that plug into the workspace.
            </h2>
          </div>
          <Button variant="link" onClick={() => navigate("/tools")} className="text-emerald-600 hover:text-emerald-700">
            Browse all <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
          {tools.map((t) => (
            <button
              key={t.label}
              onClick={() => navigate("/tools")}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 hover:border-emerald-300 hover:shadow-sm transition text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                <t.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}