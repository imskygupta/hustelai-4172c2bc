import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Crown, Rocket, Sparkles, Star } from "lucide-react";

const plans = [
  {
    name: "Free",
    priceUSD: "$0",
    priceINR: "₹0",
    period: "forever",
    icon: Sparkles,
    features: [
      "3 AI-powered searches/day",
      "Basic personalization",
      "Explore all categories",
      "Community access (limited)",
      "Basic side hustle ideas",
      "Affiliate: 1 search credit/referral",
      "Marketplace: View 2 free items",
    ],
    cta: "Start Free",
  },
  {
    name: "Pro",
    priceUSD: "$5",
    priceINR: "₹450",
    period: "/month",
    icon: Rocket,
    popular: true,
    features: [
      "5 AI searches/day",
      "Promoted profile visibility",
      "Personalized monitoring",
      "Custom idea recommendations",
      "Priority support",
      "Pro community & forums",
      "Profile & resume upload",
      "Weekly trending reports",
      "Affiliate: 5% commission",
      "Full marketplace browsing",
    ],
    cta: "Go Pro",
  },
  {
    name: "Elite",
    priceUSD: "$10",
    priceINR: "₹900",
    period: "/month",
    icon: Crown,
    features: [
      "10 AI searches/day — everything in Pro",
      "Live webinars & guidance",
      "AI Chatbot (Personal Mentor)",
      "Advanced elite communities",
      "Expert resume review",
      "Free tools & software licenses",
      "Hacks & methods library",
      "1-on-1 strategy sessions",
      "Affiliate: 6% commission",
      "Sell 1 course + 1 tool + 1 item",
    ],
    cta: "Go Elite",
  },
  {
    name: "Infinity",
    priceUSD: "$25",
    priceINR: "₹2,250",
    period: "/month",
    icon: Star,
    infinity: true,
    features: [
      "20 AI searches/day — everything in Elite",
      "Create & sell courses (up to 5)",
      "Sell tools & templates (up to 5)",
      "5 additional marketplace items",
      "Infinity members lounge",
      "Revenue sharing program",
      "Priority 1-on-1 coaching",
      "Custom branding tools",
      "Affiliate: 10% + custom rates",
      "Own affiliate program for products",
      "API access & integrations",
    ],
    cta: "Go Infinity ♾️",
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
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-medium">Pricing</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">
            Choose your hustle plan
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Start free, upgrade when you're ready. Prices in INR for Indian hustlers.
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
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-semibold tracking-wide shadow-sm">
                  Most Popular
                </div>
              )}
              {plan.infinity && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-semibold tracking-wide shadow-sm">
                  ♾️ Ultimate
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
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-display font-semibold text-slate-900">{plan.priceINR}</span>
                    <span className="text-slate-500 text-xs">{plan.period}</span>
                  </div>
                  <span className="text-xs text-slate-400">({plan.priceUSD} USD)</span>
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

        {/* Pay-As-You-Go Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 rounded-2xl p-8 text-center max-w-xl mx-auto bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all space-y-3"
        >
          <div className="inline-flex w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center mx-auto">💳</div>
          <h3 className="font-display font-semibold text-lg text-slate-900">Pay-As-You-Go</h3>
          <p className="text-sm text-slate-500">₹10/search — All AI tools unlocked per search, no subscription needed</p>
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
