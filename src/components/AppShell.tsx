import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Search, Bell, Crown, Sparkles, Rocket, Star, ChevronRight } from "lucide-react";

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
      <div className="min-h-screen flex w-full bg-slate-50/50">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/90 backdrop-blur-sm flex items-center gap-3 px-4 md:px-6">
            <SidebarTrigger className="text-slate-600 hover:text-slate-900" />

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

            <div className="flex-1 max-w-md ml-auto md:ml-4 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search hustles, tools, prompts…"
                  className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-emerald-300 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                      navigate(`/explore?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto md:ml-0">
              <TierBadge />
              {tier !== "infinity" && (
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 hidden sm:inline-flex"
                  onClick={() => navigate("/plans")}
                >
                  Upgrade
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Page header */}
          {(title || actions) && (
            <div className="border-b border-slate-200 bg-white px-4 md:px-8 py-5 flex items-center justify-between gap-4">
              <div>
                {title && <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900">{title}</h1>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}

          {/* Content */}
          <main className="flex-1 px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}