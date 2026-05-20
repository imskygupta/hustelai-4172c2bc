export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

const activeBootTasks = new Map<string, number>();

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
  const retries = options.retries ?? 1;
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
