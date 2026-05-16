/**
 * Lightweight auth anomaly telemetry. Posts to the existing `admin-alert`
 * edge function (which already dedupes server-side) and rate-limits in
 * memory + sessionStorage so a single client can never flood operators.
 *
 * Intentionally fire-and-forget: never throws, never blocks auth flow.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "hai_auth_telemetry_v1";
const WINDOW_MS = 5 * 60 * 1000; // 5 min rolling window
const MAX_PER_KIND = 3; // hard cap per kind per window per tab

type Counter = Record<string, { count: number; first: number }>;

function readCounter(): Counter {
  try {
    if (typeof sessionStorage === "undefined") return {};
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch { return {}; }
}
function writeCounter(c: Counter) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

export type AuthAnomalyKind =
  | "auth.refresh_failure_spike"
  | "auth.workspace_reconnect_loop"
  | "auth.session_mismatch"
  | "auth.invalid_handoff"
  | "auth.login_loop";

export function reportAuthAnomaly(
  kind: AuthAnomalyKind,
  meta: Record<string, unknown> = {},
) {
  try {
    const counter = readCounter();
    const now = Date.now();
    const entry = counter[kind];
    if (entry && now - entry.first < WINDOW_MS) {
      if (entry.count >= MAX_PER_KIND) return;
      entry.count += 1;
    } else {
      counter[kind] = { count: 1, first: now };
    }
    writeCounter(counter);

    const host = typeof window !== "undefined" ? window.location.hostname : "server";
    void supabase.functions.invoke("admin-alert", {
      body: {
        kind,
        severity: "warning",
        source: "client.auth",
        feature: "auth",
        message: `${kind} on ${host}`,
        meta: { host, path: typeof window !== "undefined" ? window.location.pathname : "", ...meta },
      },
    }).catch(() => { /* never block auth on telemetry */ });
  } catch {
    // Telemetry must never throw.
  }
}