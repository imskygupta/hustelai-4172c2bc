import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { detectSurface, isEnabled } from "@/config/runtime";

/**
 * If the user lands on docs.hustlaiapp.in/<anything that isn't /docs>,
 * rewrite the URL to /docs/<rest> so the DocsLayout renders instead of
 * the marketing homepage.
 *
 * Pure client-side redirect — no server config needed. Lovable's SPA
 * fallback already serves index.html for every path on the subdomain.
 */
export function DocsSubdomainRedirect() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!isEnabled("ENABLE_SUBDOMAIN_ROUTING") || !isEnabled("ENABLE_DOCS")) return;
      if (detectSurface() !== "docs") return;
      if (pathname.startsWith("/docs")) return;
      const target =
        pathname === "/" || pathname === ""
          ? "/docs"
          : `/docs${pathname.startsWith("/") ? "" : "/"}${pathname}`;
      navigate(`${target}${search}${hash}`, { replace: true });
    } catch (err) {
      // Never break the root site if hostname parsing throws.
      console.warn("[DocsSubdomainRedirect] safe-fallback:", err);
    }
  }, [pathname, search, hash, navigate]);

  return null;
}