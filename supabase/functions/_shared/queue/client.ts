// Unified Postgres-backed queue client for edge functions and workers.
// Wraps the ops.* RPCs created in Phase A. Service-role only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const URL = Deno.env.get("SUPABASE_URL") ?? "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function db() {
  if (!URL || !KEY) throw new Error("queue/client: SUPABASE_URL or SERVICE_ROLE_KEY missing");
  return createClient(URL, KEY, { auth: { persistSession: false } });
}

export type Queue = "ai" | "export" | "webhook" | "telegram" | "cron" | "cleanup";

export interface EnqueueOpts {
  queue: Queue;
  kind: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string | null;
  priority?: number;          // lower = higher
  maxAttempts?: number;
  runAt?: Date;
  traceId?: string | null;
  parentJobId?: string | null;
  userId?: string | null;
}

export async function enqueueJob(o: EnqueueOpts): Promise<string> {
  const { data, error } = await db().rpc("enqueue_job" as any, {
    _queue: o.queue,
    _kind: o.kind,
    _payload: o.payload ?? {},
    _idempotency_key: o.idempotencyKey ?? null,
    _priority: o.priority ?? 100,
    _max_attempts: o.maxAttempts ?? 5,
    _run_at: (o.runAt ?? new Date()).toISOString(),
    _trace_id: o.traceId ?? null,
    _parent_job_id: o.parentJobId ?? null,
    _user_id: o.userId ?? null,
  }, { get: false } as any);
  if (error) throw new Error(`enqueueJob failed: ${error.message}`);
  return String(data);
}

// Sprint E Phase 4 — defaults to weighted-fairness claim. Pass
// `{ weighted: false }` to opt back into raw FIFO (rarely needed).
export async function claimJob(
  queue: Queue,
  worker: string,
  leaseSeconds = 60,
  opts: { weighted?: boolean } = {},
) {
  const rpc = opts.weighted === false ? "claim_job" : "claim_job_weighted";
  const { data, error } = await db().rpc(rpc as any, {
    _queue: queue, _worker: worker, _lease_seconds: leaseSeconds,
  });
  if (error) throw new Error(`claimJob failed: ${error.message}`);
  const rows = (data as any[]) ?? [];
  return rows[0] ?? null;
}

export async function heartbeatJob(token: string, leaseSeconds = 60): Promise<boolean> {
  const { data, error } = await db().rpc("heartbeat_job" as any, {
    _token: token, _lease_seconds: leaseSeconds,
  });
  if (error) return false;
  return !!data;
}

export async function completeJob(token: string, result: Record<string, unknown> = {}): Promise<boolean> {
  const { data, error } = await db().rpc("complete_job" as any, {
    _token: token, _result: result,
  });
  if (error) throw new Error(`completeJob failed: ${error.message}`);
  return !!data;
}

export async function failJob(token: string, error: Record<string, unknown>): Promise<"retried" | "dlq" | "not_found"> {
  const { data, error: e } = await db().rpc("fail_job" as any, {
    _token: token, _error: error,
  });
  if (e) throw new Error(`failJob failed: ${e.message}`);
  return (data as any) ?? "not_found";
}

export async function cancelJob(id: string): Promise<boolean> {
  const { data, error } = await db().rpc("cancel_job" as any, { _id: id });
  if (error) throw new Error(`cancelJob failed: ${error.message}`);
  return !!data;
}

export async function sweepStuckJobs(): Promise<number> {
  const { data, error } = await db().rpc("sweep_stuck_jobs" as any, {});
  if (error) throw new Error(`sweepStuckJobs failed: ${error.message}`);
  return Number(data ?? 0);
}

export async function replayDlq(dlqId: string, force = false): Promise<string> {
  const { data, error } = await db().rpc("replay_dlq" as any, { _dlq_id: dlqId, _force: force });
  if (error) throw new Error(`replayDlq failed: ${error.message}`);
  return String(data);
}

export async function emitEvent(
  name: string,
  payload: Record<string, unknown> = {},
  ctx: { traceId?: string | null; actorId?: string | null; source?: string | null } = {},
): Promise<number> {
  const { data, error } = await db().rpc("emit_event" as any, {
    _name: name,
    _payload: payload,
    _trace_id: ctx.traceId ?? null,
    _actor_id: ctx.actorId ?? null,
    _source: ctx.source ?? null,
  });
  if (error) throw new Error(`emitEvent failed: ${error.message}`);
  return Number(data ?? 0);
}

export async function workerHeartbeat(
  worker: string,
  queues: string[] = [],
  extra: { hostname?: string; version?: string; meta?: Record<string, unknown> } = {},
): Promise<void> {
  const { error } = await db().rpc("worker_heartbeat" as any, {
    _worker: worker,
    _queues: queues,
    _hostname: extra.hostname ?? null,
    _version: extra.version ?? null,
    _meta: extra.meta ?? {},
  });
  if (error) throw new Error(`workerHeartbeat failed: ${error.message}`);
}