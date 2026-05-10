import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useCapability } from "@/lib/usage/hooks";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface Props { capabilityKey: string; compact?: boolean; }

/** Inline quota indicator. Reads current period usage from usage_counters / ai_daily_usage. */
export function QuotaBar({ capabilityKey, compact }: Props) {
  const { capability, max, unlimited, upgradeTo, loading } = useCapability(capabilityKey);
  const [used, setUsed] = useState<number>(0);

  useEffect(() => {
    if (!capability || unlimited) return;
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) return;
      try {
        if (capability.meter === "ai") {
          const today = new Date().toISOString().slice(0, 10);
          const { data } = await (supabase as any)
            .from("ai_daily_usage")
            .select("count")
            .eq("user_id", u.user.id).eq("feature", capability.feature).eq("usage_date", today)
            .maybeSingle();
          if (alive) setUsed(Number((data as any)?.count ?? 0));
        } else {
          const { data } = await (supabase as any)
            .from("usage_counters")
            .select("count, period_key")
            .eq("user_id", u.user.id).eq("meter", capability.meter).eq("feature", capability.feature)
            .order("updated_at", { ascending: false }).limit(1).maybeSingle();
          if (alive) setUsed(Number((data as any)?.count ?? 0));
        }
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, [capability, unlimited]);

  if (loading || !capability) return null;
  if (unlimited) {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${compact ? "" : "py-2"}`}>
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Unlimited {capability.label.toLowerCase()}</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  const remaining = Math.max(0, max - used);
  const danger = pct >= 90;
  return (
    <div className={`space-y-1 ${compact ? "" : "py-2"}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{capability.label}</span>
        <span className={danger ? "text-destructive font-medium" : "text-muted-foreground"}>
          {used} / {max}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {danger && (
        <Link to="/pricing" className="text-[11px] text-primary hover:underline">
          {remaining === 0 ? "Upgrade to continue" : `${remaining} left — upgrade to ${upgradeTo}`}
        </Link>
      )}
    </div>
  );
}
