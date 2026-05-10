---
name: Usage Metering
description: Centralized tier_limits + consume_usage RPC + usage_ledger; single source of truth for caps
type: feature
---
# Usage Metering (Phase 2)

Replaces scattered counters (localStorage, ad-hoc consume_* RPCs) with a single, scalable, append-only architecture.

## Primary DB tables (lean lookups + overrides)
- `tier_limits(tier, meter, feature, max_value, period)` — caps. `max_value=-1` = unlimited.
- `feature_access(tier, feature_key, enabled)` — boolean feature gates.
- `retention_policies(resource, retention_days, action, enabled)` — declarative cleanup rules.
- `usage_overrides(user_id, meter, feature, bonus_units, max_override, expires_at)` — admin-granted bonuses / unlocks.

## RPCs (primary)
- `resolve_user_limits(_user)` → `{tier, limits, features, overrides}`. Single source of truth used by frontend.
- `consume_usage(_user, _meter, _feature, _units)` → `{allowed, used, max, bypass, reason}`. AI meter still backed by fast-path `ai_daily_usage`. Other meters allow + log to ledger.
- `grant_bonus_credits(_user, _meter, _amount, _expires_at, _reason)` → admin only.

## Append-only ledger (analytics DB)
- `usage_ledger(user_id, meter, feature, units, period_key, metadata, ts)` — written by `usage-record` edge fn after the RPC enforces the cap. NEVER mutated.

## Frontend (`src/lib/usage/`)
- `meter.ts` → `consumeUsage()`, `resolveLimits()`, `hasFeatureAccess()`, `getRemainingQuota()`, `getRetentionPolicy()`.
- `hooks.ts` → `useUserLimits()`, `useFeatureAccess(key)`, `useQuota(meter, feature)`.
- 30s in-memory cache on resolveLimits.

## Edge functions
- `usage-record` — append to `usage_ledger`; emits `ai.consumed` for fan-out.
- `retention-worker` — service-role only, cron-driven daily; reads `retention_policies` and applies safe actions. Currently wires `exports_free → mark_expired_exports()`. Other resources are no-op stubs ready to extend.

## Migration rules (don't break things)
- Existing `consume_ai_quota` / `consume_export_quota` still work; new code MUST call `consumeUsage()` instead.
- localStorage tool counters in `src/lib/tool-limits.ts` are kept as a guest fallback only.
- Do NOT hardcode tier checks in UI — call `useFeatureAccess()` or `useQuota()`.
- BYOK detection lives in `consume_usage` RPC; do not duplicate in client.

## Cron setup (apply once via supabase--insert)
Schedule `retention-worker` daily 03:00 UTC via pg_cron + pg_net (per project's cron pattern).
