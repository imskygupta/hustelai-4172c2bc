// Internal scheduler. Enqueues recurring jobs into ops.jobs at fixed
// cadences. Uses idempotency keys bucketed by time so duplicate ticks
// (e.g. two workers) collapse to one row.
import { supabaseAdmin } from "../supabase.js";

interface Tick {
  kind: string;
  queue: string;
  everyMinutes: number;
  bucket: (now: Date) => string; // idempotency suffix
}

const ticks: Tick[] = [
  { kind: "cleanup.expired_exports", queue: "cleanup", everyMinutes: 60,
    bucket: (n) => n.toISOString().slice(0, 13) },                       // hourly
  { kind: "cleanup.queue_purge",     queue: "cleanup", everyMinutes: 60,
    bucket: (n) => n.toISOString().slice(0, 13) },                       // hourly
  { kind: "cleanup.ops_events_prune", queue: "cleanup", everyMinutes: 1440,
    bucket: (n) => n.toISOString().slice(0, 10) },                       // daily
];

export function startCron(signal: AbortSignal) {
  const loop = async () => {
    while (!signal.aborted) {
      const now = new Date();
      for (const t of ticks) {
        try {
          const idem = `cron:${t.kind}:${t.bucket(now)}`;
          await supabaseAdmin.rpc("enqueue_job" as any, {
            _queue: t.queue, _kind: t.kind, _payload: {},
            _idempotency_key: idem, _priority: 200, _max_attempts: 3,
            _run_at: now.toISOString(), _trace_id: null, _parent_job_id: null, _user_id: null,
          });
        } catch (e) {
          console.error("[cron]", t.kind, (e as Error).message);
        }
      }
      await wait(60_000, signal); // re-evaluate every minute; idempotency keeps it safe
    }
  };
  void loop();
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });
}