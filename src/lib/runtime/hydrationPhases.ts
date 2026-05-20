/**
 * Phase 9.2 — Staged Hydration
 *
 *   PHASE_A: auth + session + shell render (blocks first paint)
 *   PHASE_B: profile, notifications, workspace summary (post-paint, fail-open)
 *   PHASE_C: infra panels, telemetry, detox, drift, provider analytics (lazy)
 *
 * Components opt into a phase via `useHydrationPhase(>= 'B')`. The phase
 * machine is local-state only — it never awaits sibling DBs.
 */
import React, { useEffect, useState, useSyncExternalStore } from "react";

export type HydrationPhase = "A" | "B" | "C";

const ORDER: HydrationPhase[] = ["A", "B", "C"];
let current: HydrationPhase = "A";
const listeners = new Set<() => void>();
const metrics: Partial<Record<HydrationPhase, number>> = { A: performance.now() };

function setPhase(next: HydrationPhase) {
  if (ORDER.indexOf(next) <= ORDER.indexOf(current)) return;
  current = next;
  metrics[next] = performance.now();
  listeners.forEach((l) => l());
}

export function getHydrationPhase(): HydrationPhase {
  return current;
}
export function getHydrationMetrics() {
  return { ...metrics };
}

/**
 * Schedule advancement. Called once from <App /> after first paint.
 * Uses requestIdleCallback when available so we never starve interaction.
 */
export function bootstrapHydration() {
  const advance = (next: HydrationPhase, delay: number) => {
    const fn = () => setPhase(next);
    const idle = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (idle) idle(fn, { timeout: delay + 500 });
    else setTimeout(fn, delay);
  };
  advance("B", 50);
  advance("C", 1_200);
}

export function useHydrationPhase(): HydrationPhase {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => "A" as HydrationPhase,
  );
}

export function useHasReachedPhase(min: HydrationPhase): boolean {
  const phase = useHydrationPhase();
  return ORDER.indexOf(phase) >= ORDER.indexOf(min);
}

/** Convenience: render `children` only when we have reached the given phase. */
export function GatedByPhase({
  min,
  fallback = null,
  children,
}: {
  min: HydrationPhase;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ready = useHasReachedPhase(min);
  const [mounted, setMounted] = useState(ready);
  useEffect(() => {
    if (ready) setMounted(true);
  }, [ready]);
  return React.createElement(React.Fragment, null, mounted ? children : fallback);
}