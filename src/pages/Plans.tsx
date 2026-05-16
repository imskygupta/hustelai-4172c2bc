import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import {
  Check, X, Sparkles, Rocket, Crown, Star, Wallet, Shield, Zap,
  Bot, FileText, Target, Brain, BarChart3, Users, Compass, Upload,
  TrendingUp, Key, ArrowRight, Briefcase, Layers, Workflow, Mail,
  Receipt, ClipboardList, Palette, Infinity as InfinityIcon, Gauge,
  Lock, Globe2, Cpu, HeartHandshake,
} from "lucide-react";

// ─── Tiers ───────────────────────────────────────────────────────────
const tiers = [
  { name: "Free",       icon: Sparkles, price: "₹0",        sub: "forever",     accent: "from-slate-400/30 to-slate-300/10",  ring: "ring-slate-300/40",  text: "text-slate-600" },
  { name: "Pro",        icon: Rocket,   price: "₹450",      sub: "/month",       accent: "from-emerald-400/40 to-teal-300/10", ring: "ring-emerald-400/40", text: "text-emerald-600" },
  { name: "Elite",      icon: Crown,    price: "₹900",      sub: "/month",       accent: "from-violet-400/40 to-fuchsia-300/10", ring: "ring-violet-400/40", text: "text-violet-600", popular: true },
  { name: "Infinity",   icon: Star,     price: "₹2,250",    sub: "/month",       accent: "from-amber-400/40 to-orange-300/10", ring: "ring-amber-400/40",  text: "text-amber-600" },
  { name: "Pay-as-you-go", icon: Wallet, price: "₹10",      sub: "/AI assist",   accent: "from-cyan-400/40 to-sky-300/10",     ring: "ring-cyan-400/40",   text: "text-cyan-600" },
];

// ─── Why us tiles ───────────────────────────────────────────────────
const whyUs = [
  { icon: Layers,        title: "All-in-one cockpit",     copy: "CRM, invoices, projects, portals & AI in one calm workspace — no tab-hunting." },
  { icon: Cpu,           title: "In-house AI engine",     copy: "A private orchestration layer routing across our own and frontier models — no vendor lock-in." },
  { icon: Lock,          title: "Owner-grade security",   copy: "Row-level isolation, encrypted at rest, audited admin actions. Your data, your rules." },
  { icon: Gauge,         title: "Built for speed",        copy: "Edge-deployed, lazy-hydrated, animation-first. Loads in under a second on 4G." },
  { icon: HeartHandshake,title: "No platform fees",       copy: "Zero revenue sharing, zero transaction surcharge. The price you see is the price you pay." },
  { icon: Globe2,        title: "Global-ready billing",   copy: "Domestic UPI/cards plus international merchant-of-record. Invoices issued in your currency." },
];

// ─── Comparison ─────────────────────────────────────────────────────
const compare = [
  { area: "Workspaces",            us: "Unified cockpit, infinite projects", them: "Bolt-on tabs, per-seat caps" },
  { area: "AI assistance",         us: "In-house engine, 5+ frontier models",them: "One vendor, one model, hard quotas" },
  { area: "Client portals",        us: "Branded, white-labelled, automated", them: "Generic shared link, manual emails" },
  { area: "Invoices & retainers",  us: "Recurring, GST-ready, multi-currency",them: "Manual spreadsheets" },
  { area: "Data ownership",        us: "Yours — exportable any time",        them: "Locked behind upgrade paywalls" },
  { area: "Pricing",               us: "Flat ₹450 to ₹2,250 — no surprises", them: "$30–$120/seat/mo + add-ons" },
];

interface FeatureRow { name: string; icon: any; values: (boolean | string)[]; }
interface Section { category: string; features: FeatureRow[]; }

const featureGrid: Section[] = [
  { category: "Workspace", features: [
    { name: "Workspaces", icon: Briefcase, values: ["1", "5", "Unlimited", "Unlimited", "Per assist"] },
    { name: "Project checklists & timeline", icon: ClipboardList, values: [true, true, true, true, false] },
    { name: "Time tracking", icon: TrendingUp, values: [true, true, true, true, false] },
    { name: "Workspace analytics", icon: BarChart3, values: [false, true, true, true, false] },
    { name: "AI workspace insights", icon: Brain, values: [false, false, true, true, false] },
  ]},
  { category: "Client operations", features: [
    { name: "Client CRM", icon: Users, values: [true, true, true, true, false] },
    { name: "Invoices & quotations", icon: Receipt, values: ["Basic", "Advanced", "Advanced", "Advanced", false] },
    { name: "Recurring reminders", icon: Mail, values: [false, true, true, true, false] },
    { name: "Retainer management", icon: Layers, values: [false, false, true, true, false] },
  ]},
  { category: "AI assistance", features: [
    { name: "AI assists per day", icon: Bot, values: ["3", "5", "10", "Unlimited", "Per credit"] },
    { name: "In-house AI workspace assistant", icon: Bot, values: [false, false, true, true, true] },
    { name: "Proposal & quotation drafting", icon: FileText, values: [false, true, true, true, true] },
    { name: "Document intelligence", icon: Brain, values: [false, true, true, true, true] },
  ]},
  { category: "Automation & integrations", features: [
    { name: "Integrations", icon: Layers, values: ["3", "10", "25", "Unlimited", "Pay per use"] },
    { name: "Automation workflows", icon: Workflow, values: [false, false, true, true, false] },
    { name: "API access", icon: Key, values: [false, false, false, true, false] },
    { name: "White-label branding", icon: Palette, values: [false, false, false, true, false] },
  ]},
];

// ─── FAQ ───────────────────────────────────────────────────────────
const faqs = [
  { q: "Why are you the best in the market?", a: "Most freelancer tools force you to stitch 8 apps together. We replaced that stack with one cockpit — CRM, invoices, projects, portals and AI — engineered to feel like one operating environment, not a folder of tabs." },
  { q: "Which AI do you actually use?", a: "We run an in-house AI orchestration layer that intelligently routes your request across our own models and the latest frontier LLMs. You get the right model for each job — without vendor lock-in or surprise quotas." },
  { q: "Is my data safe?", a: "Every workspace is isolated with row-level security, encrypted at rest, and never used to train third-party models. You can export or delete everything in one click." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no notice period, no platform fees on what you earn. You keep your data even if you downgrade." },
  { q: "Why no free trial on higher tiers?", a: "The Free tier is your trial — fully functional, no credit card. Upgrade only when you outgrow it. We'd rather earn your money than trap your card." },
];

export default function Plans() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const currentTier = (profile as any)?.subscription_tier || "free";
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => { track("pricing_viewed"); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <SEO title="Pricing — HustleAI Workspace OS Plans" description="The all-in-one freelancer & agency cockpit. Flat pricing, in-house AI, zero platform fees." path="/plans" />
      <Navbar />

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-400/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-violet-400/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-amber-400/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="pt-24 pb-32 md:pb-16 px-4">
        <div className="container mx-auto max-w-7xl space-y-24">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center space-y-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
              <Badge className="bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-amber-500/20 border-primary/20 text-foreground px-4 py-1.5 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> The cockpit serious operators choose
              </Badge>
            </motion.div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]">
              Stop wondering.<br />
              <span className="bg-gradient-to-r from-emerald-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
                Start operating.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The only workspace freelancers and agencies need. <strong className="text-foreground">All-in-one. In-house AI. Zero platform fees.</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button size="lg" onClick={() => navigate("/payment")} className="bg-gradient-to-r from-emerald-500 to-violet-500 text-white hover:opacity-90 shadow-2xl shadow-violet-500/20 px-8 h-12">
                Start operating <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("compare")?.scrollIntoView({ behavior: "smooth" })} className="h-12 px-8">
                Compare plans
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-1">No credit card · Cancel anytime · Your data stays yours</p>
          </motion.div>

          {/* Why us — animated tiles */}
          <section className="space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
              <Badge variant="outline" className="border-primary/30">Why we win</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold">We are best in market.<br/><span className="text-muted-foreground text-2xl md:text-3xl font-medium">Here's the receipt.</span></h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {whyUs.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-display font-bold text-lg mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.copy}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Tier cards — premium animated */}
          <section id="compare" className="space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
              <Badge variant="outline" className="border-primary/30">Pricing</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold">Pick your altitude.</h2>
              <p className="text-muted-foreground">Flat pricing. Real features. No "contact sales" theatrics.</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {tiers.map((tier, i) => {
                const Icon = tier.icon;
                const isCurrent = tier.name.toLowerCase().replace(/\s|-/g, "") === currentTier.replace(/\s|-/g, "");
                return (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className={`relative group rounded-2xl border p-5 backdrop-blur-xl transition-all ${tier.popular ? "border-violet-400/50 ring-2 ring-violet-400/30 bg-gradient-to-b from-violet-500/5 to-transparent shadow-xl shadow-violet-500/10" : "border-border/60 bg-card/60 hover:border-primary/40"}`}
                  >
                    {tier.popular && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] px-2.5 py-0.5 shadow-lg">MOST LOVED</Badge>
                    )}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${tier.accent} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                    <div className="relative space-y-3 text-center">
                      <Icon className={`w-7 h-7 mx-auto ${tier.text}`} />
                      <h3 className="font-display font-bold">{tier.name}</h3>
                      <div>
                        <div className="text-2xl font-display font-bold">{tier.price}</div>
                        <div className="text-xs text-muted-foreground">{tier.sub}</div>
                      </div>
                      {isCurrent ? (
                        <Badge className="bg-primary/15 text-primary text-[10px]">Current plan</Badge>
                      ) : (
                        <Button size="sm" variant={tier.popular ? "default" : "outline"} className="w-full text-xs" onClick={() => navigate("/payment")}>
                          {tier.name === "Free" ? "Start free" : "Choose"}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Comparison: us vs them */}
          <section className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
              <Badge variant="outline" className="border-primary/30">HustleAI vs Generic SaaS</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold">The honest side-by-side.</h2>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl">
              <div className="grid grid-cols-[1.2fr_1.4fr_1.4fr] text-sm">
                <div className="p-4 font-medium text-muted-foreground border-b border-border/40">Area</div>
                <div className="p-4 font-display font-bold border-b border-border/40 bg-gradient-to-br from-emerald-500/10 to-violet-500/5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" /> HustleAI
                </div>
                <div className="p-4 font-medium text-muted-foreground border-b border-border/40">Generic SaaS</div>
                {compare.map((row, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="contents">
                    <div className="p-4 border-b border-border/20 last:border-0 font-medium">{row.area}</div>
                    <div className="p-4 border-b border-border/20 last:border-0 bg-gradient-to-br from-emerald-500/5 to-violet-500/5 flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{row.us}</span>
                    </div>
                    <div className="p-4 border-b border-border/20 last:border-0 text-muted-foreground flex items-start gap-2">
                      <X className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                      <span>{row.them}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Feature grid */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="border-primary/30">Every feature, every tier</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold">Nothing hidden.</h2>
            </div>
            {featureGrid.map((section, si) => (
              <motion.div key={section.category} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: si * 0.05 }}>
                <h3 className="font-display font-bold text-lg mb-3 px-1">{section.category}</h3>
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="text-left p-3 font-medium text-muted-foreground w-[260px]">Feature</th>
                          {tiers.map((t) => (
                            <th key={t.name} className={`p-3 text-center font-medium ${t.text} min-w-[100px]`}>{t.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.features.map((feature, fi) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <tr key={fi} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <FeatureIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span>{feature.name}</span>
                                </div>
                              </td>
                              {feature.values.map((val, vi) => (
                                <td key={vi} className="p-3 text-center">
                                  {val === true ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> :
                                   val === false ? <X className="w-4 h-4 text-muted-foreground/30 mx-auto" /> :
                                   <span className="text-xs font-medium">{val}</span>}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ))}
          </section>

          {/* Pay as you go */}
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent p-8 md:p-12 text-center space-y-4">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative space-y-4">
              <Wallet className="w-12 h-12 text-cyan-500 mx-auto" />
              <h2 className="text-2xl md:text-3xl font-display font-bold">No subscription? No problem.</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Top up AI assists at <strong className="text-foreground">₹10 each</strong>. Use them for proposals, document intelligence and workspace automations on demand.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {[
                  { label: "10 Credits", price: "₹100" },
                  { label: "20 Credits", price: "₹200" },
                  { label: "50 Credits", price: "₹500" },
                  { label: "100 Credits", price: "₹1,000" },
                ].map((p) => (
                  <Button key={p.label} variant="outline" className="border-cyan-400/40 hover:bg-cyan-500/10 backdrop-blur-sm" onClick={() => navigate("/payment?type=wallet")}>
                    {p.label} — <span className="font-bold ml-1">{p.price}</span>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <section className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="border-primary/30">Frequently asked</Badge>
              <h2 className="text-3xl md:text-5xl font-display font-bold">Why you might be wondering.</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl overflow-hidden"
                >
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <span className="font-medium">{faq.q}</span>
                    <span className={`shrink-0 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>
                      <Sparkles className="w-4 h-4 text-primary" />
                    </span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-violet-500/10 to-amber-500/10 p-10 md:p-16 text-center space-y-6">
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="relative space-y-5">
              <InfinityIcon className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-3xl md:text-5xl font-display font-bold">One workspace. Everything you run.</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Join operators who replaced their entire stack with one cockpit.</p>
              <Button size="lg" onClick={() => navigate("/payment")} className="bg-gradient-to-r from-emerald-500 via-violet-500 to-amber-500 text-white hover:opacity-90 shadow-2xl px-10 h-12">
                Upgrade now <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <p className="text-xs text-muted-foreground">No revenue sharing · No platform fees · Cancel anytime</p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Mobile sticky upgrade bar */}
      {currentTier !== "infinity" && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-safe pointer-events-none">
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Ready to operate?</p>
              <p className="text-sm font-medium truncate">Pro from ₹450/mo · cancel anytime</p>
            </div>
            <Button size="sm" onClick={() => navigate("/payment")} className="bg-gradient-to-r from-emerald-500 to-violet-500 text-white min-h-tap px-4 shrink-0">
              Upgrade <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
