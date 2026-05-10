// Lightweight, fire-and-forget event tracker for the Usage Intelligence Layer.
// Standardized event names live in EVENTS — never emit ad-hoc strings.
import { supabase } from "@/integrations/supabase/client";

export const EVENTS = {
  TOOL_OPENED: "tool_opened",
  TOOL_GENERATED: "tool_generated",
  QUOTA_HIT: "quota_hit",
  UNLOCK_PROMPT_SEEN: "unlock_prompt_seen",
  UNLOCK_PURCHASED: "unlock_purchased",
  UPGRADE_CLICKED: "upgrade_clicked",
  EXPORT_CREATED: "export_created",
  TELEGRAM_DELIVERY: "telegram_delivery",
  WORKFLOW_STARTED: "workflow_started",
  WORKFLOW_FAILED: "workflow_failed",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  AI_JOB_STARTED: "ai_job_started",
  AI_JOB_FAILED: "ai_job_failed",
  ADMIN_ACTION: "admin_action",
  RAGE_CLICK: "rage_click",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS] | string;

export interface TrackPayload {
  capability?: string;
  surface?: string;
  meter?: string;
  feature?: string;
  valueNum?: number;
  metadata?: Record<string, unknown>;
}

let SESSION_ID: string | null = null;
function sessionId(): string {
  if (SESSION_ID) return SESSION_ID;
  try {
    const k = "ha_sid";
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      sessionStorage.setItem(k, v);
    }
    SESSION_ID = v;
    return v;
  } catch {
    SESSION_ID = crypto.randomUUID();
    return SESSION_ID;
  }
}

// Coalesce bursts so we don't hammer the DB on rapid-fire events.
const QUEUE: Array<{ name: string; p: TrackPayload }> = [];
let TIMER: number | null = null;

function flush() {
  TIMER = null;
  if (!QUEUE.length) return;
  const batch = QUEUE.splice(0);
  for (const item of batch) {
    void supabase.rpc("track_event", {
      _event_name: item.name,
      _capability: item.p.capability ?? null,
      _surface: item.p.surface ?? null,
      _meter: item.p.meter ?? null,
      _feature: item.p.feature ?? null,
      _value_num: item.p.valueNum ?? null,
      _route: typeof window !== "undefined" ? window.location.pathname : null,
      _session_id: sessionId(),
      _metadata: item.p.metadata ?? {},
    });
  }
}

export function track(name: EventName, payload: TrackPayload = {}): void {
  try {
    QUEUE.push({ name, p: payload });
    if (TIMER === null) {
      TIMER = window.setTimeout(flush, 250);
    }
  } catch {
    /* never throw from telemetry */
  }
}

/** Server-friendly variant for edge functions — accepts user id explicitly. */
export async function trackServer(
  client: typeof supabase,
  name: EventName,
  payload: TrackPayload & { userId?: string | null } = {},
): Promise<void> {
  try {
    await client.rpc("track_event", {
      _event_name: name,
      _capability: payload.capability ?? null,
      _surface: payload.surface ?? "edge",
      _meter: payload.meter ?? null,
      _feature: payload.feature ?? null,
      _value_num: payload.valueNum ?? null,
      _route: null,
      _session_id: null,
      _metadata: payload.metadata ?? {},
    });
  } catch {
    /* swallow */
  }
}