import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Forces window to scroll to top on every route change.
 * Resets window + documentElement + body scroll, and any nested
 * scrollable <main> containers (e.g. AppShell). Uses both
 * useLayoutEffect (pre-paint) and useEffect (post-paint) to defeat
 * late-mounted layouts that re-set scroll.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  const reset = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    // Reset any nested scrollable shells (AppShell main, sidebar wrappers)
    document.querySelectorAll<HTMLElement>("main, [data-scroll-root]").forEach((el) => {
      el.scrollTop = 0;
    });
  };

  useLayoutEffect(() => { reset(); }, [pathname, search]);
  useEffect(() => {
    reset();
    // Run again after layout settles (animations, late mounts)
    const t = setTimeout(reset, 50);
    return () => clearTimeout(t);
  }, [pathname, search]);

  return null;
}