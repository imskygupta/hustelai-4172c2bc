---
name: Cashfree (LEGACY — retired)
description: Cashfree integration retired in favor of Dodo Payments. Edge function gated behind ENABLE_CASHFREE_LEGACY=true for historical reconciliation only.
type: constraint
---
Cashfree is RETIRED. Do not add new code paths that depend on it.

- All checkout, wallet top-ups, subscription sync, invoices, coupons, and verification flow through **Dodo Payments**.
- `supabase/functions/cashfree-payment` returns HTTP 410 unless `ENABLE_CASHFREE_LEGACY=true` is set as a secret.
- Wallet credit verification, plan upgrades, affiliate auto-credit, and emails are all driven by `dodo-webhook`.
- Use `dodo-verify` (auth-required) to read the latest payment status for the current user. Never re-introduce `cashfree-payment.verify_payment`.
- `cashfree_*` / Cashfree-named columns in `payments` are kept for historical records — do NOT drop. New writes use Dodo metadata only.

**Why:** Single source of truth. Avoids dual-billing bugs, duplicate webhooks, and conflicting entitlement grants.