import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, FileText, Users, Layers, ClipboardList, Sparkles, ArrowRight, CheckCircle2, Zap, Briefcase, Target, Rocket } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const features = [
  { icon: FileText, title: "Proposal Engine", desc: "Paste a brief, generate a tailored client proposal with selectable tone and focus." },
  { icon: ClipboardList, title: "Scope Documents", desc: "Deliverables, milestones, exclusions and pricing — auto-structured for sign-off." },
  { icon: Users, title: "Smart Client Intake", desc: "Dynamic onboarding questionnaires with shareable client links and CRM-ready responses." },
  { icon: Layers, title: "Service Offer Cards", desc: "Polished, export-ready service decks with pricing, deliverables and timelines." },
  { icon: Brain, title: "Operational Brain", desc: "Roadmap engine that classifies any client brief into phases, tools and next actions." },
  { icon: Briefcase, title: "Workspaces & CRM", desc: "Run every client engagement end-to-end — pipeline, files, comms and invoicing." },
];

const stack = [
  { stage: "Discover", points: ["Search opportunities", "Validate demand", "Pick a system"] },
  { stage: "Onboard", points: ["Smart intake form", "Discovery questions", "Auto-pull to CRM"] },
  { stage: "Sell", points: ["Generate proposal", "Build scope doc", "Send service card"] },
  { stage: "Deliver", points: ["Roadmap engine", "Tasks & milestones", "Client portal"] },
  { stage: "Get paid", points: ["Branded invoices", "Payment tracker", "Retainer mode"] },
];

export default function Operations() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Freelancer Operating System | Run Your Operations From One Workspace"
        description="Generate proposals, onboarding systems, scope documents, invoices and client workflows in minutes. The operational engine for modern freelancers."
        path="/operations"
      />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                <Sparkles className="w-3 h-3" /> Freelancer Operating System
              </span>
              <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight mt-4 leading-[1.05]">
                Run your freelance operations from one workspace.
              </h1>
              <p className="text-lg text-muted-foreground mt-5 max-w-2xl">
                Generate proposals, onboarding systems, scope documents, invoices and client workflows in minutes — powered by Workspace Intelligence.
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-lg shadow-primary/20 hover:scale-[1.02] transition">
                  <Rocket className="w-4 h-4" /> Start operating
                </Link>
                <Link to="/workspaces/roadmap" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted">
                  Try the Roadmap Engine <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-6 mt-12 max-w-xl">
                {[{ k: "12k+", v: "Workflows generated" }, { k: "<60s", v: "From brief to roadmap" }, { k: "20+", v: "Operational tools" }].map(s => (
                  <div key={s.v}>
                    <p className="font-display text-2xl font-semibold">{s.k}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.v}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Execution stack */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">The execution stack</span>
            <h2 className="font-display text-3xl font-semibold mt-2">From brief to billed — in one workspace</h2>
            <p className="text-muted-foreground mt-2">Five stages, each backed by a deterministic workflow. No prompts to write. No tool to babysit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stack.map((s, i) => (
              <motion.div
                key={s.stage}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                  <p className="text-sm font-semibold">{s.stage}</p>
                </div>
                <ul className="space-y-1.5">
                  {s.points.map(p => (
                    <li key={p} className="text-xs text-muted-foreground flex gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature cards */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">Operational tooling</span>
            <h2 className="font-display text-3xl font-semibold mt-2">Workflows, not chatbots</h2>
            <p className="text-muted-foreground mt-2">Each tool produces a real artifact a paying client will sign or pay against.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Before / after */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-muted/30 p-6">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Before</p>
              <h3 className="font-display text-xl font-semibold mt-2">Scattered tools, lost hours</h3>
              <ul className="space-y-2 mt-4 text-sm text-muted-foreground">
                <li>• Proposals written from scratch in Google Docs</li>
                <li>• Client briefs lost in chat threads</li>
                <li>• Invoicing in one app, scope in another</li>
                <li>• No memory of what worked last time</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-6">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">After — Workspace OS</p>
              <h3 className="font-display text-xl font-semibold mt-2">One workspace, one system</h3>
              <ul className="space-y-2 mt-4 text-sm">
                <li className="flex gap-2"><Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Brief in → roadmap out in seconds</li>
                <li className="flex gap-2"><Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Auto-suggested tools and documents per project</li>
                <li className="flex gap-2"><Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Invoices, portals and CRM integrated</li>
                <li className="flex gap-2"><Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Persistent operational memory across clients</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">Stop assembling tools. Start operating.</h2>
          <p className="text-muted-foreground mt-3">Spin up your workspace in under a minute.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium mt-6 shadow-lg shadow-primary/20 hover:scale-[1.02] transition">
            <Target className="w-4 h-4" /> Build your operating system
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}