// Stuck-lease sweeper + worker heartbeat publisher.
import { sweep, workerHeartbeat, emitEvent } from "./queue.js";
import os from "node:os";

export function startSweeper(workerId: string, queues: string[], signal: AbortSignal) {
  const loop = async () => {
    while (!signal.aborted) {
      try {
        const n = await sweep();
        if (n > 0) console.log(`[sweeper] unstuck ${n} job(s)`);
      } catch (e) {
        console.error("[sweeper]", (e as Error).message);
      }
      await wait(15_000, signal);
    }
  };
  void loop();
}

export function startHeartbeat(workerId: string, queues: string[], signal: AbortSignal) {
  const meta = { hostname: os.hostname(), version: "ops-1.0.0" };
  const loop = async () => {
    while (!signal.aborted) {
      try {
        await workerHeartbeat(workerId, queues, meta);
        await emitEvent("WORKER_HEARTBEAT", { worker: workerId, queues }, { source: "worker.ops" });
      } catch (e) {
        console.error("[heartbeat]", (e as Error).message);
      }
      await wait(30_000, signal);
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