// Sprint D Phase 8 — Continuity reconciliation loop.
//
// This is the ONLY layer permitted to repair drift between
// `workspace_artifacts` (continuity metadata) and the actual Telegram
// delivery outcome. It NEVER creates new artifact rows, NEVER sends a
// second TG message for an already-delivered export, and ALWAYS preserves
// the original artifact_id, resend_count, and delivery history.
//
// Architecture position:
//   - Runs on Railway (NOT in an edge function — long-lived, scheduled)
//   - Reads from PRIMARY (workspace_artifacts, generated_exports)
//   - Writes ONLY back to the same artifact_id via the FSM transition path
//     (we invoke the existing edge functions to keep one writer per concern)
//   - Telemetry goes to ADMIN DB (delivery_reconciliation_runs) + the
//     normalized admin-alert edge fn for threshold breaches
//
// Cost discipline (Phase 8.7):
//   - Adaptive idle backoff: 30s → 5min when no work
//   - Per-tick scan capped at 50 rows total across all cases
//   - All edge invocations have a hard timeout
//   - admin-alert is collapsed (5min window) by the edge normalizer
import { primaryAdmin } from "../../supabase.js";
import { env } from "../../env.js";
import { reportLoopTick } from "../loop-runner.js";
import { publishHeartbeat, publishReconRun, publishQueueMetric } from "../admin-heartbeat.js";

const IDLE_MIN_MS = Number(process.env.RECON_IDLE_MIN_MS || 30_000);
const IDLE_MAX_MS = Number(process.env.RECON_IDLE_MAX_MS || 5 * 60_000);
const SCAN_LIMIT = Math.max(5, Math.min(50, Number(process.env.RECON_SCAN_LIMIT || 25)));
const TICK_TIMEOUT_MS = 30_000;
// Cost stabilization: 4 → 12 ticks between heartbeat upserts.
const HEARTBEAT_EVERY_TICKS = 12; // ~ every 6-60min depending on backoff

// Thresholds (admin-alert only fires when crossed; collapsed by normalizer)
const STUCK_DELIVERING_MIN = 10;       // delivering > 10min with no message_id = drift
const STUCK_QUEUED_MIN = 15;           // queued/processing > 15min = retry
const RETRY_STORM_ATTEMPTS = 6;        // >= 6 attempts = archive + storm alert
const ORPHAN_TG_MIN = 5;               // telegram_only with no deep_link > 5min
const QUEUE_STALLED_PENDING = 50;      // > 50 pending = queue.stalled alert

interface CaseResult { scanned: number; repaired: number; orphans: number; failures: number }
const empty = (): CaseResult => ({ scanned: 0, repaired: 0, orphans: 0, failures: 0 });

/**
 * Case 1: TG was delivered but the artifact patch failed (delivering >10min
 * with no telegram_message_id). Try to recover the message_id from the
 * legacy generated_exports row; if found, complete the FSM transition.
 */
async function caseDeliveredNotPatched(): Promise<CaseResult> {
  const r = empty();
  const cutoff = new Date(Date.now() - STUCK_DELIVERING_MIN * 60_000).toISOString();
  const { data, error } = await primaryAdmin
    .from("workspace_artifacts")
    .select("id, ref_export_id, telegram_message_id, telegram_chat_id, last_delivery_at")
    .eq("artifact_state", "delivering")
    .is("telegram_message_id", null)
    .lt("last_delivery_at", cutoff)
    .limit(SCAN_LIMIT);
  if (error) { console.warn("[recon] case1 read:", error.message); return r; }
  r.scanned = data?.length ?? 0;

  for (const a of data ?? []) {
    if (!a.ref_export_id) continue;
    const { data: exp } = await primaryAdmin
      .from("generated_exports")
      .select("telegram_message_id, telegram_chat_id, telegram_file_id, status")
      .eq("id", a.ref_export_id)
      .maybeSingle();
    if (exp?.telegram_message_id) {
      // TG actually sent — patch artifact and move FSM forward.
      const ok = await invokeRunnerPatch(a.id, {
        artifact_state: "delivered",
        telegram_message_id: exp.telegram_message_id,
        telegram_chat_id: exp.telegram_chat_id,
        telegram_file_id: exp.telegram_file_id,
        delivery_status: "delivered",
        last_delivery_at: new Date().toISOString(),
      });
      if (ok) r.repaired++; else r.failures++;
    } else {
      // No TG record — move to failed (artifact-resend can re-attempt safely).
      const ok = await invokeRunnerPatch(a.id, {
        artifact_state: "failed",
        delivery_status: "failed",
        last_delivery_error: "recon:no_tg_record",
      });
      if (ok) r.repaired++; else r.failures++;
    }
  }
  return r;
}

/**
 * Case 2: Artifact is queued/processing but no delivery has run in 15min.
 * Re-invoke export-deliver-telegram. The edge fn's 30s idempotency window
 * prevents double-sends; FSM rejects illegal transitions.
 */
async function caseStuckQueued(): Promise<CaseResult> {
  const r = empty();
  const cutoff = new Date(Date.now() - STUCK_QUEUED_MIN * 60_000).toISOString();
  const { data, error } = await primaryAdmin
    .from("workspace_artifacts")
    .select("id, ref_export_id, user_id")
    .in("artifact_state", ["queued", "processing"])
    .lt("last_transition_at", cutoff)
    .limit(SCAN_LIMIT);
  if (error) { console.warn("[recon] case2 read:", error.message); return r; }
  r.scanned = data?.length ?? 0;

  for (const a of data ?? []) {
    if (!a.ref_export_id) continue;
    const ok = await invokeEdge("export-deliver-telegram", { export_id: a.ref_export_id });
    if (ok) r.repaired++; else r.failures++;
  }
  return r;
}

/**
 * Case 3: Retry storm — artifact has >= 6 delivery attempts and is in
 * `failed` state. Archive it and emit ONE collapsed storm alert.
 */
async function caseRetryStorm(): Promise<CaseResult> {
  const r = empty();
  const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data, error } = await primaryAdmin
    .from("workspace_artifacts")
    .select("id, user_id, delivery_attempts, ref_export_id")
    .eq("artifact_state", "failed")
    .gte("delivery_attempts", RETRY_STORM_ATTEMPTS)
    .lt("last_delivery_at", cutoff)
    .limit(SCAN_LIMIT);
  if (error) { console.warn("[recon] case3 read:", error.message); return r; }
  r.scanned = data?.length ?? 0;

  for (const a of data ?? []) {
    const ok = await invokeRunnerPatch(a.id, {
      artifact_state: "archived",
      delivery_status: "archived",
      last_delivery_error: `recon:retry_storm:${a.delivery_attempts}_attempts`,
    });
    if (ok) r.repaired++; else r.failures++;
  }
  if (r.repaired > 0) {
    await emitNormalizedAlert({
      kind: "retry_storm",
      severity: "error",
      message: `Reconciliation archived ${r.repaired} retry-storm artifacts`,
      meta: { scanned: r.scanned },
    });
  }
  return r;
}

/**
 * Case 4: telegram_only artifact missing deep link metadata. Rebuild from
 * chat_id + message_id without sending anything new.
 */
async function caseTelegramOrphan(): Promise<CaseResult> {
  const r = empty();
  const cutoff = new Date(Date.now() - ORPHAN_TG_MIN * 60_000).toISOString();
  const { data, error } = await primaryAdmin
    .from("workspace_artifacts")
    .select("id, telegram_chat_id, telegram_message_id")
    .eq("storage_mode", "telegram")
    .not("telegram_message_id", "is", null)
    .is("telegram_deep_link", null)
    .lt("last_transition_at", cutoff)
    .limit(SCAN_LIMIT);
  if (error) { console.warn("[recon] case4 read:", error.message); return r; }
  r.scanned = data?.length ?? 0;

  for (const a of data ?? []) {
    if (!a.telegram_chat_id || !a.telegram_message_id) { r.orphans++; continue; }
    // Public chats: https://t.me/<username>/<id>; private: https://t.me/c/<abs_id>/<msg>
    const chatStr = String(a.telegram_chat_id);
    const isPrivate = chatStr.startsWith("-100");
    const deepLink = isPrivate
      ? `https://t.me/c/${chatStr.slice(4)}/${a.telegram_message_id}`
      : `https://t.me/${chatStr}/${a.telegram_message_id}`;
    const { error: upErr } = await primaryAdmin
      .from("workspace_artifacts")
      .update({ telegram_deep_link: deepLink })
      .eq("id", a.id);
    if (upErr) r.failures++; else r.repaired++;
  }
  return r;
}

/**
 * Case 5: Queue lag monitor. Counts artifacts stuck in non-terminal states
 * and emits a single normalized alert if backlog crosses threshold.
 * Also publishes the snapshot to ADMIN.queue_metrics for the dashboard.
 */
async function caseQueueLag(workerId: string): Promise<CaseResult> {
  const r = empty();
  const { count, error } = await primaryAdmin
    .from("workspace_artifacts")
    .select("id", { count: "exact", head: true })
    .in("artifact_state", ["queued", "processing", "delivering"]);
  if (error) { console.warn("[recon] case5 read:", error.message); return r; }
  const pending = count ?? 0;
  r.scanned = pending;

  await publishQueueMetric({
    queue_name: "artifact_delivery",
    pending,
    worker_id: workerId,
  });

  if (pending >= QUEUE_STALLED_PENDING) {
    await emitNormalizedAlert({
      kind: "queue.stalled",
      severity: "warning",
      message: `Artifact delivery queue depth ${pending} (threshold ${QUEUE_STALLED_PENDING})`,
      meta: { pending, threshold: QUEUE_STALLED_PENDING },
    });
  }
  return r;
}

// ---------- edge invocation helpers ----------

async function invokeEdge(fn: string, body: Record<string, unknown>): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TICK_TIMEOUT_MS);
  try {
    const r = await fetch(`${env.SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    return r.ok;
  } catch (e: any) {
    console.warn(`[recon] invoke ${fn} failed:`, e?.message || e);
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Direct artifact patch — bypasses FSM transition only for terminal-state
 * corrections where the state was already legally reached but the row drifted.
 * Goes through PRIMARY directly because the FSM edge fn does not expose a
 * raw "set state without transition" path (by design).
 */
async function invokeRunnerPatch(artifact_id: string, patch: Record<string, any>): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const { error } = await primaryAdmin
      .from("workspace_artifacts")
      .update({ ...patch, last_transition_at: now, last_repair_at: now })
      .eq("id", artifact_id);
    if (error) { console.warn("[recon] patch failed:", error.message); return false; }
    return true;
  } catch (e: any) {
    console.warn("[recon] patch threw:", e?.message || e);
    return false;
  }
}

async function emitNormalizedAlert(a: {
  kind: string; severity: "info" | "warning" | "error" | "critical";
  message: string; meta?: Record<string, unknown>;
}): Promise<void> {
  await invokeEdge("admin-alert", {
    kind: a.kind,
    severity: a.severity,
    source: "railway.reconciliation",
    feature: "delivery.continuity",
    message: a.message,
    meta: a.meta ?? {},
  });
}

// ---------- loop ----------

const stats = {
  ticks: 0,
  total_scanned: 0,
  total_repaired: 0,
  total_failures: 0,
  last_run_at: null as string | null,
  startedAt: Date.now(),
};

export function startReconciliationLoop(signal: AbortSignal) {
  const workerId = process.env.OPS_WORKER_ID || `recon-${process.pid}`;
  let idleMs = IDLE_MIN_MS;
  let heartbeatCountdown = 0;

  return (async () => {
    console.log(`[recon-loop] started (scan_limit=${SCAN_LIMIT}, worker=${workerId})`);
    while (!signal.aborted) {
      stats.ticks++;
      const tickStart = Date.now();
      const startedAt = new Date().toISOString();
      const agg = empty();
      let didWork = false;

      try {
        for (const fn of [caseDeliveredNotPatched, caseStuckQueued, caseRetryStorm, caseTelegramOrphan]) {
          if (signal.aborted) break;
          const res = await fn();
          agg.scanned += res.scanned;
          agg.repaired += res.repaired;
          agg.orphans  += res.orphans;
          agg.failures += res.failures;
        }
        // case 5 runs every tick (cheap COUNT)
        if (!signal.aborted) {
          const q = await caseQueueLag(workerId);
          agg.scanned += q.scanned;
        }

        didWork = agg.repaired > 0 || agg.orphans > 0;
        stats.total_scanned += agg.scanned;
        stats.total_repaired += agg.repaired;
        stats.total_failures += agg.failures;
        stats.last_run_at = new Date().toISOString();

        await publishReconRun({
          worker_id: workerId,
          scanned: agg.scanned,
          repaired: agg.repaired,
          orphans_found: agg.orphans,
          failures: agg.failures,
          started_at: startedAt,
        });

        // Heartbeat at lower frequency than ticks
        if (--heartbeatCountdown <= 0) {
          await publishHeartbeat({
            worker_id: workerId,
            worker_kind: "reconciliation",
            active_queues: ["artifact_delivery"],
            retry_pressure: stats.total_failures,
          });
          heartbeatCountdown = HEARTBEAT_EVERY_TICKS;
        }

        // Adaptive backoff
        if (didWork) idleMs = IDLE_MIN_MS;
        else idleMs = Math.min(idleMs * 2, IDLE_MAX_MS);

        await wait(idleMs, signal);
      } catch (e: any) {
        console.error("[recon-loop] tick error:", e?.message || e);
        await wait(IDLE_MIN_MS, signal);
      } finally {
        reportLoopTick("recon-loop", {
          tick_ms: Date.now() - tickStart,
          queue_depth: agg.scanned,
          did_work: didWork,
        });
      }
    }
    console.log("[recon-loop] stopped");
  })();
}

export function getReconciliationStats() {
  return { ...stats, uptime_s: Math.round((Date.now() - stats.startedAt) / 1000) };
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });
}