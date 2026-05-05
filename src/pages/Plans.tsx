import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Check, X, Sparkles, Rocket, Crown, Star, Wallet, Shield, Zap,
  Search, Bot, FileText, Target, Brain, BarChart3, BookOpen, Store,
  Users, Video, Compass, Upload, TrendingUp, Share2, Key, ArrowRight
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
    category: "🔍 AI Search & Discovery",
    features: [
      { name: "AI-Powered Searches/day", icon: Search, values: ["3", "5", "10", "20", "Unlimited*"] },
      { name: "Personalized Recommendations", icon: Brain, values: ["Basic", true, true, true, true] },
      { name: "10+ Page Deep Research", icon: FileText, values: [false, true, true, true, true] },
      { name: "Trending Reports (Weekly)", icon: TrendingUp, values: [false, true, true, true, false] },
    ],
  },
  {
    category: "🤖 AI Tools & Bots",
    features: [
      { name: "HustleBot (AI Mentor)", icon: Bot, values: [false, false, true, true, true] },
      { name: "Proposal Draft Generator", icon: FileText, values: [false, true, true, true, true] },
      { name: "Skill Gap Analyzer", icon: Brain, values: [false, true, true, true, true] },
      { name: "Problem-Lead Discovery", icon: Target, values: [false, false, true, true, true] },
      { name: "AI Tool Benchmarks", icon: BarChart3, values: [false, true, true, true, true] },
      { name: "Roadmap Ebook Generator", icon: BookOpen, values: [false, true, true, true, true] },
      { name: "Knowledge Hub", icon: BookOpen, values: [false, true, true, true, true] },
    ],
  },
  {
    category: "👥 Community & Learning",
    features: [
      { name: "Community Access", icon: Users, values: ["Limited", "Pro Forums", "Elite Groups", "Infinity Lounge", false] },
      { name: "Live Webinars", icon: Video, values: [false, false, true, true, false] },
      { name: "1-on-1 Strategy Sessions", icon: Compass, values: [false, false, true, "Priority", false] },
      { name: "Expert Resume Review", icon: Upload, values: [false, false, true, true, false] },
    ],
  },
  {
    category: "🏪 Marketplace & Earning",
    features: [
      { name: "Marketplace Browsing", icon: Store, values: ["2 Free Items", "Full", "Full", "Full", "Full"] },
      { name: "Sell Courses", icon: BookOpen, values: [false, false, "1", "5", false] },
      { name: "Sell Tools & Templates", icon: Store, values: [false, false, "1", "5", false] },
      { name: "Affiliate Commission", icon: Share2, values: ["1 credit/ref", "5%", "6%", "10%+", false] },
      { name: "Revenue Sharing", icon: Wallet, values: [false, false, false, true, false] },
      { name: "API Access", icon: Key, values: [false, false, false, true, false] },
    ],
  },
  {
    category: "📄 Profile & Extras",
    features: [
      { name: "Resume Upload", icon: Upload, values: [false, true, true, true, false] },
      { name: "Promoted Profile Visibility", icon: Users, values: [false, true, true, true, false] },
      { name: "Free Tools & Software", icon: Zap, values: [false, false, true, true, false] },
      { name: "Custom Branding Tools", icon: Shield, values: [false, false, false, true, false] },
    ],
  },
];

const painPoints = [
  { problem: "Watching 100s of YouTube videos", solution: "Get 10+ page deep research in 1 search", icon: "📺" },
  { problem: "Paying ₹5000+ for courses", solution: "All tools & guidance included in your plan", icon: "💸" },
  { problem: "No personalized guidance", solution: "AI mentor tailored to YOUR skills", icon: "🎯" },
  { problem: "Scattered freelancing tips", solution: "Everything in one dashboard", icon: "📊" },
  { problem: "Generic advice that doesn't work", solution: "AI-analyzed leads with intent scoring", icon: "🔥" },
  { problem: "Can't find real clients", solution: "Problem-Lead Discovery scans Reddit, StackOverflow, Adzuna", icon: "🕵️" },
];

export default function Plans() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const currentTier = (profile as any)?.subscription_tier || "free";

  useEffect(() => { track("pricing_viewed"); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl space-y-16">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">Compare All Plans</Badge>
            <h1 className="text-3xl md:text-5xl font-display font-bold">
              Every Tool. Every Feature. <span className="text-gradient">One Platform.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Stop wasting hours on YouTube and scattered resources. HustleAI gives you everything in one place — AI research, lead discovery, roadmaps, mentoring, and more.
            </p>
          </motion.div>

          {/* Pain Points — moved up so visitors see the value prop first */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-4xl font-display font-bold">
                Why HustleAI {'>'} <span className="line-through text-muted-foreground">Everything Else</span>
              </h2>
              <p className="text-muted-foreground">Stop wasting time. Start earning.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {painPoints.map((point, i) => (
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
            <h2 className="text-2xl font-display font-bold">Pay-As-You-Go Credits</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Don't want a subscription? Buy search credits at ₹10/search. All AI tools unlocked per search — no commitment needed.
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
              Upgrade Now <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-xs text-muted-foreground">* Pay-as-you-go: 1 credit = 1 search with all tools unlocked</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
