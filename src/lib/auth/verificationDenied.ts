// Centralized handling for HTTP 403 verification_required responses.
//
// Edge functions guarded by requireVerifiedUser() return:
//   { error: "verification_required" | "account_suspended" | "profile_missing",
//     verification_required: true, ... }
//
// Frontend rule: stop polling, stop retries, surface the global
// <VerificationLock /> via a profile refresh — never spin forever.

import { supabase } from "@/integrations/supabase/client";

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

let pendingRefresh: Promise<void> | null = null;

/**
 * Call this when an edge-function response indicates the user failed
 * verification. It refreshes the auth profile so <VerificationLock /> takes
 * over, and dispatches a `hai:verification-denied` event so any active
 * pollers/loaders can cancel themselves.
 *
 * Idempotent: safe to call from many call sites concurrently.
 */
export async function handleVerificationDenied(payload?: unknown) {
  try {
    window.dispatchEvent(
      new CustomEvent("hai:verification-denied", { detail: payload ?? null }),
    );
  } catch {
    /* no window in SSR */
  }
  if (!pendingRefresh) {
    pendingRefresh = (async () => {
      try {
        await supabase.auth.refreshSession();
      } catch {
        /* refresh failures handled elsewhere */
      } finally {
        // brief debounce so a burst of denied calls collapses to one refresh
        setTimeout(() => {
          pendingRefresh = null;
        }, 1500);
      }
    })();
  }
  return pendingRefresh;
}

/**
 * Thin wrapper around supabase.functions.invoke() that auto-detects
 * verification denials. Returns { ok, data, denied } so callers can
 * stop loaders without parsing payloads themselves.
 */
export async function invokeWithTrust<T = unknown>(
  name: string,
  body?: unknown,
): Promise<{ ok: boolean; data: T | null; denied: boolean; error: unknown }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  // supabase-js surfaces HTTP errors via `error`, but the body may still be
  // attached. We inspect both.
  const candidate = (error as { context?: { body?: unknown } } | null)?.context?.body ?? data;
  if (isVerificationDenied(candidate)) {
    await handleVerificationDenied(candidate);
    return { ok: false, data: null, denied: true, error };
  }
  return { ok: !error, data: (data as T) ?? null, denied: false, error };
}
