import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Read-only auth diagnostic surface. Renders only state visible from the
 * existing AuthProvider context, document.cookie, and localStorage keys.
 * Does NOT mutate session, refresh tokens, or auth storage in any way.
 * Does NOT render raw JWTs, refresh tokens, or any secret material.
 */

const AUTH_DEBUG_KEY = "hustleai_auth_debug";
const BRIDGE_COOKIE = "hai_auth_bridge";

function fmtTs(seconds?: number | null): string {
  if (!seconds) return "n/a";
  try {
    return new Date(seconds * 1000).toISOString();
  } catch {
    return "n/a";
  }
}

function bridgeCookiePresent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${BRIDGE_COOKIE}=`));
}

function listSupabaseTokenKeys(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
  } catch {
    return [];
  }
}

export default function AuthDebug() {
  const { user, session, profile, loading } = useAuth();
  const location = useLocation();
  const [now, setNow] = useState(() => new Date().toISOString());
  const [mountedAt] = useState(() => Date.now());
  const [hydratedAt, setHydratedAt] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading && hydratedAt === null) setHydratedAt(Date.now());
  }, [loading, hydratedAt]);

  const debugFlag = (() => {
    try {
      return localStorage.getItem(AUTH_DEBUG_KEY) === "1";
    } catch {
      return false;
    }
  })();

  const tokenKeys = listSupabaseTokenKeys();
  const expiresAtIso = fmtTs(session?.expires_at ?? null);
  const expiresInSec = session?.expires_at
    ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000))
    : null;

  const rows: Array<[string, string]> = [
    ["auth hydrated", loading ? "false" : "true"],
    ["loading flag", String(loading)],
    ["user id", user?.id ?? "—"],
    ["user email", user?.email ?? "—"],
    ["profile tier", profile?.subscription_tier ?? "—"],
    ["session present", session ? "yes" : "no"],
    ["session expires_at", expiresAtIso],
    ["session expires_in (sec)", expiresInSec === null ? "n/a" : String(expiresInSec)],
    ["bridge cookie detected", bridgeCookiePresent() ? "yes" : "no"],
    ["sb-* token keys (count)", String(tokenKeys.length)],
    ["host", typeof window !== "undefined" ? window.location.hostname : "—"],
    ["origin", typeof window !== "undefined" ? window.location.origin : "—"],
    ["protocol", typeof window !== "undefined" ? window.location.protocol : "—"],
    ["route", `${location.pathname}${location.search}`],
    ["debug flag (?authdebug=1)", debugFlag ? "on" : "off"],
    ["mounted at", new Date(mountedAt).toISOString()],
    ["hydrated at", hydratedAt ? new Date(hydratedAt).toISOString() : "—"],
    ["hydration delay (ms)", hydratedAt ? String(hydratedAt - mountedAt) : "—"],
    ["now", now],
  ];

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "#0a0a0a", color: "#e6e6e6", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>Auth Debug (read-only)</h1>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
        No raw tokens are rendered. To capture middleware redirect reasons in the console,
        append <code>?authdebug=1</code> to any URL once.
      </p>
      <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: "4px 16px 4px 0", color: "#888", verticalAlign: "top", whiteSpace: "nowrap" }}>{k}</td>
              <td style={{ padding: "4px 0", wordBreak: "break-all" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: "#555", marginTop: 24 }}>
        This page does not mutate session state. Redirect reasons + middleware timing are
        emitted to the console under the <code>[auth]</code> prefix when the debug flag is on.
      </p>
    </div>
  );
}