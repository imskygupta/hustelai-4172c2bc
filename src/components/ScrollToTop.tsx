import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Forces window to scroll to top on every route change.
 * Mounted once inside <BrowserRouter>. Cannot be overridden per-page —
 * this is the default app behavior.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Use 'instant' so users don't see a jarring smooth-scroll animation
    // between pages. Falls back to top: 0 in older browsers.
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
    // Also reset the document scrolling element (Safari edge cases)
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
    }
  }, [pathname, search]);

  return null;
}