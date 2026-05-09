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
export function ToolDashboardShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900">HustleAI</span>
        </Link>
        <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          {user ? "Workspace" : "Free workspace"}
        </span>
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md ml-3 text-xs text-slate-400 bg-slate-100 rounded-md px-3 py-1.5 border border-slate-200">
          <Search className="w-3.5 h-3.5" />
          <span>Search tools, templates, hustles…</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")} className="text-xs h-8">
              Open dashboard <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => navigate("/login")} className="text-xs h-8">Sign in</Button>
              <Button size="sm" onClick={() => navigate("/signup")} className="text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white">
                Get started — free
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-3.5rem)] sticky top-14">
          <div className="px-3 py-4">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-400 px-2 mb-2">Doc Tools</div>
            <nav className="space-y-0.5">
              {TOOL_NAV.map((t) => {
                const active = pathname.includes(`/tools/${t.slug}`);
                return (
                  <Link
                    key={t.slug}
                    to={`/tools/${t.slug}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition
                      ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    <span className="truncate">{t.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-400 px-2 mt-6 mb-2">More inside</div>
            <nav className="space-y-0.5">
              {LOCKED_NAV.map((l) => (
                <button
                  key={l.name}
                  onClick={() => navigate(user ? "/dashboard" : "/signup")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-slate-500 hover:bg-slate-100 transition text-left"
                >
                  <l.icon className="w-3.5 h-3.5" />
                  <span className="truncate">{l.name}</span>
                  <span className="ml-auto text-[9px] font-bold uppercase text-slate-400">↗</span>
                </button>
              ))}
            </nav>

            {!user && (
              <div className="mt-6 mx-1 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 text-white p-3">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Free workspace</div>
                <div className="text-xs font-semibold mt-1 mb-2">Save your work. Sync across devices.</div>
                <Button size="sm" onClick={() => navigate("/signup")} className="w-full h-7 text-[11px] bg-white text-slate-900 hover:bg-slate-100">
                  Sign up free
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 min-w-0">
          {!user && (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] px-4 py-1.5 text-center">
              You're using the free preview — <Link to="/signup" className="font-semibold underline">sign up</Link> to save, sync, and unlock AI.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}