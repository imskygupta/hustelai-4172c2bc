/**
 * Dev-only runtime leak detector.
 *
 * Temporary instrumentation for the Runtime Stability Verification pass.
 * Logs a single grouped console summary every 30s when:
 *   - import.meta.env.DEV is true, OR
 *   - localStorage.hai_runtime_trace === "1"
 *
 * Tracks:
 *   - active in-flight runtime requests (from timeout.ts)
 *   - active boot tasks
 *   - live intervals / timeouts created via the patched setInterval/setTimeout
 *   - registered event listeners (count delta only)
 *   - hydration phase timings
 *
 * Never throws, never blocks, never holds references beyond IDs.
 */
import {
  getActiveRuntimeRequests,
  getActiveBootTasks,
} from "@/lib/async/timeout";
import { getHydrationMetrics, getHydrationPhase } from "@/lib/runtime/hydrationPhases";

let installed = false;
const liveIntervals = new Set<number>();
const liveTimeouts = new Set<number>();
let listenerDelta = 0;

function isEnabled(): boolean {
  try {
    if ((import.meta as any).env?.DEV) return true;
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hai_runtime_trace") === "1";
  } catch {
    return false;
  }
}

export function installLeakDetector() {
  if (installed || typeof window === "undefined" || !isEnabled()) return;
  installed = true;

  // Patch timers — non-invasive, only tracks IDs.
  const _setInterval = window.setInterval.bind(window);
  const _clearInterval = window.clearInterval.bind(window);
  const _setTimeout = window.setTimeout.bind(window);
  const _clearTimeout = window.clearTimeout.bind(window);

  (window as any).setInterval = ((fn: any, ms?: any, ...rest: any[]) => {
    const id = _setInterval(fn, ms, ...rest);
    liveIntervals.add(id as unknown as number);
    return id;
  }) as typeof window.setInterval;
  (window as any).clearInterval = ((id: any) => {
    liveIntervals.delete(id);
    return _clearInterval(id);
  }) as typeof window.clearInterval;
  (window as any).setTimeout = ((fn: any, ms?: any, ...rest: any[]) => {
    const id = _setTimeout((...a: any[]) => {
      liveTimeouts.delete(id as unknown as number);
      try { return fn(...a); } catch (e) { throw e; }
    }, ms, ...rest);
    liveTimeouts.add(id as unknown as number);
    return id;
  }) as typeof window.setTimeout;
  (window as any).clearTimeout = ((id: any) => {
    liveTimeouts.delete(id);
    return _clearTimeout(id);
  }) as typeof window.clearTimeout;

  // Listener delta (add - remove) — purely diagnostic.
  const targetProto = EventTarget.prototype;
  const _add = targetProto.addEventListener;
  const _rem = targetProto.removeEventListener;
  targetProto.addEventListener = function (...args: any[]) {
    listenerDelta += 1;
    return _add.apply(this, args as any);
  };
  targetProto.removeEventListener = function (...args: any[]) {
    listenerDelta -= 1;
    return _rem.apply(this, args as any);
  };

  // Watch for unhandled promise rejections — surface as a leak signal.
  let unhandled = 0;
  window.addEventListener("unhandledrejection", () => { unhandled += 1; });

  _setInterval(() => {
    const reqs = getActiveRuntimeRequests();
    const boot = getActiveBootTasks();
    const metrics = getHydrationMetrics();
    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `%c[runtime-leak] phase=${getHydrationPhase()} reqs=${reqs.length} ` +
      `intervals=${liveIntervals.size} timeouts=${liveTimeouts.size} ` +
      `listenersΔ=${listenerDelta} unhandled=${unhandled}`,
      "color:#88c",
    );
    if (reqs.length) console.table(reqs);
    if (boot.length) console.table(boot);
    console.info("hydration", metrics);
    console.groupEnd();
  }, 30_000);
}
