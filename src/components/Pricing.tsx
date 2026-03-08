import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, DollarSign, Crown, Rocket, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    gradient: false,
    features: [
      "3-4 AI-powered searches/day",
      "Basic personalization",
      "Explore all categories",
      "Community access",
      "Basic side hustle ideas",
      "Platform discovery tools",
    ],
    cta: "Start Free",
  },
  {
    name: "Pro",
    price: "$5",
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
      "Pro community groups",
      "Weekly trending reports",
      "Saved searches & alerts",
    ],
    cta: "Go Pro",
  },
  {
    name: "Elite",
    price: "$10",
    period: "/month",
    icon: Crown,
    gradient: false,
    features: [
      "Everything in Pro",
      "Live webinars & guidance",
      "AI Chatbot (Personal Mentor)",
      "Advanced elite communities",
      "Exclusive new offers first",
      "Free tools & software licenses",
      "Hacks & methods library",
      "1-on-1 strategy sessions",
      "Early access to features",
    ],
    cta: "Go Elite",
  },
];

export function Pricing() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-4 relative overflow-hidden" id="pricing">
      {/* Floating dollar signs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/10 font-display font-bold"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              fontSize: `${40 + i * 10}px`,
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
            $
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm">
            <DollarSign className="w-4 h-4" /> Simple Pricing
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold">
            Choose Your <span className="text-gradient">Hustle Plan</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free, upgrade when you're ready to level up your freelancing game.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
              className={`relative glass rounded-2xl p-8 flex flex-col ${
                plan.popular ? "border-primary/50 shadow-glow scale-[1.02]" : "border-border/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  Most Popular
                </div>
              )}
              <div className="space-y-4 mb-6">
                <plan.icon className={`w-10 h-10 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                <h3 className="font-display font-bold text-xl">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold text-gradient">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${plan.popular ? "bg-gradient-primary text-primary-foreground" : ""}`}
                variant={plan.popular ? "default" : "outline"}
                onClick={() => navigate("/signup")}
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
