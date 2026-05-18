import { env } from "./env.js";

const RECENT = new Map<string, number>();
const MAX_ENTRIES = 1000;

export function isDuplicate(key: string): boolean {
  const now = Date.now();
  const last = RECENT.get(key) || 0;
  if (now - last < env.DEDUPE_WINDOW_MS) return true;
  RECENT.set(key, now);
  if (RECENT.size > MAX_ENTRIES) {
    const cutoff = now - env.DEDUPE_WINDOW_MS * 4;
    for (const [k, t] of RECENT) if (t < cutoff) RECENT.delete(k);
  }
  return false;
}

export function dedupeKey(parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? "")).join("::").slice(0, 240);
}