// Execution Trust Context — single source of truth for who is calling an edge function.
//
// Distinguishes verified users from trusted internal/service/cron callers so
// privileged AI/runtime functions can accept legitimate non-user invocations
// without re-opening the public attack surface.
//
// Usage:
//   import { requireExecutionTrust } from "../_shared/execution-trust.ts";
//   const trust = await requireExecutionTrust(req, {
//     allow: ["user_verified", "internal_service", "cron_system"],
//     fn: "ai-job-runner",
//   });
//   if (!trust.ok) return trust.response;
//   // trust.context tells you which path was taken.
//
// Internal callers must sign requests with INTERNAL_SERVICE_SECRET; see
// signInternalRequest() below.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { requireVerifiedUser } from "./require-verified.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hustle-internal-signature, x-hustle-service, x-hustle-timestamp, x-hustle-nonce",
};

export type TrustContext =
  | "user_verified"
  | "user_unverified"
  | "internal_service"
  | "cron_system"
  | "admin_operator";

export type ExecutionTrust =
  | {
      ok: true;
      context: TrustContext;
      user?: { id: string; email: string | null };
      service?: { name: string };
      trustTier?: 0 | 1 | 2 | 3;
    }
  | { ok: false; response: Response; context: TrustContext };

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const seenNonces = new Map<string, number>();

function pruneNonces() {
  const cutoff = Date.now() - REPLAY_WINDOW_MS;
  for (const [k, t] of seenNonces) if (t < cutoff) seenNonces.delete(k);
}

function deny(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const ALLOWED_SERVICES = new Set([
  "workflow-runner",
  "ai-job-runner",
  "notifications-broadcast",
  "telemetry-router",
  "event-dispatcher",
  "intelligence-anomaly-scan",
  "blog-automation-audit",
  "editorial-pipeline",
  "retention-worker",
  "cron-system",
]);

export interface RequireTrustOptions {
  allow: TrustContext[];
  /** Logical function name for audit metadata. */
  fn: string;
  /** Minimum trust tier when context is `user_verified`. */
  minTier?: 2 | 3;
}

export async function requireExecutionTrust(
  req: Request,
  opts: RequireTrustOptions,
): Promise<ExecutionTrust> {
  const allow = new Set(opts.allow);

  // ── 1. Internal service signature path ─────────────────────────────────────
  const sig = req.headers.get("x-hustle-internal-signature");
  const svc = req.headers.get("x-hustle-service");
  const ts = req.headers.get("x-hustle-timestamp");
  const nonce = req.headers.get("x-hustle-nonce");

  if (sig || svc || ts || nonce) {
    // All four required — fail closed on partial signatures.
    if (!sig || !svc || !ts || !nonce) {
      await logTrustEvent(req, {
        type: "invalid_service_signature",
        reason: "incomplete_signature_headers",
        fn: opts.fn,
        service: svc,
      });
      return {
        ok: false,
        context: "internal_service",
        response: deny(401, { error: "invalid_internal_signature" }),
      };
    }

    const secret = Deno.env.get("INTERNAL_SERVICE_SECRET");
    if (!secret) {
      // Fail closed: missing secret means we cannot verify.
      return {
        ok: false,
        context: "internal_service",
        response: deny(503, { error: "internal_signing_unavailable" }),
      };
    }

    if (!ALLOWED_SERVICES.has(svc)) {
      await logTrustEvent(req, {
        type: "invalid_service_signature",
        reason: "service_not_allowlisted",
        fn: opts.fn,
        service: svc,
      });
      return {
        ok: false,
        context: "internal_service",
        response: deny(403, { error: "service_not_allowed" }),
      };
    }

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > REPLAY_WINDOW_MS) {
      await logTrustEvent(req, {
        type: "replay_attempt",
        reason: "stale_timestamp",
        fn: opts.fn,
        service: svc,
      });
      return {
        ok: false,
        context: "internal_service",
        response: deny(401, { error: "stale_signature" }),
      };
    }

    pruneNonces();
    if (seenNonces.has(nonce)) {
      await logTrustEvent(req, {
        type: "replay_attempt",
        reason: "nonce_reused",
        fn: opts.fn,
        service: svc,
      });
      return {
        ok: false,
        context: "internal_service",
        response: deny(401, { error: "nonce_replay" }),
      };
    }

    const expected = await hmacSha256(secret, `${svc}.${ts}.${nonce}.${opts.fn}`);
    if (expected !== sig) {
      await logTrustEvent(req, {
        type: "invalid_service_signature",
        reason: "hmac_mismatch",
        fn: opts.fn,
        service: svc,
      });
      return {
        ok: false,
        context: "internal_service",
        response: deny(401, { error: "bad_signature" }),
      };
    }

    seenNonces.set(nonce, Date.now());
    const context: TrustContext = svc === "cron-system" ? "cron_system" : "internal_service";

    if (!allow.has(context)) {
      return {
        ok: false,
        context,
        response: deny(403, { error: "context_not_allowed", context }),
      };
    }

    return { ok: true, context, service: { name: svc } };
  }

  // ── 2. Bearer-user path ────────────────────────────────────────────────────
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return {
      ok: false,
      context: "user_unverified",
      response: deny(401, { error: "unauthenticated", message: "Sign in required." }),
    };
  }

  // Defer to existing verified-user guard for status/tier semantics.
  const gate = await requireVerifiedUser(req, {
    minTier: opts.minTier,
    denialEvent: "verification_blocked_runtime",
    fn: opts.fn,
  });
  if (!gate.ok) {
    return { ok: false, context: "user_unverified", response: gate.response };
  }

  // Detect admin operator (verified user with admin role) — best-effort.
  let context: TrustContext = "user_verified";
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", gate.user.id);
    if (roles?.some((r) => r.role === "admin" || r.role === "super_admin")) {
      context = "admin_operator";
    }
  } catch {
    /* role check is best-effort; default to user_verified */
  }

  if (!allow.has(context) && !allow.has("user_verified")) {
    return {
      ok: false,
      context,
      response: deny(403, { error: "context_not_allowed", context }),
    };
  }

  return {
    ok: true,
    context,
    user: gate.user,
    trustTier: gate.trustTier,
  };
}

/**
 * Helper for one edge function calling another. Produces the four headers
 * `requireExecutionTrust` expects on the internal-service path.
 *
 * Caller must set INTERNAL_SERVICE_SECRET in env. Target function name
 * (`targetFn`) is bound into the signature, so signatures cannot be reused
 * across endpoints.
 */
export async function signInternalRequest(
  callerService: string,
  targetFn: string,
): Promise<Record<string, string>> {
  const secret = Deno.env.get("INTERNAL_SERVICE_SECRET");
  if (!secret) throw new Error("INTERNAL_SERVICE_SECRET not configured");
  const ts = Date.now().toString();
  const nonce = crypto.randomUUID();
  const sig = await hmacSha256(secret, `${callerService}.${ts}.${nonce}.${targetFn}`);
  return {
    "x-hustle-internal-signature": sig,
    "x-hustle-service": callerService,
    "x-hustle-timestamp": ts,
    "x-hustle-nonce": nonce,
  };
}

async function logTrustEvent(
  req: Request,
  args: {
    type: "invalid_service_signature" | "replay_attempt" | "blocked_internal_call";
    reason: string;
    fn: string;
    service?: string | null;
  },
) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return;
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.rpc("log_security_auth_event", {
      _user_id: null,
      _email: null,
      _event_type: args.type,
      _severity: "warn",
      _ip: req.headers.get("x-forwarded-for") ?? null,
      _user_agent: req.headers.get("user-agent") ?? null,
      _metadata: { fn: args.fn, service: args.service ?? null, reason: args.reason },
    });
  } catch {
    /* never fail the gate because logging failed */
  }
}
