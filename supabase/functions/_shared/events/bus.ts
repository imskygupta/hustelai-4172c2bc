// Typed internal event bus. Thin wrapper over ops.emit_event with a
// canonical event-name vocabulary. Never throws on the hot path.
import { emitEvent } from "../queue/client.ts";

export const Events = {
  USER_SIGNED_UP: "USER_SIGNED_UP",
  USER_TIER_CHANGED: "USER_TIER_CHANGED",
  PAYMENT_INITIATED: "PAYMENT_INITIATED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  EXPORT_STARTED: "EXPORT_STARTED",
  EXPORT_COMPLETED: "EXPORT_COMPLETED",
  EXPORT_FAILED: "EXPORT_FAILED",
  EXPORT_DELIVERED: "EXPORT_DELIVERED",
  AI_JOB_QUEUED: "AI_JOB_QUEUED",
  AI_JOB_STARTED: "AI_JOB_STARTED",
  AI_JOB_COMPLETED: "AI_JOB_COMPLETED",
  AI_JOB_FAILED: "AI_JOB_FAILED",
  TELEGRAM_ALERT_SENT: "TELEGRAM_ALERT_SENT",
  TELEGRAM_ALERT_FAILED: "TELEGRAM_ALERT_FAILED",
  WEBHOOK_RECEIVED: "WEBHOOK_RECEIVED",
  WEBHOOK_PROCESSED: "WEBHOOK_PROCESSED",
  WEBHOOK_FAILED: "WEBHOOK_FAILED",
  WORKER_HEARTBEAT: "WORKER_HEARTBEAT",
  WORKER_STALLED: "WORKER_STALLED",
  ANOMALY_DETECTED: "ANOMALY_DETECTED",
  KILL_SWITCH_TRIPPED: "KILL_SWITCH_TRIPPED",
} as const;

export type EventName = typeof Events[keyof typeof Events];

export interface EventCtx {
  traceId?: string | null;
  actorId?: string | null;
  source?: string | null;
}

/** Replay-safe typed emit. Returns event id, or 0 on failure. Never throws. */
export async function publish(
  name: EventName,
  payload: Record<string, unknown> = {},
  ctx: EventCtx = {},
): Promise<number> {
  try {
    return await emitEvent(name, payload, ctx);
  } catch (e) {
    console.error("[bus.publish] failed", name, (e as Error).message);
    return 0;
  }
}