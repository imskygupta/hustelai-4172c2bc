// Sprint D · Phase 5 — Operational telemetry normalization.
//
// Admin Telegram + admin_alerts row must only ever receive structured,
// operator-grade signals. Anything else (legacy stack traces, primary-guard
// spam, client.unhandled_rejection, no_key blanks, raw HTML) is dropped or
// converted to a structured audit-log entry but NEVER reaches Telegram.
//
// Whitelisted operational kinds:
//   delivery.failed      — A delivery attempt exhausted retries.
//   retry_storm          — More than N retries within window for one artifact.
//   auth.failed          — Worker/edge could not resolve an authoritative session.
//   pipeline.anomaly     — FSM violation: artifact moved backward / orphan write.
//   worker.down          — Railway worker missed N heartbeats.
//   queue.stalled        — Queue depth grew without throughput for N minutes.

export type OperationalKind =
  | "delivery.failed"
  | "retry_storm"
  | "auth.failed"
  | "pipeline.anomaly"
  | "worker.down"
  | "queue.stalled";

const WHITELIST: ReadonlySet<string> = new Set<OperationalKind>([
  "delivery.failed",
  "retry_storm",
  "auth.failed",
  "pipeline.anomaly",
  "worker.down",
  "queue.stalled",
]);

// Legacy kinds we explicitly want to silence on the TG channel.
const SILENCE_PATTERNS = [
  /^client\.unhandled_rejection$/i,
  /^client\.unknown$/i,
  /primary[-_]guard/i,
  /no_key/i,
  /unspecified alert/i,
];

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export interface RawAlertInput {
  kind?: string;
  severity?: AlertSeverity | string;
  source?: string;
  user_id?: string | null;
  feature?: string | null;
  message?: string;
  meta?: Record<string, unknown>;
  // Loose top-level fields some callers pass; we fold them into meta.
  artifact_id?: string | null;
  export_id?: string | null;
  retry_count?: number | null;
  failure_reason?: string | null;
  pipeline_stage?: string | null;
}

export interface NormalizedAlert {
  kind: OperationalKind;
  severity: AlertSeverity;
  source: string;
  user_id: string | null;
  feature: string | null;
  message: string;
  meta: Record<string, unknown>;
}

export interface NormalizeResult {
  /** The normalized alert to forward to TG + admin_alerts, or null if dropped. */
  alert: NormalizedAlert | null;
  /** Structured reason a non-null kind was dropped. */
  dropped_reason?:
    | "not_whitelisted"
    | "silenced_legacy"
    | "empty_payload"
    | "html_fragment";
  /** Audit row to write to admin_alerts_dropped — even for drops we keep history. */
  audit: {
    original_kind: string;
    original_message: string;
    dropped: boolean;
    reason: string;
  };
}

function stripUnsafe(input: string): string {
  return String(input ?? "")
    // Strip HTML tags entirely — operator TG should never receive raw markup.
    .replace(/<[^>]+>/g, "")
    // Collapse whitespace.
    .replace(/\s+/g, " ")
    .trim();
}

function isHtmlHeavy(s: string): boolean {
  // 3+ tags or a stack frame signature → caller likely passed a raw error blob.
  const tags = (s.match(/<[a-z]/gi) || []).length;
  return tags >= 3 || /\bat\s+\S+\s+\(.*:\d+:\d+\)/.test(s);
}

/**
 * Normalize an alert. Returns `{ alert, audit }` where `alert` is null if the
 * input must be dropped from operator surfaces. `audit` is always populated so
 * the caller can persist a row to `admin_alerts_dropped` for traceability.
 */
export function normalizeOperationalAlert(input: RawAlertInput): NormalizeResult {
  const originalKind = String(input.kind ?? "").trim();
  const originalMessage = String(input.message ?? "");

  // 1. Silence legacy noise outright.
  if (SILENCE_PATTERNS.some((rx) => rx.test(originalKind) || rx.test(originalMessage))) {
    return {
      alert: null,
      dropped_reason: "silenced_legacy",
      audit: {
        original_kind: originalKind || "(empty)",
        original_message: originalMessage.slice(0, 500),
        dropped: true,
        reason: "silenced_legacy",
      },
    };
  }

  // 2. Empty payloads are not operational events.
  const cleanedMessage = stripUnsafe(originalMessage);
  if (!cleanedMessage) {
    return {
      alert: null,
      dropped_reason: "empty_payload",
      audit: {
        original_kind: originalKind || "(empty)",
        original_message: "",
        dropped: true,
        reason: "empty_payload",
      },
    };
  }

  // 3. HTML / stack-frame heavy payloads are dev-time errors, not ops alerts.
  if (isHtmlHeavy(originalMessage)) {
    return {
      alert: null,
      dropped_reason: "html_fragment",
      audit: {
        original_kind: originalKind || "(empty)",
        original_message: originalMessage.slice(0, 500),
        dropped: true,
        reason: "html_fragment",
      },
    };
  }

  // 4. Kind must be on the operator whitelist.
  if (!WHITELIST.has(originalKind)) {
    return {
      alert: null,
      dropped_reason: "not_whitelisted",
      audit: {
        original_kind: originalKind || "(empty)",
        original_message: cleanedMessage.slice(0, 500),
        dropped: true,
        reason: "not_whitelisted",
      },
    };
  }

  // 5. Build the canonical alert.
  const meta: Record<string, unknown> = { ...(input.meta || {}) };
  if (input.artifact_id) meta.artifact_id = input.artifact_id;
  if (input.export_id) meta.export_id = input.export_id;
  if (input.retry_count != null) meta.retry_count = input.retry_count;
  if (input.failure_reason) meta.failure_reason = input.failure_reason;
  if (input.pipeline_stage) meta.pipeline_stage = input.pipeline_stage;

  const sev = (["info", "warning", "error", "critical"] as const).includes(
    input.severity as any,
  )
    ? (input.severity as AlertSeverity)
    : "error";

  return {
    alert: {
      kind: originalKind as OperationalKind,
      // Formal operational events default to error+ — they always page operators.
      severity: sev === "info" || sev === "warning" ? "error" : sev,
      source: String(input.source || "edge"),
      user_id: input.user_id ?? null,
      feature: input.feature ?? null,
      message: cleanedMessage.slice(0, 280),
      meta,
    },
    audit: {
      original_kind: originalKind,
      original_message: originalMessage.slice(0, 500),
      dropped: false,
      reason: "ok",
    },
  };
}

export const OPERATIONAL_WHITELIST: ReadonlyArray<OperationalKind> = [
  "delivery.failed",
  "retry_storm",
  "auth.failed",
  "pipeline.anomaly",
  "worker.down",
  "queue.stalled",
];