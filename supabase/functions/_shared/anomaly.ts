// Phase 6 hardening — auth/security signal recorder.
// Wraps `record_auth_anomaly` RPC. Always fire-and-forget; logging must never break the flow.

import { hashValue } from "./rate-limit.ts";

export type AnomalySeverity = "info" | "warn" | "critical";

export type AnomalyEventType =
  | "auth.failed_login"
  | "auth.signup_blocked"
  | "auth.token_refresh_anomaly"
  | "admin.suspicious_access"
  | "payment.failed"
  | "payment.webhook_invalid_signature"
  | "rate_limit.exceeded"
  | "validation.rejected";

export interface AnomalyPayload {
  eventType: AnomalyEventType | string;
  severity?: AnomalySeverity;
  userId?: string | null;
  email?: string | null;
  req?: Request;
  metadata?: Record<string, unknown>;
}

export async function recordAnomaly(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  payload: AnomalyPayload,
): Promise<void> {
  try {
    let ipHash: string | null = null;
    let userAgent: string | null = null;
    if (payload.req) {
      const fwd = payload.req.headers.get("x-forwarded-for") ?? "";
      const ip = (fwd.split(",")[0] || payload.req.headers.get("cf-connecting-ip") || "").trim();
      if (ip) ipHash = await hashValue(ip);
      userAgent = payload.req.headers.get("user-agent")?.slice(0, 300) ?? null;
    }
    await supabase.rpc("record_auth_anomaly", {
      _event_type: payload.eventType,
      _severity: payload.severity ?? "info",
      _user_id: payload.userId ?? null,
      _email: payload.email ?? null,
      _ip_hash: ipHash,
      _user_agent: userAgent,
      _metadata: payload.metadata ?? {},
    });
  } catch {
    // intentionally swallowed — anomaly logging is best-effort
  }
}