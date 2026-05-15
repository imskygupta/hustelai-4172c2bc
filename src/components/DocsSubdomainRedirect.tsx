import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { detectSurface, isEnabled } from "@/config/runtime";

/**
 * Legacy bookmark fixer: if anyone lands on docs.hustlaiapp.in/docs/<slug>
 * (the old structure), strip the /docs prefix so it lines up with the new
 * flat routing where docs root is /.
 */
export function DocsSubdomainRedirect() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!isEnabled("ENABLE_SUBDOMAIN_ROUTING") || !isEnabled("ENABLE_DOCS")) return;
      if (detectSurface() !== "docs") return;
      if (!pathname.startsWith("/docs")) return;
      const stripped = pathname.replace(/^\/docs\/?/, "/") || "/";
      navigate(`${stripped}${search}${hash}`, { replace: true });
    } catch (err) {
      console.warn("[DocsSubdomainRedirect] safe-fallback:", err);
    }
  }, [pathname, search, hash, navigate]);

  return null;
}