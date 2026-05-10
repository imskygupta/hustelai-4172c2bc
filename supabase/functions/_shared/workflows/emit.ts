// Workflow event emitter — calls enqueue_workflow_runs RPC directly.
// Safe: never throws, never blocks the producer's primary path.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

export interface EmitOptions {
  user_id?: string | null;
  dedupe_key?: string | null;
  source?: string;
}

/**
 * Emit an event into the workflow engine. Fire-and-forget by design — never
 * throws so payment/export/telegram producers stay resilient if automations
 * are disabled or the engine is paused.
 */
export async function emitWorkflowEvent(
  sb: SupabaseClient,
  name: string,
  payload: Record<string, unknown> = {},
  opts: EmitOptions = {},
): Promise<{ event_id: string | null; runs_enqueued: number }> {
  try {
    const { data, error } = await sb.rpc("enqueue_workflow_runs", {
      _event_name: name,
      _payload: payload,
      _user_id: opts.user_id ?? null,
      _dedupe_key: opts.dedupe_key ?? null,
      _source: opts.source ?? "edge",
    });
    if (error) {
      console.warn("[workflow-emit]", name, error.message);
      return { event_id: null, runs_enqueued: 0 };
    }
    const row = (data as any[])?.[0] ?? null;
    return {
      event_id: row?.event_id ?? null,
      runs_enqueued: Number(row?.runs_enqueued ?? 0),
    };
  } catch (e) {
    console.warn("[workflow-emit] threw", name, e);
    return { event_id: null, runs_enqueued: 0 };
  }
}

/** Fire-and-forget variant for callers that don't want to await. */
export function emitWorkflowEventAsync(
  sb: SupabaseClient,
  name: string,
  payload: Record<string, unknown> = {},
  opts: EmitOptions = {},
): void {
  void emitWorkflowEvent(sb, name, payload, opts);
}