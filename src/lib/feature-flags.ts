import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Tier = "free" | "pro" | "elite" | "infinity";
const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };

export type FeatureFlag = {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  min_tier: Tier | null;
  category: string;
};

let cache: { at: number; rows: FeatureFlag[] } | null = null;
const TTL = 60_000;

export async function loadFlags(force = false): Promise<FeatureFlag[]> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.rows;
  const { data } = await supabase.from("feature_flags" as any).select("*");
  const rows = ((data || []) as unknown) as FeatureFlag[];
  cache = { at: Date.now(), rows };
  return rows;
}

export function flagAccess(flag: FeatureFlag | undefined, userTier: Tier | undefined) {
  if (!flag) return { visible: true, locked: false, reason: "" as const };
  if (!flag.enabled) return { visible: true, locked: true, reason: "disabled" as const };
  if (flag.min_tier && TIER_RANK[userTier || "free"] < TIER_RANK[flag.min_tier]) {
    return { visible: true, locked: true, reason: "tier" as const };
  }
  return { visible: true, locked: false, reason: "" as const };
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(cache?.rows || []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let alive = true;
    loadFlags().then(rows => { if (alive) { setFlags(rows); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  const byKey = (k: string) => flags.find(f => f.feature_key === k);
  return { flags, loading, byKey, refresh: () => loadFlags(true).then(setFlags) };
}