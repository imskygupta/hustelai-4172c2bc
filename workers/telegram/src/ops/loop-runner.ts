// loop-runner — per-loop isolation boundary.
//
// Each background loop runs inside a supervisor that:
//   - catches any unhandled error/rejection escaping the loop function
//   - logs it without taking down the process or sibling loops
//   - increments a per-loop crash counter
//   - restarts the loop with exponential backoff (5s → 60s cap)
//   - stops cleanly when the shared AbortSignal fires (SIGTERM/SIGINT)
//
// This is the ONLY blessed way to start a loop. Direct `void loop()` calls
// bypass isolation and crash-budget tracking — do not use them.
type LoopFn = (signal: AbortSignal) => Promise<void> | void;

interface LoopState {
  name: string;
  crashes: number;
  last_crash_at: string | null;
  last_error: string | null;
  restarts: number;
  started_at: string;
  running: boolean;
}

const registry = new Map<string, LoopState>();

const RESTART_MIN_MS = 5_000;
const RESTART_MAX_MS = 60_000;

export function superviseLoop(name: string, fn: LoopFn, signal: AbortSignal) {
  if (registry.has(name)) {
    console.warn(`[loop-runner] ${name} already registered — ignoring duplicate start`);
    return;
  }
  const state: LoopState = {
    name,
    crashes: 0,
    last_crash_at: null,
    last_error: null,
    restarts: 0,
    started_at: new Date().toISOString(),
    running: true,
  };
  registry.set(name, state);

  let backoff = RESTART_MIN_MS;

  const supervisor = async () => {
    while (!signal.aborted) {
      try {
        await fn(signal);
        // If the loop returns cleanly (e.g. it saw signal.aborted), exit.
        if (signal.aborted) break;
        // Otherwise a loop that returned without crashing is a bug — restart anyway.
        console.warn(`[loop-runner] ${name} returned without abort; restarting`);
      } catch (e: any) {
        state.crashes++;
        state.last_crash_at = new Date().toISOString();
        state.last_error = String(e?.message || e).slice(0, 500);
        console.error(`[loop-runner] ${name} crashed (#${state.crashes}):`, state.last_error);
      }
      if (signal.aborted) break;
      state.restarts++;
      await wait(backoff, signal);
      backoff = Math.min(backoff * 2, RESTART_MAX_MS);
    }
    state.running = false;
    console.log(`[loop-runner] ${name} stopped (crashes=${state.crashes}, restarts=${state.restarts})`);
  };
  void supervisor();
}

export function getLoopRegistry(): LoopState[] {
  return Array.from(registry.values());
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });
}
