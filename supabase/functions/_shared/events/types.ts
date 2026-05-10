// MIRROR of src/lib/events/types.ts — keep in sync.
export type EventCategory =
  | "payment" | "export" | "ai" | "affiliate" | "security"
  | "workspace" | "admin" | "system" | "auth";

export type EventSeverity = "info" | "warn" | "error" | "critical";

export type ServerEvent = {
  name: string;
  category: EventCategory;
  severity?: EventSeverity;
  source?: string;
  user_id?: string | null;
  dedupe_key?: string | null;
  payload: Record<string, unknown>;
};
