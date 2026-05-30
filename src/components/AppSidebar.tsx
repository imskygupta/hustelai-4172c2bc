import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Search, Users, User, Crown, Wrench, Target, Store, BookOpen,
  FileText, Brain, Zap, TrendingUp, Briefcase, MessageCircle, Trophy, Bookmark,
  CreditCard, Settings, LogOut, Sparkles, Film, ShieldAlert, DollarSign, Rocket, Bot, Building2, LayoutGrid, Hammer, Video,
  Flame, Plug, Receipt, FileSignature, FileEdit,
  Send as SendIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { useOperatorMode, OPERATOR_MODES } from "@/lib/operator-mode";
import { Star } from "lucide-react";

// Workspace OS — the core operational surface. Kept deliberately short:
// users were overwhelmed when "Clients" concepts and doc tools were sprayed
// across multiple groups. One mental model per row.
const workspaceOsItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Work Hub", url: "/work", icon: Hammer },
  { title: "Clients", url: "/work/clients", icon: Users },
  { title: "Activity", url: "/dashboard/deliveries", icon: SendIcon },
];

// AI Systems — only the top-leverage entry points. The long tail
// (Skill Gap, Faceless Content, Gig Arbitrage, Sure-Hit Jobs, Knowledge Hub,
// Lead Finder, Gig Price Calc, Resume Optimizer) lives inside the
// AI Tool Bench so the sidebar stays scannable.
const aiSystems = [
  { title: "Hustle Blueprint", url: "/hustle-blueprint", icon: Rocket, tier: "free" },
  { title: "Roadmap Engine", url: "/workspaces", icon: Brain, tier: "pro" },
  { title: "Proposal AI", url: "/proposal-draft", icon: FileText, tier: "pro" },
  { title: "Red-Flag Scanner", url: "/red-flag-scanner", icon: ShieldAlert, tier: "free" },
  { title: "AI Tool Bench", url: "/ai-tools", icon: Zap, tier: "pro" },
];

// Growth — discovery + visibility
const growthItems = [
  { title: "Explore Hustles", url: "/explore", icon: Search },
  { title: "Saved", url: "/saved-hustles", icon: Bookmark },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Affiliates", url: "/affiliates", icon: Crown },
];

// Settings — only the durable account surfaces. Sub-pages live inside
// /profile so the sidebar isn't doubling up.
const settingsItems = [
  { title: "Plans & Billing", url: "/plans", icon: CreditCard },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "AI Fuel (BYO key)", url: "/workspaces/ai-settings", icon: Flame },
  { title: "Profile", url: "/profile", icon: User },
];

function tierRank(t?: string) {
  return { free: 0, pro: 1, elite: 2, infinity: 3 }[t || "free"] ?? 0;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const userTier = profile?.subscription_tier || "free";
  const rank = tierRank(userTier);
  const { mode } = useOperatorMode();

  // Persona-aware "Recommended" group — pinned to the top so frequent-use
  // routes for the active mode are one click away, without reordering the
  // rest of the sidebar (preserves muscle memory).
  const recommended = (mode
    ? OPERATOR_MODES.find(m => m.id === mode)?.modules.slice(0, 4) ?? []
    : []
  ).map(m => ({ title: m.label, url: m.to }));

  const isActive = (url: string) => pathname === url.split("?")[0];

  const linkCls = (active: boolean) =>
    `flex items-center gap-2 rounded-md transition-colors ${
      active
        ? "bg-emerald-50 text-emerald-700 font-medium"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 overflow-x-hidden">
      <SidebarHeader className="border-b border-slate-200/80 px-4 py-3">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center text-white">
            <Zap className="w-4 h-4" />
          </div>
          {!collapsed && <span className="font-display font-bold text-slate-900">HustleAI</span>}
        </button>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar overflow-x-hidden">
        {/* HustleBot — premium AI mentor button (glowing) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <button
              onClick={() => navigate("/hustlebot")}
              className="group relative w-full mx-2 my-1 rounded-lg overflow-hidden
                         bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 p-[1.5px]
                         shadow-[0_0_18px_rgba(168,85,247,0.45)] hover:shadow-[0_0_28px_rgba(168,85,247,0.7)] transition-all"
            >
              <span className="flex items-center gap-2 rounded-[7px] bg-white/95 px-3 py-2">
                <span className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shrink-0">
                  <Bot className="w-4 h-4" />
                </span>
                {!collapsed && (
                  <span className="flex flex-col items-start text-left min-w-0">
                    <span className="text-[13px] font-semibold text-slate-900 leading-tight">HustleBot</span>
                    <span className="text-[10px] text-fuchsia-600 font-medium">✨ Personal AI Mentor</span>
                  </span>
                )}
              </span>
            </button>
          </SidebarGroupContent>
        </SidebarGroup>

        {recommended.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" /> Recommended
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recommended.map((item) => (
                  <SidebarMenuItem key={`rec-${item.url}`}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className={linkCls(isActive(item.url))}>
                        <Star className="h-4 w-4 shrink-0 text-emerald-500" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-slate-400">Workspace OS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceOsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className={linkCls(isActive(item.url))}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-slate-400">AI Systems</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiSystems.map((item) => {
                const locked = tierRank(item.tier) > rank;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className={`${linkCls(isActive(item.url))} ${locked ? "opacity-50" : ""}`}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <span className="flex items-center justify-between flex-1 text-sm">
                            {item.title}
                            {locked && (
                              <Badge variant="outline" className="ml-auto text-[9px] py-0 px-1.5 border-slate-300 text-slate-500">
                                {item.tier.toUpperCase()}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-slate-400">Growth</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {growthItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className={linkCls(isActive(item.url))}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-slate-400">Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className={linkCls(isActive(item.url))}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={async () => { await signOut(); navigate("/"); }}>
                  <span className={linkCls(false)}>
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Sign out</span>}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="border-t border-slate-200/80 p-3 bg-sidebar">
          <button
            onClick={() => navigate("/dashboard?tab=webinars")}
            className="w-full mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Live webinars</span>
          </button>
          <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-900">{userTier.toUpperCase()} plan</span>
            </div>
            {userTier !== "infinity" && (
              <button
                onClick={() => navigate("/payment")}
                className="text-[11px] text-emerald-700 hover:underline font-medium"
              >
                Upgrade for more →
              </button>
            )}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}