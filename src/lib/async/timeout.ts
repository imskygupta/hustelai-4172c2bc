export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export const DEFAULT_RUNTIME_TIMEOUT_MS = 8_000;
const activeBootTasks = new Map<string, number>();
const activeRuntimeRequests = new Map<string, { startedAt: number; label: string }>();
let watchdogInstalled = false;

function traceRuntime(event: string, detail: Record<string, unknown>) {
  try {
    if (typeof window === "undefined" || localStorage.getItem("hai_runtime_trace") !== "1") return;
    console.info(`[runtime] ${event}`, detail);
  } catch {
    /* tracing must never affect runtime */
  }
}

export function trackBootTask<T>(label: string, task: Promise<T> | PromiseLike<T>): Promise<T> {
  activeBootTasks.set(label, Date.now());
  return Promise.resolve(task).finally(() => activeBootTasks.delete(label));
}

export function getActiveBootTasks() {
  return Array.from(activeBootTasks.entries()).map(([label, startedAt]) => ({
    label,
    ageMs: Date.now() - startedAt,
  }));
}

export function getActiveRuntimeRequests() {
  return Array.from(activeRuntimeRequests.values()).map(({ label, startedAt }) => ({
    label,
    ageMs: Date.now() - startedAt,
  }));
}

export function installDeadlockWatchdog(thresholdMs = DEFAULT_RUNTIME_TIMEOUT_MS) {
  if (watchdogInstalled || typeof window === "undefined") return;
  watchdogInstalled = true;
  window.setInterval(() => {
    const stuck = getActiveRuntimeRequests().filter((r) => r.ageMs > thresholdMs);
    if (stuck.length === 0) return;
    console.warn("[runtime-watchdog] request exceeded deadline; UI must remain fail-open", stuck);
    window.dispatchEvent(new CustomEvent("hai:runtime-deadlock", { detail: stuck }));
  }, Math.max(1_000, Math.floor(thresholdMs / 2)));
}

export async function withTimeout<T>(
  task: Promise<T> | PromiseLike<T>,
  label: string,
  ms = 5_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(task),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function retryWithTimeout<T>(
  run: () => Promise<T> | PromiseLike<T>,
  label: string,
  options: { timeoutMs?: number; retries?: number; retryDelayMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const retries = Math.min(options.retries ?? 1, 2);
  const retryDelayMs = options.retryDelayMs ?? 350;
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await trackBootTask(`${label}${attempt ? ` retry ${attempt}` : ""}`, withTimeout(run(), label, timeoutMs));
    } catch (err) {
      last = err;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw last;
}

export async function runWithDeadline<T>(
  run: (signal: AbortSignal) => Promise<T> | PromiseLike<T>,
  label: string,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_RUNTIME_TIMEOUT_MS;
  const controller = new AbortController();
  const requestId = `${label}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let timer: ReturnType<typeof setTimeout> | undefined;
  activeRuntimeRequests.set(requestId, { label, startedAt: Date.now() });
  traceRuntime("request.start", { label, requestId, timeoutMs });
  try {
    return await Promise.race([
      Promise.resolve(run(controller.signal)),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new TimeoutError(label, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    activeRuntimeRequests.delete(requestId);
    traceRuntime("request.end", { label, requestId });
  }
}

export async function failOpen<T>(
  run: () => Promise<T> | PromiseLike<T>,
  fallback: T,
  label: string,
  options?: { timeoutMs?: number; retries?: number; retryDelayMs?: number },
): Promise<T> {
  try {
    return await retryWithTimeout(run, label, options);
  } catch (err) {
    console.warn(`[fail-open] ${label}:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

export const INFRA_SAFE_MODE = (() => {
  try {
    const value = (import.meta.env as any)?.VITE_INFRA_SAFE_MODE;
    return value === undefined ? true : String(value).toLowerCase() !== "false";
  } catch {
    return true;
  }
})();
