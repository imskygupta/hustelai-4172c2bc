---
name: Feature Flag Engine
description: Production-grade flag system with rollout, overrides, kill switches, audit; resolver RPC + shared frontend/edge libs
type: feature
---
## Architecture
- Tables: `feature_flags` (extended), `feature_flag_rules`, `feature_flag_overrides`, `rollout_groups`, `rollout_group_members`, `feature_audit_logs`.
- RPC `resolve_feature_flags(_user, _env)` returns `{key: {enabled, source, reason, maintenance, message, bucket, rollout}}`.
- Stable percentage assignment via `flag_hash_bucket(user, flag)` (md5 → 0–99). Same user always lands in the same bucket per flag.
- Audit trigger on `feature_flags` writes before/after to `feature_audit_logs`.

## Resolution precedence (high → low)
1. `kill_switch` 2. `expires_at` 3. environment scope 4. user override 5. group override 6. `admin_only` 7. `beta_only` (admin bypass) 8. `maintenance` (admin bypass, soft-disabled but visible) 9. `allowed_tiers` (admin bypass) 10. group rule (per cohort, with own rollout %) 11. base `enabled` × rollout %.

## Frontend API (`@/lib/flags`)
- `resolveFlags(force?)`, `isFeatureEnabled(key)`, `getFlag(key)`, `requireFeature(key)`, `clearFlagCache()`.
- Hooks: `useFeatureFlags()`, `useFeatureFlag(key)`. 30s in-memory cache; legacy `@/lib/feature-flags` shim still works.

## Edge API (`_shared/flags/resolve.ts`)
- `resolveFlagsForUser(uid, env)`, `isFeatureEnabledServer`, `requireFeatureServer` (throws with `status:423`, `code:'FEATURE_DISABLED'`). 30s per-instance cache.

## Admin
- `/admin/feature-flags` — search, env/tier filters, rollout slider with quick presets (1/5/10/25/50/100), tier toggles, maintenance + kill switch, beta/admin gates, overrides editor, group manager, audit log.

## Standard rollout groups (seeded)
`beta`, `internal`, `testers`, `creators`, `affiliates`. `beta_only` flags are auto-granted to members of `beta`/`internal`/`testers`.

## Wiring guidelines
- New code: never hardcode a boolean — read from a flag (`useFeatureFlag('payments.dodo_checkout')`).
- Edge functions for payments/exports/Telegram should `requireFeatureServer(uid, key)` early and return 423 with `{flag}` payload on disable.

## Live integrations (Phase 3.5)
Edge functions wired with `flagGuard()`:
- `dodo-checkout` → `payments.dodo_checkout` (master)
- `upi-payment:submit` → `payments.upi_manual_review` + (`payments.wallet_topups` | `payments.subscription_checkout`)
- `export-create` → `exports.ai_exports`; if Telegram delivery requested, also `telegram.exports`
- `telegram-broadcast` → `telegram.broadcasts`

`flagGuard()` returns a 423/503 Response with `{ error, locked, feature, flag }`, fires a `flag_blocked` event to `log-event` (deduped per user/flag/endpoint), and respects maintenance mode (503 + `flag.message`).

## Frontend graceful UX
- `<FeatureGate flag="…">{children}</FeatureGate>` — variants `card` | `inline` | `silent`. Auto-renders the right tone for maintenance / tier / beta / kill states with optional `onUpgrade` CTA.
- `<MaintenanceBanner />` mounted globally in `App.tsx`, listens to `system.maintenance_banner` flag and shows the message verbatim.

## Admin quick controls
`/admin/runtime` includes a "Feature flag quick controls" section with one-click kill switches for the 9 highest-impact flags (payments, exports, telegram, signups, onboarding, banner). Full editor remains at `/admin/feature-flags`.

## Seeded flag catalog
24 flags across `payments`, `telegram`, `exports`, `ai_tools`, `system`. All default to enabled @ 100%, except `system.maintenance_banner` (off).