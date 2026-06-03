import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  Settings,
  CreditCard,
  KeyRound,
  Bell,
  LifeBuoy,
  LogOut,
  ChevronDown,
  Sparkles,
  Rocket,
  Crown,
  Star,
} from "lucide-react";

const TIER_META: Record<string, { label: string; icon: typeof Crown; cls: string }> = {
  infinity: { label: "Infinity", icon: Star, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  elite: { label: "Elite", icon: Crown, cls: "bg-violet-50 text-violet-700 border-violet-200" },
  pro: { label: "Pro", icon: Rocket, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  free: { label: "Free", icon: Sparkles, cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

/**
 * Workspace account menu — top-right anchor of the app shell.
 * Consolidates Profile / Settings / Billing / BYOK / Notifications /
 * Help / Sign out into a single floating panel. Mirrors modern SaaS
 * patterns (Notion, Linear, Slack, ClickUp).
 */
export function AccountMenu() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const tier = (profile?.subscription_tier as string) || "free";
  const meta = TIER_META[tier] || TIER_META.free;
  const TierIcon = meta.icon;

  const name = profile?.display_name || user?.email?.split("@")[0] || "Workspace";
  const email = user?.email || "";
  const avatarUrl = (profile as any)?.avatar_url || "";
  const company = (profile as any)?.company || "Personal workspace";
  const initials = name.slice(0, 2).toUpperCase();
  const workspaceInitial = (company || name).slice(0, 1).toUpperCase();

  const item = (icon: React.ReactNode, label: string, onClick: () => void, sub?: string) => (
    <DropdownMenuItem
      onClick={onClick}
      className="cursor-pointer gap-2.5 py-2 focus:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-full border border-border bg-card hover:bg-muted/60 transition pl-1 pr-2 py-1 text-left max-w-[180px]"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-xs font-medium text-foreground truncate max-w-[100px]">
            {name}
          </span>
          <ChevronDown className="hidden md:inline w-3 h-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-2xl border border-border bg-card/95 backdrop-blur p-2 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)]"
      >
        {/* Header — workspace + user identity */}
        <div className="p-3 rounded-xl bg-muted/40 mb-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-background">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="text-xs bg-background">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md bg-foreground text-background text-[10px] font-semibold flex items-center justify-center ring-2 ring-card">
                {workspaceInitial}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground truncate">{name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{email}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className={`${meta.cls} gap-1 text-[10px] font-medium`}>
              <TierIcon className="w-3 h-3" /> {meta.label} plan
            </Badge>
            {tier !== "infinity" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-foreground hover:bg-background"
                onClick={() => navigate("/plans")}
              >
                Upgrade
              </Button>
            )}
          </div>
        </div>

        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
          Account
        </DropdownMenuLabel>
        {item(<UserIcon className="w-4 h-4" />, "Profile", () => navigate("/profile"))}
        {item(<Settings className="w-4 h-4" />, "Workspace Settings", () => navigate("/settings/workspace"))}
        {item(<CreditCard className="w-4 h-4" />, "Billing & Plan", () => navigate("/profile?tab=billing"))}
        {item(<KeyRound className="w-4 h-4" />, "API Keys · BYOK", () => navigate("/settings/api-keys"))}
        {item(<Bell className="w-4 h-4" />, "Notifications", () => navigate("/settings/notifications"))}

        <DropdownMenuSeparator />
        {item(<LifeBuoy className="w-4 h-4" />, "Help & Docs", () =>
          window.open("https://docs.hustlaiapp.in", "_blank", "noopener,noreferrer")
        )}
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="cursor-pointer gap-2.5 py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountMenu;