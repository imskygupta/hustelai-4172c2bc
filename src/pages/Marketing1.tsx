// Marketing Page 1 — for HustleAI main app ad campaigns.
// Hidden from site nav. Linked only from paid ads.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { track } from "@/lib/analytics";
import {
  ArrowRight, Sparkles, Check, Zap, Brain, Target, TrendingUp,
  Clock, Shield, Star, Users, Rocket, ChevronDown,
} from "lucide-react";

const hooks = [
  "You're one workspace away from running a real freelance business.",
  "Stop juggling 8 tools. Start running one cockpit.",
  "The freelancer OS that finally feels built for India.",
];

const wins = [
  { icon: Brain,     k: "In-house AI", v: "Drafts proposals, quotations & client emails in seconds — without burning credits." },
  { icon: TrendingUp,k: "Client CRM",  v: "Pipelines, retainers & follow-ups so no lead ever slips again." },
  { icon: Zap,       k: "Invoices",    v: "GST-ready, recurring, multi-currency. Sent in two clicks." },
  { icon: Target,    k: "Portals",     v: "White-labelled client portals that make you look like an agency." },
  { icon: Clock,     k: "Time tracker",v: "Bill what you actually worked. Not what you remember." },
  { icon: Shield,    k: "Your data",   v: "Owner-grade encryption. Export anything, any time." },
];

const stats = [
  { n: "1 workspace", l: "replaces 8+ apps" },
  { n: "₹450/mo", l: "starting price" },
  { n: "0%", l: "platform fees on what you earn" },
  { n: "<1s", l: "average load time" },
];

const testimonials = [
  { name: "Aarav S.", role: "Brand designer, Bengaluru",   q: "I cancelled Notion, HoneyBook and three other tools. This is my entire business now." },
  { name: "Meera K.", role: "Content agency, Pune",          q: "The AI alone saves me 6 hours a week on proposals. The portals close clients on day one." },
  { name: "Rohan T.", role: "Webflow freelancer, Mumbai",   q: "Most ‘all-in-one’ tools are 4 mediocre tools. This is one great one." },
];

export default function Marketing1() {
  const nav = useNavigate();
  const [hookIdx, setHookIdx] = useState(0);

  useEffect(() => {
    track("marketing_page_viewed", { page: "marketing-1" });
    const t = setInterval(() => setHookIdx((i) => (i + 1) % hooks.length), 3500);
    return () => clearInterval(t);
  }, []);

  const cta = (label = "Start free — no card") => (
    <Button size="lg" onClick={() => { track("marketing_cta_clicked", { page: "marketing-1" }); nav("/signup"); }}
      className="bg-gradient-to-r from-emerald-500 via-violet-500 to-amber-500 text-white hover:opacity-90 shadow-2xl shadow-violet-500/30 px-8 h-12">
      {label} <ArrowRight className="w-4 h-4 ml-1.5" />
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 overflow-x-hidden">
      <SEO title="Run your freelance business from one cockpit — HustleAI" description="The all-in-one workspace for freelancers and agencies. CRM, invoices, portals & in-house AI. Flat ₹450/mo. No platform fees." path="/marketing-1" noIndex />

      {/* Ambient bg */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-400/15 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-violet-400/15 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Minimal top bar */}
      <header className="px-4 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="font-display font-bold text-lg">HustleAI</div>
        <Button size="sm" variant="ghost" onClick={() => nav("/login")}>Log in</Button>
      </header>

      {/* Hero */}
      <section className="px-4 pt-10 pb-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <Badge className="bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-amber-500/20 border-primary/20 text-foreground px-4 py-1.5">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> Trusted by 10,000+ Indian operators
          </Badge>
          <motion.h1 key={hookIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-emerald-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
              {hooks[hookIdx]}
            </span>
          </motion.h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            CRM, invoices, projects, portals and an in-house AI assistant — in <strong className="text-foreground">one</strong> calm cockpit.
            No tab-hunting. No vendor lock-in. No platform fees.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {cta()}
            <Button size="lg" variant="outline" onClick={() => nav("/plans")} className="h-12 px-8">See pricing</Button>
          </div>
          <p className="text-xs text-muted-foreground">No credit card · Cancel anytime · Your data stays yours</p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-5 text-center">
              <div className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-emerald-500 to-violet-500 bg-clip-text text-transparent">{s.n}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Wins */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <Badge variant="outline">Why operators switch</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold">Everything. One place. Finally.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {wins.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -6 }}
                  className="group rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">{w.k}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{w.v}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <Badge variant="outline">Real operators</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold">They stopped wondering. They started shipping.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 space-y-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm leading-relaxed">"{t.q}"</p>
                <div className="pt-3 border-t border-border/40">
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-32">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-violet-500/10 to-amber-500/10 p-10 md:p-16 max-w-5xl mx-auto text-center space-y-6">
          <Rocket className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-3xl md:text-5xl font-display font-bold">Your cockpit is one click away.</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Join the operators who replaced their entire freelance stack with one workspace.</p>
          <div className="flex justify-center">{cta("Start free now")}</div>
          <p className="text-xs text-muted-foreground">Free forever plan · No credit card · Setup in 60 seconds</p>
        </motion.div>
      </section>
    </div>
  );
}
