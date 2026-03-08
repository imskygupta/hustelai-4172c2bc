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
    gradient: false,
    features: [
      "3-4 AI-powered searches/day",
      "Basic personalization",
      "Explore all categories",
      "Community access (limited)",
      "Basic side hustle ideas",
      "Platform discovery tools",
    ],
    cta: "Start Free",
  },
  {
    name: "Pro",
    priceUSD: "$5",
    priceINR: "₹450",
    period: "/month",
    icon: Rocket,
    gradient: true,
    popular: true,
    features: [
      "Unlimited AI searches",
      "Promoted profile visibility",
      "Personalized monitoring",
      "Custom idea recommendations",
      "Priority support",
      "Pro community & forums",
      "Profile & resume upload",
      "Weekly trending reports",
    ],
    cta: "Go Pro",
  },
  {
    name: "Elite",
    priceUSD: "$10",
    priceINR: "₹900",
    period: "/month",
    icon: Crown,
    gradient: false,
    features: [
      "Everything in Pro",
      "Live webinars & guidance",
      "AI Chatbot (Personal Mentor)",
      "Advanced elite communities",
      "Expert resume review",
      "Free tools & software licenses",
      "Hacks & methods library",
      "1-on-1 strategy sessions",
    ],
    cta: "Go Elite",
  },
  {
    name: "Infinity",
    priceUSD: "$25",
    priceINR: "₹2,250",
    period: "/month",
    icon: Star,
    gradient: false,
    infinity: true,
    features: [
      "Everything in Elite",
      "Create & sell courses",
      "Build communities",
      "Sell tools & templates",
      "Infinity members lounge",
      "Revenue sharing program",
      "Priority 1-on-1 coaching",
      "Custom branding tools",
      "API access & integrations",
    ],
    cta: "Go Infinity ♾️",
  },
];

export function Pricing() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-4 relative overflow-hidden" id="pricing">
      {/* Floating currency symbols */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/10 font-display font-bold"
            style={{
              left: `${5 + i * 10}%`,
              top: `${15 + (i % 4) * 20}%`,
              fontSize: `${30 + i * 8}px`,
            }}
            animate={{
              y: [-20, 20, -20],
              rotate: [-5, 5, -5],
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {i % 3 === 0 ? "₹" : i % 3 === 1 ? "$" : "♾️"}
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
            ₹ Simple Pricing
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold">
            Choose Your <span className="text-gradient">Hustle Plan</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade when you're ready. Prices in INR for Indian hustlers.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative glass rounded-2xl p-6 flex flex-col ${
                plan.popular ? "border-primary/50 shadow-glow scale-[1.02]" : 
                plan.infinity ? "border-yellow-500/30" : "border-border/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  Most Popular
                </div>
              )}
              {plan.infinity && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-yellow-500 text-black text-xs font-semibold">
                  ♾️ Ultimate
                </div>
              )}
              <div className="space-y-3 mb-5">
                <plan.icon className={`w-8 h-8 ${
                  plan.infinity ? "text-yellow-500" : plan.popular ? "text-primary" : "text-muted-foreground"
                }`} />
                <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-display font-bold text-gradient">{plan.priceINR}</span>
                    <span className="text-muted-foreground text-xs">{plan.period}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">({plan.priceUSD} USD)</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${
                  plan.infinity ? "bg-yellow-500 hover:bg-yellow-600 text-black" :
                  plan.popular ? "bg-gradient-primary text-primary-foreground" : ""
                }`}
                variant={plan.popular || plan.infinity ? "default" : "outline"}
                onClick={() => navigate(plan.name === "Free" ? "/signup" : "/payment")}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
