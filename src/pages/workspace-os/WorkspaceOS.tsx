import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Plus, Sparkles, KeyRound, FileText, Receipt, Users, Kanban, TrendingUp, Hammer, Clock, ClipboardList, AlarmClock, Globe, Wallet, FolderOpen, Mail, Brain, Palette, Blocks } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/workspace-os/NotificationCenter";

import { SEO } from "@/components/SEO";

const NAV = [
  { to: "/workspaces", label: "Overview", icon: Briefcase, end: true },
  { to: "/workspaces/roadmap", label: "Roadmap Engine", icon: Brain, end: false },
  { to: "/workspaces/pipeline", label: "Pipeline", icon: Kanban, end: false },
  { to: "/workspaces/revenue", label: "Revenue", icon: TrendingUp, end: false },
  { to: "/workspaces/new", label: "New Workspace", icon: Plus, end: false },
  { to: "/workspaces/ai-settings", label: "Connect AI Fuel", icon: KeyRound, end: false },
];

const DOC_INFRA = [
  { to: "/workspaces/brand-kit", label: "Brand Kit", icon: Palette },
  { to: "/workspaces/clients", label: "Client Profiles", icon: Users },
  { to: "/workspaces/blocks", label: "Reusable Blocks", icon: Blocks },
];

const TOOLS = [
  { to: "/work",            label: "Work Hub",     icon: Hammer },
  { to: "/work/clients",    label: "Clients (CRM)",icon: Users },
  { to: "/work/invoices",   label: "Invoices",     icon: Receipt },
  { to: "/work/time",       label: "Time Tracker", icon: Clock },
  { to: "/work/checklists", label: "Checklists",   icon: ClipboardList },
  { to: "/work/files",      label: "Files",        icon: FolderOpen },
  { to: "/work/deadlines",  label: "Deadlines",    icon: AlarmClock },
  { to: "/work/expenses",   label: "Expenses",     icon: Wallet },
  { to: "/work/comm",       label: "Comm Log",     icon: Mail },
  { to: "/work/portals",    label: "Client Portals", icon: Globe },
];

const SOON = [
  { label: "Stripe sync", icon: Receipt },
  { label: "Email automations", icon: FileText },
  { label: "Team seats", icon: Users },
];

export default function WorkspaceOS() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gradient-to-br from-background via-background to-primary/5">
      <SEO title="Workspaces | HustleAI Workspace OS" description="HustleAI Workspace OS — internal page." path="" noindex />
      {/* Cinematic header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 backdrop-blur-xl bg-background/60 sticky top-0 z-20"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Workspace OS</h1>
              <p className="text-xs text-muted-foreground">Your freelancer cockpit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <NavLink
              to="/workspaces/new"
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
            >
              <Plus className="h-4 w-4" /> New Workspace
            </NavLink>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Side rail */}
        <aside className="space-y-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-6">
            <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">Document Infrastructure</p>
            {DOC_INFRA.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </NavLink>
            ))}
          </div>

          <div className="pt-6">
            <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">Daily tools</p>
            {TOOLS.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </NavLink>
            ))}
          </div>

          <div className="pt-6">
            <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-2">Coming next</p>
            {SOON.map(s => (
              <div key={s.label} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/60">
                <s.icon className="h-4 w-4" />
                {s.label}
                <span className="ml-auto text-[9px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">soon</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="min-w-0"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}