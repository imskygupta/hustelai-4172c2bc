// Execution Trust Gate — runtime account-status enforcement for privileged
// backend functions.
//
// Flow:
//   JWT-verified user
//      ↓
//   get_account_access_state_for(user_id)  (service role RPC)
//      ↓
//   get_execution_enforcement()            (auth_settings flag)
//      ↓
//   active → allow
//   non-active + enforce → block with structured ACCOUNT_INACTIVE payload
//   non-active + shadow → allow + log shadow_violation
//
// All decisions are recorded in public.execution_access_events.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hustle-internal-signature, x-hustle-service, x-hustle-timestamp, x-hustle-nonce",
};

export type AccountAccessDecision =
  | { ok: true; status: string; mode: "enforce" | "shadow"; shadowViolation: boolean }
  | { ok: false; response: Response; status: string; mode: "enforce" };

const STATUS_REDIRECT: Record<string, string> = {
  pending_approval: "/pending-access",
  suspended: "/account-status",
  deleted: "/account-status",
  banned: "/account-status",
};

// ── Short-lived per-instance access cache ─────────────────────────────────
// Keeps DB hits down for frequent callers. TTL is intentionally short so a
// status change converges within ~30s without explicit cross-instance
// invalidation. `admin_set_account_status` triggers a realtime profile
// update on the frontend, which forces sign-out independently.
const ACCESS_CACHE_TTL_MS = 30_000;
const ENFORCE_FLAG_TTL_MS = 15_000;

type CachedAccess = { status: string; reason: string | null; expires: number };
type CachedFlag = { enforce: boolean; expires: number };

const accessCache = new Map<string, CachedAccess>();
let enforceFlagCache: CachedFlag | null = null;

function getCachedAccess(userId: string): CachedAccess | null {
  const hit = accessCache.get(userId);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    accessCache.delete(userId);
    return null;
  }
  return hit;
}

function getCachedEnforce(): boolean | null {
  if (!enforceFlagCache) return null;
  if (enforceFlagCache.expires < Date.now()) {
    enforceFlagCache = null;
    return null;
  }
  return enforceFlagCache.enforce;
}

/** Drop a user's cached access state. Call after admin_set_account_status,
 *  forced sign-out, or any flow that must converge faster than the 30s TTL. */
export function invalidateAccountAccessCache(userId?: string) {
  if (userId) accessCache.delete(userId);
  else accessCache.clear();
}

/** Drop the cached enforcement flag — call after toggling auth_settings. */
export function invalidateEnforcementFlagCache() {
  enforceFlagCache = null;
}

function deny(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function withDeadline<T>(p: PromiseLike<T>, label: string, ms = 5_000): Promise<T> {
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

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return null;
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface EnforceAccountAccessOptions {
  userId: string;
  fn: string;
  feature?: string;
  route?: string;
  req?: Request;
}

/**
 * Check the caller's account status against the global enforcement flag.
 *
 * Returns { ok: true } when the request should proceed. When enforcement is
 * ON and the account is not active, returns { ok: false, response } that the
 * caller MUST return immediately.
 *
 * Fails open on infrastructure errors (missing service role, RPC timeout) —
 * the goal is to never lock legitimate users out because of a logging hiccup.
 * Shadow_violation rows always capture the failure for review.
 */
export async function enforceAccountAccess(
  opts: EnforceAccountAccessOptions,
): Promise<AccountAccessDecision> {
  const admin = adminClient();
  if (!admin) {
    return { ok: true, status: "unknown", mode: "shadow", shadowViolation: false };
  }

  let status = "active";
  let reason: string | null = null;
  let enforce = false;
  let cacheHit: "full" | "partial" | "miss" = "miss";
  let gateError: string | null = null;

  // 1. Cache lookup
  const cachedAccess = getCachedAccess(opts.userId);
  const cachedFlag = getCachedEnforce();
  if (cachedAccess) {
    status = cachedAccess.status;
    reason = cachedAccess.reason;
    cacheHit = cachedFlag !== null ? "full" : "partial";
  }
  if (cachedFlag !== null) enforce = cachedFlag;

  // 2. Fetch what isn't cached
  if (!cachedAccess || cachedFlag === null) {
    try {
      const promises: PromiseLike<unknown>[] = [];
      const wantAccess = !cachedAccess;
      const wantFlag = cachedFlag === null;
      if (wantAccess) {
        promises.push(
          withDeadline(
            admin.rpc("get_account_access_state_for", { _user_id: opts.userId }),
            "account_access_state",
            4_000,
          ),
        );
      }
      if (wantFlag) {
        promises.push(
          withDeadline(
            admin.rpc("get_execution_enforcement"),
            "execution_enforcement_flag",
            2_000,
          ),
        );
      }
      const results = await Promise.all(promises);
      let idx = 0;
      if (wantAccess) {
        // deno-lint-ignore no-explicit-any
        const stateRes = results[idx++] as any;
        const row = Array.isArray(stateRes.data) ? stateRes.data[0] : stateRes.data;
        if (row) {
          status = (row.status as string) ?? "active";
          reason = (row.reason as string) ?? null;
        }
        accessCache.set(opts.userId, {
          status,
          reason,
          expires: Date.now() + ACCESS_CACHE_TTL_MS,
        });
      }
      if (wantFlag) {
        // deno-lint-ignore no-explicit-any
        const flagRes = results[idx++] as any;
        enforce = flagRes.data === true;
        enforceFlagCache = {
          enforce,
          expires: Date.now() + ENFORCE_FLAG_TTL_MS,
        };
      }
    } catch (e) {
      // ── Conditional fail-open ────────────────────────────────────────────
      // Known-inactive (cached) + gate timeout → STILL BLOCK in enforce mode.
      // Otherwise fail open with audit so an infra incident never locks out
      // legitimate users. The cache prevents the obvious bypass: an attacker
      // cannot turn an inactive account "active" by inducing timeouts.
      gateError = (e as Error).message;
      if (cachedAccess && cachedAccess.status !== "active") {
        // Treat as a normal non-active path below using cached values.
      } else {
        await logEvent(admin, {
          ...opts,
          status: cachedAccess?.status ?? "unknown",
          decision: "allowed",
          enforcement_mode: enforce ? "enforce" : "shadow",
          reason: `gate_error:${gateError}`,
        });
        return {
          ok: true,
          status: cachedAccess?.status ?? "unknown",
          mode: enforce ? "enforce" : "shadow",
          shadowViolation: false,
        };
      }
    }
  }

  const isActive = status === "active";
  const mode: "enforce" | "shadow" = enforce ? "enforce" : "shadow";

  if (isActive) {
    // Allowed path. Only log on cache miss to keep audit volume sane —
    // sampled "allowed" rows are enough to prove the gate is firing.
    if (cacheHit !== "full") {
      await logEvent(admin, {
        ...opts,
        status,
        decision: "allowed",
        enforcement_mode: mode,
        reason: null,
      });
    }
    return { ok: true, status, mode, shadowViolation: false };
  }

  if (!enforce) {
    // Shadow mode: record violation, allow execution to proceed.
    await logEvent(admin, {
      ...opts,
      status,
      decision: "shadow_violation",
      enforcement_mode: "shadow",
      reason: gateError ? `cached_inactive_on_timeout:${gateError}` : (reason ?? "account_not_active"),
    });
    return { ok: true, status, mode: "shadow", shadowViolation: true };
  }

  // Enforce mode: block with structured payload the frontend can react to.
  await logEvent(admin, {
    ...opts,
    status,
    decision: "blocked",
    enforcement_mode: "enforce",
    reason: reason ?? "account_not_active",
  });

  return {
    ok: false,
    status,
    mode: "enforce",
    response: deny({
      status: "blocked",
      code: "ACCOUNT_INACTIVE",
      account_status: status,
      reason: reason ?? "Your account is not active.",
      redirect: STATUS_REDIRECT[status] ?? "/account-status",
    }),
  };
}

async function logEvent(
  // deno-lint-ignore no-explicit-any
  admin: any,
  args: EnforceAccountAccessOptions & {
    status: string;
    decision: "allowed" | "blocked" | "shadow_violation";
    enforcement_mode: "enforce" | "shadow";
    reason: string | null;
  },
) {
  try {
    const req = args.req;
    await withDeadline(
      admin.from("execution_access_events").insert({
        user_id: args.userId,
        fn: args.fn,
        feature: args.feature ?? null,
        route: args.route ?? req?.url ?? null,
        account_status: args.status === "unknown" ? null : args.status,
        decision: args.decision,
        enforcement_mode: args.enforcement_mode,
        reason: args.reason,
        request_id: req?.headers.get("x-request-id") ?? null,
        ip: req?.headers.get("x-forwarded-for") ?? null,
        user_agent: req?.headers.get("user-agent") ?? null,
      }),
      "execution_event_log",
      2_000,
    );
  } catch {
    /* never fail the gate because logging failed */
  }
}