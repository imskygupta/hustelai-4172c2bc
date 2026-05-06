import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Share2, TrendingUp, Gift, ArrowRight, CheckCircle, Zap, Search, Store, Crown, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tiers = [
  {
    name: "Free",
    commission: "1 Credit",
    color: "text-muted-foreground",
    desc: "Per successful signup",
    perks: ["Unique referral link", "Earn 1 search credit per referral signup", "Real-time referral tracking", "Dashboard analytics"],
  },
  {
    name: "Pro",
    commission: "5%",
    color: "text-primary",
    desc: "On referred subscriptions",
    perks: ["Everything in Free", "5% commission on subscriptions", "Priority support", "Monthly payouts via UPI/bank"],
  },
  {
    name: "Elite",
    commission: "6%",
    color: "text-accent",
    desc: "On referred subscriptions",
    perks: ["Everything in Pro", "6% commission rate", "Marketplace access — sell 1 course, 1 tool", "Custom landing pages", "Bonus rewards"],
  },
  {
    name: "Infinity",
    commission: "10%",
    color: "text-yellow-500",
    desc: "On referred subscriptions",
    popular: true,
    perks: ["Everything in Elite", "10% commission rate", "Marketplace — sell 5 courses, 5 tools, 5 items", "Set custom affiliate % for your products", "Co-branded assets", "Dedicated manager", "Revenue share program"],
  },
];

const steps = [
  { icon: Users, title: "Sign Up", desc: "Create your account — affiliate is automatic." },
  { icon: Share2, title: "Share", desc: "Get your unique link from the dashboard." },
  { icon: TrendingUp, title: "Track", desc: "Monitor clicks, conversions & earnings in real-time." },
  { icon: DollarSign, title: "Earn", desc: "Free users get search credits. Premium users earn commissions." },
];

export default function Affiliates() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-20 w-72 h-72 bg-accent/8 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto max-w-4xl text-center relative z-10 space-y-6">
            <ScrollReveal>
              <Badge variant="outline" className="border-accent/30 text-accent px-4 py-1.5">
                <Gift className="w-3.5 h-3.5 mr-1.5" /> Affiliate Program
              </Badge>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
                Earn While You <span className="text-gradient-accent">Share</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every HustleAI user is an affiliate. Free users earn search credits, premium users earn up to 10% commission on every referral.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground text-lg px-8 h-14"
                onClick={() => navigate(user ? "/dashboard?tab=affiliate" : "/signup")}>
                {user ? "Go to Affiliate Dashboard" : "Start Earning"} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </ScrollReveal>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-5xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                How It <span className="text-gradient">Works</span>
              </h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-4 gap-6 relative">
              <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-px bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30" />
              {steps.map((step, i) => (
                <ScrollReveal key={step.title} delay={i * 0.1}>
                  <div className="text-center relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative z-10">
                      <step.icon className="w-8 h-8 text-primary" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Reward Tiers */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
                Reward <span className="text-gradient-accent">Tiers</span>
              </h2>
              <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
                Your affiliate rewards scale with your subscription tier.
              </p>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {tiers.map((tier, i) => (
                <ScrollReveal key={tier.name} delay={i * 0.1}>
                  <div className={`glass rounded-2xl p-6 hover:shadow-glow hover:border-primary/30 transition-all duration-500 h-full relative ${tier.popular ? "border-yellow-500/30" : ""}`}>
                    {tier.popular && (
                      <Badge className="absolute -top-3 right-4 bg-yellow-500 text-black">Best Value</Badge>
                    )}
                    <div className={`text-3xl font-display font-bold ${tier.color} mb-1`}>{tier.commission}</div>
                    <h3 className="font-display font-semibold text-lg">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mb-5">{tier.desc}</p>
                    <ul className="space-y-2">
                      {tier.perks.map(perk => (
                        <li key={perk} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Marketplace Promo */}
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-4xl">
            <ScrollReveal direction="scale">
              <div className="glass rounded-2xl p-10 text-center space-y-5 border-accent/20">
                <Store className="w-12 h-12 text-accent mx-auto" />
                <h2 className="text-3xl font-display font-bold">Sell on the Marketplace</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Elite & Infinity members can sell courses, tools, and templates. Set your own prices and even your own affiliate commission rates (Infinity only).
                </p>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/marketplace")}>
                  <Store className="w-5 h-5 mr-2" /> Browse Marketplace
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <ScrollReveal direction="scale">
              <div className="glass rounded-2xl p-12 text-center space-y-6 border-accent/20">
                <Zap className="w-12 h-12 text-accent mx-auto" />
                <h2 className="text-3xl font-display font-bold">Start Earning Today</h2>
                <p className="text-muted-foreground">Questions? Reach out at <a href="mailto:hustlaiapp@zohomail.in" className="text-primary hover:underline">hustlaiapp@zohomail.in</a></p>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground" onClick={() => navigate(user ? "/dashboard?tab=affiliate" : "/signup")}>
                  {user ? "Open Affiliate Dashboard" : "Join the Program"} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
}
