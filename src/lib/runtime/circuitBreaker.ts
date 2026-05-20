/**
 * Phase 9.2 — Runtime Circuit Breakers.
 *
 * Lightweight per-key breaker: trips after N consecutive failures, stays open
 * for a cool-down window with exponential backoff, then half-opens for a
 * single probe.
 */
const FAIL_THRESHOLD = 3;
const BASE_COOLDOWN_MS = 15_000;
const MAX_COOLDOWN_MS = 5 * 60_000;

type State = {
  failures: number;
  openedAt: number | null;
  cooldownMs: number;
  lastError?: string;
  trips: number;
};

import { pushEvent } from "./eventStream";

const breakers = new Map<string, State>();
const listeners = new Set<() => void>();

function get(key: string): State {
  let s = breakers.get(key);
  if (!s) {
    s = { failures: 0, openedAt: null, cooldownMs: BASE_COOLDOWN_MS, trips: 0 };
    breakers.set(key, s);
  }
  return s;
}

export function isOpen(key: string): boolean {
  const s = breakers.get(key);
  if (!s || s.openedAt === null) return false;
  if (Date.now() - s.openedAt >= s.cooldownMs) return false; // half-open
  return true;
}

export function recordSuccess(key: string) {
  const s = get(key);
  const wasOpen = s.openedAt !== null;
  s.failures = 0;
  s.openedAt = null;
  s.cooldownMs = BASE_COOLDOWN_MS;
  if (wasOpen) {
    pushEvent({
      category: "recovery",
      severity: "info",
      title: `${key} recovered`,
      detail: "Circuit breaker auto-closed after successful probe.",
      subject: key,
    });
  }
  listeners.forEach((l) => l());
}

export function recordFailure(key: string, err?: unknown) {
  const s = get(key);
  s.failures += 1;
  s.lastError = err instanceof Error ? err.message : String(err ?? "unknown");
  if (s.failures >= FAIL_THRESHOLD) {
    s.openedAt = Date.now();
    s.trips += 1;
    s.cooldownMs = Math.min(MAX_COOLDOWN_MS, s.cooldownMs * 2);
    console.warn(`[circuit-breaker] OPEN ${key} (cooldown ${s.cooldownMs}ms): ${s.lastError}`);
    pushEvent({
      category: "breaker",
      severity: "degraded",
      title: `${key} circuit opened`,
      detail: `${s.failures} consecutive failures · cooldown ${Math.round(s.cooldownMs / 1000)}s · ${s.lastError ?? ""}`,
      subject: key,
    });
  }
  listeners.forEach((l) => l());
}

export async function withBreaker<T>(
  key: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (isOpen(key)) return fallback;
  try {
    const out = await run();
    recordSuccess(key);
    return out;
  } catch (err) {
    recordFailure(key, err);
    return fallback;
  }
}

export function getBreakerSnapshot() {
  return Array.from(breakers.entries()).map(([key, s]) => ({
    key,
    open: isOpen(key),
    failures: s.failures,
    trips: s.trips,
    cooldownMs: s.cooldownMs,
    lastError: s.lastError,
  }));
}

export function subscribeBreakers(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}