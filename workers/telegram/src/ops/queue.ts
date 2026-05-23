// Node/Express-side queue client mirroring supabase/functions/_shared/queue/client.ts.
// Uses the same ops.* RPCs over the existing supabaseAdmin connection.
import { supabaseAdmin } from "../supabase.js";

export type Queue = "ai" | "export" | "webhook" | "telegram" | "cron" | "cleanup";

export interface JobRow {
  id: string;
  queue: Queue;
  kind: string;
  status: string;
  payload: Record<string, unknown>;
  trace_id: string;
  user_id: string | null;
  attempt: number;
  max_attempts: number;
  lease_token: string;
  leased_until: string;
  checkpoint: Record<string, unknown> | null;
  cancel_requested: boolean;
}

// Sprint E Phase 4 — weighted-fairness claim. Honors canonical tier
// priority + aging (anti-starvation) + retry decay. Falls back to raw
// FIFO claim only if the weighted RPC is missing (older DB version).
const USE_WEIGHTED = String(process.env.QUEUE_WEIGHTED_CLAIM ?? "true").toLowerCase() !== "false";
export async function claim(queue: Queue, worker: string, leaseSeconds = 60): Promise<JobRow | null> {
  const rpc = USE_WEIGHTED ? "claim_job_weighted" : "claim_job";
  const { data, error } = await supabaseAdmin.rpc(rpc as any, {
    _queue: queue, _worker: worker, _lease_seconds: leaseSeconds,
  });
  if (error) {
    // Soft-fallback if the weighted RPC is missing on this env.
    if (USE_WEIGHTED && /function .* does not exist/i.test(error.message)) {
      console.warn("[queue.claim] weighted RPC missing, falling back to claim_job");
      const { data: d2, error: e2 } = await supabaseAdmin.rpc("claim_job" as any, {
        _queue: queue, _worker: worker, _lease_seconds: leaseSeconds,
      });
      if (e2) { console.error("[queue.claim]", queue, e2.message); return null; }
      return ((d2 as any[]) ?? [])[0] ?? null;
    }
    console.error("[queue.claim]", queue, error.message);
    return null;
  }
  const rows = (data as any[]) ?? [];
  return rows[0] ?? null;
}

export async function heartbeat(token: string, leaseSeconds = 60): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc("heartbeat_job" as any, {
    _token: token, _lease_seconds: leaseSeconds,
  });
  return !!data;
}

export async function complete(token: string, result: Record<string, unknown> = {}): Promise<void> {
  const { error } = await supabaseAdmin.rpc("complete_job" as any, { _token: token, _result: result });
  if (error) console.error("[queue.complete]", error.message);
}

export async function fail(token: string, err: unknown): Promise<"retried" | "dlq" | "not_found"> {
  const errPayload = {
    message: (err as any)?.message || String(err),
    stack: (err as any)?.stack || null,
    at: new Date().toISOString(),
  };
  const { data } = await supabaseAdmin.rpc("fail_job" as any, { _token: token, _error: errPayload });
  return (data as any) ?? "not_found";
}

export async function sweep(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("sweep_stuck_jobs" as any, {});
  if (error) { console.error("[queue.sweep]", error.message); return 0; }
  return Number(data ?? 0);
}

export async function emitEvent(
  name: string,
  payload: Record<string, unknown> = {},
  ctx: { traceId?: string | null; actorId?: string | null; source?: string | null } = {},
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("emit_event" as any, {
    _name: name, _payload: payload,
    _trace_id: ctx.traceId ?? null,
    _actor_id: ctx.actorId ?? null,
    _source: ctx.source ?? "worker",
  });
  if (error) console.error("[queue.emit_event]", name, error.message);
}

export async function workerHeartbeat(
  worker: string, queues: string[],
  meta: { hostname?: string; version?: string; extra?: Record<string, unknown> } = {},
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("worker_heartbeat" as any, {
    _worker: worker, _queues: queues,
    _hostname: meta.hostname ?? null,
    _version: meta.version ?? null,
    _meta: meta.extra ?? {},
  });
  if (error) console.error("[queue.workerHeartbeat]", error.message);
}