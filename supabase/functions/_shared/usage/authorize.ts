// ── Server-side Execution Authorization Wrapper (U1) ─────────────────────
// Drop-in chokepoint for edge functions. Mirrors src/lib/usage/authorize.ts
// but talks to the service-role client and honors the per-tool mode
// registry (`tool_execution_modes`) + global kill switch
// (`auth_settings.execution_authorize_enabled`).
//
// In shadow mode (default), the wrapper NEVER blocks — it records the
// would-be decision in `usage_events` with the proper `blocked_stage` and
// `source='tool'`. Flipping a tool to `hard` later turns those shadow
// rows into real 429s without any per-tool code change.
//
// Every call generates an `x-execution-id` returned to callers via
// `decision.executionId`, and is recorded on the matching ledger row so a
// user screenshot can be resolved to one exact quota decision.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeServer, type QuotaResult } from "./guard.ts";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export type ExecutionMode = "none" | "shadow" | "hard";
export type BlockedStage =
  | "auth" | "account" | "feature" | "quota" | "provider" | "execution";

export interface AuthorizeServerOptions {
  tool: string;                // canonical key, e.g. "ai_chatbot"
  meter: string;               // "ai" | "export" | ...
  feature?: string;            // default "*"
  units?: number;              // default 1
  userId: string | null;
  req?: Request;
  requireFeatureKey?: string;  // optional feature_access gate
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuthorizeServerDecision {
  allowed: boolean;            // shadow always returns true
  shadow: boolean;             // true when would-have-blocked under shadow
  stage: BlockedStage | null;
  mode: ExecutionMode;
  reason?: string;
  result?: QuotaResult;
  executionId: string;
  /** Convenience: 429 Response when `allowed=false` (hard mode), else null. */
  response: Response | null;
}

const cors429 = (cors: Record<string, string>) =>
  ({ ...cors, "Content-Type": "application/json" });

function uuid(): string {
  try { return crypto.randomUUID(); }
  catch { return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
}

async function resolveMode(tool: string): Promise<ExecutionMode> {
  try {
    const { data } = await admin().rpc("resolve_execution_mode", { _tool: tool });
    if (data === "none" || data === "shadow" || data === "hard") return data;
    return "shadow";
  } catch {
    return "shadow";
  }
}

/** Record a decision into the append-only `usage_events` ledger. */
async function record(args: {
  opts: AuthorizeServerOptions;
  stage: BlockedStage | null;
  decision: "allowed" | "blocked" | "shadow_violation";
  mode: ExecutionMode;
  executionId: string;
  units: number;
  quota?: QuotaResult;
  startedAt: number;
}) {
  try {
    const { opts, stage, decision, mode, executionId, units, quota } = args;
    const elapsed = Math.round(performance.now() - args.startedAt);
    await admin().from("usage_events").insert({
      user_id: opts.userId,
      meter: opts.meter,
      feature: opts.feature ?? "*",
      capability_key: opts.tool,
      execution_id: executionId,
      tier_snapshot: null,
      units_used: decision === "allowed" ? units : 0,
      remaining_before: quota
        ? Math.max(0, (quota.max ?? 0) - (quota.used ?? 0) + units)
        : null,
      remaining_after: quota ? Math.max(0, (quota.max ?? 0) - (quota.used ?? 0)) : null,
      max_at_time: quota?.max ?? null,
      decision: decision === "shadow_violation" ? "shadow" : decision,
      blocked_reason: decision !== "allowed" ? (quota?.reason ?? stage ?? null) : null,
      provider: null,
      provider_cost_micro: null,
      input_tokens: null,
      output_tokens: null,
      source: "tool",
      session_id: opts.sessionId ?? null,
      request_id: opts.req?.headers.get("x-request-id") ?? executionId,
      execution_ms: elapsed,
      blocked_stage: stage,
      metadata: { ...(opts.metadata ?? {}), capability: opts.tool, mode },
    });
  } catch { /* never throw from the wrapper */ }
}

/**
 * Authorize an execution. Always returns a decision; in shadow mode it
 * always allows execution and records what WOULD have been blocked.
 *
 * Edge function usage:
 *
 *   const auth = await authorizeServer({ tool: "ai_chatbot", meter: "ai",
 *     userId, req, requireFeatureKey: "ai_chatbot" });
 *   if (auth.response) return auth.response;        // hard-blocked
 *   // ...do work...
 *   return new Response(json, { headers: withExecutionHeaders(headers, auth) });
 */
export async function authorizeServer(
  opts: AuthorizeServerOptions,
  cors: Record<string, string> = {},
): Promise<AuthorizeServerDecision> {
  const executionId = uuid();
  const startedAt = performance.now();
  const mode = await resolveMode(opts.tool);
  const units = opts.units ?? 1;

  // mode=none: fully disabled, allow everything, no ledger row
  if (mode === "none") {
    return { allowed: true, shadow: false, stage: null, mode, executionId, response: null };
  }

  // 1. Auth
  if (!opts.userId) {
    if (mode === "hard") {
      await record({ opts, stage: "auth", decision: "blocked", mode, executionId, units, startedAt });
      return {
        allowed: false, shadow: false, stage: "auth", mode, executionId,
        reason: "unauthenticated",
        response: new Response(
          JSON.stringify({ error: "unauthenticated", locked: true, execution_id: executionId }),
          { status: 401, headers: cors429(cors) },
        ),
      };
    }
    await record({ opts, stage: "auth", decision: "shadow_violation", mode, executionId, units, startedAt });
    return { allowed: true, shadow: true, stage: "auth", mode, executionId, response: null };
  }

  // 2. Feature access (optional)
  if (opts.requireFeatureKey) {
    try {
      const { data: ent } = await admin().rpc("get_user_entitlements", { _user: opts.userId });
      // deno-lint-ignore no-explicit-any
      const features = ((ent as any)?.features ?? {}) as Record<string, boolean>;
      if (!features[opts.requireFeatureKey]) {
        if (mode === "hard") {
          await record({ opts, stage: "feature", decision: "blocked", mode, executionId, units, startedAt });
          return {
            allowed: false, shadow: false, stage: "feature", mode, executionId,
            reason: `feature_disabled:${opts.requireFeatureKey}`,
            response: new Response(JSON.stringify({
              error: `feature_disabled:${opts.requireFeatureKey}`,
              locked: true, upgrade_url: "/pricing", execution_id: executionId,
            }), { status: 403, headers: cors429(cors) }),
          };
        }
        await record({ opts, stage: "feature", decision: "shadow_violation", mode, executionId, units, startedAt });
        return { allowed: true, shadow: true, stage: "feature", mode, executionId, response: null };
      }
    } catch { /* fail-open on entitlement read */ }
  }

  // 3. Quota — always consume; in shadow we still allow execution if blocked
  const quota = await consumeServer(opts.userId, opts.meter, opts.feature ?? "*", units);
  if (!quota.allowed && !quota.bypass) {
    if (mode === "hard") {
      await record({ opts, stage: "quota", decision: "blocked", mode, executionId, units, startedAt, quota });
      return {
        allowed: false, shadow: false, stage: "quota", mode, executionId,
        reason: quota.reason, result: quota,
        response: new Response(JSON.stringify({
          error: `Quota exceeded for ${opts.meter}`,
          locked: true, meter: opts.meter, feature: opts.feature ?? "*",
          used: quota.used, max: quota.max,
          upgrade_url: "/pricing", execution_id: executionId,
        }), { status: 429, headers: cors429(cors) }),
      };
    }
    await record({ opts, stage: "quota", decision: "shadow_violation", mode, executionId, units, startedAt, quota });
    return { allowed: true, shadow: true, stage: "quota", mode, executionId, result: quota, response: null };
  }

  // 4. Allowed
  await record({ opts, stage: null, decision: "allowed", mode, executionId, units, startedAt, quota });
  return { allowed: true, shadow: false, stage: null, mode, executionId, result: quota, response: null };
}

/** Add `x-execution-id` (+ `x-execution-mode`) to any response headers. */
export function withExecutionHeaders(
  headers: Record<string, string>,
  decision: AuthorizeServerDecision,
): Record<string, string> {
  return {
    ...headers,
    "x-execution-id": decision.executionId,
    "x-execution-mode": decision.mode,
    ...(decision.shadow ? { "x-execution-shadow": decision.stage ?? "unknown" } : {}),
  };
}