import { supabase } from "@/integrations/supabase/client";
import { detectEnvironment, type ResolvedFlag, type ResolvedFlagMap } from "./types";

// Cost stabilization: 30s in-memory cache was too aggressive — every tab
// reopen re-fired the RPC. Now 5 min in-memory + 5 min localStorage so a
// returning visitor reuses the prior tab's result for the whole session.
const TTL = 5 * 60_000;
const LS_KEY = "ff:v1";
let cache: { at: number; userId: string | null; map: ResolvedFlagMap } | null = null;
let inflight: Promise<ResolvedFlagMap> | null = null;

function readLs(): typeof cache {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.at || !p?.map) return null;
    return p;
  } catch { return null; }
}
function writeLs(snap: NonNullable<typeof cache>) {
  try { localStorage?.setItem(LS_KEY, JSON.stringify(snap)); } catch { /* quota */ }
}

const DEFAULT: ResolvedFlag = {
  enabled: false, source: "base", reason: "unknown",
  maintenance: false, message: null,
};

export function clearFlagCache() {
  cache = null;
  try { localStorage?.removeItem(LS_KEY); } catch { /* ignore */ }
}

export async function resolveFlags(force = false): Promise<ResolvedFlagMap> {
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id ?? null;
  if (!force) {
    if (cache && cache.userId === uid && Date.now() - cache.at < TTL) return cache.map;
    if (!cache) {
      const stored = readLs();
      if (stored && stored.userId === uid && Date.now() - stored.at < TTL) {
        cache = stored;
        return cache.map;
      }
    }
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
      writeLs(cache);
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