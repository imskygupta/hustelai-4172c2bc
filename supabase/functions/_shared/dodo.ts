// Shared Dodo Payments helper. Picks base URL by DODO_MODE (test|live).
const RAW_MODE = (Deno.env.get("DODO_MODE") || "test").toLowerCase();
// Hard guardrail: never silently fall back to test if DODO_MODE is misset.
// Allowed values: "live" | "test". Anything else is rejected.
if (RAW_MODE !== "live" && RAW_MODE !== "test") {
  throw new Error(`Invalid DODO_MODE='${RAW_MODE}'. Must be 'live' or 'test'.`);
}
export const DODO_MODE = RAW_MODE;
export const DODO_BASE = DODO_MODE === "live"
  ? "https://live.dodopayments.com"
  : "https://test.dodopayments.com";
export const DODO_API_KEY = Deno.env.get("DODO_API_KEY") || "";
export const DODO_WEBHOOK_SECRET = Deno.env.get("DODO_WEBHOOK_SECRET") || "";

// Optional sanity check on key prefix (non-fatal, logged only).
if (DODO_API_KEY) {
  const looksLive = DODO_API_KEY.startsWith("sk_live_") || DODO_API_KEY.includes("_live_");
  const looksTest = DODO_API_KEY.startsWith("sk_test_") || DODO_API_KEY.includes("_test_");
  if (DODO_MODE === "live" && looksTest) {
    console.error("[dodo] WARNING: DODO_MODE=live but API key looks like a test key");
  }
  if (DODO_MODE === "test" && looksLive) {
    console.error("[dodo] WARNING: DODO_MODE=test but API key looks like a live key");
  }
}

export async function dodo<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${DODO_BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${DODO_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Dodo ${res.status} ${path}: ${json?.error?.message || json?.message || text}`);
  }
  return json as T;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
};