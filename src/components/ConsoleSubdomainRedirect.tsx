import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * console.api.hustlaiapp.in/<x> -> /console/<x>
 * Keeps the developer dashboard on its own subdomain while sharing one SPA.
 */
export function ConsoleSubdomainRedirect() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const host = window.location.hostname || "";
      if (!/^console\.api\./i.test(host)) return;
      if (pathname.startsWith("/console")) return;
      const target =
        pathname === "/" || pathname === ""
          ? "/console"
          : `/console${pathname.startsWith("/") ? "" : "/"}${pathname}`;
      navigate(`${target}${search}${hash}`, { replace: true });
    } catch (err) {
      console.warn("[ConsoleSubdomainRedirect] safe-fallback:", err);
    }
  }, [pathname, search, hash, navigate]);

  return null;
}