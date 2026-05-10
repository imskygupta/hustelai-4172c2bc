// Rage-click & retry-loop detector.
// Reports to friction_signals when user shows frustration patterns.
import { supabase } from "@/integrations/supabase/client";
import { track, EVENTS } from "./track";

const RAGE_WINDOW_MS = 1200;
const RAGE_THRESHOLD = 4;

const buckets = new Map<string, number[]>();

function key(surface: string, kind: string) {
  return `${surface}::${kind}`;
}

function emit(surface: string, kind: string, count: number, metadata: Record<string, unknown> = {}) {
  track(EVENTS.RAGE_CLICK, { surface, metadata: { kind, count, ...metadata } });
  void supabase.from("friction_signals").insert([{
    surface,
    signal_kind: kind,
    count,
    metadata: metadata as never,
  }]);
}

/** Record a click on a specific surface. If 4+ clicks within 1.2s, fires a rage signal. */
export function recordClick(surface: string, kind: string = "click"): void {
  const k = key(surface, kind);
  const now = Date.now();
  const arr = buckets.get(k) ?? [];
  const fresh = arr.filter((t) => now - t < RAGE_WINDOW_MS);
  fresh.push(now);
  buckets.set(k, fresh);
  if (fresh.length >= RAGE_THRESHOLD) {
    emit(surface, kind, fresh.length);
    buckets.set(k, []); // reset after firing
  }
}

/** Record a failed retry — fires after 3+ failures in any short window. */
export function recordRetryFailure(surface: string, error?: string): void {
  const k = key(surface, "retry_fail");
  const now = Date.now();
  const arr = buckets.get(k) ?? [];
  const fresh = arr.filter((t) => now - t < 30_000);
  fresh.push(now);
  buckets.set(k, fresh);
  if (fresh.length >= 3) {
    emit(surface, "retry_loop", fresh.length, { error });
    buckets.set(k, []);
  }
}

/** One-shot signal (e.g. modal reopened 5 times). */
export function recordFriction(surface: string, kind: string, metadata: Record<string, unknown> = {}) {
  emit(surface, kind, 1, metadata);
}