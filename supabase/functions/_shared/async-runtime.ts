// Operational write router + mirror helper.
//
// Two entrypoints:
//   - mirrorAsyncRuntime(table, row, stream?) — legacy, owned-only mirror.
//   - writeOperational({ stream, table, owned, primary }) — Phase 3 router.
//     Consults runtime_extraction_streams.authority_state and conditionally
//     skips the primary write once the stream is owned-authoritative.
//
// All paths are fire-and-forget on the owned side and never throw on the hot
// request path. The primary callback IS awaited because callers usually need
// the inserted row id back (e.g. dispatcher uses it for a follow-up update).
import { getOwned, getPrimaryService, ownedReady } from "./clients.ts";

// -------------------- authority cache --------------------
type AuthorityRow = {
  authority_state: "primary" | "mirror" | "owned_authoritative" | "primary_disabled";
  parity_status: string | null;
  rail_guarded: boolean;
  primary_writes_disabled: boolean;
  fetched_at: number;
};
const AUTHORITY_TTL_MS = 60_000;
const authorityCache = new Map<string, AuthorityRow>();

async function getAuthority(stream: string): Promise<AuthorityRow> {
  const cached = authorityCache.get(stream);
  const now = Date.now();
  if (cached && now - cached.fetched_at < AUTHORITY_TTL_MS) return cached;
  try {
    const { data } = await getPrimaryService()
      .rpc("runtime_get_authority" as any, { _stream: stream });
    const row = Array.isArray(data) ? data[0] : data;
    const result: AuthorityRow = {
      authority_state: (row?.authority_state ?? "primary") as AuthorityRow["authority_state"],
      parity_status: row?.parity_status ?? null,
      rail_guarded: !!row?.rail_guarded,
      primary_writes_disabled: !!row?.primary_writes_disabled,
      fetched_at: now,
    };
    authorityCache.set(stream, result);
    return result;
  } catch {
    // Default to safest behavior: primary remains authoritative.
    const result: AuthorityRow = {
      authority_state: "primary",
      parity_status: null,
      rail_guarded: false,
      primary_writes_disabled: false,
      fetched_at: now,
    };
    authorityCache.set(stream, result);
    return result;
  }
}

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

function recordPrimary(stream: string, n = 1): void {
  try {
    const primary = getPrimaryService();
    void primary.rpc("runtime_record_route", {
      _stream: stream,
      _outcome: "primary",
      _count: n,
      _confidence: null,
      _bytes_avoided: 0,
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