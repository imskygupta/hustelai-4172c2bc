// Client cache for the public-bootstrap edge function. Collapses 4 hot
// PostgREST calls per visitor into a single cached payload.
//
// Strategy:
//  - 5 min localStorage cache keyed on `pb:v1`
//  - In-flight de-dupe so concurrent callers share one fetch
//  - On error: return last good cache (stale-OK), never throw
import { supabase } from "@/integrations/supabase/client";

const KEY = "pb:v1";
const TTL_MS = 5 * 60_000;

export interface PublicBootstrap {
  runtime_config: Array<{ key: string; value: unknown }>;
  social_links: Array<any>;
  unlock_packs: Array<any>;
  flags: Record<string, any>;
  generated_at: string;
}

let mem: { at: number; data: PublicBootstrap } | null = null;
let inflight: Promise<PublicBootstrap> | null = null;

function readStored(): { at: number; data: PublicBootstrap } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.at || !parsed?.data) return null;
    return parsed;
  } catch { return null; }
}

function writeStored(snap: { at: number; data: PublicBootstrap }) {
  try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* quota */ }
}

export async function getPublicBootstrap(force = false): Promise<PublicBootstrap> {
  const now = Date.now();
  if (!force) {
    if (mem && now - mem.at < TTL_MS) return mem.data;
    if (!mem) mem = readStored();
    if (mem && now - mem.at < TTL_MS) return mem.data;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("public-bootstrap", { body: {} });
      if (error) throw error;
      const snap = { at: Date.now(), data: data as PublicBootstrap };
      mem = snap;
      writeStored(snap);
      return snap.data;
    } catch (e) {
      // Fall back to last good cache, however stale.
      if (mem) return mem.data;
      const stored = readStored();
      if (stored) { mem = stored; return stored.data; }
      // Last resort: empty shape so callers don't crash.
      return { runtime_config: [], social_links: [], unlock_packs: [], flags: {}, generated_at: new Date().toISOString() };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Convenience selectors. */
export async function getCachedSocialLinks() {
  return (await getPublicBootstrap()).social_links;
}
export async function getCachedUnlockPacks() {
  return (await getPublicBootstrap()).unlock_packs;
}
export async function getCachedRuntimeConfig(): Promise<Record<string, unknown>> {
  const rows = (await getPublicBootstrap()).runtime_config;
  const out: Record<string, unknown> = {};
  for (const r of rows as any[]) out[r.key] = r.value;
  return out;
}