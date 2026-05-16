// Lightweight client crash reporter. Forwards window errors and unhandled
// promise rejections to the admin-alert edge function with throttling so
// Telegram is never spammed. Sentry remains the primary stack-trace sink;
// this layer exists so operators see an aggregated "client crash" signal
// even when Sentry DSN is not configured.
import { supabase } from "@/integrations/supabase/client";

const RECENT = new Map<string, number>();
const COOLDOWN_MS = 60_000; // one alert per signature per minute
const MAX_PER_5MIN = 8;
let windowCount = 0;
let windowStart = Date.now();

function throttled(key: string): boolean {
  const now = Date.now();
  if (now - windowStart > 300_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= MAX_PER_5MIN) return true;
  const last = RECENT.get(key) || 0;
  if (now - last < COOLDOWN_MS) return true;
  RECENT.set(key, now);
  windowCount++;
  if (RECENT.size > 200) {
    for (const [k, t] of RECENT) if (now - t > COOLDOWN_MS * 4) RECENT.delete(k);
  }
  return false;
}

function send(kind: string, message: string, meta: Record<string, unknown>) {
  const key = `${kind}::${message.slice(0, 100)}`;
  if (throttled(key)) return;
  try {
    void supabase.functions.invoke("admin-alert", {
      body: {
        kind,
        severity: "error",
        source: "client",
        message: message.slice(0, 400),
        meta: { ...meta, route: typeof location !== "undefined" ? location.pathname : "" },
      },
    }).catch(() => {});
  } catch { /* never break the app */ }
}

let installed = false;
export function installCrashReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e: ErrorEvent) => {
    const msg = e?.message || "Unknown error";
    // Ignore noisy ResizeObserver loop warnings
    if (/ResizeObserver loop/.test(msg)) return;
    send("client.crash", msg, {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e?.error?.stack?.slice(0, 600),
    });
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason: any = e?.reason;
    const msg = typeof reason === "string" ? reason : (reason?.message || "Unhandled rejection");
    send("client.unhandled_rejection", msg, {
      stack: reason?.stack?.slice(0, 600),
    });
  });
}

/** Manual reporter for React error boundaries. */
export function reportBoundaryCrash(error: Error, info?: { componentStack?: string }) {
  send("client.crash", error?.message || "Render crash", {
    stack: error?.stack?.slice(0, 600),
    component_stack: info?.componentStack?.slice(0, 600),
  });
}