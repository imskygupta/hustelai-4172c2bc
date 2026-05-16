import { NavLink, Outlet, useLocation } from "react-router-dom";
import { User, Shield, Bell, Plug, CreditCard, Briefcase, FileDown, Key, Settings as SettingsIcon, Cpu, Send, Wallet as WalletIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    label: "Account",
    items: [
      { to: "/settings/profile", label: "Profile", icon: User, status: "" },
      { to: "/settings/account", label: "Account", icon: SettingsIcon, status: "" },
      { to: "/settings/security", label: "Security", icon: Shield, status: "ok" },
      { to: "/settings/notifications", label: "Notifications", icon: Bell, status: "" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/settings/workspace", label: "AI Workspace", icon: Cpu, status: "" },
      { to: "/settings/exports", label: "Exports", icon: FileDown, status: "ok" },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/settings/integrations", label: "Integrations", icon: Plug, status: "ok" },
      { to: "/settings/telegram", label: "Telegram", icon: Send, status: "ok" },
      { to: "/settings/billing", label: "Billing", icon: CreditCard, status: "ok" },
      { to: "/settings/wallet", label: "Wallet & unlocks", icon: WalletIcon, status: "ok" },
      { to: "/settings/api", label: "API Keys", icon: Key, status: "soon" },
    ],
  },
  {
    label: "Direct line",
    items: [
      { to: "/settings/feedback", label: "Send feedback", icon: MessageSquare, status: "" },
    ],
  },
];

export default function SettingsLayout() {
  const { pathname } = useLocation();
  const current = SECTIONS.flatMap((s) => s.items).find((i) => pathname.startsWith(i.to));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground/80 mb-1">
            Settings
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {current?.label ?? "Settings"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your workspace, security, and integrations.
          </p>
        </div>

        {/* Mobile: horizontal scrollable pill nav. Desktop: vertical sidebar. */}
        <nav className="lg:hidden -mx-4 sm:-mx-6 mb-5 px-4 sm:px-6 overflow-x-auto no-scrollbar">
          <ul className="flex gap-2 min-w-max">
            {SECTIONS.flatMap((s) => s.items).map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={cn(
                      "inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm border min-h-tap whitespace-nowrap transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    {item.status === "soon" && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">Soon</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          <aside className="hidden lg:block lg:sticky lg:top-6 self-start">
            <nav className="space-y-6">
              {SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-2">
                    {section.label}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group",
                                isActive
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              )
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{item.label}</span>
                            {item.status === "ok" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active" />
                            )}
                            {item.status === "soon" && (
                              <span className="text-[9px] uppercase tracking-wider font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Soon</span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}