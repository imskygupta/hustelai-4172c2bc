import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import {
  Activity,
  CreditCard,
  Gauge,
  Key,
  LayoutDashboard,
  Menu,
  Settings2,
  X,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { RequireConsoleAuth } from "./RequireConsoleAuth";

const NAV: { to: string; label: string; icon: any }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/keys", label: "API keys", icon: Key },
  { to: "/usage", label: "Usage", icon: Gauge },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

function envLabel() {
  if (typeof window === "undefined") return "production";
  const h = window.location.hostname;
  if (h.includes("localhost") || h.startsWith("127.")) return "development";
  if (h.includes("preview") || h.includes("lovable.app")) return "staging";
  return "production";
}

function EnvBadge() {
  const env = envLabel();
  const tone =
    env === "production"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/20"
      : env === "staging"
      ? "bg-amber-500/10 text-amber-300 border-amber-400/20"
      : "bg-sky-500/10 text-sky-300 border-sky-400/20";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.18em] border font-mono ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {env}
    </span>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#070a0f] px-3 py-5 h-full">
      <Link to="/dashboard" onClick={onNavigate} className="px-3 py-2 mb-4 flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-emerald-500/15 border border-emerald-400/30 grid place-items-center text-emerald-300 font-mono text-[11px]">H</div>
        <div>
          <div className="text-[13px] font-semibold text-zinc-100 leading-tight">HustleAI</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/80">Console</div>
        </div>
      </Link>
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                isActive
                  ? "bg-white/[0.06] text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03]"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/[0.06] px-3">
        <a href="https://api.hustlaiapp.in" className="text-[11px] text-zinc-500 hover:text-zinc-300">
          ← Back to api.hustlaiapp.in
        </a>
      </div>
    </aside>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="h-14 border-b border-white/[0.06] bg-[#070a0f]/80 backdrop-blur flex items-center justify-between px-3 lg:px-6 gap-3">
      <button
        onClick={onMenu}
        className="lg:hidden h-8 w-8 grid place-items-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Activity className="h-4 w-4 text-emerald-400" />
        <span className="text-[12px] text-zinc-400 font-mono truncate hidden sm:inline">api.hustlaiapp.in</span>
        <EnvBadge />
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] uppercase tracking-[0.18em] border border-emerald-400/20">
          Beta
        </span>
      </div>
      <div className="flex items-center gap-3">
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      </div>
    </header>
  );
}

export default function ConsoleLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <RequireConsoleAuth>
      <Helmet>
        <title>HustleAI Console — Developer Dashboard</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex bg-[#05070a] text-zinc-200">
        <div className="hidden lg:flex">
          <Sidebar />
        </div>
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-60 bg-[#070a0f] h-full">
              <div className="flex justify-end p-2">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="h-8 w-8 grid place-items-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="flex-1 bg-black/60" onClick={() => setMenuOpen(false)} />
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenu={() => setMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </RequireConsoleAuth>
  );
}