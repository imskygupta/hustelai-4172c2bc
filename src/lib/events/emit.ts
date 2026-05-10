// Client-side event emitter. Wraps the `log-event` edge function with
// type safety, default severity, and a dedupe key. Fire-and-forget — never
// throws into the calling component.
import { supabase } from "@/integrations/supabase/client";
import {
  AppEvent,
  EVENT_CATEGORY,
  EVENT_SEVERITY,
  EventSeverity,
} from "./types";

function dedupeKey(name: string, payload: Record<string, unknown>): string {
  // Stable-ish hash of name + a few identifying fields (avoid tying to ts).
  const id = (payload.payment_id || payload.export_id || payload.workspace_id || payload.user_id || "") as string;
  return `${name}:${id}:${Math.floor(Date.now() / 5000)}`;
}

export function emit<E extends AppEvent>(
  event: E,
  opts: { severity?: EventSeverity; source?: string } = {},
): void {
  try {
    const payload = event.payload as unknown as Record<string, unknown>;
    const body = {
      category: EVENT_CATEGORY[event.name],
      action: event.name,
      severity: opts.severity ?? EVENT_SEVERITY[event.name],
      source: opts.source ?? "client",
      dedupe_key: dedupeKey(event.name, payload),
      payload,
    };
    void supabase.functions.invoke("log-event", { body }).catch(() => {});
  } catch {
    /* analytics must never break UI */
  }
}
