// Backward-compatible shim. The canonical flag system now lives in src/lib/flags/.
// New code should import from "@/lib/flags".
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveFlags, clearFlagCache } from "@/lib/flags/resolver";

export type Tier = "free" | "pro" | "elite" | "infinity";
const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, elite: 2, infinity: 3 };

export type FeatureFlag = {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  enabled: boolean;            // resolved (post rollout/tier/etc.)
  min_tier: Tier | null;
  category: string;
};

let rowCache: { at: number; rows: FeatureFlag[] } | null = null;
const TTL = 60_000;

export async function loadFlags(force = false): Promise<FeatureFlag[]> {
  if (!force && rowCache && Date.now() - rowCache.at < TTL) return rowCache.rows;
  if (force) clearFlagCache();
  const [{ data: raw }, resolved] = await Promise.all([
    supabase.from("feature_flags" as any).select("id,feature_key,label,description,min_tier,category"),
    resolveFlags(force),
  ]);
  const rows: FeatureFlag[] = ((raw || []) as any[]).map((r) => ({
    id: r.id,
    feature_key: r.feature_key,
    label: r.label,
    description: r.description,
    min_tier: r.min_tier as Tier | null,
    category: r.category,
    enabled: resolved[r.feature_key]?.enabled ?? false,
  }));
  rowCache = { at: Date.now(), rows };
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
  const [flags, setFlags] = useState<FeatureFlag[]>(rowCache?.rows || []);
  const [loading, setLoading] = useState(!rowCache);
  useEffect(() => {
    let alive = true;
    loadFlags().then(rows => { if (alive) { setFlags(rows); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  const byKey = (k: string) => flags.find(f => f.feature_key === k);
  return { flags, loading, byKey, refresh: () => loadFlags(true).then(setFlags) };
}