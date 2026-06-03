import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Search, Crown, Sparkles, Rocket, Star, ChevronRight, ArrowRight, Command } from "lucide-react";
import { Chatbot } from "@/components/Chatbot";
import { HustleBotIntro } from "@/components/HustleBotIntro";
import NotificationCenter from "@/components/workspace-os/NotificationCenter";
import AIFillStatusBanner from "@/components/tools/AIFillStatusBanner";
import { AsyncActivityIndicator } from "@/components/async/AsyncActivityIndicator";
import { ThemeToggle, getInitialTheme } from "@/components/ThemeToggle";
import { CalmModeToggle } from "@/components/CalmModeToggle";
import { AccountMenu } from "@/components/AccountMenu";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}

export function AppShell({ children, title, breadcrumbs, actions }: AppShellProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const tier = (profile?.subscription_tier as string) || "free";

  // Dark mode is paused — keep the AppShell strictly in light identity.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // ---- In-app Tool Finder (distinct from hustle search) ----
  const TOOL_INDEX: { label: string; desc: string; path: string; group: string }[] = [
    { label: "Dashboard", desc: "Your cockpit overview", path: "/dashboard", group: "Workspace" },
    { label: "Workspaces", desc: "All client workspaces", path: "/workspaces", group: "Workspace" },
    { label: "Work Hub", desc: "Daily freelancer cockpit", path: "/work", group: "Workspace" },
    { label: "Clients (CRM)", desc: "All clients", path: "/work/clients", group: "Workspace" },
    { label: "Invoices", desc: "Create & track invoices", path: "/work/invoices", group: "Money" },
    { label: "Time Tracker", desc: "Log billable hours", path: "/work/time", group: "Money" },
    { label: "Expenses", desc: "Tools & subscriptions", path: "/work/expenses", group: "Money" },
    { label: "Revenue", desc: "Earnings dashboard", path: "/workspaces/revenue", group: "Money" },
    { label: "Pipeline", desc: "Deals kanban", path: "/workspaces/pipeline", group: "Money" },
    { label: "Proposal Generator", desc: "AI-drafted proposals", path: "/proposal-draft", group: "Documents" },
    { label: "Quotation Generator", desc: "Premium project quotes", path: "/workspaces?intent=quotation", group: "Documents" },
    { label: "Invoice Generator", desc: "Branded invoices", path: "/workspaces?intent=invoice", group: "Documents" },
    { label: "Agreement / Contract", desc: "Protect engagements", path: "/workspaces?intent=agreement", group: "Documents" },
    { label: "Quick Invoice (Doc Tool)", desc: "Branded invoice in 60s", path: "/tools/invoice-generator", group: "Doc Tools" },
    { label: "Quick Proposal (Doc Tool)", desc: "Client-ready proposal", path: "/tools/proposal-generator", group: "Doc Tools" },
    { label: "Quick Contract (Doc Tool)", desc: "Freelance contract PDF", path: "/tools/contract-generator", group: "Doc Tools" },
    { label: "Service Offer Card", desc: "Shareable service deck", path: "/workspaces?intent=service_card", group: "Documents" },
    { label: "Business Card", desc: "Modern brand identity", path: "/workspaces?intent=business_card", group: "Documents" },
    { label: "Brand Kit", desc: "Logo, colors, fonts", path: "/workspaces/brand-kit", group: "Documents" },
    { label: "Snippet Library", desc: "Reusable doc blocks", path: "/workspaces/blocks", group: "Documents" },
    { label: "Smart Client Intake", desc: "Branded intake forms", path: "/workspaces/intake", group: "Documents" },
    { label: "Hustle Blueprint", desc: "7-day action plan", path: "/hustle-blueprint", group: "AI" },
    { label: "Resume Optimizer", desc: "Tailored CV", path: "/resume-optimizer", group: "AI" },
    { label: "Red-Flag Scanner", desc: "Spot bad clients", path: "/red-flag-scanner", group: "AI" },
    { label: "Gig Price Calc", desc: "3-tier pricing", path: "/gig-price-calculator", group: "AI" },
    { label: "Faceless Content", desc: "Viral storyboards", path: "/faceless-content", group: "AI" },
    { label: "AI Tool Bench", desc: "Compare AI tools", path: "/ai-tools", group: "AI" },
    { label: "Knowledge Hub", desc: "Save & automate prompts", path: "/knowledge-hub", group: "AI" },
    { label: "Skill Gap Analyzer", desc: "Learning roadmap", path: "/skill-gap", group: "AI" },
    { label: "Lead Finder", desc: "Social-media lead radar", path: "/problem-leads", group: "AI" },
    { label: "HustleBot (AI Mentor)", desc: "Personal AI mentor", path: "/hustlebot", group: "AI" },
    { label: "Explore Hustles", desc: "AI hustle search", path: "/explore", group: "Discover" },
    { label: "Saved Hustles", desc: "Your bookmarks", path: "/saved-hustles", group: "Discover" },
    { label: "Community", desc: "Forum & chat", path: "/community", group: "Discover" },
    { label: "Leaderboard", desc: "Top earners", path: "/leaderboard", group: "Discover" },
    { label: "Affiliates", desc: "Earn commissions", path: "/affiliates", group: "Discover" },
    { label: "Plans & Billing", desc: "Subscription", path: "/plans", group: "Account" },
    { label: "Profile", desc: "Your account", path: "/profile", group: "Account" },
    { label: "AI Fuel (BYO key)", desc: "Connect your own AI key", path: "/workspaces/ai-settings", group: "Account" },
  ];
  const [q, setQ] = useState("");
  const [openFinder, setOpenFinder] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const finderRef = useRef<HTMLDivElement | null>(null);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as typeof TOOL_INDEX;
    return TOOL_INDEX
      .filter(t => t.label.toLowerCase().includes(term) || t.desc.toLowerCase().includes(term) || t.group.toLowerCase().includes(term))
      .slice(0, 8);
  }, [q]);

  function go(path: string) {
    setOpenFinder(false);
    setQ("");
    navigate(path);
  }

  const TierBadge = () => {
    const map: Record<string, { icon: typeof Crown; cls: string }> = {
      infinity: { icon: Star, cls: "bg-amber-100 text-amber-700 border-amber-200" },
      elite: { icon: Crown, cls: "bg-violet-100 text-violet-700 border-violet-200" },
      pro: { icon: Rocket, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      free: { icon: Sparkles, cls: "bg-slate-100 text-slate-600 border-slate-200" },
    };
    const m = map[tier] || map.free;
    const Icon = m.icon;
    return (
      <Badge variant="outline" className={`${m.cls} gap-1 font-medium`}>
        <Icon className="w-3 h-3" />
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header
            className="sticky top-0 z-30 h-14 border-b border-border bg-card/90 backdrop-blur-sm flex items-center gap-2 md:gap-3 px-3 md:px-6 pt-safe"
          >
            <SidebarTrigger className="text-muted-foreground hover:text-foreground min-h-tap min-w-tap md:min-h-0 md:min-w-0" />

            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="hidden md:flex items-center gap-1 text-sm">
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    {b.href ? (
                      <button onClick={() => navigate(b.href!)} className="text-slate-500 hover:text-slate-900">
                        {b.label}
                      </button>
                    ) : (
                      <span className="text-slate-900 font-medium">{b.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            <div className="flex-1 max-w-md ml-auto md:ml-4 hidden md:block" ref={finderRef}>
              <div className="relative">
                <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setOpenFinder(true); setActiveIdx(0); }}
                  onFocus={() => q && setOpenFinder(true)}
                  onBlur={() => setTimeout(() => setOpenFinder(false), 150)}
                  placeholder="Find a tool, doc or page in the app…"
                  className="pl-9 pr-16 h-9 bg-violet-50/40 border-violet-200/70 focus:bg-white focus:border-violet-400 text-sm placeholder:text-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, matches.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
                    else if (e.key === "Enter") {
                      e.preventDefault();
                      if (matches[activeIdx]) go(matches[activeIdx].path);
                      else if (q.trim()) navigate(`/explore?q=${encodeURIComponent(q)}`);
                    } else if (e.key === "Escape") setOpenFinder(false);
                  }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 hidden lg:inline">⌘K</span>

                {openFinder && q && (
                  <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                    {matches.length > 0 ? (
                      <ul className="py-1 max-h-80 overflow-auto">
                        {matches.map((m, i) => (
                          <li key={m.path}>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); go(m.path); }}
                              onMouseEnter={() => setActiveIdx(i)}
                              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left ${i === activeIdx ? "bg-violet-50" : "hover:bg-slate-50"}`}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">{m.label}</div>
                                <div className="text-[11px] text-slate-500 truncate">{m.desc}</div>
                              </div>
                              <span className="text-[9px] uppercase tracking-wider font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5 shrink-0">{m.group}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <button
                        onMouseDown={(e) => { e.preventDefault(); navigate(`/explore?q=${encodeURIComponent(q)}`); setOpenFinder(false); }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-emerald-50"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900">No tool match — search hustles for "{q}"</div>
                          <div className="text-[11px] text-slate-500">Run an AI hustle search instead</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                      </button>
                    )}
                    <div className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400 flex items-center justify-between bg-slate-50/50">
                      <span>Tool Finder · jumps in-app</span>
                      <span>↵ open · ↑↓ navigate · esc close</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 ml-auto md:ml-0">
              {/* Mobile-only quick search trigger → /explore */}
              <button
                onClick={() => navigate("/explore")}
                aria-label="Search"
                className="md:hidden inline-flex items-center justify-center min-h-tap min-w-tap rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition"
              >
                <Search className="w-4 h-4" />
              </button>
              {/* Utility cluster — kept compact, icon-only */}
              <div className="hidden md:inline-flex items-center gap-0.5 mr-1 pr-1 border-r border-border">
                <CalmModeToggle />
                <ThemeToggle />
                <AsyncActivityIndicator />
              </div>
              <NotificationCenter />
              {/* Primary right-side anchor — avatar + account menu */}
              <AccountMenu />
            </div>
          </header>

          {/* Page header */}
          {(title || actions) && (
            <div className="border-b border-border bg-card px-4 md:px-8 py-4 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                {title && (
                  <h1 className="text-lg md:text-2xl font-display font-bold text-foreground truncate">
                    {title}
                  </h1>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">{actions}</div>
              )}
            </div>
          )}

          {/* Content */}
          <main className="flex-1 px-4 md:px-8 py-5 md:py-8 pb-24 md:pb-8 min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
        <Chatbot />
        <HustleBotIntro />
        <AIFillStatusBanner />
      </div>
    </SidebarProvider>
  );
}