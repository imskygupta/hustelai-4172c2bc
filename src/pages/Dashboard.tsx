import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Chatbot } from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Crown, Rocket, Sparkles, Users, Video, Wrench,
  BookOpen, TrendingUp, MessageCircle, Gift, Lock,
  Newspaper, ArrowUpRight, ArrowDownRight, ExternalLink
} from "lucide-react";

interface FeedData {
  headlines: { text: string; source: string }[];
  stocks: { symbol: string; price: string; change: string; up: boolean }[];
  discover: { title: string; description: string; category: string }[];
}

const eliteTools = [
  { name: "Canva Pro License", desc: "Design anything, anywhere", icon: "🎨" },
  { name: "Grammarly Premium", desc: "Write like a pro", icon: "✍️" },
  { name: "SEMrush Access", desc: "SEO & marketing research", icon: "📊" },
  { name: "Notion Pro", desc: "Organize your freelance biz", icon: "📋" },
  { name: "Figma Pro", desc: "UI/UX design toolkit", icon: "🖌️" },
  { name: "ChatGPT Plus", desc: "AI writing assistant", icon: "🤖" },
];

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) {
      loadFeed();
    }
  }, [user]);

  const loadFeed = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("dashboard-feed");
      if (error) throw error;
      setFeed(data);
    } catch (e) {
      console.error("Feed load failed:", e);
      // Fallback data
      setFeed({
        headlines: [
          { text: "AI Freelancing Market Grows 340% in 2026", source: "TechCrunch" },
          { text: "Remote Work Now Default for 67% of Tech Companies", source: "Forbes" },
          { text: "India's Gig Economy Surpasses $200B Valuation", source: "Economic Times" },
          { text: "New Study: Freelancers Earn 40% More Than Full-Time Peers", source: "Bloomberg" },
          { text: "Top Skills in Demand: AI Prompt Engineering, No-Code, Video", source: "LinkedIn" },
          { text: "Government Launches Freelancer Health Insurance Scheme", source: "Mint" },
          { text: "Upwork Reports Record Q1 2026 Revenue", source: "Reuters" },
          { text: "Web3 Freelancing Platforms See 5x User Growth", source: "CoinDesk" },
        ],
        stocks: [
          { symbol: "NIFTY", price: "24,580", change: "+1.2%", up: true },
          { symbol: "SENSEX", price: "81,234", change: "+0.8%", up: true },
          { symbol: "BTC", price: "$97,450", change: "+3.4%", up: true },
          { symbol: "ETH", price: "$4,120", change: "-1.1%", up: false },
          { symbol: "AAPL", price: "$198.50", change: "+0.5%", up: true },
          { symbol: "MSFT", price: "$445.20", change: "+1.8%", up: true },
        ],
        discover: [
          { title: "AI Video Editing is Booming", description: "Companies pay $50-200/video for AI-enhanced edits. Learn the tools in 2 weeks.", category: "Trending" },
          { title: "Notion Templates Market", description: "Sell productivity templates on Gumroad. Top sellers make $5K+/month.", category: "Side Hustle" },
          { title: "LinkedIn Ghostwriting", description: "CEOs pay $500-2K/month for someone to write their LinkedIn posts.", category: "Writing" },
          { title: "Micro-SaaS Opportunities", description: "Build tiny software tools with no-code. Monthly recurring revenue potential.", category: "Tech" },
          { title: "UGC Content Creation", description: "Brands pay $150-500 per short video. No followers needed.", category: "Creative" },
          { title: "AI Chatbot Development", description: "Businesses need custom chatbots. Charge $1K-5K per project.", category: "Tech" },
        ],
      });
    } finally {
      setFeedLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const tier = profile.subscription_tier;
  const isElite = tier === "elite";
  const isPro = tier === "pro" || isElite;

  const TierBadge = () => (
    <Badge
      className={`${
        isElite
          ? "bg-gradient-accent text-accent-foreground"
          : isPro
          ? "bg-gradient-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {isElite ? <Crown className="w-3 h-3 mr-1" /> : isPro ? <Rocket className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Stock Ticker Bar */}
      {feed?.stocks && (
        <div className="fixed top-16 w-full z-40 bg-card/90 backdrop-blur-sm border-b border-border/50 overflow-hidden h-8">
          <motion.div
            className="flex items-center gap-8 h-full whitespace-nowrap"
            animate={{ x: [0, -1200] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {[...feed.stocks, ...feed.stocks, ...feed.stocks].map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-mono">
                <span className="font-semibold text-foreground">{s.symbol}</span>
                <span className="text-muted-foreground">{s.price}</span>
                <span className={`flex items-center ${s.up ? "text-primary" : "text-destructive"}`}>
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.change}
                </span>
              </span>
            ))}
          </motion.div>
        </div>
      )}

      <div className="pt-28 pb-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold">
                  Welcome, {profile.display_name || "Hustler"}!
                </h1>
                <TierBadge />
              </div>
              <p className="text-muted-foreground text-sm">
                {isElite
                  ? "You have full access to all Elite features including AI Mentor, tools & webinars."
                  : isPro
                  ? "Upgrade to Elite for AI Mentor, webinars & exclusive tools."
                  : `You've used ${profile.search_count}/4 free searches today. Upgrade for unlimited.`}
              </p>
            </div>
            {!isElite && (
              <Button className="bg-gradient-primary text-primary-foreground shrink-0" onClick={() => navigate("/#pricing")}>
                Upgrade Plan
              </Button>
            )}
          </motion.div>

          {/* News Headline Marquee */}
          {feed?.headlines && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
                <Newspaper className="w-4 h-4 text-primary" />
                <span className="font-display font-semibold text-sm">Breaking News</span>
                <span className="ml-auto text-[10px] text-muted-foreground animate-pulse-glow">● LIVE</span>
              </div>
              <div className="overflow-hidden h-10">
                <motion.div
                  className="flex items-center gap-12 h-full whitespace-nowrap px-4"
                  animate={{ x: [0, -2000] }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                  {[...feed.headlines, ...feed.headlines].map((h, i) => (
                    <span key={i} className="text-sm flex items-center gap-2">
                      <span className="text-foreground">{h.text}</span>
                      <span className="text-xs text-primary">— {h.source}</span>
                    </span>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Search, label: "AI Search", desc: isPro ? "Unlimited" : `${4 - profile.search_count} left`, action: () => navigate("/explore"), locked: false },
              { icon: Users, label: "Community", desc: isElite ? "Elite Groups" : isPro ? "Pro Groups" : "Basic Access", action: () => {}, locked: false },
              { icon: Video, label: "Live Webinars", desc: "Expert guidance", action: () => {}, locked: !isElite },
              { icon: MessageCircle, label: "AI Mentor", desc: "Personal chatbot", action: () => {}, locked: !isElite },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={item.locked ? undefined : item.action}
                className={`glass rounded-xl p-5 space-y-2 transition-all duration-300 ${
                  item.locked ? "opacity-50" : "cursor-pointer hover:shadow-glow hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <item.icon className="w-8 h-8 text-primary" />
                  {item.locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <h3 className="font-display font-semibold">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Discover Cards */}
          {feed?.discover && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-bold">Discover What's Trending</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feed.discover.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="glass rounded-xl p-5 space-y-3 hover:border-primary/30 hover:shadow-glow transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                        {item.category}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-display font-semibold text-sm group-hover:text-gradient transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Blog Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-display font-bold">Latest from Blog</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/blog")}>
                View All →
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: "10 Zero-Investment Side Hustles for 2026", cat: "Getting Started", time: "5 min" },
                { title: "How to Price Your Freelance Services", cat: "Strategy", time: "7 min" },
                { title: "AI Tools Every Freelancer Needs", cat: "Tools", time: "6 min" },
              ].map((post, i) => (
                <div
                  key={i}
                  className="glass rounded-xl p-4 space-y-2 hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate("/blog")}
                >
                  <span className="text-[10px] text-primary">{post.cat} · {post.time} read</span>
                  <h4 className="font-display font-semibold text-sm">{post.title}</h4>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Elite Tools & Software */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Free Tools & Software</h2>
              {!isElite && <Badge variant="outline" className="text-xs">Elite Only</Badge>}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eliteTools.map((tool) => (
                <div
                  key={tool.name}
                  className={`glass rounded-xl p-4 flex items-center gap-4 transition-all ${
                    isElite ? "hover:border-primary/30" : "opacity-40"
                  }`}
                >
                  <span className="text-3xl">{tool.icon}</span>
                  <div>
                    <p className="font-display font-semibold text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.desc}</p>
                  </div>
                  {!isElite && <Lock className="w-4 h-4 text-muted-foreground ml-auto" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hacks & Methods (Elite) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-display font-bold">Hacks & Methods Library</h2>
              {!isElite && <Badge variant="outline" className="text-xs">Elite Only</Badge>}
            </div>
            <div className={`glass rounded-xl p-6 ${!isElite ? "opacity-40" : ""}`}>
              {isElite ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    "Cold Email Templates That Convert",
                    "LinkedIn Growth Hacking Playbook",
                    "Upwork Profile Optimization Guide",
                    "Pricing Strategy Calculator",
                    "Client Retention Blueprint",
                    "Portfolio Website Checklist",
                  ].map((hack) => (
                    <div key={hack} className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{hack}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Upgrade to Elite to unlock exclusive hacks & methods</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Trending */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Trending This Week</h2>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "AI Prompt Engineering — $2K-8K/mo",
                  "Short-Form Video Editing — $1K-5K/mo",
                  "Notion Template Sales — $500-3K/mo",
                  "Technical Writing — $3K-10K/mo",
                ].map((trend) => (
                  <div key={trend} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Chatbot only for Elite */}
      {isElite && <Chatbot />}
    </div>
  );
}
