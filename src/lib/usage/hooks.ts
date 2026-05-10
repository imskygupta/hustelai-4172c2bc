import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveLimits } from "./meter";
import type { LimitsPayload, Meter } from "./types";
import { CAPABILITIES, suggestUpgradeTier } from "./capabilities";

export function useUserLimits() {
  const [limits, setLimits] = useState<LimitsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) { if (alive) setLoading(false); return; }
      try {
        const p = await resolveLimits(u.user.id);
        if (alive) setLimits(p);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  return { limits, loading };
}

export function useFeatureAccess(featureKey: string): { enabled: boolean; loading: boolean } {
  const { limits, loading } = useUserLimits();
  return { enabled: !!limits?.features?.[featureKey], loading };
}

export function useQuota(meter: Meter, feature = "*") {
  const { limits, loading } = useUserLimits();
  const max = limits?.limits[`${meter}:${feature}`]?.max
           ?? limits?.limits[`${meter}:*`]?.max
           ?? -1;
  return { max, unlimited: max < 0, loading };
}

/**
 * Resolve a capability for the current user — returns max, current tier,
 * and the minimum upgrade tier that would unlock more headroom.
 */
export function useCapability(key: string) {
  const { limits, loading } = useUserLimits();
  const cap = CAPABILITIES[key];
  if (!cap) return { loading, capability: null, max: -1, unlimited: true, upgradeTo: "infinity" as const, tier: "free" as const };
  const tier = (limits?.tier ?? "free") as any;
  const max = limits?.limits[`${cap.meter}:${cap.feature}`]?.max
           ?? limits?.limits[`${cap.meter}:*`]?.max
           ?? -1;
  return {
    loading,
    capability: cap,
    max,
    unlimited: max < 0,
    tier,
    upgradeTo: suggestUpgradeTier(tier, cap),
  };
}
