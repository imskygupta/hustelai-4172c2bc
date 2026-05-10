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
- `telegram-bot-health` → `telegram.admin_ops`
- `telegram-webhook` → `telegram.auth` (handshake) + `telegram.commands` (free-form msgs)
- `export-deliver-telegram` → soft-checks `telegram.notifications` + `telegram.storage` (returns `deferred`, does not throw)
- `ai-chatbot` → `ai_tools.chatbot`
- `ai-search` → `ai_tools.search`

`flagGuard()` returns a 423/503 Response with `{ error, locked, feature, flag }`, fires a `flag_blocked` event to `log-event` (deduped per user/flag/endpoint), and respects maintenance mode (503 + `flag.message`).

## Frontend graceful UX
- `<FeatureGate flag="…">{children}</FeatureGate>` — variants `card` | `inline` | `compact` | `silent`. Loading shows `<FlagSkeleton />`. Auto-renders maintenance / tier / beta / kill / queued states. Supports `onRetry` and `onUpgrade`.
- `<DegradedState />` — same UI, can be used standalone when handling 423/503 responses from edge functions. Helper `degradedFromFlag(flag)` maps a `ResolvedFlag`.
- `safeInvoke(() => supabase.functions.invoke(...))` — narrow union return: `{ ok, data }` | `{ locked, payload }` | `{ error }`. Use to render `<DegradedState reason={payload.flag?.reason} ... />` instead of toasting raw errors.
- `<MaintenanceBanner />` mounted globally in `App.tsx`, listens to `system.maintenance_banner` flag and shows the message verbatim.

## Admin quick controls
`/admin/runtime` includes a "Feature flag quick controls" section with one-click kill switches for the 9 highest-impact flags (payments, exports, telegram, signups, onboarding, banner). Full editor remains at `/admin/feature-flags`.

## Operational analytics (Phase 3.6)
- `feature_flag_blocks` (primary DB, admin-read, service-role insert) — every guard denial is recorded with `flag_key, endpoint, source, reason, environment, status_code, user_id`.
- `feature_flag_incidents` — auto-populated by `trg_feature_flags_incidents` when an admin flips `kill_switch`, `maintenance`, or disables a flag. Toggling the switch back **resolves** the matching open row.
- RPCs: `flag_block_summary(_since)` (top-blocked breakdown) and `flag_block_timeline(_since, _bucket)` (bucketed for charts). Both `SECURITY DEFINER`, gated to authenticated admins.
- `flagGuard()` writes blocks **directly** into `feature_flag_blocks` via service role (replaces the prior `log-event` round-trip — `log-event` rejected category=`runtime`).
- New page: `/admin/runtime/analytics` (RuntimeAnalytics.tsx) — KPI strip, hover-bar timeline, top-blocked list with reason chips, live incident feed (open/resolved). Window selector: 1h / 24h / 7d / 30d with adaptive bucket size.
- `FlagQuickControls` extended with `telegram.notifications`, `telegram.commands`, `telegram.auth`, `ai_tools.{chatbot,search,exports}`.

## Seeded flag catalog
38 flags across `payments`, `telegram`, `exports`, `ai_tools`, `system`. All default to enabled @ 100%, except `system.maintenance_banner` (off).
New telegram keys: `telegram.auth`, `telegram.notifications`, `telegram.broadcasts`, `telegram.storage`, `telegram.admin_ops`, `telegram.commands`.
New AI tool keys: `ai_tools.{chatbot,search,resume_builder,hustle_explore,exports,image,generators,marketplace}`.