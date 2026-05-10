import { motion } from "framer-motion";
import { Send, FolderArchive, Bell, Wallet, Workflow, Brain, ArrowRight, Lock, Sparkles, Receipt, FileSignature, Calculator, IdCard, CalendarRange, Timer, ScrollText, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/* -------- AI Workspace -------- */
export function AIWorkspaceSection() {
  const navigate = useNavigate();
  const items = [
    { icon: Brain, title: "AI workspace memory", desc: "Pinned prompts, saved workflows and your brand voice — recalled on every generation." },
    { icon: Workflow, title: "Pipelines & automations", desc: "Kanban deals, recurring reminders, intake → proposal → invoice flows." },
    { icon: FileText, title: "Branded docs & exports", desc: "Invoices, proposals, agreements and resumes themed to your brand kit." },
  ];
  return (
    <section className="py-24 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 space-y-4">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-medium">AI Workspace</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">An operating system,<br/>not another AI chatbox.</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Persistent memory, automations and branded outputs so every AI generation builds on the last.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <motion.div key={it.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <it.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">{it.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{it.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button onClick={() => navigate("/workspaces")} className="bg-slate-900 hover:bg-slate-800 text-white">
            Open workspace <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------- Telegram Delivery -------- */
export function TelegramDeliverySection() {
  const navigate = useNavigate();
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-medium">
            <Send className="w-3.5 h-3.5" /> Telegram delivery layer
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">Your AI exports,<br/>delivered like notifications.</h2>
          <p className="text-slate-500 leading-relaxed">
            Generate an invoice, proposal or roadmap and have it delivered straight to Telegram with secure, time-limited share links — no inbox clutter, no lost downloads.
          </p>
          <ul className="space-y-2.5 text-sm text-slate-600">
            {[
              "Instant export delivery to your Telegram",
              "OTP-protected share links for clients",
              "Deep-link downloads with expiry & revoke",
              "Free: basic delivery · Pro+: history, automations & alerts",
            ].map((t) => (
              <li key={t} className="flex gap-2"><Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{t}</li>
            ))}
          </ul>
          <Button onClick={() => navigate("/settings/integrations")} className="bg-sky-600 hover:bg-sky-700 text-white">
            Connect Telegram <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="relative rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 p-6">
          <div className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-semibold tracking-wide shadow">LIVE</div>
          <div className="space-y-3">
            {[
              { name: "Invoice_INV-20260509.pdf", tag: "Telegram cached", color: "emerald" },
              { name: "Proposal_AcmeCo.pdf", tag: "Share link · 7d", color: "sky" },
              { name: "Resume_Designer.pdf", tag: "Watermarked", color: "amber" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:border-emerald-300 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Send className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
                    <div className="text-[11px] text-slate-500">delivered just now</div>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                  f.color === "emerald" ? "bg-emerald-50 text-emerald-700" : f.color === "sky" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
                }`}>{f.tag}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* -------- Export Center -------- */
export function ExportCenterSection() {
  const navigate = useNavigate();
  return (
    <section className="py-24 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14 space-y-4">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-medium">Export Center</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">Every file you generate,<br/>tracked and recoverable.</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">A single home for invoices, proposals, contracts and resumes — with delivery status, access logs and expiry control.</p>
        </motion.div>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: FolderArchive, title: "Persistent history", sub: "Pro+", desc: "Searchable, favoritable, never lost." },
            { icon: Lock, title: "Expiring share links", sub: "Free 7d · Pro+ persistent", desc: "OTP-protected, revoke anytime." },
            { icon: Send, title: "Telegram cache", sub: "All tiers", desc: "Re-send instantly without re-uploading." },
            { icon: Bell, title: "Access logs", sub: "Pro+", desc: "Know who downloaded, when." },
          ].map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3"><c.icon className="w-4 h-4" /></div>
              <div className="text-sm font-display font-semibold text-slate-900">{c.title}</div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mt-0.5">{c.sub}</div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button variant="outline" onClick={() => navigate("/settings/exports")} className="border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300">
            Open Export Center <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------- Payments & Wallet -------- */
export function PaymentsAutomationSection() {
  const navigate = useNavigate();
  return (
    <section className="py-24 px-4 bg-slate-50/60">
      <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-5 order-2 lg:order-1">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-display font-semibold text-slate-900">Subscription · Pro</div>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Active</span>
            </div>
            <div className="space-y-2">
              {[
                { n: "INV-20260509-1a2b3c4d", st: "Paid", c: "emerald" },
                { n: "INV-20260408-9z8y7x6w", st: "Paid", c: "emerald" },
                { n: "INV-20260308-5q4w3e2r", st: "UPI · review", c: "amber" },
              ].map((r) => (
                <div key={r.n} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50">
                  <span className="font-mono text-slate-700">{r.n}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${r.c === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.st}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-5 order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
            <Wallet className="w-3.5 h-3.5" /> Payments &amp; Wallet
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">Subscriptions, UPI &amp; pay-as-you-go — under one roof.</h2>
          <p className="text-slate-500 leading-relaxed">
            Structured invoices, secure checkout via verified merchant rails, UPI manual review with admin alerts, and a top-up wallet for occasional AI assists.
          </p>
          <ul className="space-y-2.5 text-sm text-slate-600">
            {[
              "Verified merchant checkout (256-bit secure)",
              "Structured invoice numbers (INV-YYYYMMDD-xxxx)",
              "UPI proof upload with admin verification",
              "Wallet top-ups: ₹10 / AI assist credit",
            ].map((t) => (
              <li key={t} className="flex gap-2"><Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{t}</li>
            ))}
          </ul>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => navigate("/settings/billing")} className="bg-slate-900 hover:bg-slate-800 text-white">Open billing</Button>
            <Button variant="outline" onClick={() => navigate("/payment?type=wallet")} className="border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700">Top up wallet</Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* -------- Free tools strip -------- */
export function FreeToolsStrip() {
  const navigate = useNavigate();
  const tools = [
    { icon: Receipt, label: "Invoice Generator" },
    { icon: FileText, label: "Proposal Generator" },
    { icon: ScrollText, label: "Contract Generator" },
    { icon: Calculator, label: "Pricing Calculator" },
    { icon: CalendarRange, label: "Content Calendar" },
    { icon: IdCard, label: "Business Card" },
    { icon: Timer, label: "Pomodoro" },
    { icon: FileSignature, label: "Onboarding Forms" },
  ];
  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-medium mb-2">Free tools</div>
            <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight text-slate-900">9 free tools that plug into your AI workspace.</h2>
          </div>
          <Button variant="link" onClick={() => navigate("/tools")} className="text-emerald-600 hover:text-emerald-700">
            Browse all tools <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tools.map((t) => (
            <button key={t.label} onClick={() => navigate("/tools")}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300 hover:shadow-sm transition text-left">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                <t.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}