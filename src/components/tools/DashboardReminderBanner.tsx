import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** Map a public /tools/* page to its richer in-dashboard equivalent. */
function dashboardEquivalent(pathname: string): { href: string; label: string } {
  if (pathname.includes("invoice")) return { href: "/workspaces?intent=invoice", label: "Invoice Generator" };
  if (pathname.includes("proposal")) return { href: "/proposal-draft", label: "Proposal AI" };
  if (pathname.includes("contract") || pathname.includes("agreement"))
    return { href: "/workspaces?intent=agreement", label: "Agreement Builder" };
  return { href: "/dashboard", label: "Dashboard" };
}

/**
 * Persistent reminder shown on public /tools/* pages for signed-in users:
 * "you can use this tool inside your dashboard with full AI." Hidden for guests.
 */
export function DashboardReminderBanner() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;
  const dest = dashboardEquivalent(pathname);

  return (
    <div className="mb-4 print:hidden">
      <Link
        to={dest.href}
        className="group flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-4 py-3 shadow-sm hover:shadow-md hover:border-emerald-300 transition"
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <LayoutDashboard className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Dashboard</span>
            <Sparkles className="w-3 h-3 text-emerald-600" />
          </div>
          <div className="text-sm font-semibold text-slate-900 truncate">
            Use the full {dest.label} inside your dashboard
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            Full AI auto-fill, save drafts, reuse client & branding profiles
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-slate-900 text-white text-xs font-semibold group-hover:bg-slate-800 transition shrink-0">
          Open in Dashboard
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    </div>
  );
}
