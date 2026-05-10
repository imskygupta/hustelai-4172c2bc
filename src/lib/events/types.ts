// Centralized event catalog — single source of truth for the platform event spine.
// Mirrored in supabase/functions/_shared/events/types.ts. Keep in sync.

export type EventCategory =
  | "payment"
  | "export"
  | "ai"
  | "affiliate"
  | "security"
  | "workspace"
  | "admin"
  | "system"
  | "auth";

export type EventSeverity = "info" | "warn" | "error" | "critical";

/** Discriminated union of all known events. Add new entries here. */
export type AppEvent =
  // payment
  | { name: "payment.succeeded"; payload: { user_id: string; amount: number; currency: string; plan?: string; provider: "dodo" | "cashfree" | "upi"; payment_id: string } }
  | { name: "payment.failed";    payload: { user_id?: string; amount?: number; provider: string; reason: string; payment_id?: string } }
  | { name: "payment.webhook_failed"; payload: { provider: string; reason: string; raw?: unknown } }
  // export
  | { name: "export.created";   payload: { user_id: string; export_id: string; kind: string } }
  | { name: "export.delivered"; payload: { user_id: string; export_id: string; channel: "telegram" | "download" | "email" } }
  | { name: "export.failed";    payload: { user_id: string; export_id?: string; reason: string } }
  // ai
  | { name: "ai.consumed"; payload: { user_id: string; feature: string; tier: string; bypass: boolean; used: number; max: number } }
  | { name: "ai.blocked";  payload: { user_id: string; feature: string; reason: "quota" | "tier" } }
  // affiliate
  | { name: "affiliate.referral"; payload: { referrer_id: string; referred_user_id: string; reward_amount: number } }
  // security
  | { name: "security.role_granted"; payload: { actor_id: string; target_user_id: string; role: string } }
  | { name: "security.login_lockout"; payload: { user_id?: string; email?: string; reason: string } }
  // workspace
  | { name: "workspace.created"; payload: { user_id: string; workspace_id: string } }
  // admin
  | { name: "admin.action"; payload: { actor_id: string; action: string; target?: string; meta?: Record<string, unknown> } }
  // system
  | { name: "system.maintenance"; payload: { enabled: boolean; reason?: string } };

export type EventName = AppEvent["name"];

/** Default severity per event — overridable at emit time. */
export const EVENT_SEVERITY: Record<EventName, EventSeverity> = {
  "payment.succeeded": "info",
  "payment.failed": "warn",
  "payment.webhook_failed": "critical",
  "export.created": "info",
  "export.delivered": "info",
  "export.failed": "warn",
  "ai.consumed": "info",
  "ai.blocked": "info",
  "affiliate.referral": "info",
  "security.role_granted": "warn",
  "security.login_lockout": "warn",
  "workspace.created": "info",
  "admin.action": "info",
  "system.maintenance": "critical",
};

export const EVENT_CATEGORY: Record<EventName, EventCategory> = {
  "payment.succeeded": "payment",
  "payment.failed": "payment",
  "payment.webhook_failed": "payment",
  "export.created": "export",
  "export.delivered": "export",
  "export.failed": "export",
  "ai.consumed": "ai",
  "ai.blocked": "ai",
  "affiliate.referral": "affiliate",
  "security.role_granted": "security",
  "security.login_lockout": "security",
  "workspace.created": "workspace",
  "admin.action": "admin",
  "system.maintenance": "system",
};
