# Dodo standardization + Core SaaS Infra Rollout

This is a large, multi-phase effort. Shipping it as one mega-PR is risky. I'm proposing a phased plan so each phase is testable, reversible, and goes live cleanly.

## Phase 0 — Cashfree → Dodo cutover (today, ship first)

**Production removal**
- Pull Cashfree CTAs/components off `Pricing`, `Upgrade`, `Wallet`, `Billing`, `Payment`, `PaymentStatus` pages.
- Remove Cashfree status polling and subscription/invoice sync from active flows.
- Repoint wallet credit verification to the Dodo webhook (already webhook-confirmed via `dodo-webhook`).
- Strip Cashfree env vars from runtime usage (keep secrets in vault until Phase 0 verified live).

**Archival (not deletion)**
- Move Cashfree code to `src/legacy/cashfree/` and `supabase/functions/_legacy/cashfree-*`.
- Wrap any compatibility shim behind `ENABLE_CASHFREE_LEGACY` (default `false`).
- Mark `cashfree_*` DB tables as legacy via comment + `is_legacy` flag — do NOT drop (historical invoices).

**Audit & verify**
- Grep for `cashfree-payment.verify_payment` and any `supabase.functions.invoke('cashfree-…')` — replace or remove.
- Confirm no entitlement-granting path reads from Cashfree tables.
- Remove duplicate billing cron jobs (keep only Dodo-driven ones + abandoned-checkout-recovery).

## Phase 1 — Billing State Machine (this week, after Phase 0 lives)

New table `subscription_states` with status enum:
`trialing | active | grace_period | on_hold | cancelled | expired | refunded`

- `entitlement_map` view → resolves tier+status → feature flags
- Downgrade timing: cancellations stay `active` until `current_period_end`, then → `expired`
- Grace period: failed renewal → `grace_period` for 3 days, then `on_hold` (read-only), then `expired`
- UI: status badges on Billing page; feature gates check `entitlement_map` not raw `subscription_tier`

## Phase 2 — Central Event Bus

`automation_events` table: `id, event_type, actor_user_id, payload jsonb, status, attempts, created_at, processed_at, error`

Emitters: Dodo webhook, signup, credit grant, affiliate reward, email send, Discord sync.
Consumers: retry worker (cron), analytics aggregator, debugger panel in admin.

## Phase 3 — Usage Metering

`usage_events` (raw) + `usage_rollups_daily` (aggregate) per `user_id` × `metric` (ai_run, tokens, export, storage_mb, automation_run, api_call).
`quota_engine` RPC replaces scattered `consume_*_quota` functions.

## Phase 4 — Feature Flags expansion

Extend existing `feature_flags` with: `rollout_percent`, `allowed_user_ids[]`, `allowed_tiers[]`, `experiment_key`. Admin panel UI for toggling.

## Phase 5 — Internal AI Ops Dashboard

Admin route `/admin/ops` with: top features, failed emails (last 24h), payment failures, churn risk (no login 14d + paying), inactive users, upgrade funnel (visited /pricing → checkout → success).

## Phase 6 — AI Content Automation Engine

Cron-driven orchestrator that uses `email_templates` + Lovable AI to draft newsletters, re-engagement, launch announcements, creator digests. Admin approval queue before send.

## Phase 7 — Status + Incident system

`status.hustlaiapp.in` (or `/status` route initially): provider health (Dodo, Brevo, MailerSend, Lovable AI, Discord), webhook health, cron health, incidents log. `provider_health_checks` table fed by 5-min cron.

## Phase 8 — Audit Logs

`audit_logs` table: `actor_user_id, action, target_type, target_id, before jsonb, after jsonb, ip, user_agent, created_at`.
Hook into: admin actions, plan changes, coupon creation, credit grants, provider toggles, template edits, feature flag changes.

## Recommendation

**Approve Phase 0 to ship today** (matches your "live today" goal). Phases 1–8 are each 1–2 day chunks; I'll ship them in order, asking for approval between phases so each one is reviewable and won't snowball into one giant unreviewable change.

## Questions before I start Phase 0

1. **Cashfree historical data**: keep `cashfree_*` tables visible in admin Billing (read-only "Legacy" tab) or hide entirely?
2. **ENABLE_CASHFREE_LEGACY**: build secret default `false` — confirm OK to hardcode `false` for now (no toggle UI yet)?
3. **Wallet purchases in flight**: any active Cashfree wallet orders right now we need to honor, or safe to hard-cut?

Once you answer those, I'll execute Phase 0 immediately.
