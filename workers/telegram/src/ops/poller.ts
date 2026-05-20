// Generic queue poller loop. Spins one loop per queue. Each tick: claim a
// job, run its handler with heartbeats, complete or fail. Backoff naturally
// applied by the DB via fail_job.
import { claim, complete, fail, heartbeat, type Queue } from "./queue.js";
import { getHandler } from "./handlers.js";

const HEARTBEAT_MS = 20_000;
// Cost stabilization: empty-queue backoff 2s -> 10s. SKIP LOCKED + lease
// fencing + queue semantics unchanged; only idle poll cadence relaxed.
const IDLE_MS = 10_000;
const ERROR_MS = 5_000;

export function startPoller(queue: Queue, workerId: string, signal: AbortSignal) {
  const loop = async () => {
    while (!signal.aborted) {
      try {
        const job = await claim(queue, workerId, 60);
        if (!job) { await wait(IDLE_MS, signal); continue; }
        await runJob(queue, job, workerId);
      } catch (e) {
        console.error(`[poller:${queue}]`, (e as Error).message);
        await wait(ERROR_MS, signal);
      }
    }
  };
  void loop();
}

async function runJob(queue: Queue, job: any, workerId: string) {
  const handler = getHandler(job.kind);
  if (!handler) {
    await fail(job.lease_token, new Error(`no handler for kind=${job.kind}`));
    return;
  }
  // heartbeat in background
  let alive = true;
  const hb = setInterval(() => {
    if (!alive) return;
    void heartbeat(job.lease_token, 60);
  }, HEARTBEAT_MS);
  try {
    const result = await handler(job);
    await complete(job.lease_token, result ?? {});
    console.log(`[poller:${queue}] ok ${job.kind} (${job.id})`);
  } catch (e) {
    const outcome = await fail(job.lease_token, e);
    console.warn(`[poller:${queue}] ${outcome} ${job.kind} (${job.id}): ${(e as Error).message}`);
  } finally {
    alive = false;
    clearInterval(hb);
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });
}