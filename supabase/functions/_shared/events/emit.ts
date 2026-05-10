// Server-side event emitter. Writes to analytics `event_log` and triggers
// fan-out via the dispatcher. Never throws — analytics must not break the
// primary request path.
import { safeAnalyticsInsert } from "../clients.ts";
import { ServerEvent, EventSeverity } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Emit an event server-side. Optionally fans out to dispatcher. */
export async function emitServer(
  event: ServerEvent,
  opts: { dispatch?: boolean } = { dispatch: true },
): Promise<void> {
  const row = {
    user_id: event.user_id ?? null,
    category: event.category,
    action: event.name,
    severity: (event.severity ?? "info") as EventSeverity,
    source: event.source ?? "server",
    payload: event.payload ?? {},
    dedupe_key: event.dedupe_key ?? null,
  };

  // 1) write to analytics (append-only ledger)
  await safeAnalyticsInsert("event_log", row);

  // 2) fire-and-forget fan-out
  if (opts.dispatch !== false && SUPABASE_URL && SERVICE_KEY) {
    try {
      void fetch(`${SUPABASE_URL}/functions/v1/event-dispatcher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(row),
      }).catch(() => {});
    } catch {/* swallow */}
  }
}
