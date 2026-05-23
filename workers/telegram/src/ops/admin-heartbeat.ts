// Sprint D Phase 8.6 — ADMIN DB worker/queue observability writer.
//
// Responsibilities (ADMIN DB ONLY):
//   - worker_heartbeats     : upsert row every ~60s
//   - queue_metrics         : periodic queue depth snapshots
//   - delivery_reconciliation_runs : one row per reconciliation tick that did work
//
// Architecture rules enforced here:
//   - Never writes to PRIMARY
//   - Never writes large payloads (capped serialized size, no stack traces)
//   - Lazy ADMIN client — boot succeeds without ADMIN_* env vars; the writer
//     just becomes a no-op so dev environments don't crash
import { getAdminAdmin } from "../supabase.js";

let cachedAdmin: ReturnType<typeof getAdminAdmin> | null | undefined;
function admin() {
  if (cachedAdmin !== undefined) return cachedAdmin;
  try {
    cachedAdmin = getAdminAdmin();
  } catch (e) {
    console.warn("[admin-heartbeat] ADMIN DB not configured — observability writes disabled");
    cachedAdmin = null;
  }
  return cachedAdmin;
}

export interface HeartbeatInput {
  worker_id: string;
  worker_kind: string;
  active_queues?: string[];
  failed_jobs?: number;
  retry_pressure?: number;
  queue_lag_ms?: number;
  region?: string;
  version?: string;
}

export async function publishHeartbeat(input: HeartbeatInput): Promise<void> {
  const sb = admin();
  if (!sb) return;
  try {
    await sb.from("worker_heartbeats").upsert({
      worker_id: input.worker_id,
      worker_kind: input.worker_kind,
      region: input.region ?? process.env.RAILWAY_REGION ?? null,
      version: input.version ?? process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      last_seen_at: new Date().toISOString(),
      active_queues: input.active_queues ?? [],
      failed_jobs: input.failed_jobs ?? 0,
      retry_pressure: input.retry_pressure ?? 0,
      queue_lag_ms: input.queue_lag_ms ?? 0,
      meta: {},
    }, { onConflict: "worker_id" });
  } catch (e: any) {
    console.warn("[admin-heartbeat] publish failed:", e?.message || e);
  }
}

export interface QueueMetricInput {
  queue_name: string;
  pending: number;
  in_flight?: number;
  failed_recent?: number;
  oldest_pending_s?: number;
  worker_id?: string;
}

export async function publishQueueMetric(input: QueueMetricInput): Promise<void> {
  const sb = admin();
  if (!sb) return;
  try {
    await sb.from("queue_metrics").insert({
      queue_name: input.queue_name,
      pending: input.pending,
      in_flight: input.in_flight ?? 0,
      failed_recent: input.failed_recent ?? 0,
      oldest_pending_s: input.oldest_pending_s ?? 0,
      worker_id: input.worker_id ?? null,
    });
  } catch (e: any) {
    console.warn("[admin-heartbeat] queue metric failed:", e?.message || e);
  }
}

export interface ReconRunInput {
  worker_id: string;
  scanned: number;
  repaired: number;
  orphans_found: number;
  failures: number;
  started_at: string;
  notes?: string;
}

export async function publishReconRun(input: ReconRunInput): Promise<void> {
  const sb = admin();
  if (!sb) return;
  // Skip empty runs — only record ticks that actually did something.
  if (input.scanned === 0 && input.repaired === 0 && input.orphans_found === 0 && input.failures === 0) {
    return;
  }
  try {
    await sb.from("delivery_reconciliation_runs").insert({
      worker_id: input.worker_id,
      started_at: input.started_at,
      finished_at: new Date().toISOString(),
      scanned: input.scanned,
      repaired: input.repaired,
      orphans_found: input.orphans_found,
      failures: input.failures,
      notes: input.notes?.slice(0, 500) ?? null,
      meta: {},
    });
  } catch (e: any) {
    console.warn("[admin-heartbeat] recon run failed:", e?.message || e);
  }
}