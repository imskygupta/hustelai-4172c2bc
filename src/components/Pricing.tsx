import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Rocket, Sparkles, Star, Building2, ArrowRight, Flame } from "lucide-react";

const plans = [
  {
    name: "Free",
    priceUSD: "$0",
    priceINR: "₹0",
    strikeINR: "",
    period: "forever",
    tagline: "Perfect for getting started",
    icon: Sparkles,
    badge: null as string | null,
    features: [
      "1 Workspace",
      "3 AI assists / day",
      "Clients CRM & contacts",
      "Invoices, quotations & agreements",
      "Time tracker + deadlines",
      "Project checklists & files",
      "Notes & activity timeline",
      "Basic client portal",
      "3 integrations (Gmail, Calendar, BYOK AI)",
      "Watermarked exports",
    ],
    cta: "Start Workspace",
  },
  {
    name: "Pro",
    priceUSD: "$5",
    priceINR: "₹450",
    strikeINR: "₹999",
    period: "/month",
    tagline: "For active freelancers",
    icon: Rocket,
    popular: true,
    badge: "Most popular",
    features: [
      "5 Workspaces",
      "5 AI assists / day",
      "Custom-branded invoices & docs",
      "Pipeline (Kanban) + approvals",
      "Comm log (email / WhatsApp / calls)",
      "Expenses + revenue dashboard",
      "Recurring reminders",
      "Workspace analytics",
      "Premium templates",
      "Watermark-free exports",
      "10 integrations (Workspace, Meet, Slack, BYOK AI)",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
  },
  {
    name: "Elite",
    priceUSD: "$10",
    priceINR: "₹900",
    strikeINR: "₹1,999",
    period: "/month",
    tagline: "For growing freelance businesses",
    icon: Crown,
    badge: "Save 55%",
    features: [
      "Unlimited workspaces",
      "10 AI assists / day",
      "AI workspace assistant (proposals, replies, doc intel)",
      "Advanced CRM, pipeline & lead scoring",
      "Retainer management & MRR tracking",
      "Branded client portals + approvals",
      "Automation workflows",
      "Workspace insights & forecasting",
      "Team collaboration",
      "25 integrations + early-access connectors",
      "Strategy sessions",
    ],
    cta: "Go Elite",
  },
  {
    name: "Infinity",
    priceUSD: "$25",
    priceINR: "₹2,250",
    strikeINR: "₹4,999",
    period: "/month",
    tagline: "For agencies & power users",
    icon: Star,
    infinity: true,
    badge: "Ultimate",
    features: [
      "Everything in Elite",
      "Unlimited AI assists",
      "Advanced automations",
      "API access",
      "White-label branding",
      "Unlimited integrations + custom webhooks",
      "Team permissions & roles",
      "Client analytics",
      "Multi-user collaboration",
      "Priority onboarding",
      "Early access features",
    ],
    cta: "Go Infinity",
  },
];

export function Pricing() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-4 relative" id="pricing">
      <div className="container mx-auto max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
            <Flame className="w-3.5 h-3.5" /> Limited launch pricing — up to 60% off
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">
            Pricing built for client work.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Workspaces, CRM, invoices, portals and AI assistance — one operating layer for freelancers and agencies.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
              className={`group relative rounded-2xl p-6 flex flex-col bg-white border transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? "border-emerald-500/40 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-500"
                  : plan.infinity
                  ? "border-amber-300/60 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-200/40"
                  : "border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100"
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-sm ${
                  plan.popular ? "bg-emerald-500 text-white" : plan.infinity ? "bg-amber-400 text-slate-900" : "bg-slate-900 text-white"
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className="space-y-3 mb-5">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    plan.infinity
                      ? "bg-amber-50 text-amber-600 group-hover:bg-amber-100"
                      : plan.popular
                      ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                  }`}
                >
                  <plan.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 -mt-1">{plan.tagline}</p>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-display font-semibold text-slate-900">{plan.priceINR}</span>
                    <span className="text-slate-500 text-xs">{plan.period}</span>
                  </div>
                  {plan.strikeINR && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400 line-through">{plan.strikeINR}</span>
                      <Badge className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-50 text-[10px] px-1.5 py-0">Launch deal</Badge>
                    </div>
                  )}
                  <span className="text-xs text-slate-400 block mt-1">({plan.priceUSD} USD)</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full h-10 ${
                  plan.infinity
                    ? "bg-amber-400 hover:bg-amber-500 text-slate-900"
                    : plan.popular
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-slate-900 hover:bg-emerald-500 text-white transition-colors"
                }`}
                onClick={() => navigate(plan.name === "Free" ? "/signup" : "/payment")}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Enterprise band */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] text-white p-8 md:p-10"
        >
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-fuchsia-500/30 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs">
                <Building2 className="w-3.5 h-3.5" /> Enterprise
              </div>
              <h3 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">
                Need something custom for your agency or studio?
              </h3>
              <p className="text-slate-300 max-w-xl text-sm">
                Volume seats, SSO, custom integrations, dedicated success manager and SLA-backed uptime. We'll shape it around your workflow.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["SSO / SAML", "Custom contracts", "Dedicated CSM", "99.99% SLA"].map((t) => (
                  <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 border border-white/15">{t}</span>
                ))}
              </div>
            </div>
            <div className="flex md:justify-end">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 h-12 px-6 font-semibold" onClick={() => navigate("/contact?topic=enterprise")}>
                Contact sales <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Pay-As-You-Go Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 rounded-2xl p-8 text-center max-w-xl mx-auto bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all space-y-3"
        >
          <div className="inline-flex w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center mx-auto">💳</div>
          <h3 className="font-display font-semibold text-lg text-slate-900">AI assist credits</h3>
          <p className="text-sm text-slate-500">₹10 / assist — top up on demand without a subscription. Ideal for occasional use.</p>
          <Button
            variant="outline"
            onClick={() => navigate("/payment?type=wallet")}
            className="border-slate-300 text-slate-900 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
          >
            Buy Credits
          </Button>
        </motion.div>

        {/* View All Features */}
        <div className="text-center mt-6">
          <Button variant="link" onClick={() => navigate("/plans")} className="text-emerald-600 hover:text-emerald-700">
            View all features & compare plans →
          </Button>
        </div>
      </div>
    </section>
  );
}
