import { useEffect } from "react";
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
  Bot, FileText, Target, Brain, BarChart3, BookOpen,
  Users, Video, Compass, Upload, TrendingUp, Key, ArrowRight,
  Briefcase, Layers, Workflow, Mail, Receipt, ClipboardList, Palette
} from "lucide-react";

const tiers = ["Free", "Pro", "Elite", "Infinity", "Pay-As-You-Go"];
const tierColors = ["text-muted-foreground", "text-primary", "text-accent", "text-yellow-500", "text-emerald-500"];
const tierIcons = [Sparkles, Rocket, Crown, Star, Wallet];
const tierPrices = ["₹0", "₹450/mo", "₹900/mo", "₹2,250/mo", "₹10/search"];

interface FeatureRow {
  category: string;
  features: { name: string; icon: any; values: (boolean | string)[] }[];
}

const featureGrid: FeatureRow[] = [
  {
    category: "Workspace Features",
    features: [
      { name: "Workspaces", icon: Briefcase, values: ["1", "5", "Unlimited", "Unlimited", "Per assist"] },
      { name: "Project checklists & timeline", icon: ClipboardList, values: [true, true, true, true, false] },
      { name: "Time tracking", icon: TrendingUp, values: [true, true, true, true, false] },
      { name: "Workspace analytics", icon: BarChart3, values: [false, true, true, true, false] },
      { name: "Workspace insights", icon: Brain, values: [false, false, true, true, false] },
    ],
  },
  {
    category: "Client Operations",
    features: [
      { name: "Client CRM", icon: Users, values: [true, true, true, true, false] },
      { name: "Invoices & quotations", icon: Receipt, values: ["Basic", "Advanced", "Advanced", "Advanced", false] },
      { name: "Agreements & approvals", icon: FileText, values: [true, true, true, true, false] },
      { name: "Recurring reminders", icon: Mail, values: [false, true, true, true, false] },
      { name: "Retainer management", icon: Layers, values: [false, false, true, true, false] },
      { name: "Revenue dashboard", icon: BarChart3, values: [false, true, true, true, false] },
    ],
  },
  {
    category: "Collaboration & Portals",
    features: [
      { name: "Client portal", icon: Compass, values: ["Basic", "Branded", "Shared", "Shared + analytics", false] },
      { name: "Team collaboration", icon: Users, values: [false, false, true, true, false] },
      { name: "Team permissions & roles", icon: Shield, values: [false, false, false, true, false] },
      { name: "Multi-user collaboration", icon: Users, values: [false, false, false, true, false] },
    ],
  },
  {
    category: "Automation & Integrations",
    features: [
      { name: "Automation workflows", icon: Workflow, values: [false, false, true, true, false] },
      { name: "Advanced automations", icon: Workflow, values: [false, false, false, true, false] },
      { name: "Advanced integrations", icon: Layers, values: [false, false, false, true, false] },
      { name: "API access", icon: Key, values: [false, false, false, true, false] },
      { name: "White-label branding", icon: Palette, values: [false, false, false, true, false] },
      { name: "Custom branding on documents", icon: Palette, values: [false, true, true, true, false] },
    ],
  },
  {
    category: "AI Assistance",
    features: [
      { name: "AI assists / day", icon: Bot, values: ["3", "5", "10", "Unlimited", "Per credit"] },
      { name: "AI workspace assistant", icon: Bot, values: [false, false, true, true, true] },
      { name: "Proposal & quotation drafting", icon: FileText, values: [false, true, true, true, true] },
      { name: "Document intelligence", icon: Brain, values: [false, true, true, true, true] },
      { name: "Premium templates", icon: Zap, values: [false, true, true, true, false] },
    ],
  },
  {
    category: "Support & Community",
    features: [
      { name: "Community access", icon: Users, values: [true, "Pro forums", "Elite groups", "Infinity lounge", false] },
      { name: "Priority support", icon: Compass, values: [false, true, true, true, false] },
      { name: "Strategy sessions", icon: Video, values: [false, false, true, "Priority", false] },
      { name: "Priority onboarding", icon: Upload, values: [false, false, false, true, false] },
      { name: "Early access features", icon: Target, values: [false, false, false, true, false] },
    ],
  },
];

const outcomes = [
  { problem: "Scattered tools for client work", solution: "One workspace for clients, projects & invoices", icon: "🗂️" },
  { problem: "Manual quotations & agreements", solution: "Polished docs generated in seconds", icon: "📝" },
  { problem: "Chasing clients for approvals", solution: "Branded client portals with approval flows", icon: "✅" },
  { problem: "Late or forgotten invoices", solution: "Recurring reminders & revenue dashboard", icon: "💼" },
  { problem: "Disconnected freelancer stack", solution: "CRM, pipeline & retainers in one place", icon: "🧩" },
  { problem: "Repetitive admin work", solution: "Automation workflows that run quietly", icon: "⚙️" },
];

export default function Plans() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const currentTier = (profile as any)?.subscription_tier || "free";

  useEffect(() => { track("pricing_viewed"); }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Pricing — HustleAI Workspace OS Plans" description="Simple, transparent pricing for the freelancer Workspace OS. Free, Pro, Elite and Infinity plans built for client work." path="/plans" />
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl space-y-16">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">Compare plans</Badge>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Run client work from <span className="text-gradient">one workspace.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              HustleAI Workspace OS is the operating layer for freelancers and agencies — clients, projects, invoices, portals and AI assistance in one calm place.
            </p>
          </motion.div>

          {/* Pain Points — moved up so visitors see the value prop first */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-4xl font-display font-bold">Built for client outcomes.</h2>
              <p className="text-muted-foreground">Designed to replace the freelancer's scattered toolkit.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outcomes.map((point, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl p-5 space-y-3">
                  <span className="text-3xl">{point.icon}</span>
                  <div>
                    <p className="text-sm text-destructive line-through">{point.problem}</p>
                    <p className="text-sm font-medium text-primary mt-1">✅ {point.solution}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Plan Cards Quick Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tiers.map((tier, i) => {
              const Icon = tierIcons[i];
              const isCurrent = tier.toLowerCase() === currentTier;
              return (
                <motion.div key={tier} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`glass rounded-xl p-4 text-center space-y-2 ${isCurrent ? "border-primary/50 shadow-glow" : ""}`}>
                  <Icon className={`w-6 h-6 mx-auto ${tierColors[i]}`} />
                  <h3 className="font-display font-bold text-sm">{tier}</h3>
                  <p className="text-lg font-display font-bold text-gradient">{tierPrices[i]}</p>
                  {isCurrent && <Badge className="bg-primary/20 text-primary text-[10px]">Current</Badge>}
                </motion.div>
              );
            })}
          </div>

          {/* Feature Comparison Grid */}
          <div className="space-y-8">
            {featureGrid.map((section, si) => (
              <motion.div key={section.category} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: si * 0.05 }}>
                <h3 className="font-display font-bold text-lg mb-4">{section.category}</h3>
                <div className="glass rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left p-3 font-medium text-muted-foreground w-[240px]">Feature</th>
                          {tiers.map((tier, i) => (
                            <th key={tier} className={`p-3 text-center font-medium ${tierColors[i]} min-w-[100px]`}>{tier}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.features.map((feature, fi) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <tr key={fi} className="border-b border-border/20 last:border-0">
                              <td className="p-3 flex items-center gap-2">
                                <FeatureIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-foreground">{feature.name}</span>
                              </td>
                              {feature.values.map((val, vi) => (
                                <td key={vi} className="p-3 text-center">
                                  {val === true ? <Check className="w-4 h-4 text-primary mx-auto" /> :
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
          </div>

          {/* Pay As You Go */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="glass rounded-2xl p-8 border-emerald-500/30 space-y-4 text-center">
            <Wallet className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-display font-bold">AI assist credits</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Prefer no subscription? Top up AI assists at ₹10 each. Use them for proposals, quotations, document intelligence and workspace automations on demand.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "10 Credits", price: "₹100", pack: "pack_10" },
                { label: "20 Credits", price: "₹200", pack: "pack_20" },
                { label: "50 Credits", price: "₹500", pack: "pack_50" },
                { label: "100 Credits", price: "₹1,000", pack: "pack_100" },
              ].map(p => (
                <Button key={p.pack} variant="outline" className="border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => navigate("/payment?type=wallet")}>
                  {p.label} — {p.price}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <Button size="lg" onClick={() => navigate("/payment")} className="bg-gradient-primary text-primary-foreground px-8">
              Upgrade plan <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-xs text-muted-foreground">No revenue sharing. No marketplace fees. Cancel anytime.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
