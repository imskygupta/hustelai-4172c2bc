import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Share2, TrendingUp, Gift, ArrowRight, CheckCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tiers = [
  { name: "Starter", commission: "15%", color: "text-primary", desc: "0-10 referrals/month", perks: ["Unique referral link", "Real-time dashboard", "Monthly payouts"] },
  { name: "Pro Affiliate", commission: "25%", color: "text-accent", desc: "11-50 referrals/month", perks: ["Everything in Starter", "Custom landing pages", "Priority support", "Bonus rewards"] },
  { name: "Elite Partner", commission: "35%", color: "text-destructive", desc: "50+ referrals/month", perks: ["Everything in Pro", "Co-branded assets", "Dedicated manager", "Early feature access", "Revenue share"] },
];

const steps = [
  { icon: Users, title: "Sign Up", desc: "Create your free affiliate account in seconds." },
  { icon: Share2, title: "Share", desc: "Get your unique link and share with your audience." },
  { icon: TrendingUp, title: "Track", desc: "Monitor clicks, conversions, and earnings in real-time." },
  { icon: DollarSign, title: "Earn", desc: "Get paid every month via UPI, bank transfer, or PayPal." },
];

export default function Affiliates() {
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
                Join the HustleAI Affiliate Program and earn up to 35% commission on every referral. Turn your network into income.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground text-lg px-8 h-14"
                onClick={() => navigate("/signup")}>
                Become an Affiliate <ArrowRight className="w-5 h-5 ml-2" />
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
              {/* Connecting line */}
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

        {/* Commission Tiers */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                Commission <span className="text-gradient-accent">Tiers</span>
              </h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-3 gap-6">
              {tiers.map((tier, i) => (
                <ScrollReveal key={tier.name} delay={i * 0.1}>
                  <div className={`glass rounded-2xl p-8 hover:shadow-glow hover:border-primary/30 transition-all duration-500 h-full ${i === 2 ? "border-accent/30 relative" : ""}`}>
                    {i === 2 && (
                      <Badge className="absolute -top-3 right-4 bg-accent text-accent-foreground">Most Popular</Badge>
                    )}
                    <div className={`text-4xl font-display font-bold ${tier.color} mb-1`}>{tier.commission}</div>
                    <h3 className="font-display font-semibold text-lg">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mb-6">{tier.desc}</p>
                    <ul className="space-y-2.5">
                      {tier.perks.map(perk => (
                        <li key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <ScrollReveal direction="scale">
              <div className="glass rounded-2xl p-12 text-center space-y-6 border-accent/20">
                <Zap className="w-12 h-12 text-accent mx-auto" />
                <h2 className="text-3xl font-display font-bold">Start Earning Today</h2>
                <p className="text-muted-foreground">Questions? Reach out at <a href="mailto:contact@skycart.xyz" className="text-primary hover:underline">contact@skycart.xyz</a></p>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/signup")}>
                  Join the Program <ArrowRight className="w-5 h-5 ml-2" />
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
