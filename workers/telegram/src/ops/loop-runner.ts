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
  disabled: boolean;
  disabled_reason: string | null;
  // Heartbeat / health signals (updated by the loop via reportLoopTick).
  last_tick_at: string | null;
  last_tick_ms: number | null;
  slow_ticks: number;
  // Queue starvation signals.
  last_queue_depth: number | null;
  last_work_at: string | null;
  starvation_warnings: number;
}

const registry = new Map<string, LoopState>();

const RESTART_MIN_MS = 5_000;
const RESTART_MAX_MS = 60_000;
const RESTART_JITTER_RATIO = 0.3; // ±30%
// Crash budget: if a loop crashes this many times within CRASH_WINDOW_MS,
// the supervisor self-disables the loop (process keeps running, sibling
// loops untouched). Operator must redeploy / flip flag to recover.
const CRASH_BUDGET = Number(process.env.LOOP_CRASH_BUDGET || 10);
const CRASH_WINDOW_MS = Number(process.env.LOOP_CRASH_WINDOW_MS || 10 * 60_000);
// Stale-loop detection: if a loop hasn't reported a tick in this long it's
// considered stale. Surfaced in /ops/loop-stats; not auto-killed (a wedged
// loop is safer than a flapping one).
const STALE_LOOP_MS = Number(process.env.LOOP_STALE_MS || 5 * 60_000);
// Slow-tick warning threshold.
const SLOW_TICK_MS = Number(process.env.LOOP_SLOW_TICK_MS || 30_000);
// Queue starvation: a non-empty queue that hasn't drained in this long.
const STARVATION_MS = Number(process.env.LOOP_STARVATION_MS || 10 * 60_000);

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
    disabled: false,
    disabled_reason: null,
    last_tick_at: null,
    last_tick_ms: null,
    slow_ticks: 0,
    last_queue_depth: null,
    last_work_at: null,
    starvation_warnings: 0,
  };
  registry.set(name, state);

  let backoff = RESTART_MIN_MS;
  const crashTimes: number[] = [];

  const supervisor = async () => {
    while (!signal.aborted) {
      try {
        await fn(signal);
        if (signal.aborted) break;
        console.warn(`[loop-runner] ${name} returned without abort; restarting`);
      } catch (e: any) {
        state.crashes++;
        state.last_crash_at = new Date().toISOString();
        state.last_error = String(e?.message || e).slice(0, 500);
        console.error(`[loop-runner] ${name} crashed (#${state.crashes}):`, state.last_error);
        // Crash budget — stop restarting if the loop is flapping.
        const now = Date.now();
        crashTimes.push(now);
        while (crashTimes.length && now - crashTimes[0] > CRASH_WINDOW_MS) crashTimes.shift();
        if (crashTimes.length >= CRASH_BUDGET) {
          state.disabled = true;
          state.disabled_reason = `crash_budget_exceeded (${crashTimes.length} in ${Math.round(CRASH_WINDOW_MS / 60_000)}m)`;
          console.error(`[loop-runner] ${name} self-disabled: ${state.disabled_reason}`);
          break;
        }
      }
      if (signal.aborted) break;
      state.restarts++;
      const jittered = backoff * (1 + (Math.random() * 2 - 1) * RESTART_JITTER_RATIO);
      await wait(Math.max(RESTART_MIN_MS, Math.round(jittered)), signal);
      backoff = Math.min(backoff * 2, RESTART_MAX_MS);
    }
    state.running = false;
    console.log(`[loop-runner] ${name} stopped (crashes=${state.crashes}, restarts=${state.restarts})`);
  };
  void supervisor();
}

export function getLoopRegistry(): LoopState[] {
  const now = Date.now();
  return Array.from(registry.values()).map((s) => {
    const stale =
      s.running &&
      !s.disabled &&
      s.last_tick_at != null &&
      now - Date.parse(s.last_tick_at) > STALE_LOOP_MS;
    const starved =
      s.running &&
      !s.disabled &&
      (s.last_queue_depth ?? 0) > 0 &&
      s.last_work_at != null &&
      now - Date.parse(s.last_work_at) > STARVATION_MS;
    return { ...s, stale, starved };
  });
}

// Called by each loop on every tick. `queue_depth` is the depth observed
// this tick (0 if empty); `did_work` is true if the tick actually drained
// items. Both are used for starvation detection.
export function reportLoopTick(
  name: string,
  opts: { tick_ms: number; queue_depth?: number; did_work?: boolean },
) {
  const s = registry.get(name);
  if (!s) return;
  const nowIso = new Date().toISOString();
  s.last_tick_at = nowIso;
  s.last_tick_ms = opts.tick_ms;
  if (opts.tick_ms > SLOW_TICK_MS) {
    s.slow_ticks++;
    console.warn(`[loop-runner] ${name} slow tick: ${opts.tick_ms}ms (threshold ${SLOW_TICK_MS}ms)`);
  }
  if (opts.queue_depth != null) s.last_queue_depth = opts.queue_depth;
  if (opts.did_work) s.last_work_at = nowIso;
  // First observation of non-empty queue also seeds last_work_at so we don't
  // immediately flag starvation on startup.
  else if (s.last_work_at == null && (opts.queue_depth ?? 0) > 0) s.last_work_at = nowIso;
}

export function isLoopDisabled(name: string): boolean {
  return registry.get(name)?.disabled === true;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });
}
