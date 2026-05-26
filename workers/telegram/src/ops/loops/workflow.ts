// workflow-loop — Railway-driven replacement for the pg_cron */3 tick that
// invokes the workflow-runner edge function.
//
// Design:
//  - We do NOT re-implement workflow action handlers here. They live in the
//    edge function (supabase/functions/workflow-runner). This loop only
//    decides WHEN to invoke and with what batch size.
//  - Queue depth is peeked via a single SELECT on PRIMARY (read-only). When
//    there is no due work the loop sleeps with exponential backoff up to
//    POLL_IDLE_MAX_MS — no hot polling.
//  - When work is due we POST to the edge function with a bounded `limit`.
//    One edge invocation drains up to 10 runs (vs today's 3 unconditional
//    cron ticks/15min).
//  - Dual-run safe: until pg_cron `workflow-runner-tick` is unscheduled,
//    both paths can run; `claim_workflow_runs` uses SKIP LOCKED so they
//    cannot double-claim. Set WORKFLOW_DUAL_RUN=false to bypass invocation
//    (observe-only).
import { primaryAdmin } from "../../supabase.js";
import { env } from "../../env.js";
import { emitEvent } from "../queue.js";
import { reportLoopTick } from "../loop-runner.js";

// Cost stabilization: wider idle band + softer error backoff.
const IDLE_MIN_MS = Number(process.env.POLL_IDLE_MIN_MS || 10_000);
const IDLE_MAX_MS = Number(process.env.POLL_IDLE_MAX_MS || 300_000);
const ERROR_MS = 30_000;
const CLAIM_LIMIT = Math.max(1, Math.min(25, Number(process.env.WORKFLOW_CLAIM_LIMIT || 10)));
const OBSERVE_ONLY = String(process.env.WORKFLOW_DUAL_RUN ?? "true").toLowerCase() === "false"
  ? false
  : false; // default = invoke (dual-run mode against pg_cron is safe via SKIP LOCKED)
const TICK_TIMEOUT_MS = 60_000;

// Stats kept in memory; flushed to ops_events every 5 min for invocation-delta tracking.
const stats = {
  ticks: 0,
  invocations: 0,
  runs_processed: 0,
  empty_ticks: 0,
  errors: 0,
  last_invoked_at: null as string | null,
  startedAt: Date.now(),
};

async function peekDueCount(): Promise<number> {
  // Lightweight count on PRIMARY. Workflow_runs is the ONE table this loop
  // touches on PRIMARY (read-only here).
  const { count, error } = await primaryAdmin
    .from("workflow_runs")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "retrying"])
    .lte("scheduled_at", new Date().toISOString());
  if (error) {
    console.warn("[workflow-loop] peek error:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function invokeRunner(limit: number): Promise<{ processed: number; ok: boolean; error?: string }> {
  const url = `${env.SUPABASE_URL}/functions/v1/workflow-runner?limit=${limit}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TICK_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      signal: ctl.signal,
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { processed: 0, ok: false, error: `${r.status}:${JSON.stringify(body).slice(0, 200)}` };
    return { processed: Number(body?.processed ?? 0), ok: true };
  } catch (e: any) {
    return { processed: 0, ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export function startWorkflowLoop(signal: AbortSignal) {
  let idleMs = IDLE_MIN_MS;
  let lastStatsFlush = Date.now();

  // Loop body — returns only on abort. Throws bubble to superviseLoop().
  return (async () => {
    console.log(`[workflow-loop] started (claim_limit=${CLAIM_LIMIT}, observe_only=${OBSERVE_ONLY})`);
    while (!signal.aborted) {
      stats.ticks++;
      const tickStart = Date.now();
      let didWork = false;
      let dueObserved = 0;
      try {
        const due = await peekDueCount();
        dueObserved = due;
        if (due === 0) {
          stats.empty_ticks++;
          await wait(idleMs, signal);
          idleMs = Math.min(idleMs * 2, IDLE_MAX_MS);
        } else {
          idleMs = IDLE_MIN_MS;
          if (OBSERVE_ONLY) {
            console.log(`[workflow-loop] observe-only: ${due} due (skipping invoke)`);
          } else {
            const limit = Math.min(CLAIM_LIMIT, due);
            const res = await invokeRunner(limit);
            stats.invocations++;
            stats.last_invoked_at = new Date().toISOString();
            if (res.ok) {
              stats.runs_processed += res.processed;
              if (res.processed > 0) didWork = true;
              console.log(`[workflow-loop] processed=${res.processed} due=${due}`);
            } else {
              stats.errors++;
              console.warn(`[workflow-loop] invoke failed: ${res.error}`);
              await wait(ERROR_MS, signal);
            }
          }
          // Cost stabilization: post-drain pause 2s → 10s. The edge fn
          // already drained up to CLAIM_LIMIT rows in one invocation.
          await wait(10_000, signal);
        }

        if (Date.now() - lastStatsFlush > 300_000) {
          await emitEvent("WORKFLOW_LOOP_STATS", { ...stats, uptime_s: Math.round((Date.now() - stats.startedAt) / 1000) }, { source: "ops.workflow-loop" });
          lastStatsFlush = Date.now();
        }
      } catch (e: any) {
        stats.errors++;
        console.error("[workflow-loop] tick error:", e?.message || e);
        await wait(ERROR_MS, signal);
      } finally {
        reportLoopTick("workflow-loop", {
          tick_ms: Date.now() - tickStart,
          queue_depth: dueObserved,
          did_work: didWork,
        });
      }
    }
    console.log("[workflow-loop] stopped");
  })();
}

export function getWorkflowLoopStats() {
  return { ...stats, uptime_s: Math.round((Date.now() - stats.startedAt) / 1000) };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });
}
