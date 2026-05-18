// Mirror helper — writes a row into the owned async_runtime schema on the
// owned Supabase project (wguuipsikboqqinqeehv), then bumps the runtime
// extraction metrics so the admin panel reflects real production traffic.
//
// Fire-and-forget. Never throws. Safe to call from any edge function on a
// hot request path.
import { getOwned, getPrimaryService, ownedReady } from "./clients.ts";

const EST_BYTES: Record<string, number> = {
  notification_deliveries: 384,
  telegram_send_log: 256,
  admin_alert_history: 384,
  broadcast_telemetry: 256,
  delivery_receipts: 256,
  queue_archive: 512,
  completed_jobs: 320,
  replay_history: 320,
  retry_history: 256,
  runtime_health_sweeps: 384,
  incident_history: 512,
  lease_contention_log: 256,
};

function recordMetric(stream: string, outcome: "owned"|"mirror"|"fail", n = 1, bytes = 0): void {
  try {
    const primary = getPrimaryService();
    void primary.rpc("runtime_record_route", {
      _stream: stream,
      _outcome: outcome,
      _count: n,
      _confidence: null,
      _bytes_avoided: bytes,
    });
  } catch { /* tolerate */ }
}

function recordFallback(stream: string, reason: string): void {
  try {
    const primary = getPrimaryService();
    void primary.rpc("runtime_record_fallback" as any, {
      _stream: stream,
      _reason: reason.slice(0, 300),
      _expires_in_seconds: 600,
    });
  } catch { /* tolerate */ }
}

/**
 * Mirror a single row into the owned async_runtime schema.
 * - `table` is the bare table name inside the async_runtime schema.
 * - `stream` is the matching runtime_extraction_streams.stream label.
 */
export function mirrorAsyncRuntime(
  table: string,
  row: Record<string, unknown>,
  stream?: string,
): void {
  const streamName = stream || table;
  if (!ownedReady()) {
    recordMetric(streamName, "fail", 1, 0);
    recordFallback(streamName, "owned_not_ready");
    return;
  }
  void (async () => {
    try {
      const owned = getOwned();
      const { error } = await owned.schema("async_runtime").from(table).insert(row);
      if (error) {
        recordMetric(streamName, "fail", 1, 0);
        recordFallback(streamName, error.message || "owned_insert_error");
        return;
      }
      const bytes = EST_BYTES[table] ?? 256;
      recordMetric(streamName, "owned", 1, bytes);
    } catch (e) {
      recordMetric(streamName, "fail", 1, 0);
      recordFallback(streamName, (e as Error)?.message || "owned_exception");
    }
  })();
}

/** Mirror many rows at once. */
export function mirrorAsyncRuntimeBatch(
  table: string,
  rows: Record<string, unknown>[],
  stream?: string,
): void {
  if (!rows.length) return;
  const streamName = stream || table;
  if (!ownedReady()) {
    recordMetric(streamName, "fail", rows.length, 0);
    recordFallback(streamName, "owned_not_ready");
    return;
  }
  void (async () => {
    try {
      const owned = getOwned();
      const { error } = await owned.schema("async_runtime").from(table).insert(rows);
      if (error) {
        recordMetric(streamName, "fail", rows.length, 0);
        recordFallback(streamName, error.message || "owned_insert_error");
        return;
      }
      const bytes = (EST_BYTES[table] ?? 256) * rows.length;
      recordMetric(streamName, "owned", rows.length, bytes);
    } catch (e) {
      recordMetric(streamName, "fail", rows.length, 0);
      recordFallback(streamName, (e as Error)?.message || "owned_exception");
    }
  })();
}