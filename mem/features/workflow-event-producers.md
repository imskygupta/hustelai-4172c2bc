---
name: Workflow Event Producers
description: Real producers wired into workflow engine (payments, exports, Telegram) + seeded templates and ops RPCs
type: feature
---
## Producers (all use `_shared/workflows/emit.ts → emitWorkflowEvent`)
- **dodo-webhook** → `payment.succeeded`, `payment.failed`, `subscription.created`, `subscription.renewed`, `subscription.cancelled`, `wallet.topup`, `refund.succeeded`. Dedupe keys per Dodo `payment_id`/`subscription_id`.
- **upi-payment** → `upi.awaiting_review` (submit), `upi.approved`/`upi.rejected` (review), and a mirrored `payment.succeeded` on approval so payment workflows trigger uniformly.
- **export-create** → `export.generated` (with `deliver_to_telegram` flag in payload).
- **export-deliver-telegram** → `export.delivered`, `export.telegram_uploaded` (when new `file_id` cached), `export.failed` on catch.
- **telegram-webhook** → `telegram.connected` (after `/start <token>` link), `telegram.disconnected` (`/stop`).
- **telegram-broadcast** → `telegram.broadcast_sent` always; `telegram.delivery_failed` when `failed > 0`.

## Payload contract
Always include where applicable: `user_id, tier, amount, currency, payment_provider, transaction_id, subscription_id, metadata`.

## Templates seeded (`workflow_templates` + paused workflows)
`payment-success-welcome`, `payment-failed-notice`, `export-telegram-delivery`, `telegram-onboarding`, `subscription-upgrade-bonus`, `refund-retention`. Installed PAUSED — admin enables per-template in `/admin/automations`.

## Ops RPCs (admin-only)
- `workflow_ops_summary(_since)` → throughput, success rate, retries, DLQ, avg attempts, queue lag p50/p95.
- `workflow_event_throughput(_since,_bucket)` → time-bucketed event counts.
- `workflow_top_events(_since)` → producer health (top 50 events with last_seen + runs enqueued).

## Safety rules
- All emits are fire-and-forget (`void` or `fireAndForget(...)`); never throw on the producer path.
- Engine kill-switch (`automation.engine`) blocks the runner & `workflow-emit` edge entry, but RPC-based producers still write events (so producers stay observable; runs simply queue).