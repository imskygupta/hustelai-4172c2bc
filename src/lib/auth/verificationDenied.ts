// Centralized handling for HTTP 403 verification_required responses.
//
// Edge functions guarded by requireVerifiedUser() return:
//   { error: "verification_required" | "account_suspended" | "profile_missing",
//     verification_required: true, ... }
//
// Frontend rule: stop polling, stop retries, and let the root auth gate render
// <RestrictedVerificationShell /> if the centralized trust state is restricted.

import { supabase } from "@/integrations/supabase/client";
import { runWithDeadline, TimeoutError } from "@/lib/async/timeout";

export interface VerificationDeniedPayload {
  error: string;
  verification_required?: boolean;
  verification_status?: string;
  verification_deadline?: string | null;
}

export function isVerificationDenied(payload: unknown): payload is VerificationDeniedPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    p.verification_required === true ||
    p.error === "verification_required" ||
    p.error === "account_suspended" ||
    p.error === "profile_missing"
  );
}

let lastDeniedAt = 0;

/**
 * Call this when an edge-function response indicates the user failed
 * verification. It dispatches a `hai:verification-denied` event so any active
 * pollers/loaders can cancel themselves.
 *
 * Idempotent: safe to call from many call sites concurrently.
 */
export async function handleVerificationDenied(payload?: unknown) {
  const now = Date.now();
  if (now - lastDeniedAt < 750) return;
  lastDeniedAt = now;
  try {
    window.dispatchEvent(
      new CustomEvent("hai:verification-denied", { detail: payload ?? null }),
    );
  } catch {
    /* no window in SSR */
  }
}

/**
 * Thin wrapper around supabase.functions.invoke() that auto-detects
 * verification denials. Returns { ok, data, denied } so callers can
 * stop loaders without parsing payloads themselves.
 */
export async function invokeWithTrust<T = unknown>(
  name: string,
  body?: unknown,
  options: { timeoutMs?: number } = {},
): Promise<{ ok: boolean; data: T | null; denied: boolean; timedOut: boolean; error: unknown }> {
  let data: T | null = null;
  let error: unknown = null;
  try {
    const res = await runWithDeadline(
      () => supabase.functions.invoke<T>(name, { body }),
      `functions.${name}`,
      { timeoutMs: options.timeoutMs ?? 8_000 },
    );
    data = (res.data as T) ?? null;
    error = res.error;
  } catch (err) {
    error = err;
  }
  // supabase-js surfaces HTTP errors via `error`, but the body may still be
  // attached. We inspect both.
  const candidate = await extractErrorBody(error) ?? data;
  if (isVerificationDenied(candidate)) {
    void handleVerificationDenied(candidate);
    return { ok: false, data: null, denied: true, timedOut: false, error };
  }
  return { ok: !error, data: (data as T) ?? null, denied: false, timedOut: error instanceof TimeoutError, error };
}

async function extractErrorBody(error: unknown): Promise<unknown> {
  const ctx = (error as { context?: { body?: unknown; json?: () => Promise<unknown> } } | null)?.context;
  if (!ctx) return null;
  if (ctx.body !== undefined) return ctx.body;
  if (typeof ctx.json !== "function") return null;
  try {
    return await runWithDeadline(() => ctx.json!(), "functions.errorBody", { timeoutMs: 1_000 });
  } catch {
    return null;
  }
}
