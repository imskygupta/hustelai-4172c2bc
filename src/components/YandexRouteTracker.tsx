import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { yandexHit, yandexTrack } from "@/lib/yandex";
import { trackEvent } from "@/lib/analytics";

/**
 * SPA-safe Yandex Metrica route tracker.
 * - Fires `hit` on every pathname/search change (no duplicates per location).
 * - Tracks blog scroll-depth milestones (25/50/75/100%) on /blog/* routes.
 * Mount once inside <BrowserRouter>.
 */
export function YandexRouteTracker() {
  const { pathname, search } = useLocation();
  const lastUrl = useRef<string>("");

  // Route hit
  useEffect(() => {
    const url = pathname + search;
    if (url === lastUrl.current) return;
    const referer = lastUrl.current
      ? window.location.origin + lastUrl.current
      : document.referrer;
    lastUrl.current = url;
    // Defer to next tick so document.title has updated
    const t = setTimeout(() => yandexHit(url, referer), 50);
    // Persistent route_view for our own funnel analytics
    void trackEvent("route_view", {
      surface: "spa",
      metadata: { path: pathname, search, referrer: referer || null },
    });
    return () => clearTimeout(t);
  }, [pathname, search]);

  // Blog scroll-depth tracking
  useEffect(() => {
    const isBlog =
      pathname.startsWith("/blog") ||
      (typeof window !== "undefined" &&
        window.location.hostname.startsWith("blogs."));
    if (!isBlog) return;
    const fired = new Set<number>();
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (max <= 0) return;
      const pct = Math.round((h.scrollTop / max) * 100);
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          yandexTrack(`blog_scroll_${m}` as const, { path: pathname });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}