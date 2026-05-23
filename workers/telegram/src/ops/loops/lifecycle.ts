// Sprint E Phase 6 — Storage economics lifecycle loop.
//
// Architecture position:
//   - Runs on Railway (NOT edge cron — slow adaptive sweep, low-frequency)
//   - Owns retention enforcement for workspace_artifacts
//   - NEVER hard-deletes rows, NEVER touches Telegram payloads
//   - Calls `lifecycle_degrade_expired_continuity` in bounded batches
//   - Soft-degrades continuity_state: active → expired
//
// Why Railway (not pg_cron / edge):
//   - Bounded batches avoid long transactions on the PRIMARY DB
//   - Adaptive backoff (5min → 1hr) when no work prevents cloud burn
//   - Single owner — no double-sweep risk
//
// Cost discipline:
//   - Idle: 5min, scales to 1hr when nothing to degrade
//   - Batch capped at 200 rows / tick (configurable)
//   - Emits one collapsed admin alert when large sweeps happen
import { primaryAdmin } from "../../supabase.js";
import { reportLoopTick } from "../loop-runner.js";
import { publishHeartbeat } from "../admin-heartbeat.js";
import { env } from "../../env.js";

const IDLE_MIN_MS = Number(process.env.LIFECYCLE_IDLE_MIN_MS || 5 * 60_000);
const IDLE_MAX_MS = Number(process.env.LIFECYCLE_IDLE_MAX_MS || 60 * 60_000);
const BATCH_SIZE = Math.max(25, Math.min(500, Number(process.env.LIFECYCLE_BATCH || 200)));
const HEARTBEAT_EVERY_TICKS = 6;
const LARGE_SWEEP_THRESHOLD = 100;

const stats = {
  ticks: 0,
  total_degraded: 0,
  last_run_at: null as string | null,
  last_degraded: 0,
  startedAt: Date.now(),
};

async function sweepOnce(): Promise<{ degraded: number; ok: boolean }> {
  const { data, error } = await primaryAdmin.rpc("lifecycle_degrade_expired_continuity", {
    _batch: BATCH_SIZE,
  });
  if (error) {
    console.warn("[lifecycle] sweep failed:", error.message);
    return { degraded: 0, ok: false };
  }
  const n = typeof data === "number" ? data : 0;
  return { degraded: n, ok: true };
}

async function emitLargeSweepAlert(degraded: number): Promise<void> {
  try {
    await fetch(`${env.SUPABASE_URL}/functions/v1/admin-alert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "lifecycle.large_sweep",
        severity: "info",
        source: "railway.lifecycle",
        feature: "storage.retention",
        message: `Lifecycle sweep degraded ${degraded} expired continuity rows`,
        meta: { degraded, threshold: LARGE_SWEEP_THRESHOLD },
      }),
    });
  } catch (e: any) {
    console.warn("[lifecycle] alert failed:", e?.message || e);
  }
}

export function startLifecycleLoop(signal: AbortSignal) {
  const workerId = process.env.OPS_WORKER_ID || `lifecycle-${process.pid}`;
  let idleMs = IDLE_MIN_MS;
  let heartbeatCountdown = 0;

  return (async () => {
    console.log(`[lifecycle-loop] started (batch=${BATCH_SIZE}, idle=${IDLE_MIN_MS}..${IDLE_MAX_MS}ms)`);
    while (!signal.aborted) {
      stats.ticks++;
      const tickStart = Date.now();
      let degraded = 0;
      let didWork = false;

      try {
        const r = await sweepOnce();
        degraded = r.degraded;
        stats.last_degraded = degraded;
        stats.total_degraded += degraded;
        stats.last_run_at = new Date().toISOString();
        didWork = degraded > 0;

        if (degraded >= LARGE_SWEEP_THRESHOLD) {
          await emitLargeSweepAlert(degraded);
        }

        if (--heartbeatCountdown <= 0) {
          await publishHeartbeat({
            worker_id: workerId,
            worker_kind: "lifecycle",
            active_queues: ["continuity_retention"],
            retry_pressure: 0,
          });
          heartbeatCountdown = HEARTBEAT_EVERY_TICKS;
        }

        if (didWork) idleMs = IDLE_MIN_MS;
        else idleMs = Math.min(idleMs * 2, IDLE_MAX_MS);

        await wait(idleMs, signal);
      } catch (e: any) {
        console.error("[lifecycle-loop] tick error:", e?.message || e);
        await wait(IDLE_MIN_MS, signal);
      } finally {
        reportLoopTick("lifecycle-loop", {
          tick_ms: Date.now() - tickStart,
          queue_depth: degraded,
          did_work: didWork,
        });
      }
    }
    console.log("[lifecycle-loop] stopped");
  })();
}

export function getLifecycleStats() {
  return { ...stats, uptime_s: Math.round((Date.now() - stats.startedAt) / 1000) };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });
}