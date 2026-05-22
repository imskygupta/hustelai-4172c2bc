// Centralized verified-user guard for edge functions.
//
// Usage at the top of any privileged edge function:
//   import { requireVerifiedUser } from "../_shared/require-verified.ts";
//   const gate = await requireVerifiedUser(req);
//   if (!gate.ok) return gate.response;
//   const { user, profile } = gate;
//
// Returns HTTP 403 with a structured payload the frontend can react to.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export type VerifiedGate =
  | {
      ok: true;
      user: { id: string; email: string | null };
      profile: {
        verification_status: "pending" | "verified" | "suspended" | "flagged";
        verification_deadline: string | null;
        verified_at: string | null;
        restricted_reason: string | null;
        subscription_tier: string | null;
      };
      trustTier: 0 | 1 | 2 | 3;
    }
  | { ok: false; response: Response };

function deny(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function trustTierFor(
  status: string,
  tier: string | null,
): 0 | 1 | 2 | 3 {
  if (status !== "verified") return 1;
  if (tier && ["pro", "elite", "infinity"].includes(tier)) return 3;
  return 2;
}

async function withDeadline<T>(p: PromiseLike<T>, label: string, ms = 8_000): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(p),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function requireVerifiedUser(
  req: Request,
  opts: {
    minTier?: 2 | 3;
    /**
     * Surface a structured security event when access is denied for verification reasons.
     * Set to one of the supported denial event types so observability stays consistent.
     */
    denialEvent?:
      | "verification_blocked_ai"
      | "verification_blocked_runtime"
      | "verification_blocked_export";
    /** Logical function or surface name used in the audit metadata. */
    fn?: string;
  } = {},
): Promise<VerifiedGate> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return {
      ok: false,
      response: deny(401, {
        error: "unauthenticated",
        message: "Sign in required.",
      }),
    };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    // Fail closed for runtime; missing config should not silently grant access.
    return {
      ok: false,
      response: deny(503, {
        error: "auth_unavailable",
        message: "Verification service is temporarily unavailable.",
      }),
    };
  }

  const authed = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: ue } = await withDeadline(authed.auth.getUser(), "auth_get_user");
  if (ue || !u?.user) {
    return {
      ok: false,
      response: deny(401, {
        error: "unauthenticated",
        message: "Session invalid or expired.",
      }),
    };
  }
  const user = u.user;

  // Read profile with service role so RLS can't accidentally hide it.
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: pe } = await withDeadline(
    admin
      .from("profiles")
      .select(
        "verification_status, verification_deadline, verified_at, restricted_reason, subscription_tier",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    "profile_lookup",
  );

  if (pe || !profile) {
    await maybeLogDenial(url, service, opts, req, {
      userId: user.id,
      email: user.email ?? null,
      reason: "profile_missing",
    });
    return {
      ok: false,
      response: deny(403, {
        error: "profile_missing",
        message: "Account is not fully provisioned. Please verify your email.",
        verification_required: true,
      }),
    };
  }

  // Defense in depth: also confirm Supabase Auth says email is confirmed.
  const emailConfirmed = !!user.email_confirmed_at;
  const status = profile.verification_status as VerifiedGate extends { ok: true }
    ? never
    : string;

  if (profile.verification_status === "suspended") {
    await maybeLogDenial(url, service, opts, req, {
      userId: user.id,
      email: user.email ?? null,
      reason: "suspended",
    });
    return {
      ok: false,
      response: deny(403, {
        error: "account_suspended",
        message:
          profile.restricted_reason ||
          "Account is suspended. Please re-verify your email to restore access.",
        verification_required: true,
      }),
    };
  }

  if (profile.verification_status !== "verified" || !emailConfirmed) {
    await maybeLogDenial(url, service, opts, req, {
      userId: user.id,
      email: user.email ?? null,
      reason: "unverified",
    });
    return {
      ok: false,
      response: deny(403, {
        error: "verification_required",
        message:
          "Verify your email to use this feature. Check your inbox for the confirmation link.",
        verification_required: true,
        verification_status: profile.verification_status,
        verification_deadline: profile.verification_deadline,
        email: user.email,
      }),
    };
  }

  const trustTier = trustTierFor(
    profile.verification_status,
    profile.subscription_tier ?? null,
  );

  if (opts.minTier && trustTier < opts.minTier) {
    await maybeLogDenial(url, service, opts, req, {
      userId: user.id,
      email: user.email ?? null,
      reason: "tier_required",
      currentTier: trustTier,
    });
    return {
      ok: false,
      response: deny(403, {
        error: "tier_required",
        message: "This feature requires an upgraded plan.",
        required_tier: opts.minTier,
        current_tier: trustTier,
      }),
    };
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? null },
    profile: profile as VerifiedGate extends { ok: true } ? never : never,
    trustTier,
  } as VerifiedGate;
}

async function maybeLogDenial(
  url: string,
  service: string,
  opts: { denialEvent?: string; fn?: string },
  req: Request,
  ctx: {
    userId?: string | null;
    email?: string | null;
    reason: string;
    currentTier?: number;
  },
) {
  if (!opts.denialEvent) return;
  try {
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.rpc("log_security_auth_event", {
      _user_id: ctx.userId ?? null,
      _email: ctx.email ?? null,
      _event_type: opts.denialEvent,
      _severity: "warn",
      _ip: req.headers.get("x-forwarded-for") ?? null,
      _user_agent: req.headers.get("user-agent") ?? null,
      _metadata: {
        fn: opts.fn ?? null,
        reason: ctx.reason,
        current_tier: ctx.currentTier ?? null,
      },
    });
  } catch {
    /* never fail the gate because logging failed */
  }
}

/** Fire-and-forget security event logger. */
export async function logSecurityAuthEvent(
  // deno-lint-ignore no-explicit-any
  admin: any,
  args: {
    userId?: string | null;
    email?: string | null;
    eventType: string;
    severity?: "info" | "warn" | "critical";
    req?: Request;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await admin.rpc("log_security_auth_event", {
      _user_id: args.userId ?? null,
      _email: args.email ?? null,
      _event_type: args.eventType,
      _severity: args.severity ?? "info",
      _ip: args.req?.headers.get("x-forwarded-for") ?? null,
      _user_agent: args.req?.headers.get("user-agent") ?? null,
      _metadata: args.metadata ?? {},
    });
  } catch {
    /* fail open on logging */
  }
}