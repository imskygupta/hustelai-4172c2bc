import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Chatbot } from "@/components/Chatbot";
import { NotificationPopup } from "@/components/NotificationPopup";
import { AffiliateTab } from "@/components/AffiliateTab";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Crown, Rocket, Sparkles, Star, Users, Video, Wrench,
  BookOpen, TrendingUp, MessageCircle, Gift, Lock,
  Newspaper, ArrowUpRight, ArrowDownRight, ExternalLink, User, FileText,
  UserCheck, Clock, Calendar, Share2, Store, Target, Brain, Zap,
  BarChart3, Activity, Eye, History
} from "lucide-react";

interface FeedData {
  headlines: { text: string; source: string }[];
  stocks: { symbol: string; price: string; change: string; up: boolean }[];
  discover: { title: string; description: string; category: string; link?: string | null }[];
}

interface TrendingLink {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  link: string | null;
  sort_order: number;
}

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  meeting_id: string | null;
  meeting_pass: string | null;
  scheduled_at: string | null;
  status: string;
  target_tier: string;
}

interface ExpertAssignment {
  id: string;
  expert_name: string;
  topic: string;
  description: string | null;
  status: string;
  meeting_link: string | null;
  scheduled_at: string | null;
  notes: string | null;
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
  const [searchParams] = useSearchParams();
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [expertAssignments, setExpertAssignments] = useState<ExpertAssignment[]>([]);
  const [trendingLinks, setTrendingLinks] = useState<TrendingLink[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "affiliate" | "command">(
    searchParams.get("tab") === "affiliate" ? "affiliate" : searchParams.get("tab") === "command" ? "command" : "dashboard"
  );
  const [savedHustlesCount, setSavedHustlesCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user]);

  useEffect(() => {
    if (user) {
      loadFeed();
      loadWebinars();
      loadExpertAssignments();
      loadTrendingLinks();
      loadCommandCenterData();
    }
  }, [user]);

  const loadCommandCenterData = async () => {
    if (!user) return;
    // Saved hustles count
    const { count: hustleCount } = await supabase
      .from("saved_hustles").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setSavedHustlesCount(hustleCount || 0);

    // Chat messages count (as proxy for AI usage)
    const { count: msgCount } = await supabase
      .from("chat_messages").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "user");
    setChatCount(msgCount || 0);

    // Recent activity - combine saved hustles + chat messages
    const { data: recentHustles } = await supabase
      .from("saved_hustles").select("*, side_hustles(title)")
      .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5);
    const { data: recentChats } = await supabase
      .from("chat_messages").select("content, created_at")
      .eq("user_id", user.id).eq("role", "user").order("created_at", { ascending: false }).limit(5);

    const activities: any[] = [];
    (recentHustles || []).forEach((h: any) => activities.push({
      type: "hustle", title: h.side_hustles?.title || "Saved Hustle", time: h.updated_at, status: h.status,
    }));
    (recentChats || []).forEach((c: any) => activities.push({
      type: "chat", title: c.content.slice(0, 60) + (c.content.length > 60 ? "..." : ""), time: c.created_at,
    }));
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRecentActivity(activities.slice(0, 8));
  };

  const loadFeed = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("dashboard-feed");
      if (error) throw error;
      setFeed(data);
    } catch {
      setFeed({
        headlines: [
          { text: "AI Freelancing Market Grows 340% in 2026", source: "TechCrunch" },
          { text: "Remote Work Now Default for 67% of Tech Companies", source: "Forbes" },
          { text: "India's Gig Economy Surpasses ₹16L Cr Valuation", source: "Economic Times" },
          { text: "New Study: Freelancers Earn 40% More Than Full-Time Peers", source: "Bloomberg" },
        ],
        stocks: [
          { symbol: "NIFTY", price: "24,580", change: "+1.2%", up: true },
          { symbol: "SENSEX", price: "81,234", change: "+0.8%", up: true },
          { symbol: "BTC", price: "₹81,00,000", change: "+3.4%", up: true },
          { symbol: "ETH", price: "₹3,42,000", change: "-1.1%", up: false },
        ],
        discover: [
          { title: "AI Video Editing is Booming", description: "Companies pay ₹4K-16K/video for AI-enhanced edits.", category: "Trending" },
          { title: "Notion Templates Market", description: "Sell productivity templates. Top sellers make ₹4L+/month.", category: "Side Hustle" },
          { title: "LinkedIn Ghostwriting", description: "CEOs pay ₹40K-1.6L/month for LinkedIn content.", category: "Writing" },
          { title: "Micro-SaaS Opportunities", description: "Build tiny software tools with no-code. MRR potential.", category: "Tech" },
          { title: "UGC Content Creation", description: "Brands pay ₹12K-40K per short video. No followers needed.", category: "Creative" },
          { title: "AI Chatbot Development", description: "Businesses need custom chatbots. Charge ₹80K-4L per project.", category: "Tech" },
        ],
      });
    } finally {
      setFeedLoading(false);
    }
  };

  const loadWebinars = async () => {
    const { data } = await supabase.from("webinars").select("*").order("scheduled_at", { ascending: true });
    if (data) setWebinars(data as Webinar[]);
  };

  const loadExpertAssignments = async () => {
    const { data } = await supabase.from("expert_assignments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setExpertAssignments(data as ExpertAssignment[]);
  };

  const loadTrendingLinks = async () => {
    const { data } = await supabase
      .from("trending_links")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (data) setTrendingLinks(data as TrendingLink[]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const tier = profile.subscription_tier as string;
  const isInfinity = tier === "infinity";
  const isElite = tier === "elite" || isInfinity;
  const isPro = tier === "pro" || isElite;
  const isFree = tier === "free";
  const emailVerified = user.email_confirmed_at != null;

  // Search credit limits per tier
  const searchLimits: Record<string, number> = { free: 3, pro: 5, elite: 10, infinity: 20 };
  const maxSearches = searchLimits[tier] || 3;
  const searchesLeft = Math.max(0, maxSearches - profile.search_count);

  // Filter webinars by tier access
  const accessibleWebinars = webinars.filter(w => {
    if (w.target_tier === "all") return true;
    if (w.target_tier === "pro" && isPro) return true;
    if (w.target_tier === "elite" && isElite) return true;
    if (w.target_tier === "infinity" && isInfinity) return true;
    return false;
  });

  const TierBadge = () => (
    <Badge className={`${
      isInfinity ? "bg-yellow-500 text-black" :
      isElite ? "bg-gradient-accent text-accent-foreground" :
      isPro ? "bg-gradient-primary text-primary-foreground" :
      "bg-secondary text-secondary-foreground"
    }`}>
      {isInfinity ? <Star className="w-3 h-3 mr-1" /> : isElite ? <Crown className="w-3 h-3 mr-1" /> : isPro ? <Rocket className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <NotificationPopup />

      {/* Stock Ticker */}
      {feed?.stocks && (
        <div className="fixed top-16 w-full z-40 bg-card/90 backdrop-blur-sm border-b border-border/50 overflow-hidden h-8">
          <motion.div className="flex items-center gap-8 h-full whitespace-nowrap"
            animate={{ x: [0, -1200] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
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
          {/* Email Verification Banner */}
          {!emailVerified && <EmailVerificationBanner email={user.email || ""} />}

          {/* Welcome */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold">Welcome, {profile.display_name || "Hustler"}!</h1>
                <TierBadge />
              </div>
              <p className="text-muted-foreground text-sm">
                {isInfinity ? "♾️ Unlimited access. Create, sell, and dominate." :
                 isElite ? "Full access to AI Mentor, tools & webinars." :
                 isPro ? "Upgrade to Elite for AI Mentor & exclusive tools." :
                 `${searchesLeft}/${maxSearches} searches left today. Upgrade for more.`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => navigate("/profile")}><User className="w-4 h-4 mr-1" /> Profile</Button>
              {!isInfinity && <Button className="bg-gradient-primary text-primary-foreground" size="sm" onClick={() => navigate("/#pricing")}>Upgrade</Button>}
            </div>
          </motion.div>

          {/* Tab Switcher */}
          <div className="flex gap-2 border-b border-border/50 pb-2 overflow-x-auto">
            <Button variant={activeTab === "dashboard" ? "default" : "ghost"} size="sm"
              onClick={() => setActiveTab("dashboard")}>
              <Search className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <Button variant={activeTab === "command" ? "default" : "ghost"} size="sm"
              onClick={() => setActiveTab("command")}>
              <Activity className="w-4 h-4 mr-1" /> Command Center
            </Button>
            <Button variant={activeTab === "affiliate" ? "default" : "ghost"} size="sm"
              onClick={() => setActiveTab("affiliate")}>
              <Share2 className="w-4 h-4 mr-1" /> Affiliate
            </Button>
            {(tier === "pro" || tier === "elite" || tier === "infinity") && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/proposal-draft")}>
                  <FileText className="w-4 h-4 mr-1" /> Proposal AI
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/skill-gap")}>
                  <Brain className="w-4 h-4 mr-1" /> Skill Gap
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/ai-tools")}>
                  <Zap className="w-4 h-4 mr-1" /> AI Tools
                </Button>
              </>
            )}
            {(tier === "elite" || tier === "infinity") && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/marketplace")}>
                  <Store className="w-4 h-4 mr-1" /> Marketplace
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/problem-leads")}>
                  <Target className="w-4 h-4 mr-1" /> Lead Finder
                </Button>
              </>
            )}
          </div>

          {activeTab === "affiliate" ? (
            <AffiliateTab />
          ) : activeTab === "command" ? (
            /* ====== COMMAND CENTER TAB ====== */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Usage Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Search, label: "Searches Today", value: `${profile.search_count}/${maxSearches}`, pct: (profile.search_count / maxSearches) * 100, color: "text-primary" },
                  { icon: MessageCircle, label: "AI Chats Sent", value: chatCount.toString(), pct: Math.min(chatCount * 2, 100), color: "text-accent" },
                  { icon: BookOpen, label: "Saved Hustles", value: savedHustlesCount.toString(), pct: Math.min(savedHustlesCount * 10, 100), color: "text-primary" },
                  { icon: Star, label: "XP Points", value: profile.xp_points.toString(), pct: Math.min(profile.xp_points / 10, 100), color: "text-yellow-500" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }} className="glass rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <span className="font-display font-bold text-lg">{stat.value}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    <Progress value={stat.pct} className="h-1" />
                  </motion.div>
                ))}
              </div>

              {/* Tier Usage Breakdown */}
              <div className="glass rounded-xl p-5 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Monthly Usage
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "AI Searches", used: profile.search_count, max: maxSearches * 30, desc: "searches this month" },
                    { label: "AI Chat Messages", used: chatCount, max: isPro ? 500 : isFree ? 50 : 1000, desc: "messages sent" },
                    { label: "Proposal Drafts", used: Math.floor(chatCount / 3), max: isPro ? 30 : isFree ? 5 : 100, desc: "proposals generated" },
                    ...(isElite ? [{ label: "Lead Scans", used: Math.floor(chatCount / 5), max: 50, desc: "leads discovered" }] : []),
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono text-xs">{item.used} / {item.max} {item.desc}</span>
                      </div>
                      <Progress value={Math.min((item.used / item.max) * 100, 100)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: FileText, label: "New Proposal", action: () => navigate("/proposal-draft"), locked: isFree },
                  { icon: Brain, label: "Skill Analysis", action: () => navigate("/skill-gap"), locked: isFree },
                  { icon: Target, label: "Find Leads", action: () => navigate("/problem-leads"), locked: !isElite },
                  { icon: Zap, label: "AI Tools", action: () => navigate("/ai-tools"), locked: isFree },
                ].map(item => (
                  <Button key={item.label} variant="outline" className={`h-auto py-3 flex flex-col gap-1 ${item.locked ? "opacity-40" : ""}`}
                    onClick={item.locked ? undefined : item.action} disabled={item.locked}>
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="text-xs">{item.label}</span>
                    {item.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </Button>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="glass rounded-xl p-5 space-y-3">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" /> Recent Activity
                </h3>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          a.type === "hustle" ? "bg-primary/10" : "bg-accent/10"
                        }`}>
                          {a.type === "hustle" ? <BookOpen className="w-4 h-4 text-primary" /> : <MessageCircle className="w-4 h-4 text-accent" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {a.type === "hustle" ? `Hustle · ${a.status}` : "AI Chat"} · {new Date(a.time).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity yet. Start exploring! 🚀</p>
                )}
              </div>

              {/* Saved Hustles Quick View */}
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" /> Your Hustles
                </h3>
                <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/saved-hustles")}>
                  View All →
                </Button>
              </div>
            </motion.div>
          ) : (
          <>
          {/* News Headlines */}
          {feed?.headlines && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
                <Newspaper className="w-4 h-4 text-primary" />
                <span className="font-display font-semibold text-sm">Breaking News</span>
                <span className="ml-auto text-[10px] text-destructive animate-pulse">● LIVE</span>
              </div>
              <div className="overflow-hidden h-10">
                <motion.div className="flex items-center gap-12 h-full whitespace-nowrap px-4"
                  animate={{ x: [0, -2000] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: Search, label: "AI Search", desc: `${searchesLeft}/${maxSearches} left`, action: () => navigate("/explore"), locked: false },
              { icon: Users, label: "Community", desc: isPro ? "Forums Open" : "Limited", action: () => navigate("/community"), locked: false },
              { icon: User, label: "My Profile", desc: "Edit & resume", action: () => navigate("/profile"), locked: false },
              { icon: Video, label: "Live Webinars", desc: `${accessibleWebinars.length} available`, action: () => document.getElementById("webinars-section")?.scrollIntoView({ behavior: "smooth" }), locked: !isPro },
              { icon: MessageCircle, label: "HustleBot", desc: "AI Mentor", action: () => {}, locked: !isElite },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                onClick={item.locked ? undefined : item.action}
                className={`glass rounded-xl p-4 space-y-2 transition-all duration-300 ${item.locked ? "opacity-40 blur-[0.5px]" : "cursor-pointer hover:shadow-glow hover:border-primary/30"}`}>
                <div className="flex items-center justify-between">
                  <item.icon className="w-7 h-7 text-primary" />
                  {item.locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <h3 className="font-display font-semibold text-sm">{item.label}</h3>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* AI-Powered Tools & Features */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">AI-Powered Tools</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Search, label: "AI Hustle Search", desc: "Discover side hustles with AI-powered search", action: () => navigate("/explore"), minTier: "free", emoji: "🔍" },
                { icon: Zap, label: "AI Tool Benchmarks", desc: "Compare AI tools like Cursor, Copilot & ChatGPT side-by-side", action: () => navigate("/ai-tools"), minTier: "pro", emoji: "⚡" },
                { icon: FileText, label: "Proposal Draft AI", desc: "Generate winning freelance proposals with AI", action: () => navigate("/proposal-draft"), minTier: "pro", emoji: "📝" },
                { icon: Brain, label: "Skill Gap Analyzer", desc: "Get a personalized learning roadmap for high-paying niches", action: () => navigate("/skill-gap"), minTier: "pro", emoji: "🧠" },
                { icon: Target, label: "Problem Lead Finder", desc: "AI-powered radar for freelance opportunities from social media", action: () => navigate("/problem-leads"), minTier: "elite", emoji: "🎯" },
                { icon: BookOpen, label: "Knowledge Hub", desc: "Save prompts, export chats, organize knowledge & automate workflows", action: () => navigate("/knowledge-hub"), minTier: "pro", emoji: "📚" },
                { icon: Store, label: "Marketplace", desc: "Sell templates, tools & digital products to the community", action: () => navigate("/marketplace"), minTier: "elite", emoji: "🏪" },
              ].map((tool, i) => {
                const locked = (tool.minTier === "pro" && isFree) ||
                               (tool.minTier === "elite" && !isElite);
                return (
                  <motion.div key={tool.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    onClick={locked ? undefined : tool.action}
                    className={`glass rounded-xl p-5 space-y-3 transition-all duration-300 group ${locked ? "opacity-50 blur-[0.5px]" : "cursor-pointer hover:shadow-glow hover:border-primary/30"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{tool.emoji}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {tool.minTier === "free" ? "All Tiers" : tool.minTier === "pro" ? "Pro+" : "Elite+"}
                        </Badge>
                        {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>
                    <h3 className="font-display font-semibold text-sm group-hover:text-primary transition-colors">{tool.label}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                  </motion.div>
                );
              })}
            </div>
            {isFree && (
              <div className="text-center">
                <Button className="bg-gradient-primary text-primary-foreground" size="sm" onClick={() => navigate("/#pricing")}>
                  <Lock className="w-4 h-4 mr-1" /> Upgrade to Unlock AI Tools
                </Button>
              </div>
            )}
          </motion.div>

          {/* Live Webinars */}
          <motion.div id="webinars-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Live Webinars</h2>
              {!isPro && <Badge variant="outline" className="text-xs">Pro+ Only</Badge>}
            </div>
            <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-4 ${!isPro ? "blur-sm pointer-events-none" : ""}`}>
              {accessibleWebinars.length > 0 ? accessibleWebinars.map(w => (
                <div key={w.id} className="glass rounded-xl p-5 space-y-3 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2">
                    <Badge className={w.status === "live" ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary/20 text-primary"} variant="outline">
                      {w.status === "live" ? "🔴 LIVE" : w.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{w.target_tier}</Badge>
                  </div>
                  <h3 className="font-display font-semibold text-sm">{w.title}</h3>
                  {w.description && <p className="text-xs text-muted-foreground">{w.description}</p>}
                  {w.scheduled_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(w.scheduled_at).toLocaleString()}
                    </p>
                  )}
                  {w.link && (
                    <Button size="sm" variant="outline" className="text-primary" onClick={() => window.open(w.link!, "_blank")}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Join
                    </Button>
                  )}
                  {w.meeting_id && <p className="text-[10px] text-muted-foreground">ID: {w.meeting_id} {w.meeting_pass && `| Pass: ${w.meeting_pass}`}</p>}
                </div>
              )) : (
                <div className="glass rounded-xl p-5 col-span-full text-center text-sm text-muted-foreground">
                  No upcoming webinars. Stay tuned! 🎥
                </div>
              )}
            </div>
            {!isPro && (
              <div className="text-center -mt-16 relative z-10">
                <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/#pricing")}>
                  <Lock className="w-4 h-4 mr-1" /> Upgrade to Pro
                </Button>
              </div>
            )}
          </motion.div>

          {/* Expert Guidance */}
          {isElite && expertAssignments.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-display font-bold">Expert Guidance</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {expertAssignments.map(e => (
                  <div key={e.id} className="glass rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
                    </div>
                    <h3 className="font-display font-semibold text-sm">{e.topic}</h3>
                    <p className="text-xs text-muted-foreground">Expert: {e.expert_name}</p>
                    {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                    {e.scheduled_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(e.scheduled_at).toLocaleString()}
                      </p>
                    )}
                    {e.meeting_link && (
                      <Button size="sm" variant="outline" onClick={() => window.open(e.meeting_link!, "_blank")}>
                        <ExternalLink className="w-3 h-3 mr-1" /> Join Session
                      </Button>
                    )}
                    {e.notes && <p className="text-xs text-muted-foreground italic">"{e.notes}"</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Discover Cards - from DB trending_links */}
          {(trendingLinks.length > 0 || feed?.discover) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-bold">Discover What's Trending</h2>
              </div>
              <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-4 ${isFree ? "blur-sm pointer-events-none" : ""}`}>
                {(trendingLinks.length > 0 ? trendingLinks : (feed?.discover || [])).map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                    onClick={() => { if ('link' in item && item.link) window.open(item.link, "_blank"); }}
                    className={`glass rounded-xl p-5 space-y-3 hover:border-primary/30 hover:shadow-glow transition-all duration-300 group ${('link' in item && item.link) ? "cursor-pointer" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{item.category}</span>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-display font-semibold text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </motion.div>
                ))}
              </div>
              {isFree && (
                <div className="text-center -mt-20 relative z-10">
                  <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/#pricing")}>
                    <Lock className="w-4 h-4 mr-1" /> Upgrade to Unlock
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Blog Section */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-display font-bold">Latest from Blog</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/blog")}>View All →</Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: "10 Zero-Investment Side Hustles for 2026", cat: "Getting Started", time: "5 min" },
                { title: "How to Price Your Freelance Services", cat: "Strategy", time: "7 min" },
                { title: "AI Tools Every Freelancer Needs", cat: "Tools", time: "6 min" },
              ].map((post, i) => (
                <div key={i} className="glass rounded-xl p-4 space-y-2 hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate("/blog")}>
                  <span className="text-[10px] text-primary">{post.cat} · {post.time} read</span>
                  <h4 className="font-display font-semibold text-sm">{post.title}</h4>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Elite Tools */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Free Tools & Software</h2>
              {!isElite && <Badge variant="outline" className="text-xs">Elite Only</Badge>}
            </div>
            <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-4 ${!isElite ? "blur-sm" : ""}`}>
              {eliteTools.map((tool) => (
                <div key={tool.name} className={`glass rounded-xl p-4 flex items-center gap-4 transition-all ${isElite ? "hover:border-primary/30" : ""}`}>
                  <span className="text-3xl">{tool.icon}</span>
                  <div>
                    <p className="font-display font-semibold text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {!isElite && (
              <div className="text-center -mt-16 relative z-10">
                <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/#pricing")}>
                  <Lock className="w-4 h-4 mr-1" /> Upgrade to Elite
                </Button>
              </div>
            )}
          </motion.div>

          {/* Hacks & Methods */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-display font-bold">Hacks & Methods Library</h2>
              {!isElite && <Badge variant="outline" className="text-xs">Elite Only</Badge>}
            </div>
            <div className={`glass rounded-xl p-6 ${!isElite ? "blur-sm" : ""}`}>
              <div className="grid md:grid-cols-2 gap-4">
                {["Cold Email Templates That Convert", "LinkedIn Growth Hacking Playbook", "Upwork Profile Optimization Guide",
                  "Pricing Strategy Calculator", "Client Retention Blueprint", "Portfolio Website Checklist",
                ].map((hack) => (
                  <div key={hack} className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{hack}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Infinity Section */}
          {isInfinity && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="text-xl font-display font-bold">Infinity Zone</h2>
                <Badge className="bg-yellow-500 text-black text-xs">♾️</Badge>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: "🎓", title: "Create Courses", desc: "Build and sell courses to the community", tab: "courses" },
                  { icon: "🏪", title: "Sell Tools", desc: "List your tools & templates in the marketplace", tab: "marketplace" },
                  { icon: "👥", title: "Build Communities", desc: "Create and manage your own groups", tab: "communities" },
                ].map((item) => (
                  <div key={item.title} onClick={() => navigate(`/infinity-zone?tab=${item.tab}`)}
                    className="glass rounded-xl p-5 space-y-2 border-yellow-500/20 hover:border-yellow-500/40 hover:shadow-glow transition-all cursor-pointer group">
                    <span className="text-3xl">{item.icon}</span>
                    <h3 className="font-display font-semibold group-hover:text-yellow-500 transition-colors">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Trending */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Trending This Week</h2>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {["AI Prompt Engineering — ₹1.6L-6.5L/mo", "Short-Form Video Editing — ₹80K-4L/mo",
                  "Notion Template Sales — ₹40K-2.4L/mo", "Technical Writing — ₹2.4L-8L/mo",
                ].map((trend) => (
                  <div key={trend} className="flex items-center gap-2 text-sm">
                    <ArrowUpRight className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          </>
          )}
        </div>
      </div>

      {isElite && <Chatbot />}
    </div>
  );
}
