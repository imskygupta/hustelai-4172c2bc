---
name: Operator Audit Log (Phase 5)
description: Append-only audit table, record_operator_action RPC, and viewer panel for admin actions
type: feature
---

# Operator Audit Log

## DB
- Table `public.operator_audit_log` — append-only (BEFORE UPDATE/DELETE triggers raise).
- RLS: admin-only SELECT; no client INSERT policies.
- Writes go through SECURITY DEFINER `record_operator_action(_action, _target_type, _target_id, _target_label, _reason, _metadata)`. Requires `admin` or `moderator`.
- Read RPCs: `operator_audit_recent(limit)`, `operator_audit_for_target(type, id, limit)`.

## Frontend
- Helper: `src/lib/audit/recordOperatorAction.ts` (typed action union, fail-soft).
- Viewer: `src/components/admin/AuditLogPanel.tsx` — category chips, search, expandable metadata.
- Mounted in AdminDashboard under Operations → "Audit Log" (`section === "audit"`).

## Wired call sites (Phase 5)
- `tier.change`, `role.assign`, `role.remove`, `user.delete`, `impersonation.start` (AdminDashboard)
- `verification.approve`, `verification.reject` (VerificationPanel)

## Required before unlocking destructive actions
Suspend, force-logout, reset-credits, refunds, destructive moderation must each call `recordOperatorAction` BEFORE the mutation. Use the typed `OperatorAction` union to keep action names canonical.
