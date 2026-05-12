import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getSuggestions,
  type NextActionSuggestion,
  type NextActionTrigger,
} from "@/lib/nextActions/registry";

interface ContextSignals {
  telegramConnected: boolean;
  tier: string;
  signedIn: boolean;
}

function useContextSignals(): ContextSignals {
  const { user, profile } = useAuth();
  const tier = (profile?.subscription_tier as string) || "free";
  const [telegramConnected, setTg] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) { setTg(false); return; }
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("notification_integrations")
          .select("status")
          .eq("user_id", user.id)
          .eq("provider", "telegram")
          .eq("status", "active")
          .limit(1);
        if (alive) setTg(Array.isArray(data) && data.length > 0);
      } catch {
        if (alive) setTg(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  return { telegramConnected, tier, signedIn: !!user };
}

/**
 * Filter registry by tier / integrations / auth.
 * Cap to 3 suggestions to keep the UX calm.
 */
export function useNextActions(trigger: NextActionTrigger | null): NextActionSuggestion[] {
  const { telegramConnected, tier, signedIn } = useContextSignals();

  return useMemo(() => {
    if (!trigger) return [];
    const all = getSuggestions(trigger);
    const filtered = all.filter((s) => {
      if (s.authedOnly && !signedIn) return false;
      if (s.hideForTiers?.includes(tier)) return false;
      if (s.requiresIntegration === "telegram" && !telegramConnected) return false;
      return true;
    });

    // Telegram-related suggestions become lower priority once already connected
    const sorted = [...filtered].sort((a, b) => {
      const aTg = a.id.includes("telegram") || a.id.startsWith("tg.");
      const bTg = b.id.includes("telegram") || b.id.startsWith("tg.");
      if (aTg && telegramConnected) return 1;
      if (bTg && telegramConnected) return -1;
      return 0;
    });

    return sorted.slice(0, 3);
  }, [trigger, telegramConnected, tier, signedIn]);
}
