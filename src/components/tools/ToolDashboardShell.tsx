import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText, FilePen, ScrollText, Calculator, User2, CalendarRange, CreditCard, ClipboardList,
  Bot, Map, BookOpen, Briefcase, Search, Sparkles, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const TOOL_NAV = [
  { slug: "invoice-generator", name: "Invoices", icon: FileText },
  { slug: "proposal-generator", name: "Proposals", icon: FilePen },
  { slug: "contract-generator", name: "Contracts", icon: ScrollText },
  { slug: "pricing-calculator", name: "Pricing", icon: Calculator },
  { slug: "portfolio-bio", name: "Portfolio", icon: User2 },
  { slug: "content-calendar", name: "Calendar", icon: CalendarRange },
  { slug: "business-card", name: "Business Card", icon: CreditCard },
  { slug: "onboarding-form", name: "Intake Forms", icon: ClipboardList },
];

const LOCKED_NAV = [
  { name: "HustleBot · AI mentor", icon: Bot },
  { name: "Roadmaps", icon: Map },
  { name: "Knowledge Hub", icon: BookOpen },
  { name: "Workspaces", icon: Briefcase },
  { name: "Lead Pipeline", icon: Sparkles },
];

/**
 * "Mirage" shell — when a guest visits any /tools/* page they see a faux
 * dashboard wrapper around the live tool. After signup the real AppShell
 * dashboard takes over with the same look & feel, so the experience feels
 * continuous (no jarring reskin moment).
 *
 * Signed-in users see the same shell here too (since /tools/* sits outside
 * AppShell route map) — safe & consistent.
 */
export function ToolDashboardShell({ children, toolKey }: { children: ReactNode; toolKey?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Map our internal toolKey → the dashboard route slug (they're identical
  // for every tool except "intake-form" which lives at /dashboard/tools/onboarding-form).
  const dashSlugFor: Record<string, string> = {
    "intake-form": "onboarding-form",
  };
  const dashSlug = toolKey ? (dashSlugFor[toolKey] || toolKey) : "";
  const openInDashboard = () => navigate(toolKey ? `/dashboard/tools/${dashSlug}` : "/dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-30 h-14 bg-card border-b border-border flex items-center px-4 gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">HustleAI</span>
        </Link>
        <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
          {user ? "Workspace" : "Free workspace"}
        </span>
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md ml-3 text-xs text-muted-foreground bg-muted rounded-md px-3 py-1.5 border border-border">
          <Search className="w-3.5 h-3.5" />
          <span>Search tools, templates, hustles…</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Button size="sm" onClick={openInDashboard} className="text-xs h-8">
              {toolKey ? "Open in Dashboard" : "Open Dashboard"} <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate("/login")} className="text-xs h-8">Sign in</Button>
              <Button size="sm" onClick={() => navigate("/signup")} className="text-xs h-8">
                Get started — free
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-card min-h-[calc(100vh-3.5rem)] sticky top-14">
          <div className="px-3 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground px-2 mb-2">Doc Tools</div>
            <nav className="space-y-0.5">
              {TOOL_NAV.map((t) => {
                const active = pathname.includes(`/tools/${t.slug}`);
                return (
                  <Link
                    key={t.slug}
                    to={`/tools/${t.slug}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition
                      ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    <span className="truncate">{t.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground px-2 mt-6 mb-2">More inside</div>
            <nav className="space-y-0.5">
              {LOCKED_NAV.map((l) => (
                <button
                  key={l.name}
                  onClick={() => navigate(user ? "/dashboard" : "/signup")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted transition text-left"
                >
                  <l.icon className="w-3.5 h-3.5" />
                  <span className="truncate">{l.name}</span>
                  <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground">↗</span>
                </button>
              ))}
            </nav>

            {!user && (
              <div className="mt-6 mx-1 rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Free workspace</div>
                <div className="text-xs font-semibold mt-1 mb-2">Save your work. Sync across devices.</div>
                <Button size="sm" onClick={() => navigate("/signup")} className="w-full h-7 text-[11px]">
                  Sign up free
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0">
          {!user ? (
            <div className="bg-muted border-b border-border text-muted-foreground text-[11px] px-4 py-1.5 text-center">
              You're using the free preview — <Link to="/signup" className="font-semibold underline">sign up</Link> to save, sync, and unlock AI.
            </div>
          ) : toolKey ? (
            <div className="bg-foreground text-background text-[11px] px-4 py-1.5 flex items-center justify-center gap-3">
              <span>You're signed in — open this tool in your dashboard for autosave, AI assists & history.</span>
              <button onClick={openInDashboard} className="font-semibold underline hover:no-underline">
                Open in Dashboard →
              </button>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}