import { supabase } from "@/integrations/supabase/client";
import { detectEnvironment, type ResolvedFlag, type ResolvedFlagMap } from "./types";

const TTL = 30_000;
let cache: { at: number; userId: string | null; map: ResolvedFlagMap } | null = null;
let inflight: Promise<ResolvedFlagMap> | null = null;

const DEFAULT: ResolvedFlag = {
  enabled: false, source: "base", reason: "unknown",
  maintenance: false, message: null,
};

export function clearFlagCache() { cache = null; }

export async function resolveFlags(force = false): Promise<ResolvedFlagMap> {
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id ?? null;
  if (!force && cache && cache.userId === uid && Date.now() - cache.at < TTL) {
    return cache.map;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.rpc("resolve_feature_flags" as any, {
        _user: uid, _env: detectEnvironment(),
      });
      if (error) throw error;
      const map = (data as ResolvedFlagMap) || {};
      cache = { at: Date.now(), userId: uid, map };
      return map;
    } catch {
      return cache?.map ?? {};
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const map = await resolveFlags();
  return !!map[key]?.enabled;
}

export async function getFlag(key: string): Promise<ResolvedFlag> {
  const map = await resolveFlags();
  return map[key] ?? DEFAULT;
}

/** Throws if feature disabled. Use in route guards / server flows. */
export async function requireFeature(key: string): Promise<void> {
  const f = await getFlag(key);
  if (!f.enabled) throw new Error(`Feature '${key}' is disabled (${f.reason || f.source})`);
}