import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Zap } from "lucide-react";
import type { Tier } from "@/lib/usage/types";

const TIER_META: Record<Tier, { label: string; icon: any; className: string }> = {
  free: { label: "Free", icon: Sparkles, className: "bg-muted text-muted-foreground" },
  pro: { label: "Pro", icon: Zap, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  elite: { label: "Elite", icon: Crown, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  infinity: { label: "Infinity", icon: Crown, className: "bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-500 border-violet-500/20" },
};

export function CapabilityBadge({ tier }: { tier: Tier }) {
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-[10px] font-medium ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
