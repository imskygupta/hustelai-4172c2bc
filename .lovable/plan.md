# Platform Architecture Phases — Resumption Plan

Resuming the paused multi-phase platform work now that Telegram delivery is stable. Goal: turn HustleAI from "feature stack" into a real **operations-grade SaaS platform** with a unified event spine, metered state, feature flags, ops visibility, audit logs, and an automation engine — while keeping primary Supabase lightweight.

## Architectural Constraint (governs everything below)

```text
PRIMARY DB (lightweight, hot path)
  └─ auth, profiles, subscriptions, payments, wallets,
     entitlements, current-day quotas, feature_flags

ANALYTICS DB (append-only, heavy)
  └─ event_log, audit_log, usage_ledger, automation_runs,
     export_history, email_logs, provider_metrics

WORKSPACE DB → unchanged (Work Hub, intake)
COMMUNITY DB → unchanged (forums, discord)
TELEGRAM    → CDN/delivery layer (no changes this phase)
```

Frontend NEVER writes analytics directly — always through `log-event` / new dispatcher edge functions.

---

## Phase 1 — Event + Activity Pipeline (foundation)

The single spine that Telegram, email, audit, automation, notifications all subscribe to.

**New analytics tables (DB2)**
- `event_log` — already partly used; formalize columns: `id, ts, user_id, category, action, severity, source, payload, dedupe_key, replay_of`
- `event_subscriptions` — `id, category, action_pattern, channel (telegram|email|webhook|automation), config, enabled`
- `event_failures` — failed delivery rows for replay
- Indexes: `(category, ts desc)`, `(user_id, ts desc)`, `(severity, ts desc)`, unique `(dedupe_key)` partial

**Typed schema (frontend + edge shared)**
- `src/lib/events/types.ts` — discriminated union of `EventName` → payload shape. Categories: `payment | export | ai | affiliate | security | workspace | admin | system`. Severity: `info | warn | error | critical`.
- `src/lib/events/dispatch.ts` — `emit(event)` wrapper around `log-event` with dedupe key + idempotency.
- `supabase/functions/_shared/events/` — same types mirrored for edge functions; `emitServer()` writes directly to analytics with service role.

**Dispatcher edge function** (`event-dispatcher`)
- Triggered via Postgres `pg_net` from analytics `event_log` insert OR called inline from emitters.
- Reads `event_subscriptions`, fans out: Telegram (`notify-ops`), email, webhook, automation queue.
- Records success/failure into `event_failures`; supports manual replay from admin.

**Migrate existing emitters** to `emit()`:
- payment webhooks, export creation, AI quota consume, affiliate signup, KYC actions, admin actions.

---

## Phase 2 — Metered State / Usage Ledger

Replace scattered counters (`ai_daily_usage`, localStorage, `tool_uses_*`) with a unified ledger.

**Analytics tables**
- `usage_ledger` — `id, user_id, meter (ai|export|search|storage|...), feature, units, ts, period_key, source_event_id, metadata`
- `usage_rollups_daily` — pre-aggregated `(user_id, meter, feature, day, total)` materialized via cron.

**Primary DB stays hot**
- `quota_today` materialized view OR keep `ai_daily_usage` as fast cache; reconcile from ledger nightly.
- `entitlements` table already exists — extend to include `byok_active`, `retention_days`, `export_quota_override`.

**Helpers**
- `src/lib/usage/meter.ts` — `consume(meter, feature, units)` → calls RPC, returns `{allowed, used, max, bypass}`.
- Server RPC `consume_usage(_user, _meter, _feature, _units)` replaces 3 ad-hoc consume functions.
- BYOK detection unified — single source of truth (`user_ai_keys` active row).

**Migrations**
- Update `consume_ai_quota`, `consume_export_quota` to also append to `usage_ledger` (via edge fn write-through).
- Deprecate localStorage tool counters in `tool-limits.ts` (keep as fallback for guests).

---

## Phase 3 — Feature Flag System (extend existing)

`feature_flags` table + `FeatureFlagsManager` already exist. Add:

- **Scopes**: `global | tier | user | percentage_rollout`
- New columns: `scope, target_user_ids uuid[], rollout_percent int, variant text, schedule_start, schedule_end`
- New table `feature_flag_overrides (user_id, feature_key, enabled, expires_at)` for per-user toggles.
- **Maintenance overlay** flag: when `system.maintenance` enabled → `MaintenanceGate` shows banner; when `payments.lock` enabled → checkout blocked with friendly modal.
- **Hook** `useFeature(key)` returns `{enabled, variant, reason}` — replaces ad-hoc checks.
- Admin UI: add scope selector, percentage slider, schedule pickers, per-user override panel.

---

## Phase 4 — Ops Dashboard (`/admin/ops`)

Single operations command center. Pulls from analytics DB only (read-only).

**Panels**
- **Payment Health**: last 24h success/fail count, failed webhooks (replayable), Dodo + Cashfree status pings.
- **Event Queue**: pending events, failures, replay buttons.
- **Export Queue**: pending/failed exports, Telegram delivery health (cached file_id %, re-deliver).
- **Provider Health**: AI providers (Gemini/Zhipu/LongCat) latency + error rate, email providers (Brevo/Resend/MailerSend), Telegram bot reachability.
- **Rate Limits**: top consumers per meter today.
- **Quick Actions**: replay event, pause provider, toggle maintenance flag.

UI: consistent card grid, skeleton loaders, severity badges, time-range tabs (1h/24h/7d).

---

## Phase 5 — Audit Logs (`/admin/audit`)

Searchable UI on top of `event_log` filtered to `category in (admin, security, payment, billing)`.

- Filters: actor, target user, category, severity, date range, free-text payload search.
- Row drawer: full payload JSON, related events (same `correlation_id`), replay button (admins only, security events).
- Export CSV. Saved searches.

Emit audit events from: admin role grant/revoke, billing tier change, integration connect/disconnect, export delivery, KYC decision, login lockouts.

---

## Phase 6 — Content + Automation Engine

Future-ready, minimal v1 in this pass.

**Tables (analytics DB)**
- `automations` — `id, name, trigger_event, conditions jsonb, actions jsonb[], enabled, created_by`
- `automation_runs` — `id, automation_id, event_id, status, started_at, finished_at, error`
- `campaigns` — `id, name, audience_query, template_id, schedule_at, status, stats`
- `audience_segments` — saved queries (`tier=pro AND last_export>30d`)

**Engine**
- `automation-runner` edge fn: subscribes via `event_subscriptions(channel='automation')`, evaluates conditions, executes action steps (send email, send telegram, set entitlement, add wallet credit, add tag).
- Reuses existing email/telegram primitives — no new delivery code.

**Admin UI** (v1 scaffold only)
- `/admin/automations` — list, enable/disable, dry-run.
- `/admin/campaigns` — compose newsletter, pick segment, schedule.
- Onboarding sequence: pre-seed 3 default automations (welcome, day-3 nudge, upgrade prompt).

---

## Cross-cutting UX/UI Polish (continuous)

Applied to every page touched in phases 4–6, plus a sweep of existing surfaces:

- **Skeleton loaders** in: ops dashboard, audit log, automations, exports list, billing.
- **Empty states** with illustration + primary CTA on every list view.
- **Mobile responsiveness audit** of `/settings/*`, `/profile`, `/admin/*` (already started — finish remaining tabs).
- **Consistent design tokens**: ensure ops/audit/automations use the same card surface, badge palette, table style as Telegram Ops.
- **Subtle motion**: framer-motion fade-up on card grids (respecting `prefers-reduced-motion`).
- Loading + success + error + expired + locked states standardized via shared `<StateView>` component.

---

## Execution Order (one phase per agent loop)

1. **Phase 1** — events tables + types + dispatcher edge fn + migrate ~6 emitters. Most critical, unblocks everything.
2. **Phase 2** — usage ledger + unified `consume_usage` RPC + meter helpers.
3. **Phase 3** — extend feature flags (scopes, overrides, maintenance) + `useFeature` hook.
4. **Phase 4** — `/admin/ops` dashboard.
5. **Phase 5** — `/admin/audit` UI.
6. **Phase 6** — automation engine v1 scaffold.

UX polish folded into each phase's surfaces.

## Out of Scope (this resumption)

- Rebuilding Telegram delivery (stable).
- Dodo/payment changes beyond emitting events.
- New AI features.
- Splitting analytics to a dedicated Supabase project (will swap URL+key when provisioned).

## Approval Question

This is a 6-phase plan. Confirm and I'll start with **Phase 1 (Event Pipeline)** in the next loop — that single phase touches: 1 migration (analytics DB), 2 new edge functions, ~6 emitter call-site updates, and shared event types. Subsequent phases each ship as their own loop so you can review between.
