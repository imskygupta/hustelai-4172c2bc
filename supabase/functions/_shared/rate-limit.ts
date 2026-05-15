// Phase 6 hardening — pragmatic rate limiting for edge functions.
// Backed by `public.rate_limit_hit(bucket_key, window_seconds, max_hits)`.
//
// Usage:
//   import { enforceRateLimit, ipKey } from "../_shared/rate-limit.ts";
//   const limit = await enforceRateLimit(supabase, {
//     key: `signup:${ipKey(req)}`, windowSec: 600, max: 10,
//   });
//   if (!limit.ok) return limit.response;

import { tooManyRequests } from "./validation.ts";

export interface RateLimitOptions {
  key: string;
  windowSec: number;
  max: number;
}

export type RateLimitResult =
  | { ok: true; hits: number }
  | { ok: false; hits: number; retryAfter: number; response: Response };

/**
 * Atomic check-and-increment via the SECURITY DEFINER RPC.
 * Fails open on infra errors so a temporary DB hiccup doesn't lock everyone out.
 */
export async function enforceRateLimit(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      _bucket_key: opts.key.slice(0, 200),
      _window_seconds: opts.windowSec,
      _max_hits: opts.max,
    });
    if (error || !data || !data[0]) return { ok: true, hits: 0 };
    const row = data[0];
    if (row.allowed) return { ok: true, hits: row.hits };
    return {
      ok: false,
      hits: row.hits,
      retryAfter: row.retry_after_seconds ?? opts.windowSec,
      response: tooManyRequests(row.retry_after_seconds ?? opts.windowSec),
    };
  } catch {
    return { ok: true, hits: 0 };
  }
}

/** Coarse IP key (best-effort — Supabase strips most headers but we try a few). */
export function ipKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const cf = req.headers.get("cf-connecting-ip") ?? "";
  const ip = (fwd.split(",")[0] || cf || "unknown").trim();
  return ip || "unknown";
}

/** SHA-256 hex of a value — useful for storing privacy-preserving IP hashes. */
export async function hashValue(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}