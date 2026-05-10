import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NotificationPopup } from "@/components/NotificationPopup";
import { AffiliateTab } from "@/components/AffiliateTab";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { DailyUsageWidget } from "@/components/dashboard/DailyUsageWidget";
import { OperationalUsageWidget } from "@/components/dashboard/OperationalUsageWidget";
import { UnlockBalanceWidget } from "@/components/dashboard/UnlockBalanceWidget";
import { ActivityCard } from "@/components/async/ActivityCard";
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
  Calculator, UserCircle2, CalendarRange, Timer, IdCard,
} from "lucide-react";
import { Link } from "react-router-dom";

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

        {/* Operational Brain — featured module */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 sm:p-6">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-violet-200/50 to-fuchsia-200/40 blur-2xl pointer-events-none" />
          <div className="relative grid lg:grid-cols-3 gap-5 items-center">
            <div className="lg:col-span-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-violet-700 bg-violet-100 rounded-full px-2.5 py-0.5">
                <Brain className="w-3 h-3" /> Operational Brain
              </span>
              <h2 className="font-display font-semibold text-xl sm:text-2xl text-slate-900 mt-2">AI Roadmap Engine</h2>
              <p className="text-sm text-slate-600 mt-1 max-w-xl">
                Describe a client, project or service. The engine classifies it with lightweight AI and generates workflows, recommended tools, suggested documents and next actions instantly.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => navigate("/workspaces/roadmap")}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate workflow
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/workspaces/new")}>
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Start new client system
                </Button>
                <Button size="sm" variant="ghost" className="text-slate-700" onClick={() => navigate("/workspaces/roadmap")}>
                  <Target className="w-3.5 h-3.5 mr-1.5" /> Analyze project
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex flex-col gap-1.5">
              {[
                { label: "Classify brief", color: "bg-emerald-500" },
                { label: "Generate phases", color: "bg-violet-500" },
                { label: "Suggest tools", color: "bg-sky-500" },
                { label: "Draft docs", color: "bg-amber-500" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-xs text-slate-700 bg-white/70 backdrop-blur rounded-lg border border-slate-200 px-3 py-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Popular Operational Tools */}
        <BrightToolGrid
          title="Popular operational tools"
          subtitle="Built for freelancers — start faster with the systems clients pay for"
          rightSlot={<Link to="/operations" className="text-xs text-violet-700 hover:underline inline-flex items-center gap-1">Tour the OS <ArrowUpRight className="w-3 h-3" /></Link>}
          userTier={(profile?.subscription_tier as any) || "free"}
          tools={[
            { icon: FileText,      label: "Proposal Generator",  desc: "AI-drafted client pitches",         path: "/proposal-draft",                        color: "from-emerald-500 to-teal-500" },
            { icon: ClipboardList, label: "Scope Document",      desc: "Deliverables & milestones doc",     path: "/workspaces?intent=quotation",           color: "from-violet-500 to-fuchsia-500", minTier: "pro" },
            { icon: Users,         label: "Smart Client Intake", desc: "Branded onboarding questionnaires", path: "/workspaces/intake",                     color: "from-sky-500 to-indigo-500" },
            { icon: Layers,        label: "Service Offer Cards", desc: "Premium shareable service decks",   path: "/workspaces?intent=service_card",        color: "from-amber-500 to-orange-500", minTier: "pro" },
          ]}
          onNavigate={navigate}
        />

        {/* Document Studio — actual generators */}
        <BrightToolGrid
          title="Document Studio"
          subtitle="Generate every client-facing document — branded, themed, PDF-ready"
          cols={5}
          userTier={(profile?.subscription_tier as any) || "free"}
          tools={[
            { icon: FileText,      label: "Proposal",       desc: "Win the project",          path: "/dashboard/tools/proposal-generator", color: "from-emerald-500 to-teal-500" },
            { icon: Receipt,       label: "Invoice",        desc: "Get paid on time",         path: "/dashboard/tools/invoice-generator",  color: "from-amber-500 to-orange-500" },
            { icon: ClipboardList, label: "Quotation",      desc: "Premium project quotes",   path: "/workspaces?intent=quotation",        color: "from-violet-500 to-fuchsia-500", note: "Needs workspace AI intake" },
            { icon: ShieldAlert,   label: "Agreement",      desc: "Protect engagements",      path: "/dashboard/tools/contract-generator", color: "from-rose-500 to-red-500" },
            { icon: Layers,        label: "Service Card",   desc: "Shareable offer deck",     path: "/workspaces?intent=service_card",     color: "from-sky-500 to-indigo-500", minTier: "pro", note: "Needs workspace AI intake" },
            { icon: Sparkles,      label: "Business Card",  desc: "Modern brand identity",    path: "/dashboard/tools/business-card",      color: "from-fuchsia-500 to-pink-500" },
          ]}
          onNavigate={navigate}
        />

        {/* Document Infrastructure — the reusable foundation (not generators) */}
        <BrightToolGrid
          title="Document Infrastructure"
          subtitle="Foundation pieces reused across every generated document — set up once, drop in anywhere"
          userTier={(profile?.subscription_tier as any) || "free"}
          tools={[
            { icon: Sparkles,      label: "Brand Kit",        desc: "Logo, colors & fonts shared by every doc", path: "/workspaces/brand-kit", color: "from-fuchsia-500 to-pink-500", minTier: "pro" },
            { icon: Users,         label: "Client Profiles",  desc: "Reusable client records (auto-fill docs)", path: "/workspaces/clients",   color: "from-sky-500 to-blue-500" },
            { icon: Layers,        label: "Snippet Library",  desc: "Reusable text blocks (terms, scope, FAQs)", path: "/workspaces/blocks",   color: "from-slate-500 to-slate-700", minTier: "pro" },
            { icon: ClipboardList, label: "Intake OS",        desc: "Branded client intake forms",              path: "/workspaces/intake",   color: "from-emerald-500 to-teal-500" },
          ]}
          onNavigate={navigate}
        />

        {/* Free Doc Tools — the public /tools/* family, surfaced to logged-in users.
            All available on every plan with the standard 3-uses-per-month free cap. */}
        <BrightToolGrid
          title="Free doc tools"
          subtitle="One-shot generators & calculators — invoice, proposal, contract, pricing & more. Free for every plan."
          rightSlot={<Link to="/dashboard/tools" className="text-xs text-violet-700 hover:underline inline-flex items-center gap-1">All tools <ArrowUpRight className="w-3 h-3" /></Link>}
          cols={5}
          userTier={(profile?.subscription_tier as any) || "free"}
          tools={[
            { icon: Receipt,       label: "Invoice",          desc: "Free GST-ready invoice",      path: "/dashboard/tools/invoice-generator",  color: "from-emerald-500 to-teal-500" },
            { icon: FileText,      label: "Proposal",         desc: "Polished client proposals",   path: "/dashboard/tools/proposal-generator", color: "from-violet-500 to-purple-500" },
            { icon: Sparkles,      label: "Contract",         desc: "Freelance agreement / NDA",   path: "/dashboard/tools/contract-generator", color: "from-amber-500 to-orange-500" },
            { icon: Calculator,    label: "Pricing Calc",     desc: "Freelancer / agency / SaaS",  path: "/dashboard/tools/pricing-calculator", color: "from-violet-500 to-fuchsia-500" },
            { icon: UserCircle2,   label: "Portfolio Bio",    desc: "LinkedIn / creator bios",     path: "/dashboard/tools/portfolio-bio",      color: "from-sky-500 to-indigo-500" },
            { icon: ClipboardList, label: "Intake Form",      desc: "Build & share an intake",     path: "/dashboard/tools/onboarding-form",    color: "from-emerald-500 to-teal-500" },
            { icon: CalendarRange, label: "Content Calendar", desc: "4-week social plan",          path: "/dashboard/tools/content-calendar",   color: "from-rose-500 to-pink-500" },
            { icon: Timer,         label: "Pomodoro",         desc: "Focus + hours + earnings",    path: "/dashboard/tools/pomodoro",           color: "from-orange-500 to-rose-500" },
            { icon: IdCard,        label: "Business Card",    desc: "Standalone, no AI input",     path: "/dashboard/tools/business-card",      color: "from-fuchsia-500 to-pink-500" },
          ]}
          onNavigate={navigate}
        />

        {/* Daily Tools */}
        <BrightToolGrid
          title="Daily tools"
          subtitle="The everyday surface of your freelance operating system"
          cols={5}
          userTier={(profile?.subscription_tier as any) || "free"}
          tools={[
            { icon: Hammer,        label: "Work Hub",       desc: "Your daily cockpit",      path: "/work",           color: "from-emerald-500 to-teal-500" },
            { icon: Users,         label: "Clients (CRM)",  desc: "All clients in one place", path: "/work/clients",   color: "from-violet-500 to-fuchsia-500" },
            { icon: Receipt,       label: "Invoices",       desc: "Create & track invoices", path: "/work/invoices",  color: "from-amber-500 to-orange-500" },
            { icon: Clock,         label: "Time Tracker",   desc: "Auto-bill hours",         path: "/work/time",      color: "from-sky-500 to-indigo-500" },
            { icon: ClipboardList, label: "Checklists",     desc: "Project templates",       path: "/work/checklists",color: "from-teal-500 to-emerald-500" },
            { icon: FolderOpen,    label: "Files",          desc: "Delivery & versions",     path: "/work/files",     color: "from-amber-600 to-yellow-500" },
            { icon: AlarmClock,    label: "Deadlines",      desc: "Color-coded countdowns",  path: "/work/deadlines", color: "from-rose-500 to-red-500", minTier: "pro" },
            { icon: Wallet,        label: "Expenses",       desc: "Tools & subscriptions",   path: "/work/expenses",  color: "from-pink-500 to-rose-500" },
            { icon: Mail,          label: "Comm Log",       desc: "Calls & messages",        path: "/work/comm",      color: "from-blue-500 to-cyan-500", minTier: "elite" },
            { icon: Globe,         label: "Client Portals", desc: "Public client links",     path: "/work/portals",   color: "from-indigo-500 to-violet-500", minTier: "elite" },
          ]}
          onNavigate={navigate}
        />

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
            <TabsTrigger value="webinars" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-xs">
              <Video className="w-3.5 h-3.5 mr-1.5" /> Webinars
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <DailyUsageWidget />
              <OperationalUsageWidget />
              <UnlockBalanceWidget />
            </div>
            <ActivityCard />
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

            {/* COCKPIT — Workspace OS modules at a glance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              {/* AI Fuel — premium hero band, sits ABOVE cockpit modules */}
              <div className="mb-5 relative overflow-hidden rounded-2xl p-[1.5px] bg-gradient-to-r from-emerald-400 via-violet-500 to-fuchsia-500 shadow-[0_0_22px_rgba(16,185,129,0.25)]">
                <div className="relative rounded-[14px] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-5 sm:p-6 overflow-hidden">
                  <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
                  <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-emerald-400/30 blur-md animate-pulse" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                          <KeyRound className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-300/90 mb-1">
                          <Sparkles className="w-3 h-3" /> AI Fuel · Cockpit power
                        </span>
                        <p className="text-base sm:text-lg font-display font-semibold text-white">
                          Add AI fuel to your cockpit
                        </p>
                        <p className="text-xs text-slate-300 mt-0.5 max-w-md">
                          Connect Gemini, OpenAI or your own key — power proposals, replies & doc intelligence across every module.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-white text-slate-900 hover:bg-emerald-50 font-semibold shadow-lg"
                        onClick={() => navigate("/workspaces/ai-settings")}
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Connect AI
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-200 hover:text-white hover:bg-white/10"
                        onClick={() => navigate("/plans")}
                      >
                        Get free credits
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

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
            </div>

          </TabsContent>

          {/* WEBINARS — moved to lowest priority, accessible from sidebar footer */}
          <TabsContent value="webinars" className="mt-5">
            <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-emerald-600" /> Live webinars
              </h3>
              <p className="text-xs text-slate-500 mb-4">Optional learning sessions — your daily work doesn't depend on these.</p>
              {accessibleWebinars.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {accessibleWebinars.map(w => (
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
              ) : (
                <div className="text-center py-10 text-sm text-slate-400">No webinars scheduled right now.</div>
              )}
            </div>

            {/* Recent activity — sits beside webinars */}
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
            </div>
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

function BrightToolGrid({
  title, subtitle, tools, onNavigate, rightSlot, cols = 4, userTier = "free",
}: {
  title: string; subtitle?: string;
  tools: { icon: any; label: string; desc: string; path: string; color: string; minTier?: "free" | "pro" | "elite" | "infinity"; note?: string }[];
  onNavigate: (p: string) => void;
  rightSlot?: React.ReactNode;
  cols?: 4 | 5;
  userTier?: "free" | "pro" | "elite" | "infinity" | string;
}) {
  const rank: Record<string, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };
  const myRank = rank[userTier as string] ?? 0;
  const gridCls = cols === 5
    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
    : "grid grid-cols-2 md:grid-cols-4 gap-3";
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {rightSlot}
      </div>
      <div className={gridCls}>
        {tools.map(t => {
          const need = t.minTier ? (rank[t.minTier] ?? 0) : 0;
          const locked = need > myRank;
          return (
            <button
              key={t.label}
              onClick={() => onNavigate(t.path)}
              className={`text-left rounded-xl border bg-white hover:shadow-md hover:-translate-y-0.5 transition-all p-3.5 group relative overflow-hidden ${
                locked ? "border-slate-200/70 hover:border-amber-300" : "border-slate-200 hover:border-emerald-300"
              }`}
            >
              <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full bg-gradient-to-br ${t.color} ${locked ? "opacity-[0.06]" : "opacity-10"} group-hover:opacity-20 transition-opacity`} />
              <div className={`relative w-9 h-9 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center mb-2.5 shadow-sm ${locked ? "saturate-50" : ""}`}>
                <t.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-start justify-between gap-1.5">
                <p className={`text-sm font-semibold leading-tight ${locked ? "text-slate-700" : "text-slate-900"}`}>{t.label}</p>
                {locked && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="w-2.5 h-2.5" />{t.minTier}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
              {locked && (
                <p className="text-[10px] text-amber-700 mt-1.5 font-medium">Preview now · upgrade to unlock</p>
              )}
              {t.note && !locked && (
                <p className="text-[10px] text-violet-700 mt-1.5 font-medium inline-flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> {t.note}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}