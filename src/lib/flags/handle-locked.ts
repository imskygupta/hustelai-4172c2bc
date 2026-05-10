/**
 * Detect feature-flag lock responses from edge functions.
 * Edge guards return shape: { error, locked: true, feature, flag: { reason, source, maintenance, message } }
 * with HTTP 423 (locked) or 503 (maintenance).
 */
import type { ResolvedFlag } from "./types";

export interface LockedPayload {
  locked: true;
  feature: string;
  flag: ResolvedFlag | null;
  error?: string;
}

export function isLockedPayload(x: unknown): x is LockedPayload {
  return !!x && typeof x === "object" && (x as any).locked === true && typeof (x as any).feature === "string";
}

/**
 * Wrap a fetch / supabase.functions.invoke call. Returns either:
 *   { ok: true, data }  — normal result
 *   { ok: false, locked: true, payload } — flag lock (caller should render DegradedState)
 *   { ok: false, locked: false, error } — any other error
 */
export async function safeInvoke<T = unknown>(
  run: () => Promise<{ data: any; error: any }>,
): Promise<
  | { ok: true; data: T }
  | { ok: false; locked: true; payload: LockedPayload }
  | { ok: false; locked: false; error: string }
> {
  try {
    const { data, error } = await run();
    if (error) {
      // supabase-js bundles status in error.context?.status sometimes
      const ctx: any = (error as any).context;
      const body = ctx?.body ?? data;
      if (isLockedPayload(body)) return { ok: false, locked: true, payload: body };
      return { ok: false, locked: false, error: error.message || "Request failed" };
    }
    if (isLockedPayload(data)) return { ok: false, locked: true, payload: data };
    return { ok: true, data: data as T };
  } catch (e: any) {
    return { ok: false, locked: false, error: String(e?.message || e) };
  }
}