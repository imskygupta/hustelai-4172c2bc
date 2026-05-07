import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * status.hustlaiapp.in/<x> -> /status
 * Always safe — wrapped in try/catch so a bad host never breaks the root site.
 */
export function StatusSubdomainRedirect() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const host = window.location.hostname || "";
      if (!/^status\./i.test(host)) return;
      if (pathname.startsWith("/status")) return;
      const target =
        pathname === "/" || pathname === ""
          ? "/status"
          : `/status${pathname.startsWith("/") ? "" : "/"}${pathname}`;
      navigate(`${target}${search}${hash}`, { replace: true });
    } catch (err) {
      console.warn("[StatusSubdomainRedirect] safe-fallback:", err);
    }
  }, [pathname, search, hash, navigate]);

  return null;
}