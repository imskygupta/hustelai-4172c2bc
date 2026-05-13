/**
 * Lightweight stale-while-revalidate cache for blog reads.
 *
 * Two layers:
 *   1. In-memory map (instant for the current session, survives route changes).
 *   2. sessionStorage mirror (instant on cold reload while still in-tab).
 *
 * Returned data is "stale OK" — UIs render it immediately, then call the
 * revalidator in the background and re-render once fresh data arrives.
 * Inflight de-dup prevents thundering-herd refetches when many components
 * ask for the same key.
 *
 * Lives entirely in BLOG infra. Primary DB untouched.
 */

type Entry<T> = { value: T; ts: number };

const mem = new Map<string, Entry<any>>();
const inflight = new Map<string, Promise<any>>();
const FRESH_MS = 60_000; // serve from cache silently; older = revalidate after paint
const SS_PREFIX = "blogcache:";

function ssGet<T>(key: string): Entry<T> | null {
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function ssSet<T>(key: string, entry: Entry<T>) {
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry)); } catch { /* quota */ }
}

/** Read cached value (memory > sessionStorage). Does not fetch. */
export function readCache<T = any>(key: string): T | null {
  const m = mem.get(key);
  if (m) return m.value;
  const s = ssGet<T>(key);
  if (s) { mem.set(key, s); return s.value; }
  return null;
}

export function writeCache<T>(key: string, value: T) {
  const entry = { value, ts: Date.now() };
  mem.set(key, entry);
  ssSet(key, entry);
}

/**
 * Stale-while-revalidate fetch.
 * onData fires twice if cache is stale: once with cached, once with fresh.
 */
export async function swr<T>(
  key: string,
  fetcher: () => Promise<T>,
  onData: (value: T, fromCache: boolean) => void,
): Promise<void> {
  const cached = readCache<T>(key);
  const cachedAt = mem.get(key)?.ts ?? 0;
  if (cached) onData(cached, true);

  // Fresh enough — skip network entirely.
  if (cached && Date.now() - cachedAt < FRESH_MS) return;

  let p = inflight.get(key);
  if (!p) {
    p = fetcher().then((v) => { writeCache(key, v); return v; }).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  try {
    const fresh = await p;
    onData(fresh, false);
  } catch (e) {
    if (!cached) throw e;
    // swallow if we already showed cached data
  }
}

/**
 * Fire-and-forget prefetch — warms cache for likely-next navigation.
 * Safe to call on hover, viewport intersection, or idle.
 */
export function prefetch<T>(key: string, fetcher: () => Promise<T>) {
  if (mem.has(key)) return;
  if (inflight.has(key)) return;
  const p = fetcher()
    .then((v) => { writeCache(key, v); return v; })
    .catch(() => null)
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
}

/** Idle scheduler with rAF fallback. */
export function onIdle(fn: () => void, timeout = 1500) {
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 200);
  }
}