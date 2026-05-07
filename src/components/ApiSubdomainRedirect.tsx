import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * If the user lands on api.hustlaiapp.in/<anything that isn't /api-platform>,
 * rewrite to /api-platform/<rest> so the API marketing site renders.
 */
export function ApiSubdomainRedirect() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const isApiHost = host.startsWith("api.");
    if (!isApiHost) return;
    if (pathname.startsWith("/api-platform")) return;

    const target =
      pathname === "/" || pathname === ""
        ? "/api-platform"
        : `/api-platform${pathname.startsWith("/") ? "" : "/"}${pathname}`;
    navigate(`${target}${search}${hash}`, { replace: true });
  }, [pathname, search, hash, navigate]);

  return null;
}