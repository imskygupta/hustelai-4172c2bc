// Phase 6 hardening — Zod-based request validation helpers for edge functions.
// Usage:
//   import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
//   import { parseJson, badRequest } from "../_shared/validation.ts";
//   const Body = z.object({ email: z.string().email().max(255) });
//   const parsed = await parseJson(req, Body);
//   if (!parsed.ok) return parsed.response;
//   const { email } = parsed.data;

import { z, ZodSchema } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export { z };

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PATCH, PUT, DELETE",
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

export function badRequest(message: string, details?: unknown) {
  return jsonResponse({ error: message, details: details ?? null }, 400);
}

export function unauthorized(message = "Unauthorized") {
  return jsonResponse({ error: message }, 401);
}

export function forbidden(message = "Forbidden") {
  return jsonResponse({ error: message }, 403);
}

export function tooManyRequests(retryAfterSeconds = 60) {
  return jsonResponse(
    { error: "Rate limit exceeded", retry_after_seconds: retryAfterSeconds },
    429,
    { "Retry-After": String(retryAfterSeconds) },
  );
}

/**
 * Safely parse JSON body against a Zod schema.
 * Returns either { ok: true, data } or { ok: false, response } so callers can early-return.
 */
export async function parseJson<T>(
  req: Request,
  schema: ZodSchema<T>,
  opts: { maxBytes?: number } = {},
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const max = opts.maxBytes ?? 256 * 1024; // 256KB cap by default
  let raw: string;
  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > max) {
      return { ok: false, response: badRequest("Payload too large") };
    }
    raw = new TextDecoder().decode(buf);
  } catch {
    return { ok: false, response: badRequest("Could not read request body") };
  }

  let parsed: unknown;
  try {
    parsed = raw.length === 0 ? {} : JSON.parse(raw);
  } catch {
    return { ok: false, response: badRequest("Invalid JSON") };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      response: badRequest("Validation failed", result.error.flatten().fieldErrors),
    };
  }
  return { ok: true, data: result.data };
}

/** Pull only allowlisted fields from an object — defends against mass assignment. */
export function pickAllowed<T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  allowed: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of allowed) {
    if (k in source && source[k] !== undefined) out[k] = source[k];
  }
  return out;
}

/** Common reusable schemas. */
export const S = {
  uuid: () => z.string().uuid(),
  email: () => z.string().trim().toLowerCase().email().max(255),
  shortText: (max = 255) => z.string().trim().min(1).max(max),
  longText: (max = 5000) => z.string().trim().min(1).max(max),
  url: () => z.string().trim().url().max(2048),
  posInt: (max = 1_000_000) => z.number().int().positive().max(max),
};