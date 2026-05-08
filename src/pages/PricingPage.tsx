import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Rocket, Sparkles, Star, Building2, ArrowRight, Flame, Zap } from "lucide-react";
import { track } from "@/lib/analytics";

const plans = [
  {
    name: "Free",
    icon: Sparkles,
    tagline: "Solo, getting started",
    strike: "₹499",
    price: "₹0",
    period: "forever",
    badge: null as string | null,
    cta: "Start free",
    href: "/signup",
    features: ["1 Workspace", "3 AI assists / day", "Clients CRM", "Invoices & quotations", "Time tracker", "Basic client portal", "3 integrations"],
    accent: "slate",
  },
  {
    name: "Pro",
    icon: Rocket,
    tagline: "Active freelancers",
    strike: "₹999",
    price: "₹450",
    period: "/month",
    badge: "Most popular",
    cta: "Upgrade to Pro",
    href: "/payment?plan=pro",
    features: ["5 Workspaces", "5 AI assists / day", "Custom branded docs", "Pipeline + approvals", "Comm log", "Revenue dashboard", "10 integrations", "Watermark-free exports"],
    accent: "emerald",
  },
  {
    name: "Elite",
    icon: Crown,
    tagline: "Growing freelance biz",
    strike: "₹1,999",
    price: "₹900",
    period: "/month",
    badge: "Save 55%",
    cta: "Go Elite",
    href: "/payment?plan=elite",
    features: ["Unlimited workspaces", "10 AI assists / day", "AI workspace assistant", "Advanced CRM + lead scoring", "Retainer & MRR tracking", "Branded portals", "Automation workflows", "25 integrations"],
    accent: "purple",
  },
  {
    name: "Infinity",
    icon: Star,
    tagline: "Agencies & power users",
    strike: "₹4,999",
    price: "₹2,250",
    period: "/month",
    badge: "Ultimate",
    cta: "Go Infinity",
    href: "/payment?plan=infinity",
    features: ["Everything in Elite", "Unlimited AI assists", "Advanced automations", "API access", "White-label branding", "Unlimited integrations + webhooks", "Team permissions", "Priority onboarding"],
    accent: "amber",
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  useEffect(() => { track("pricing_page_viewed"); }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO title="Pricing — HustleAI Workspace OS" description="Simple, transparent pricing for the freelancer Workspace OS. Free, Pro, Elite, Infinity and Enterprise plans." path="/pricing" />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-200/30 blur-3xl rounded-full pointer-events-none" />
        <div className="container mx-auto max-w-4xl text-center space-y-5 relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
            <Flame className="w-3.5 h-3.5" /> Limited launch pricing — up to 60% off
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight">
            Pricing built for <span className="text-emerald-600">client work.</span>
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            One workspace for clients, projects, invoices, portals and AI assistance. Cancel anytime. No revenue share. No platform fees.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Free forever plan</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> No credit card to start</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p, i) => {
              const popular = p.badge === "Most popular";
              const ultimate = p.name === "Infinity";
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className={`group relative rounded-2xl p-6 flex flex-col bg-white border transition-all duration-300 hover:-translate-y-1 ${
                    popular
                      ? "border-emerald-500/50 shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20"
                      : ultimate
                      ? "border-amber-300/60 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-200/40"
                      : "border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100"
                  }`}
                >
                  {p.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-sm ${
                      popular ? "bg-emerald-500 text-white" : ultimate ? "bg-amber-400 text-slate-900" : "bg-slate-900 text-white"
                    }`}>
                      {p.badge}
                    </div>
                  )}
                  <div className="space-y-3 mb-5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      popular ? "bg-emerald-50 text-emerald-600" : ultimate ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-700"
                    }`}>
                      <p.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-semibold text-lg">{p.name}</h3>
                    <p className="text-xs text-slate-500 -mt-1">{p.tagline}</p>
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-display font-semibold text-slate-900">{p.price}</span>
                        <span className="text-slate-500 text-xs">{p.period}</span>
                      </div>
                      {p.strike !== p.price && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 line-through">{p.strike}</span>
                          <Badge className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-50 text-[10px] px-1.5 py-0">Launch deal</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2 flex-1 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-600 leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full h-10 ${
                      popular
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : ultimate
                        ? "bg-amber-400 hover:bg-amber-500 text-slate-900"
                        : "bg-slate-900 hover:bg-emerald-500 text-white transition-colors"
                    }`}
                    onClick={() => navigate(p.href)}
                  >
                    {p.cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Enterprise band */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] text-white p-8 md:p-12"
          >
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-fuchsia-500/30 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/20 blur-3xl rounded-full pointer-events-none" />
            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs">
                  <Building2 className="w-3.5 h-3.5" /> Enterprise
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
                  Custom pricing for agencies, studios & teams.
                </h2>
                <p className="text-slate-300 max-w-xl">
                  Volume seats, SSO, custom integrations, dedicated success manager, SLA-backed uptime, white-glove onboarding. Built around your workflow.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["SSO / SAML", "Custom contracts", "Dedicated CSM", "99.99% SLA", "Private deployments"].map((t) => (
                    <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 border border-white/15">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 h-12 font-semibold" onClick={() => navigate("/contact?topic=enterprise")}>
                  Contact sales <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate("/plans")}>
                  Compare all features
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Pay-as-you-go */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all space-y-3"
          >
            <div className="inline-flex w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center mx-auto"><Zap className="w-5 h-5" /></div>
            <h3 className="font-display font-semibold text-lg">AI assist credits</h3>
            <p className="text-sm text-slate-500">₹10 / assist — top up on demand without a subscription. Ideal for occasional use.</p>
            <Button variant="outline" onClick={() => navigate("/payment?type=wallet")} className="border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300">
              Buy credits
            </Button>
          </motion.div>

          {/* Trust strip */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { v: "Free", l: "forever plan" },
              { v: "Instant", l: "workspace setup" },
              { v: "0%", l: "revenue share" },
              { v: "99.9%", l: "uptime SLA" },
            ].map((t) => (
              <div key={t.l}>
                <div className="text-2xl font-display font-semibold text-slate-900">{t.v}</div>
                <div className="text-xs text-slate-500 mt-1">{t.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}