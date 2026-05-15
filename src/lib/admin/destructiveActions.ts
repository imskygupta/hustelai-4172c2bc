import { supabase } from "@/integrations/supabase/client";
import { recordOperatorAction } from "@/lib/audit/recordOperatorAction";

/**
 * Thin client wrappers around the SECURITY DEFINER admin RPCs.
 * The DB enforces:
 *   - caller has 'admin' role
 *   - reason is at least 6 chars
 *   - operator_audit_log row is written before the mutation succeeds
 * We re-record on the client too so any client-only metadata is captured.
 */

type RpcOk<T = unknown> = { ok: true; data: T };
type RpcErr = { ok: false; error: string };
export type RpcResult<T = unknown> = RpcOk<T> | RpcErr;

function err(message: string): RpcErr {
  return { ok: false, error: message };
}

async function call<T = unknown>(
  fn: string,
  args: Record<string, unknown>,
): Promise<RpcResult<T>> {
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) return err(error.message || String(error));
  return { ok: true, data: data as T };
}

export async function suspendUser(targetId: string, email: string, reason: string) {
  if (reason.trim().length < 6) return err("Reason must be at least 6 characters");
  const r = await call("admin_suspend_user", { _target: targetId, _reason: reason });
  if (r.ok) await recordOperatorAction({
    action: "user.suspend", targetType: "user", targetId, targetLabel: email, reason,
  });
  return r;
}

export async function unsuspendUser(targetId: string, email: string, reason: string) {
  if (reason.trim().length < 6) return err("Reason must be at least 6 characters");
  const r = await call("admin_unsuspend_user", { _target: targetId, _reason: reason });
  if (r.ok) await recordOperatorAction({
    action: "user.unsuspend", targetType: "user", targetId, targetLabel: email, reason,
  });
  return r;
}

export async function forceLogoutUser(targetId: string, email: string, reason: string) {
  if (reason.trim().length < 6) return err("Reason must be at least 6 characters");
  const r = await call<{ sessions_revoked?: number }>("admin_force_logout", {
    _target: targetId, _reason: reason,
  });
  if (r.ok) await recordOperatorAction({
    action: "user.force_logout", targetType: "user", targetId, targetLabel: email, reason,
    metadata: { sessions_revoked: (r.data as any)?.sessions_revoked ?? 0 },
  });
  return r;
}

export async function resetCredits(
  targetId: string, email: string, newBalance: number, previousBalance: number, reason: string,
) {
  if (reason.trim().length < 6) return err("Reason must be at least 6 characters");
  if (!Number.isFinite(newBalance) || newBalance < 0) return err("Balance must be ≥ 0");
  const r = await call("admin_reset_credits", {
    _target: targetId, _new_balance: newBalance, _reason: reason,
  });
  if (r.ok) await recordOperatorAction({
    action: "credits.reset", targetType: "user", targetId, targetLabel: email, reason,
    metadata: { previous_balance: previousBalance, new_balance: newBalance,
                delta: newBalance - previousBalance },
  });
  return r;
}

export async function requestRefund(
  targetId: string, email: string,
  args: { orderId?: string; amount: number; currency?: string; reason: string },
) {
  if (args.reason.trim().length < 6) return err("Reason must be at least 6 characters");
  if (!Number.isFinite(args.amount) || args.amount <= 0) return err("Amount must be > 0");
  const r = await call<{ refund_id?: string }>("admin_request_refund", {
    _target: targetId,
    _order_id: args.orderId ?? "",
    _amount: args.amount,
    _currency: args.currency ?? "INR",
    _reason: args.reason,
  });
  if (r.ok) await recordOperatorAction({
    action: "billing.refund", targetType: "refund_request",
    targetId: (r.data as any)?.refund_id, targetLabel: email, reason: args.reason,
    metadata: { amount: args.amount, currency: args.currency ?? "INR",
                order_id: args.orderId ?? null, status: "pending" },
  });
  return r;
}