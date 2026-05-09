// Shared Dodo Payments helper. Picks base URL by DODO_MODE (test|live).
export const DODO_MODE = (Deno.env.get("DODO_MODE") || "test").toLowerCase();
export const DODO_BASE = DODO_MODE === "live"
  ? "https://live.dodopayments.com"
  : "https://test.dodopayments.com";
export const DODO_API_KEY = Deno.env.get("DODO_API_KEY") || "";
export const DODO_WEBHOOK_SECRET = Deno.env.get("DODO_WEBHOOK_SECRET") || "";

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