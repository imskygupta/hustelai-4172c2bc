import { supabase } from "@/integrations/supabase/client";

/**
 * Single trusted entrypoint for all admin/operator actions.
 * Writes through the SECURITY DEFINER `record_operator_action` RPC,
 * which enforces operator role + append-only semantics in the DB.
 *
 * Failures are non-fatal at the call site (logged + surfaced via console)
 * — but every destructive action MUST await this before mutating state
 * so the audit trail is never silently skipped.
 */
export type OperatorAction =
  // Roles
  | "role.assign"
  | "role.remove"
  // Subscription / billing
  | "tier.change"
  | "billing.refund"
  | "billing.override"
  | "credits.reset"
  | "credits.grant"
  // User lifecycle
  | "user.suspend"
  | "user.unsuspend"
  | "user.force_logout"
  | "user.delete"
  // Impersonation
  | "impersonation.start"
  | "impersonation.end"
  // Verification / KYC
  | "verification.approve"
  | "verification.reject"
  // Forum / community
  | "forum.delete_post"
  | "forum.lock_thread"
  | "forum.ban_user"
  // Telegram
  | "telegram.bot_update"
  | "telegram.broadcast"
  // Runtime / settings
  | "runtime.config_change"
  | "runtime.maintenance_toggle"
  | "feature_flag.update"
  // Generic
  | (string & {});

export type RecordOperatorActionInput = {
  action: OperatorAction;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export async function recordOperatorAction(
  input: RecordOperatorActionInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await (supabase as any).rpc("record_operator_action", {
      _action: input.action,
      _target_type: input.targetType ?? null,
      _target_id: input.targetId ?? null,
      _target_label: input.targetLabel ?? null,
      _reason: input.reason ?? null,
      _metadata: input.metadata ?? {},
    });
    if (error) {
      console.warn("[audit] record_operator_action failed", input.action, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data as string };
  } catch (e: any) {
    console.warn("[audit] record_operator_action threw", input.action, e?.message);
    return { ok: false, error: e?.message };
  }
}

export type OperatorAuditEntry = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function fetchRecentAudit(limit = 100): Promise<OperatorAuditEntry[]> {
  const { data, error } = await (supabase as any).rpc("operator_audit_recent", { _limit: limit });
  if (error) {
    console.warn("[audit] fetchRecentAudit failed", error.message);
    return [];
  }
  return (data ?? []) as OperatorAuditEntry[];
}

export async function fetchAuditForTarget(
  targetType: string, targetId: string, limit = 50
): Promise<OperatorAuditEntry[]> {
  const { data, error } = await (supabase as any).rpc("operator_audit_for_target", {
    _target_type: targetType, _target_id: targetId, _limit: limit,
  });
  if (error) {
    console.warn("[audit] fetchAuditForTarget failed", error.message);
    return [];
  }
  return (data ?? []) as OperatorAuditEntry[];
}