// ── Execution Authorization Wrapper (U0.5) ───────────────────────────────
// Single chokepoint for every privileged tool execution. Phase U1 will flip
// on hard enforcement by changing this file ONLY — no per-tool edits needed.
//
//   executeTool()
//     ↓
//   authorizeExecution()   ← this module
//     ↓
//   consumeUsage()
//     ↓
//   recordUsage()          (mirrored into usage_events with rich metadata)
//     ↓
//   execute()
//
// Today: shadow only — `allowed: true` always returned when in shadow, but
// the blocked_stage is captured in usage_events so /admin/usage-governance
// can review what WOULD have been blocked before flipping the flag.

import { supabase } from "@/integrations/supabase/client";
import { consumeUsage } from "./meter";
import { getEntitlements } from "./entitlements";
import type { ConsumeResult, Meter } from "./types";

export type BlockedStage =
  | "auth" | "account" | "feature" | "quota" | "provider" | "execution";

export type AuthorizationDecision = {
  allowed: boolean;
  shadow: boolean;
  stage: BlockedStage | null;
  reason?: string;
  result?: ConsumeResult;
  requestId: string;
};

export interface AuthorizeExecutionOptions {
  tool: string;             // capability_key, e.g. "proposal_generator"
  meter: Meter;             // "ai" | "export" | ...
  feature?: string;         // default "*"
  units?: number;           // default 1
  requireFeatureKey?: string; // optional feature_access gate
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

function uuid(): string {
  // crypto.randomUUID is available in modern browsers + edge runtimes
  try { return crypto.randomUUID(); }
  catch { return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }
}

export async function authorizeExecution(
  opts: AuthorizeExecutionOptions,
): Promise<AuthorizationDecision> {
  const requestId = uuid();
  const started = performance.now();
  const meter = opts.meter;
  const feature = opts.feature ?? "*";
  const units = opts.units ?? 1;

  // 1. Auth
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) {
    await mirror({ requestId, opts, stage: "auth", decision: "blocked", started });
    return { allowed: false, shadow: false, stage: "auth", reason: "unauthenticated", requestId };
  }

  // 2. Feature access (capability gate)
  if (opts.requireFeatureKey) {
    try {
      const ent = await getEntitlements(userId);
      if (!ent?.features?.[opts.requireFeatureKey]) {
        await mirror({ requestId, opts, stage: "feature", decision: "blocked", started });
        return {
          allowed: false, shadow: false, stage: "feature",
          reason: `feature_disabled:${opts.requireFeatureKey}`, requestId,
        };
      }
    } catch { /* fail-open on entitlement read */ }
  }

  // 3. Quota (canonical consume_usage path)
  const result = await consumeUsage(meter, feature, units);
  const elapsed = Math.round(performance.now() - started);
  if (!result.allowed && !result.bypass) {
    // consumeUsage already mirrored into usage_events; nothing more to log.
    return {
      allowed: false, shadow: false, stage: "quota",
      reason: result.reason ?? "quota_exceeded", result, requestId,
    };
  }

  // 4. Allowed (or bypass for unlimited tiers)
  void mirror({
    requestId, opts, stage: null, decision: "allowed",
    started, executionMs: elapsed, units,
  });
  return { allowed: true, shadow: false, stage: null, result, requestId };
}

// ── helper: enrich the usage_events ledger with stage/source/request_id ──
async function mirror(args: {
  requestId: string;
  opts: AuthorizeExecutionOptions;
  stage: BlockedStage | null;
  decision: "allowed" | "blocked";
  started: number;
  executionMs?: number;
  units?: number;
}) {
  try {
    const { opts, stage, decision, requestId } = args;
    const executionMs = args.executionMs ?? Math.round(performance.now() - args.started);
    await supabase.functions.invoke("usage-record", {
      body: {
        meter: opts.meter,
        feature: opts.feature ?? "*",
        units: args.units ?? 0,
        capability_key: opts.tool,
        source: "tool",
        session_id: opts.sessionId ?? null,
        request_id: requestId,
        execution_ms: executionMs,
        blocked_stage: stage,
        metadata: { ...(opts.metadata ?? {}), capability: opts.tool },
        result: decision === "blocked"
          ? { allowed: false, bypass: false, reason: stage, used: 0, max: 0 }
          : { allowed: true, bypass: false, used: 0, max: 0 },
      },
    });
  } catch { /* never throw from the wrapper */ }
}