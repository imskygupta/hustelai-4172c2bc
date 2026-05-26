// Visibility-gated interval. Pauses ticking when the tab is hidden and
// fires once on visibilitychange → visible. Used by admin / health pollers
// to avoid burning DB cycles in backgrounded tabs.
import { useEffect, useRef } from "react";

export function useVisibilityInterval(fn: () => void | Promise<void>, intervalMs: number, deps: unknown[] = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const safeRun = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try { void fnRef.current(); } catch { /* swallow */ }
    };

    const start = () => {
      stop();
      timer = window.setInterval(safeRun, intervalMs);
    };
    const stop = () => {
      if (timer != null) { window.clearInterval(timer); timer = null; }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") { safeRun(); start(); }
      else stop();
    };

    // Initial fire is the caller's responsibility (matches old setInterval semantics).
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}