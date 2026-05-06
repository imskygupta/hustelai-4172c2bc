import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NotificationPopup } from "@/components/NotificationPopup";
import { AffiliateTab } from "@/components/AffiliateTab";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";

import {
  Search, Crown, Rocket, Sparkles, Users, Video, BookOpen, TrendingUp, MessageCircle,
  Lock, ArrowUpRight, ArrowDownRight, ExternalLink, FileText, Calendar, Share2,
  Store, Target, Brain, Zap, BarChart3, Activity, History, DollarSign, Film,
  ShieldAlert, Briefcase, Loader2, Bot, Music, Hammer, KeyRound, Receipt, Clock,
  ClipboardList, FolderOpen, Wallet, AlarmClock, Globe, Kanban, Layers, Mail,
} from "lucide-react";

interface FeedData {
  headlines: { text: string; source: string }[];
  stocks: { symbol: string; price: string; change: string; up: boolean }[];
  discover: { title: string; description: string; category: string; link?: string | null }[];
}

interface Webinar {
  id: string; title: string; description: string | null; link: string | null;
  meeting_id: string | null; meeting_pass: string | null; scheduled_at: string | null;
  status: string; target_tier: string;
}

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [savedHustlesCount, setSavedHustlesCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && profile && !profile.onboarding_completed) navigate("/onboarding");
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    if (user) {
      loadFeed(); loadWebinars(); loadCommandCenterData();
    }
  }, [user]);

  const loadCommandCenterData = async () => {
    if (!user) return;
    const { count: hustleCount } = await supabase
      .from("saved_hustles").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setSavedHustlesCount(hustleCount || 0);
    const { count: msgCount } = await supabase
      .from("chat_messages").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "user");
    setChatCount(msgCount || 0);
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
      type: "chat", title: c.content.slice(0, 60) + (c.content.length > 60 ? "…" : ""), time: c.created_at,
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
          { text: "India's Gig Economy Surpasses ₹16L Cr Valuation", source: "ET" },
        ],
        stocks: [
          { symbol: "NIFTY", price: "24,580", change: "+1.2%", up: true },
          { symbol: "BTC", price: "₹81,00,000", change: "+3.4%", up: true },
          { symbol: "ETH", price: "₹3,42,000", change: "-1.1%", up: false },
        ],
        discover: [
          { title: "AI Video Editing", description: "₹4K-16K/video for AI-enhanced edits.", category: "Trending" },
          { title: "LinkedIn Ghostwriting", description: "₹40K-1.6L/month for CEOs.", category: "Writing" },
          { title: "Notion Templates", description: "Top sellers earn ₹4L+/month.", category: "Side Hustle" },
        ],
      });
    }
  };

  const loadWebinars = async () => {
    const { data } = await supabase.from("webinars").select("*").order("scheduled_at", { ascending: true });
    if (data) setWebinars(data as Webinar[]);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <SEO title="Dashboard | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const tier = profile.subscription_tier as string;
  const isInfinity = tier === "infinity";
  const isElite = tier === "elite" || isInfinity;
  const isPro = tier === "pro" || isElite;
  const isFree = tier === "free";
  const emailVerified = user!.email_confirmed_at != null;

  const searchLimits: Record<string, number> = { free: 3, pro: 5, elite: 10, infinity: 20 };
  const maxSearches = searchLimits[tier] || 3;
  const searchesLeft = Math.max(0, maxSearches - profile.search_count);

  const accessibleWebinars = webinars.filter(w => {
    if (w.target_tier === "all") return true;
    if (w.target_tier === "pro" && isPro) return true;
    if (w.target_tier === "elite" && isElite) return true;
    if (w.target_tier === "infinity" && isInfinity) return true;
    return false;
  });

  return (
    <AppShell
      title={`Welcome back, ${profile.display_name || "Hustler"}`}
      breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Dashboard" }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="border-slate-200" onClick={() => navigate("/explore")}>
            <Search className="w-4 h-4 mr-1.5" /> New search
          </Button>
          {!isInfinity && (
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/payment")}>
              <Crown className="w-4 h-4 mr-1.5" /> Upgrade
            </Button>
          )}
        </>
      }
    >
      <NotificationPopup />

      <div className="space-y-6 max-w-7xl mx-auto w-full">
        {!emailVerified && <EmailVerificationBanner email={user!.email || ""} />}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={Search} label="Searches today"
            value={`${profile.search_count} / ${maxSearches}`}
            sub={`${searchesLeft} left`} accent="emerald"
            progress={(profile.search_count / maxSearches) * 100}
          />
          <KpiCard
            icon={Sparkles} label="XP earned"
            value={profile.xp_points.toString()}
            sub="Climb the leaderboard" accent="violet"
            progress={Math.min(profile.xp_points / 10, 100)}
          />
          <KpiCard
            icon={BookOpen} label="Saved hustles"
            value={savedHustlesCount.toString()}
            sub="Tap to manage" accent="amber"
            progress={Math.min(savedHustlesCount * 10, 100)}
          />
          <KpiCard
            icon={MessageCircle} label="AI chats"
            value={chatCount.toString()}
            sub="Conversations sent" accent="sky"
            progress={Math.min(chatCount * 2, 100)}
          />
        </div>

        {/* Live ticker / market strip */}
        {feed?.stocks && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live market
              </span>
              <span className="text-[10px] text-slate-400">Updates every 15 min</span>
            </div>
            <div className="overflow-hidden h-10 relative">
              <motion.div
                className="flex items-center gap-8 h-full whitespace-nowrap px-4 absolute"
                animate={{ x: [0, -800] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              >
                {[...feed.stocks, ...feed.stocks, ...feed.stocks].map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="font-semibold text-slate-900">{s.symbol}</span>
                    <span className="text-slate-500">{s.price}</span>
                    <span className={`flex items-center ${s.up ? "text-emerald-600" : "text-rose-500"}`}>
                      {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {s.change}
                    </span>
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100/80 border border-slate-200 h-9">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-xs">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> AI Tools
            </TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-xs">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Trending
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-xs">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Usage
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Affiliate
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-5 space-y-5">
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Quick start */}
              <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-slate-900">Quick start</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Jump into your most-used workflows</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { icon: Search, label: "AI Search", path: "/explore" },
                    { icon: Hammer, label: "Work Hub", path: "/work" },
                    { icon: Rocket, label: "Blueprint", path: "/hustle-blueprint" },
                    { icon: FileText, label: "Resume AI", path: "/resume-optimizer" },
                    { icon: DollarSign, label: "Price Calc", path: "/gig-price-calculator" },
                    { icon: Film, label: "Content", path: "/faceless-content" },
                    { icon: ShieldAlert, label: "Red-Flag", path: "/red-flag-scanner" },
                    { icon: Bot, label: "HustleBot", path: "/hustlebot" },
                    { icon: Music, label: "Relax Mode", path: "/relax" },
                  ].map(q => (
                    <button
                      key={q.label}
                      onClick={() => navigate(q.path)}
                      className="group flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left"
                    >
                      <q.icon className="w-4 h-4 text-slate-500 group-hover:text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan card */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50/60 to-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wide">{tier} plan</span>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  {isInfinity ? "♾️ Unlimited everything. Create, sell, dominate." :
                   isElite ? "Full AI Mentor + premium tools." :
                   isPro ? "Pro tools unlocked. Upgrade to Elite for AI Mentor." :
                   `${searchesLeft}/${maxSearches} searches left this period.`}
                </p>
                {!isInfinity && (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                    onClick={() => navigate("/payment")}
                  >
                    Upgrade plan
                  </Button>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" /> Recent activity
                </h3>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 h-7" onClick={() => navigate("/saved-hustles")}>
                  View all
                </Button>
              </div>
              {recentActivity.length > 0 ? (
                <div className="space-y-1">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        a.type === "hustle" ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"
                      }`}>
                        {a.type === "hustle" ? <BookOpen className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 truncate">{a.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {a.type === "hustle" ? `Saved hustle · ${a.status}` : "AI chat"} · {new Date(a.time).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  No activity yet. Start by searching for a hustle 🚀
                </div>
              )}
            </div>

            {/* COCKPIT — Workspace OS modules at a glance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" /> Your cockpit
                </h3>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 h-7" onClick={() => navigate("/workspaces")}>
                  Open Workspace OS <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mb-4">Every module that powers your freelance business — one cockpit, no tab-hunting.</p>

              <div className="grid md:grid-cols-3 gap-4">
                <CockpitGroup
                  title="Client OS"
                  desc="CRM, pipelines & retainers"
                  accent="emerald"
                  tools={[
                    { icon: Users, label: "Clients (CRM)", path: "/work/clients" },
                    { icon: Kanban, label: "Pipeline", path: "/workspaces/pipeline" },
                    { icon: Layers, label: "Retainers", path: "/workspaces" },
                    { icon: Mail, label: "Comm Log", path: "/work/comm" },
                  ]}
                />
                <CockpitGroup
                  title="Money OS"
                  desc="Invoices, time & revenue"
                  accent="amber"
                  tools={[
                    { icon: Receipt, label: "Invoices", path: "/work/invoices" },
                    { icon: Clock, label: "Time Tracker", path: "/work/time" },
                    { icon: Wallet, label: "Expenses", path: "/work/expenses" },
                    { icon: BarChart3, label: "Revenue", path: "/workspaces/revenue" },
                  ]}
                />
                <CockpitGroup
                  title="Delivery OS"
                  desc="Projects, files & portals"
                  accent="violet"
                  tools={[
                    { icon: ClipboardList, label: "Checklists", path: "/work/checklists" },
                    { icon: FolderOpen, label: "Files", path: "/work/files" },
                    { icon: AlarmClock, label: "Deadlines", path: "/work/deadlines" },
                    { icon: Globe, label: "Client Portals", path: "/work/portals" },
                  ]}
                />
              </div>

              {/* AI Fuel band */}
              <div className="mt-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/40 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Add AI fuel to your cockpit</p>
                    <p className="text-xs text-slate-500 truncate">
                      Connect Gemini, OpenAI or your own key — power proposals, replies & doc intelligence across every module.
                    </p>
                  </div>
                </div>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0" onClick={() => navigate("/workspaces/ai-settings")}>
                  Connect AI
                </Button>
              </div>
            </div>

            {/* Webinars */}
            {accessibleWebinars.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2 mb-4">
                  <Video className="w-4 h-4 text-emerald-600" /> Live webinars
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {accessibleWebinars.slice(0, 4).map(w => (
                    <div key={w.id} className="rounded-lg border border-slate-200 p-4 hover:border-emerald-300 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={w.status === "live" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"} variant="outline">
                          {w.status === "live" ? "🔴 LIVE" : w.status}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-1">{w.title}</h4>
                      {w.description && <p className="text-xs text-slate-500 mb-2">{w.description}</p>}
                      {w.scheduled_at && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                          <Calendar className="w-3 h-3" /> {new Date(w.scheduled_at).toLocaleString()}
                        </p>
                      )}
                      {w.link && (
                        <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => window.open(w.link!, "_blank")}>
                          <ExternalLink className="w-3 h-3 mr-1" /> Join
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* AI TOOLS */}
          <TabsContent value="tools" className="mt-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Search, label: "AI Hustle Search", desc: "Discover hustles with AI", action: () => navigate("/explore"), tier: "free", emoji: "🔍" },
                { icon: Hammer, label: "Work — Freelancer OS", desc: "Invoices, time, clients, deadlines", action: () => navigate("/work"), tier: "free", emoji: "🛠️" },
                { icon: Rocket, label: "Blueprint Generator", desc: "7-day action plan", action: () => navigate("/hustle-blueprint"), tier: "free", emoji: "🚀" },
                { icon: FileText, label: "Resume Optimizer", desc: "Tailored CV + portfolio", action: () => navigate("/resume-optimizer"), tier: "free", emoji: "📄" },
                { icon: DollarSign, label: "Gig Price Calc", desc: "3-tier anchor pricing", action: () => navigate("/gig-price-calculator"), tier: "free", emoji: "💰" },
                { icon: Film, label: "Faceless Content", desc: "6-scene viral storyboards", action: () => navigate("/faceless-content"), tier: "free", emoji: "🎬" },
                { icon: ShieldAlert, label: "Red-Flag Scanner", desc: "Spot bad clients early", action: () => navigate("/red-flag-scanner"), tier: "free", emoji: "🚦" },
                { icon: FileText, label: "Proposal Draft AI", desc: "Win freelance gigs", action: () => navigate("/proposal-draft"), tier: "pro", emoji: "📝" },
                { icon: Brain, label: "Skill Gap Analyzer", desc: "Personal learning roadmap", action: () => navigate("/skill-gap"), tier: "pro", emoji: "🧠" },
                { icon: Zap, label: "AI Tool Benchmarks", desc: "Compare AI tools side-by-side", action: () => navigate("/ai-tools"), tier: "pro", emoji: "⚡" },
                { icon: TrendingUp, label: "Gig Arbitrage", desc: "Find platform price gaps", action: () => navigate("/gig-arbitrage"), tier: "pro", emoji: "📊" },
                { icon: BookOpen, label: "Knowledge Hub", desc: "Save & automate prompts", action: () => navigate("/knowledge-hub"), tier: "pro", emoji: "📚" },
                { icon: Briefcase, label: "🎯 Sure-Hit Jobs", desc: "Personal QC referral", action: () => navigate("/sure-hit-jobs"), tier: "pro", emoji: "🎯" },
                { icon: Target, label: "Lead Finder", desc: "Social-media radar", action: () => navigate("/problem-leads"), tier: "elite", emoji: "🎯" },
                { icon: Store, label: "Marketplace", desc: "Sell digital products", action: () => navigate("/marketplace"), tier: "elite", emoji: "🏪" },
              ].map(tool => {
                const locked = (tool.tier === "pro" && isFree) || (tool.tier === "elite" && !isElite);
                return (
                  <button
                    key={tool.label}
                    onClick={locked ? undefined : tool.action}
                    disabled={locked}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      locked
                        ? "border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{tool.emoji}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] py-0 ${
                          tool.tier === "free" ? "border-slate-200 text-slate-500" :
                          tool.tier === "pro" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                          "border-violet-200 text-violet-700 bg-violet-50"
                        }`}>
                          {tool.tier === "free" ? "FREE" : tool.tier === "pro" ? "PRO" : "ELITE"}
                        </Badge>
                        {locked && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 mb-0.5">{tool.label}</h3>
                    <p className="text-xs text-slate-500">{tool.desc}</p>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* TRENDING */}
          <TabsContent value="trending" className="mt-5 space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(feed?.discover || []).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-300 transition-all cursor-pointer"
                  onClick={() => item.link && window.open(item.link, "_blank")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{item.category}</span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* USAGE */}
          <TabsContent value="usage" className="mt-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Monthly usage
              </h3>
              <div className="space-y-4">
                {[
                  { label: "AI Searches", used: profile.search_count, max: maxSearches * 30 },
                  { label: "AI Chat Messages", used: chatCount, max: isPro ? 500 : isFree ? 50 : 1000 },
                  { label: "Proposal Drafts", used: Math.floor(chatCount / 3), max: isPro ? 30 : isFree ? 5 : 100 },
                  ...(isElite ? [{ label: "Lead Scans", used: Math.floor(chatCount / 5), max: 50 }] : []),
                ].map(item => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="font-mono text-xs text-slate-500">{item.used} / {item.max}</span>
                    </div>
                    <Progress value={Math.min((item.used / item.max) * 100, 100)} className="h-1.5 bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* AFFILIATE */}
          <TabsContent value="affiliate" className="mt-5">
            <AffiliateTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, accent, progress,
}: {
  icon: any; label: string; value: string; sub: string;
  accent: "emerald" | "violet" | "amber" | "sky"; progress: number;
}) {
  const map = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-500" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", bar: "bg-violet-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-500" },
    sky: { bg: "bg-sky-50", text: "text-sky-600", bar: "bg-sky-500" },
  }[accent];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${map.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${map.text}`} />
        </div>
        <span className="text-2xl font-display font-bold text-slate-900">{value}</span>
      </div>
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <p className="text-[10px] text-slate-400 mb-2">{sub}</p>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${map.bar}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
    </div>
  );
}

function CockpitGroup({
  title, desc, accent, tools,
}: {
  title: string; desc: string;
  accent: "emerald" | "amber" | "violet";
  tools: { icon: any; label: string; path: string }[];
}) {
  const map = {
    emerald: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", hover: "hover:border-emerald-300 hover:bg-emerald-50/40" },
    amber:   { dot: "bg-amber-500",   chip: "bg-amber-50 text-amber-700",     hover: "hover:border-amber-300 hover:bg-amber-50/40" },
    violet:  { dot: "bg-violet-500",  chip: "bg-violet-50 text-violet-700",   hover: "hover:border-violet-300 hover:bg-violet-50/40" },
  }[accent];
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">{desc}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {tools.map(t => (
          <button key={t.label} onClick={() => navigate(t.path)}
            className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-slate-200 bg-white text-left transition-all ${map.hover}`}>
            <t.icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-medium text-slate-700 truncate">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}