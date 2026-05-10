// workflow-runner — pulls due workflow_runs and executes their steps.
// Designed to be invoked every minute by pg_cron AND on-demand from admin UI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { ACTIONS, resolveParams, type ActionContext } from "../_shared/workflows/actions.ts";
import { isFeatureEnabledServer } from "../_shared/flags/resolve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH = 25;

function backoffMs(attempt: number) {
  // Exponential with jitter: 30s, 1m, 2m, 4m, 8m, 16m, 30m cap
  const base = Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 30 * 60_000);
  return base + Math.floor(Math.random() * 5_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Master engine kill switch
  if (!(await isFeatureEnabledServer(null, "automation.engine"))) {
    return j({ ok: true, skipped: "engine_disabled" });
  }

  const limitStr = new URL(req.url).searchParams.get("limit");
  const limit = Math.min(MAX_BATCH, Math.max(1, Number(limitStr) || 10));

  const { data: claimed, error: claimErr } = await sb.rpc("claim_workflow_runs", { _limit: limit });
  if (claimErr) return j({ error: claimErr.message }, 500);
  const runs = (claimed as any[]) || [];
  if (!runs.length) return j({ ok: true, processed: 0 });

  const results: any[] = [];
  for (const run of runs) {
    results.push(await executeRun(sb, run));
  }
  return j({ ok: true, processed: runs.length, results });
});

async function executeRun(sb: any, run: any) {
  // Re-load workflow definition (steps may have been edited since enqueue)
  const { data: wf, error: wfErr } = await sb.from("workflows").select("*").eq("id", run.workflow_id).single();
  if (wfErr || !wf) {
    await failRun(sb, run, `workflow_missing: ${wfErr?.message || "deleted"}`, /*final*/ true);
    return { run_id: run.id, status: "failed", reason: "workflow_missing" };
  }

  if (!wf.enabled || wf.paused) {
    await sb.from("workflow_runs").update({
      status: "cancelled", finished_at: new Date().toISOString(),
      last_error: wf.paused ? "workflow_paused" : "workflow_disabled",
    }).eq("id", run.id);
    return { run_id: run.id, status: "cancelled" };
  }

  // Per-workflow feature flag gate
  if (wf.feature_flag && !(await isFeatureEnabledServer(run.user_id, wf.feature_flag))) {
    return scheduleRetry(sb, run, "feature_flag_disabled");
  }

  const steps: any[] = Array.isArray(wf.steps) ? wf.steps : [];
  let context: Record<string, any> = run.context || {};

  for (const step of steps) {
    const handler = ACTIONS[step.action];
    if (!handler) {
      await recordStep(sb, run.id, step, "failed", { error: `unknown_action:${step.action}` });
      return finalizeRun(sb, run, `unknown_action:${step.action}`, /*final*/ true);
    }

    // Conditional skip via `when` (simple equality from context)
    if (step.when && !evalWhen(step.when, { ...run.payload, ...context })) {
      await recordStep(sb, run.id, step, "skipped", { reason: "when_false" });
      continue;
    }

    const t0 = Date.now();
    const ctx: ActionContext = { params: {}, context, run, sb };
    ctx.params = resolveParams(step.params || {}, ctx);
    try {
      const out = (await handler(ctx)) || {};
      const ms = Date.now() - t0;
      await recordStep(sb, run.id, step, "succeeded", { input: ctx.params, output: out, duration_ms: ms });
      context = { ...context, [step.id || step.action]: out };
    } catch (e: any) {
      const ms = Date.now() - t0;
      await recordStep(sb, run.id, step, "failed", {
        input: ctx.params, error: String(e?.message || e), duration_ms: ms,
      });
      return scheduleRetry(sb, run, String(e?.message || e));
    }
  }

  // All steps OK
  await sb.from("workflow_runs").update({
    status: "succeeded", finished_at: new Date().toISOString(),
    context, last_error: null,
  }).eq("id", run.id);
  return { run_id: run.id, status: "succeeded" };
}

function evalWhen(when: any, scope: Record<string, any>): boolean {
  if (typeof when !== "object" || !when) return true;
  // Tiny matcher: { "path.to": value } — all must match
  for (const [path, expected] of Object.entries(when)) {
    const actual = path.split(".").reduce<any>((a, k) => (a == null ? a : a[k]), scope);
    if (actual !== expected) return false;
  }
  return true;
}

async function recordStep(sb: any, runId: string, step: any, status: string, extras: any) {
  await sb.from("workflow_steps").insert({
    run_id: runId,
    step_id: step.id || step.action,
    action: step.action,
    status,
    input: extras.input ?? {},
    output: extras.output ?? null,
    error: extras.error ?? null,
    duration_ms: extras.duration_ms ?? null,
  });
}

async function scheduleRetry(sb: any, run: any, error: string) {
  const next = run.attempt; // claim already incremented attempt
  if (next >= run.max_attempts) {
    return finalizeRun(sb, run, error, /*final*/ true);
  }
  const delay = backoffMs(next);
  await sb.from("workflow_runs").update({
    status: "retrying",
    scheduled_at: new Date(Date.now() + delay).toISOString(),
    last_error: error,
  }).eq("id", run.id);
  return { run_id: run.id, status: "retrying", attempt: next, retry_in_ms: delay };
}

async function finalizeRun(sb: any, run: any, error: string, final: boolean) {
  await sb.from("workflow_runs").update({
    status: "failed", finished_at: new Date().toISOString(), last_error: error,
  }).eq("id", run.id);
  if (final) {
    await sb.from("workflow_failures").insert({
      run_id: run.id, workflow_id: run.workflow_id,
      trigger_event: run.trigger_event, payload: run.payload,
      attempts: run.attempt, last_error: error,
    });
  }
  return { run_id: run.id, status: "failed", error };
}

async function failRun(sb: any, run: any, error: string, final: boolean) {
  return finalizeRun(sb, run, error, final);
}

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}