import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plug, Sparkles, Bell, Github, Linkedin, MessageCircle,
  Globe, Database, Mail, Calendar, Cloud, Bot, Workflow,
  FileText, CreditCard, Send, Image as ImageIcon, Video, Key,
} from "lucide-react";
import { motion } from "framer-motion";

type Integration = {
  name: string;
  desc: string;
  icon: any;
  category: "Deployment" | "Social" | "Communication" | "AI" | "Productivity" | "Payments";
  accent: string;
  status?: "live" | "soon";
};

const integrations: Integration[] = [
  // ---------- LIVE ----------
  { name: "Gemini (BYOK)", desc: "Bring your Google Gemini key for proposals, summaries and doc intel.", icon: Sparkles, category: "AI", accent: "from-blue-500/30 to-cyan-500/30", status: "live" },
  { name: "OpenAI (BYOK)", desc: "Plug in your OpenAI key for premium GPT-powered drafting.", icon: Bot, category: "AI", accent: "from-teal-500/30 to-emerald-500/30", status: "live" },
  { name: "OpenRouter (BYOK)", desc: "One key, dozens of models — route to the cheapest or fastest.", icon: Key, category: "AI", accent: "from-violet-500/30 to-fuchsia-500/30", status: "live" },
  { name: "Google Workspace", desc: "Send proposals from Gmail and log replies into the workspace timeline.", icon: Mail, category: "Communication", accent: "from-rose-500/30 to-red-500/30", status: "live" },
  { name: "Google Calendar", desc: "Auto-create events for deadlines, calls and client milestones.", icon: Calendar, category: "Productivity", accent: "from-blue-500/30 to-indigo-500/30", status: "live" },
  { name: "Google Meet", desc: "Spin up Meet links from any client or project, one click.", icon: Video, category: "Communication", accent: "from-emerald-500/30 to-teal-500/30", status: "live" },

  // ---------- COMING SOON ----------
  { name: "Vercel", desc: "Deploy & monitor client sites directly from your workspace.", icon: Cloud, category: "Deployment", accent: "from-zinc-500/30 to-zinc-700/30" },
  { name: "GitHub", desc: "Sync repos, PRs and issues with project pipelines.", icon: Github, category: "Deployment", accent: "from-purple-500/30 to-fuchsia-500/30" },
  { name: "LinkedIn", desc: "Auto-post case studies and import leads into CRM.", icon: Linkedin, category: "Social", accent: "from-sky-500/30 to-blue-600/30" },
  { name: "WhatsApp CRM", desc: "Two-way client chats synced to the workspace timeline.", icon: Send, category: "Communication", accent: "from-emerald-500/30 to-green-600/30" },
  { name: "Slack", desc: "Pipe notifications and approvals to your team channels.", icon: Bell, category: "Communication", accent: "from-indigo-500/30 to-violet-500/30" },
  { name: "Nano Banana", desc: "Generate client-ready visuals and social assets.", icon: ImageIcon, category: "AI", accent: "from-yellow-500/30 to-amber-500/30" },
  { name: "Notion", desc: "Mirror project briefs and SOPs to your Notion workspace.", icon: FileText, category: "Productivity", accent: "from-stone-500/30 to-neutral-600/30" },
  { name: "Zapier", desc: "Trigger 5,000+ apps from workspace events.", icon: Workflow, category: "Productivity", accent: "from-orange-500/30 to-amber-500/30" },
  { name: "Airtable", desc: "Sync clients and pipelines with Airtable bases.", icon: Database, category: "Productivity", accent: "from-pink-500/30 to-rose-500/30" },
  { name: "Stripe", desc: "Charge invoices and reconcile payouts automatically.", icon: CreditCard, category: "Payments", accent: "from-violet-500/30 to-purple-600/30" },
  { name: "Razorpay", desc: "Accept INR payments inside client portals.", icon: CreditCard, category: "Payments", accent: "from-blue-500/30 to-sky-600/30" },
  { name: "Webhooks", desc: "Custom HTTP endpoints for any external system.", icon: Globe, category: "Productivity", accent: "from-cyan-500/30 to-teal-500/30" },
  { name: "HubSpot", desc: "Two-way contact sync with your existing CRM.", icon: Plug, category: "Productivity", accent: "from-orange-500/30 to-red-500/30" },
];

const cats = ["All", "Deployment", "Social", "Communication", "AI", "Productivity", "Payments"] as const;

export default function Integrations() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero */}
        <section className="pt-24 pb-12 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto max-w-4xl text-center relative z-10 space-y-5">
            <ScrollReveal>
              <Badge variant="outline" className="border-primary/30 text-primary px-3 py-1">
                <Plug className="w-3.5 h-3.5 mr-1.5" /> Integrations
              </Badge>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight">
                Connect your <span className="text-gradient">entire stack</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.15}>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Plug HustleAI Workspace OS into the tools you already use — Google Workspace, Meet,
                and bring-your-own AI keys (Gemini, OpenAI, OpenRouter) are live today. More
                connectors rolling out weekly.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 6 live</span>
                <span>·</span>
                <span>12+ coming soon</span>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Categories */}
        <section className="px-4 pb-4">
          <div className="container mx-auto max-w-6xl flex flex-wrap gap-2 justify-center">
            {cats.map((c) => (
              <Badge
                key={c}
                variant={c === "All" ? "default" : "outline"}
                className="cursor-default px-3 py-1 text-xs"
              >
                {c}
              </Badge>
            ))}
          </div>
        </section>

        {/* Grid */}
        <section className="py-10 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {integrations.map((it, i) => {
                const Icon = it.icon;
                const live = it.status === "live";
                return (
                  <motion.div
                    key={it.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (i % 6) * 0.04 }}
                    className="relative group"
                  >
                    <div className="relative glass rounded-2xl p-5 h-full border border-border/50 overflow-hidden">
                      {!live && (
                        <div className="absolute inset-0 backdrop-blur-[1.5px] bg-background/30 pointer-events-none" />
                      )}
                      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${it.accent} blur-2xl opacity-70`} />

                      <div className={`relative space-y-3 ${live ? "" : "opacity-90"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="h-11 w-11 rounded-xl bg-background/80 border border-border/50 flex items-center justify-center shadow-sm">
                            <Icon className="h-5 w-5 text-foreground" />
                          </div>
                          {live ? (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" /> Live
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5">
                              Coming soon
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-base">{it.name}</h3>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                            {it.category}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {it.desc}
                        </p>
                        <Button size="sm" variant={live ? "default" : "ghost"} disabled={!live} className="w-full justify-between mt-2">
                          {live ? "Connect" : "Connect"}
                          <span className="text-[10px] opacity-70">{live ? "Ready" : "Soon"}</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer note */}
        <section className="px-4 pb-20">
          <div className="container mx-auto max-w-3xl">
            <div className="glass rounded-2xl p-8 text-center space-y-3 border border-border/50">
              <Sparkles className="w-8 h-8 mx-auto text-primary" />
              <h2 className="text-2xl font-display font-bold">Integration framework launching soon</h2>
              <p className="text-sm text-muted-foreground">
                We're rolling out native, OAuth-based integrations across deployment, CRM, communication and AI tools.
                Want a specific integration first? Email{" "}
                <a href="mailto:hustlaiapp@zohomail.in" className="text-primary hover:underline">
                  hustlaiapp@zohomail.in
                </a>.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
}
