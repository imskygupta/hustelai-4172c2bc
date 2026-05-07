import { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  ClerkLoaded,
  ClerkLoading,
} from "@clerk/clerk-react";
import {
  Activity,
  CreditCard,
  Gauge,
  Key,
  LayoutDashboard,
  Network,
  ScrollText,
  Settings2,
  Webhook,
  Loader2,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

const NAV: { to: string; label: string; icon: any }[] = [
  { to: "/console", label: "Overview", icon: LayoutDashboard },
  { to: "/console/keys", label: "API keys", icon: Key },
  { to: "/console/usage", label: "Usage", icon: Gauge },
  { to: "/console/logs", label: "Request logs", icon: ScrollText },
  { to: "/console/endpoints", label: "Endpoints", icon: Network },
  { to: "/console/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/console/billing", label: "Billing", icon: CreditCard },
  { to: "/console/settings", label: "Settings", icon: Settings2 },
];

function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#070a0f] px-3 py-5">
      <Link to="/console" className="px-3 py-2 mb-4 flex items-center gap-2">
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
            end={to === "/console"}
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
        <Link to="/api-platform" className="text-[11px] text-zinc-500 hover:text-zinc-300">
          ← Back to api.hustlaiapp.in
        </Link>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="h-14 border-b border-white/[0.06] bg-[#070a0f]/80 backdrop-blur flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-400" />
        <span className="text-[12px] text-zinc-400 font-mono">api.hustlaiapp.in · production</span>
      </div>
      <div className="flex items-center gap-3">
        <SignedIn>
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </SignedIn>
      </div>
    </header>
  );
}

function GateScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#05070a] text-zinc-200 px-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
        <div className="h-10 w-10 rounded-md bg-emerald-500/15 border border-emerald-400/30 grid place-items-center text-emerald-300 font-mono mx-auto mb-4">H</div>
        <h1 className="text-[20px] font-semibold text-zinc-100">HustleAI Console</h1>
        <p className="text-[13px] text-zinc-400 mt-1.5">
          Sign in to manage API keys, usage and webhooks.
        </p>
        <div className="mt-6 flex justify-center">
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded-md bg-emerald-500 text-zinc-900 text-[13px] font-medium hover:bg-emerald-400 transition-colors">
              Sign in to console
            </button>
          </SignInButton>
        </div>
        <p className="text-[11px] text-zinc-500 mt-6">
          New here? Sign in creates your developer workspace automatically.
        </p>
      </div>
    </div>
  );
}

export default function ConsoleLayout() {
  return (
    <>
      <Helmet>
        <title>HustleAI Console — Developer Dashboard</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ClerkLoading>
        <div className="min-h-screen grid place-items-center bg-[#05070a] text-zinc-300">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedOut>
          <GateScreen />
        </SignedOut>
        <SignedIn>
          <div className="min-h-screen flex bg-[#05070a] text-zinc-200">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Topbar />
              <main className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
                  <Outlet />
                </div>
              </main>
            </div>
          </div>
        </SignedIn>
      </ClerkLoaded>
    </>
  );
}