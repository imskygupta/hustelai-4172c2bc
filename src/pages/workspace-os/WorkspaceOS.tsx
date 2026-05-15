import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Plus, Sparkles, KeyRound, Users, Kanban, Brain, Palette, Blocks, Inbox, Menu, ChevronDown, TrendingUp, LogOut, ArrowUpRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/workspace-os/NotificationCenter";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BigScreenHint } from "@/components/BigScreenHint";
import { WorkspaceContextBar } from "@/components/workspace/WorkspaceContextBar";
import { WorkspaceCommandPalette } from "@/components/workspace/CommandPalette";
import { PageTransition } from "@/components/workspace/PageTransition";
import { wp } from "@/lib/workspace/paths";
import { isWorkspaceHost, isDualHost, MARKETING_ORIGIN } from "@/lib/host";
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { SEO } from "@/components/SEO";

// Calmer IA — only what an operator needs daily.
// Main = the core operational verbs.
// Secondary = configuration & assets, tucked behind a disclosure.
// Anything else (Work Hub legacy tools, "Coming soon" placeholders, etc.)
// is hidden from the rail by design — see mem://features/workspace-polish.
const MAIN = [
  { to: wp(""),         label: "Overview",  icon: Briefcase, end: true },
  { to: wp("pipeline"), label: "Projects",  icon: Kanban },
  { to: wp("clients"),  label: "Clients",   icon: Users },
  { to: wp("roadmap"),  label: "Roadmap",   icon: Brain },
  { to: wp("intake"),   label: "Intake",    icon: Inbox },
];

const SECONDARY = [
  { to: wp("brand-kit"), label: "Brand Kit",    icon: Palette },
  { to: wp("blocks"),    label: "Assets",       icon: Blocks },
  { to: wp("revenue"),   label: "Revenue",      icon: TrendingUp },
  { to: wp("providers"), label: "AI Providers", icon: KeyRound },
];

export default function WorkspaceOS() {
  const [navOpen, setNavOpen] = useState(false);
  const onWorkspaceHost = isWorkspaceHost();
  const { activeProvider, providerLoading } = useWorkspace();
  const { user } = useAuth();

  const leaveWorkspace = () => {
    const href = isDualHost() ? "/workspaces" : `${MARKETING_ORIGIN}/workspaces`;
    if (isDualHost()) window.location.href = href;
    else window.location.replace(href);
  };
  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch { /* noop */ }
    leaveWorkspace();
  };

  const [moreOpen, setMoreOpen] = useState(true);
  // Industry-grade nav: airier rhythm, clear section header, calm active state.
  const itemCls = ({ isActive }: { isActive: boolean }) => cn(
    "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12.5px] transition-all duration-200 overflow-hidden",
    isActive
      ? "text-foreground font-medium bg-foreground/[0.045] ring-1 ring-foreground/[0.06]"
      : "text-muted-foreground/85 hover:text-foreground hover:bg-foreground/[0.025]"
  );
  const Nav = ({ onPick }: { onPick?: () => void }) => (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="px-2.5 mb-1 text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/55 font-medium">Operations</p>
        {MAIN.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={onPick} className={itemCls}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-gradient-to-b from-emerald-500 to-violet-500" />
                )}
                <item.icon className={cn("h-[15px] w-[15px] shrink-0 transition-colors", isActive ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground/80")} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setMoreOpen(o => !o)}
          className="w-full flex items-center gap-1.5 px-3 mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55 font-medium hover:text-foreground/80"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", moreOpen ? "" : "-rotate-90")} />
          Workspace assets
        </button>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-1 overflow-hidden"
          >
            {SECONDARY.map(t => (
              <NavLink key={t.to} to={t.to} onClick={onPick} className={itemCls}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-gradient-to-b from-emerald-500 to-violet-500" />
                    )}
                    <t.icon className={cn("h-[15px] w-[15px] shrink-0", isActive ? "text-foreground" : "text-muted-foreground/70")} />
                    <span className="truncate">{t.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "relative min-h-[calc(100vh-3rem)] text-foreground",
      onWorkspaceHost
        ? "bg-gradient-to-br from-[hsl(48_85%_99%)] via-[hsl(40_75%_99.2%)] to-[hsl(30_70%_98.8%)]"
        : "bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.06),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(258_80%_64%/0.05),transparent_55%)]"
    )}>
      {/* Ambient pastel backdrop — borrows the "Pick your cockpit" gradient */}
      {onWorkspaceHost && <div aria-hidden className="ws-ambient-pastel" style={{ position: "fixed", opacity: 0.18 }} />}
      <SEO title="Workspaces | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      <BigScreenHint pageKey="workspace-os" label="Workspace OS is built for desktop" />
      <WorkspaceCommandPalette />
      {/* Cinematic header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "sticky top-0 z-20 relative backdrop-blur-xl",
          onWorkspaceHost
            ? "border-b border-border/40 bg-white/70"
            : "border-b border-border/50 bg-background/60"
        )}
      >
        {/* gradient hairline */}
        <span aria-hidden className="absolute bottom-0 left-0 right-0 h-px opacity-60" style={{ backgroundImage: "var(--ws-gradient)" }} />
        <div className={cn(
          "max-w-7xl mx-auto px-6 flex items-center justify-between",
          onWorkspaceHost ? "py-2.5" : "py-4"
        )}>
          <div className="flex items-center gap-3">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center" aria-label="Open workspace menu">
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto">
                <SheetHeader><SheetTitle>{onWorkspaceHost ? "Menu" : "Workspace OS"}</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-1"><Nav onPick={() => setNavOpen(false)} /></div>
              </SheetContent>
            </Sheet>
            <NavLink to={wp("")} className="flex items-center gap-2.5 group">
              <div className="relative h-8 w-8 rounded-lg flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.35)]" style={{ backgroundImage: "var(--ws-gradient)" }}>
                <Sparkles className="h-4 w-4 text-black/80" />
              </div>
              {onWorkspaceHost ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tracking-tight text-foreground group-hover:text-foreground transition-colors">HustleAI</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace</span>
                </div>
              ) : (
                <div>
                  <h1 className="text-lg font-semibold tracking-tight leading-tight">Workspace OS</h1>
                  <p className="text-xs text-muted-foreground">Your freelancer cockpit</p>
                </div>
              )}
            </NavLink>
            {/* Live presence + provider chip — only on workspace host */}
            {onWorkspaceHost && (
              <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-border/40">
                <span className="ws-presence" aria-hidden />
                <span className="text-[11px] text-muted-foreground">Live</span>
                <span className="mx-2 h-3 w-px bg-border/60" />
                <ProviderChip provider={activeProvider} loading={providerLoading} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Global search — opens the ⌘K palette */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("ws-cmdk-toggle"))}
              className="hidden md:inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-full bg-white/70 hover:bg-white border border-border/60 text-[12px] text-muted-foreground hover:text-foreground transition shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              aria-label="Search workspace"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-foreground/70">Search anything…</span>
              <kbd className="ml-2 hidden lg:inline-flex text-[10px] uppercase tracking-wider text-muted-foreground/70 border border-border/60 rounded px-1.5 py-px bg-background/60">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("ws-cmdk-toggle"))}
              className="md:hidden h-9 w-9 rounded-full bg-white/70 hover:bg-white border border-border/60 flex items-center justify-center"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
            <NotificationCenter />
            <NavLink
              to={wp("projects/new")}
              className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-black shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-transform"
              style={{ backgroundImage: "var(--ws-gradient)" }}
            >
              <Plus className="h-4 w-4" /> New Project
            </NavLink>
            {onWorkspaceHost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative h-9 w-9 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted border border-border/60 transition"
                    aria-label="Workspace account"
                  >
                    <span className="text-[11px] font-medium text-foreground">
                      {(user?.email?.[0] || "•").toUpperCase()}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Portal session
                  </DropdownMenuLabel>
                  {user?.email && (
                    <div className="px-2 pb-2 text-xs text-foreground/80 truncate">{user.email}</div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={leaveWorkspace} className="cursor-pointer">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Leave workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-400 focus:text-red-400">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                  <div className="px-2 pt-2 text-[10px] text-muted-foreground">
                    You can always re-enter through your HustleAI portal.
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </motion.header>

      <div className="relative z-10 max-w-[1480px] mx-auto px-4 lg:px-8 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-8 xl:gap-12">
        {/* Side rail — desktop only; mobile uses the Sheet in the header */}
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
          <Nav />
        </aside>

        {/* Content */}
        <main className="min-w-0 space-y-4">
          <WorkspaceContextBar />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

function ProviderChip({ provider, loading }: { provider: ReturnType<typeof useWorkspace>["activeProvider"]; loading: boolean }) {
  if (loading) {
    return <span className="text-[11px] text-white/40">Provider…</span>;
  }
  if (!provider) {
    return (
      <NavLink to={wp("providers")} className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 hover:text-amber-700">
        <span className="ws-dot ws-dot--warn ws-pulse-soft" /> No AI fuel
      </NavLink>
    );
  }
  const label = PROVIDER_LABELS[provider.provider] || provider.provider;
  return (
    <NavLink to={wp("providers")} className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 hover:text-emerald-700">
      <span className="ws-dot ws-dot--ok" /> {label}
      {provider.model ? <span className="text-muted-foreground">· {provider.model}</span> : null}
    </NavLink>
  );
}