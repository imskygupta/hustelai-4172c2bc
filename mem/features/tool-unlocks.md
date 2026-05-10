---
name: Tool Unlocks & Boosts
description: Independent consumable economy for lightweight tools, exports, and HustleAI Cloud storage. Runs parallel to tier system. AI/heavy infra is NEVER boostable.
type: feature
---

## Two parallel monetization layers

1. **Core tier** (Free/Pro/Elite/Infinity): governs AI credits, premium models, roadmaps, workspaces, portals, async jobs, automations. **Never** affected by unlocks.
2. **Unlock packs** (NEW): one-time consumables for `lightweight | export | storage` meters only. Rollover indefinitely (unless time-boxed pack).

## DB
- `tier_limits` rows for `lightweight:{invoice,business_card,proposal_lite,contract_lite,portfolio_bio,*}` daily caps + `storage:*` lifetime MB caps.
- `unlock_balances` (per user/meter/feature, `remaining`, `lifetime_purchased`, optional `expires_at`).
- `unlock_ledger` (audit: `delta`, `balance_after`, reason: purchase/consume/grant/expire/rollover/promo/referral).
- `unlock_packs` catalog (seeded: invoice_10, business_card_10, lightweight_50, export_10, storage_1gb, lightweight_24h_unlimited).

## RPCs
- `consume_usage`: extended — when meter ∈ {lightweight,export,storage} and tier exhausted, draws from `unlock_balances`. Returns `reason:'unlock'` (allowed) or `reason:'quota_unlockable'` (denied, suggest pack). AI meter path unchanged.
- `grant_unlocks(user, meter, feature, units, reason, source, expires_at, metadata)` — admin-only for `reason='grant'`; webhook system uses `'purchase'`.
- `unlock_summary(user)` — returns active balances + last 30 ledger entries.

## Frontend
- `src/lib/usage/capabilities.ts`: `costType` + `boostable` flags. `isBoostable(key)` / `getCostType(key)` helpers.
- `src/lib/unlocks/{api,hooks,types}.ts`: API + `useUnlockSummary`, `useUnlockBalance`, `useUnlockPacks`.
- `QuotaError.unlockable` flag drives `<QuotaBoundary>` to render `<UnlockSheet>` (with countdown + pack list) instead of generic `<UpgradeSheet>`.
- `humanizeError` rule: `quota_unlockable` → "You've used today's free generations. Come back or unlock more instantly."

## UI surfaces
- **Dashboard**: `<UnlockBalanceWidget>` next to operational usage.
- **Settings → Wallet & unlocks** (`/settings/wallet`): balances, HustleAI Cloud gauge, daily reset countdown, pack catalog, ledger.
- All storage UI says **"HustleAI Cloud"** — never expose Telegram storage internals.

## Purchase flow
`unlock-purchase` edge function → Cashfree checkout with `kind:'unlock'` metadata → cashfree webhook calls `grant_unlocks(reason:'purchase', source: payment_id)`.

## Future hooks (schema already supports)
- `unlock_ledger.reason` accepts `promo|referral|grant` for streak/referral/promo/seasonal flows.
- `expires_at` on balances supports time-boxed boosts (e.g. 24h unlimited).

## Hard rule
Unlocks **never** apply to: AI assist credits, premium models, roadmaps, blueprints, hustlebot, automations, workspaces, portals, async jobs. Those stay strictly tier-gated.