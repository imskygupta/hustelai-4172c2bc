import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Plus, Sparkles, KeyRound, Users, Kanban, Brain, Palette, Blocks, Inbox, Menu, ChevronDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/workspace-os/NotificationCenter";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BigScreenHint } from "@/components/BigScreenHint";
import { WorkspaceContextBar } from "@/components/workspace/WorkspaceContextBar";
import { WorkspaceCommandPalette } from "@/components/workspace/CommandPalette";
import { wp } from "@/lib/workspace/paths";
import { isWorkspaceHost } from "@/lib/host";

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
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const onWorkspaceHost = isWorkspaceHost();

  const [moreOpen, setMoreOpen] = useState(false);
  // Premium nav tiles — subtle gradient stripe on active, soft hover lift.
  const itemCls = ({ isActive }: { isActive: boolean }) => cn(
    "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 overflow-hidden",
    isActive
      ? "text-foreground font-medium bg-gradient-to-r from-primary/15 via-primary/5 to-transparent ring-1 ring-primary/20 shadow-sm shadow-primary/10"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:translate-x-0.5"
  );
  const Nav = ({ onPick }: { onPick?: () => void }) => (
    <>
      {MAIN.map(item => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={onPick} className={itemCls}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gradient-to-b from-primary to-violet-500" />
              )}
              <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground/90")} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => setMoreOpen(o => !o)}
        className="mt-4 w-full flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 hover:text-foreground/80"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", moreOpen ? "" : "-rotate-90")} />
        More
      </button>
      {moreOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-0.5 overflow-hidden"
        >
          {SECONDARY.map(t => (
            <NavLink key={t.to} to={t.to} onClick={onPick} className={itemCls}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gradient-to-b from-primary to-violet-500" />
                  )}
                  <t.icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </motion.div>
      )}
    </>
  );

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.06),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(258_80%_64%/0.05),transparent_55%)]">
      <SEO title="Workspaces | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      <BigScreenHint pageKey="workspace-os" label="Workspace OS is built for desktop" />
      <WorkspaceCommandPalette />
      {/* Cinematic header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 backdrop-blur-xl bg-background/60 sticky top-0 z-20"
      >
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
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-md shadow-primary/20">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              {onWorkspaceHost ? (
                <span className="text-sm font-medium tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">HustleAI</span>
              ) : (
                <div>
                  <h1 className="text-lg font-semibold tracking-tight leading-tight">Workspace OS</h1>
                  <p className="text-xs text-muted-foreground">Your freelancer cockpit</p>
                </div>
              )}
            </NavLink>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <NavLink
              to={wp("projects/new")}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
            >
              <Plus className="h-4 w-4" /> New Project
            </NavLink>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
        {/* Side rail — desktop only; mobile uses the Sheet in the header */}
        <aside className="hidden lg:block space-y-0.5 lg:sticky lg:top-20 lg:self-start">
          <Nav />
        </aside>

        {/* Content */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-w-0 space-y-4"
        >
          <WorkspaceContextBar />
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}