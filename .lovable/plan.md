## Usage Governance + Tier Capability — Platform-Wide

The foundation already exists (`tier_limits`, `feature_access`, `usage_overrides`, `consume_usage`, `resolve_user_limits`, `useFeatureAccess`, `useQuota`, edge `flagGuard`). This plan **extends and unifies** it — no parallel system.

### 1. Extend the meter taxonomy

Add new meters to `tier_limits` (rows only — schema unchanged):

| Meter | Free | Pro | Elite | Infinity | Period |
|---|---|---|---|---|---|
| `workspace` | 1 | 10 | 50 | -1 | lifetime |
| `portal` (public client portal) | 1 | 5 | 25 | -1 | lifetime |
| `upload` (files/day) | 5 | 50 | 200 | -1 | day |
| `async_job` (queued/day) | 10 | 100 | 500 | -1 | day |
| `roadmap` | 3 | 15 | 50 | -1 | week |
| `intake_form` | 1 | 5 | 25 | -1 | lifetime |

Existing AI/export/automation/storage/telegram caps stay (already balanced).

Add `period='week'` support to `consume_usage` (currently day/lifetime only) — small SQL extension to compute `period_key` as ISO week when `period='week'`.

### 2. Capability registry (single source of truth)

New file `src/lib/usage/capabilities.ts`:
- Static map of every gated capability → `{ meter, feature, label, costClass: 'cheap'|'standard'|'expensive', upgradeCopy }`.
- Used by hooks, UI badges, and the admin panel so labels/copy stay consistent.
- Replaces scattered `TIER_LIMITS` in `src/lib/tool-limits.ts` and `WORKSPACE_LIMITS`/`EXPORT_LIMITS` constants in `entitlements.ts` (those become thin re-exports for back-compat).

### 3. Enforcement primitives (frontend)

Extend `src/lib/usage/`:
- `guards.ts` → `requireQuota(meter, feature)` — calls `consumeUsage`, throws `QuotaError` with structured payload `{ used, max, meter, upgradeTier }`.
- `hooks.ts` → add `useCapability(key)` returning `{ allowed, used, max, remaining, unlimited, upgradeTo }`.
- React error boundary `<QuotaBoundary>` that catches `QuotaError` and renders the standard upgrade sheet.

Refactor existing call sites incrementally — the legacy `enforceLimit` (localStorage) in `tool-limits.ts` becomes a guest-only fallback; signed-in users always go through `consumeUsage`.

### 4. Enforcement primitives (edge)

New `supabase/functions/_shared/usage/guard.ts`:
- `quotaGuard(userId, meter, feature, units, cors)` → returns `Response | null` (mirrors `flagGuard` shape).
- Used by: `ai-job-runner`, `export-*`, `workspace-create`, `intake-create`, `portal-publish`, `telegram-deliver`, `newsletter-dispatch`.
- Returns 429 with `{ error, locked: true, meter, used, max, upgrade_url }`.

### 5. UX surfaces

- `<QuotaBar meter feature />` — inline progress bar (used in tool headers, dashboard usage card, settings).
- `<CapabilityBadge capability />` — shows tier required (e.g. "Pro", "Infinity") next to gated features.
- `<UpgradeSheet capability used max />` — drawer/dialog rendered by `QuotaBoundary` and any `meter.exceeded` event. Soft, non-spammy. Suggests the **minimum** tier that unlocks it.
- Dashboard `DailyUsageWidget` extended with non-AI meters (uploads, exports, portals).
- Async chips already show queued counts — extend `AsyncActivityIndicator` to surface "X / Y daily jobs used".

### 6. Admin → Usage Governance

New page `src/pages/admin/UsageGovernance.tsx` at `/admin/usage-governance`:
- **Tier matrix** — editable table of `tier_limits` rows (per-tier, per-meter). Save → upserts directly via service role; no redeploy.
- **Feature access matrix** — editable `feature_access` toggles.
- **Overrides** — search user → grant `usage_overrides` (bonus units / max override / expiry). Wraps existing `grant_bonus_credits` RPC; new RPC `grant_capability_override` for the max_override path.
- **Analytics tab** — top consumers per meter (uses existing `usage_ledger` on analytics DB), block events, near-cap users.
- **Abuse signals** — users hitting cap >N times in 24h (read-only list).

Reuses existing admin shell + `has_role(admin)` gating. No new auth surface.

### 7. Workspace/portal hard limits

Server-side trigger on `workspaces` and `client_portals` insert that calls `consume_usage('workspace'|'portal', '*', 1)` and raises if `allowed=false`. Prevents bypass via direct SQL/edge writes.

### 8. What's explicitly NOT in scope

- No usage heatmaps (mentioned as "later").
- No new payment/upgrade flow — links to existing `/pricing`.
- No realtime usage websocket — 30s cache on `resolveLimits` is fine.
- No tier downgrade reconciliation logic.
- No localStorage migration — old keys silently ignored.

### 9. Migration order

1. SQL migration: insert new `tier_limits` rows, add `'week'` period support to `consume_usage`, add workspace/portal triggers, add `grant_capability_override` RPC.
2. `src/lib/usage/capabilities.ts` + `guards.ts` + extended `hooks.ts`.
3. UX components: `QuotaBar`, `CapabilityBadge`, `UpgradeSheet`, `QuotaBoundary`.
4. Edge `_shared/usage/guard.ts` + wire into the 6 highest-cost functions.
5. Admin Usage Governance page + nav entry under existing Admin → Operations.
6. Refactor `tool-limits.ts` / `entitlements.ts` to re-export from capabilities registry.
7. Memory update (`mem/tech/usage-metering.md` extended; new `mem/features/usage-governance.md`).

### Technical notes

- Free-tier philosophy preserved — only **infra-cost** meters tightened (workspace, portal, upload, async_job). AI/export caps unchanged.
- `consume_usage` already returns `{allowed, used, max, reason}` — no API break.
- Admin overrides are append-only (`usage_overrides`) — full audit trail.
- BYOK bypass for AI meter remains unchanged.