---
name: Usage Governance
description: Centralized capability registry, frontend+edge quota guards, admin governance UI
type: feature
---

# Usage Governance

Central capability/limits engine for the platform. Builds on the existing `tier_limits`/`feature_access`/`usage_overrides`/`consume_usage` foundation — does NOT replace it.

## New meters
`workspace`, `portal`, `upload`, `async_job`, `roadmap`, `intake_form` (in `tier_limits`). Periods now include `week` (ISO).

## Counter table
`usage_counters(user_id, meter, feature, period_key, count)` — primary-DB lean lookups for non-AI meters. AI still uses `ai_daily_usage` fast path. Heavy ledger stays on analytics DB (`usage_ledger`).

## Frontend
- Registry: `src/lib/usage/capabilities.ts` (CAPABILITIES map, `suggestUpgradeTier`).
- Guards: `requireQuota(key)` throws `QuotaError` caught by `<QuotaBoundary>` (mounted in `App.tsx`) → opens `<UpgradeSheet>`.
- Hooks: `useCapability(key)` → `{ max, unlimited, upgradeTo, tier }`.
- UI: `<QuotaBar capabilityKey>`, `<CapabilityBadge tier>`, `<UpgradeSheet>`. Mobile-first drawer.
- Dashboard: `OperationalUsageWidget` shows non-AI meters next to `DailyUsageWidget`.

## Edge
- `supabase/functions/_shared/usage/guard.ts` → `quotaGuard(userId, meter, feature, units, cors)` returns null or 429.
- Wire into AI runner, exports, workspace/portal/intake creation, telegram delivery, newsletter dispatch incrementally.

## Admin
- Page: `/admin/usage-governance` (lazy, admin-only).
- Tabs: Tier Limits (editable), Feature Access (toggles), Overrides (grant via `grant_capability_override` RPC), Registry (reference), Abuse (top consumers per meter via `usage_top_consumers` RPC).
- No redeploy needed for limit changes.

## Free-tier philosophy
Generous AI/export caps preserved. Only infra-cost meters tightened (1 workspace, 1 portal, 5 uploads/day, 10 async jobs/day, 3 roadmaps/week, 1 intake form). Infinity = true unlimited operational usage.

## Don't
- Don't bypass `consumeUsage` / `requireQuota` with new ad-hoc counters.
- Don't store new tier checks in components — use `useCapability(key)` or the `CAPABILITIES` map.
- Don't add new meters without a tier_limits row across all 4 tiers.
