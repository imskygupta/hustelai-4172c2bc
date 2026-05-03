import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Sparkles, Users, User as UserIcon, X,
  DollarSign, Film, ShieldAlert, Briefcase, Lightbulb, FileText, Search, Wrench, Compass, BarChart3, Wallet
} from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const TOOLS = [
  { label: "Gig Price", icon: DollarSign, href: "/gig-price-calculator", tier: "free" },
  { label: "Faceless Content", icon: Film, href: "/faceless-content", tier: "free" },
  { label: "Red-Flag Scanner", icon: ShieldAlert, href: "/red-flag-scanner", tier: "free" },
  { label: "Sure-Hit Jobs", icon: Briefcase, href: "/sure-hit-jobs", tier: "pro" },
  { label: "Hustle Blueprint", icon: Lightbulb, href: "/hustle-blueprint", tier: "free" },
  { label: "Resume Optimizer", icon: FileText, href: "/resume-optimizer", tier: "free" },
  { label: "Search Hustles", icon: Search, href: "/explore", tier: "free" },
  { label: "Skill Gap", icon: Compass, href: "/skill-gap", tier: "free" },
  { label: "AI Tools Bench", icon: Wrench, href: "/ai-tools", tier: "free" },
  { label: "Problem Leads", icon: BarChart3, href: "/problem-leads", tier: "pro" },
  { label: "Proposal Draft", icon: FileText, href: "/proposal-draft", tier: "free" },
  { label: "Knowledge Hub", icon: Wallet, href: "/knowledge-hub", tier: "free" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hide on auth pages
  const hideOn = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin", "/imskygupta-admin"];
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;
  if (!user) return null;

  const isActive = (href: string) => location.pathname === href;

  const go = (href: string) => {
    navigate(href);
    setDrawerOpen(false);
  };

  const Item = ({ icon: Icon, label, onClick, active }: any) => (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-all ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <>
      {/* Spacer so content isn't hidden under nav */}
      <div className="h-16 md:hidden" aria-hidden />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50 backdrop-blur-xl">
        <div className="flex items-stretch h-16 max-w-md mx-auto px-1">
          <Item icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} onClick={() => go("/dashboard")} />

          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <button
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-all ${
                  drawerOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Sparkles className={`w-5 h-5 ${drawerOpen ? "scale-110" : ""} transition-transform`} />
                  <span className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <span className="text-[10px] font-medium">Tools</span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> All Hustle Tools
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 grid grid-cols-3 gap-2 overflow-y-auto">
                {TOOLS.map((t) => (
                  <button
                    key={t.href}
                    onClick={() => go(t.href)}
                    className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 active:scale-95 transition-all"
                  >
                    {t.tier === "free" && (
                      <span className="absolute top-1 right-1 text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FREE</span>
                    )}
                    {t.tier === "pro" && (
                      <span className="absolute top-1 right-1 text-[8px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-bold">PRO</span>
                    )}
                    <t.icon className="w-5 h-5 text-primary" />
                    <span className="text-[10px] text-center leading-tight font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </DrawerContent>
          </Drawer>

          <Item icon={Users} label="Community" active={isActive("/community")} onClick={() => go("/community")} />
          <Item icon={UserIcon} label="Profile" active={isActive("/profile")} onClick={() => go("/profile")} />
        </div>
      </nav>
    </>
  );
}