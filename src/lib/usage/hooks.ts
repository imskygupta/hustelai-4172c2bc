import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveLimits } from "./meter";
import type { LimitsPayload, Meter } from "./types";

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
