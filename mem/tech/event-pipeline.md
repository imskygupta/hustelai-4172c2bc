---
name: Event Pipeline
description: Centralized typed event spine — emit() client / emitServer() edge / event-dispatcher fan-out
type: feature
---
# Event Pipeline (Phase 1)

Single spine all subsystems publish to. Categories: payment, export, ai, affiliate, security, workspace, admin, system, auth. Severities: info | warn | error | critical.

## Files
- `src/lib/events/types.ts` — typed catalog (AppEvent discriminated union, EVENT_SEVERITY/CATEGORY maps). Mirror at `supabase/functions/_shared/events/types.ts`.
- `src/lib/events/emit.ts` — client `emit(event)` → POSTs to `log-event` with severity + dedupe_key. Fire-and-forget.
- `supabase/functions/_shared/events/emit.ts` — server `emitServer(event)` → writes to analytics `event_log`, chains to dispatcher.
- `supabase/functions/event-dispatcher/index.ts` — service-role only fan-out; matches in-code SUBSCRIPTIONS rules; routes to Telegram (`notify-ops`); failures logged to `event_failures`.
- `supabase/functions/log-event/index.ts` — accepts severity/source/dedupe_key, writes to event_log, chains to dispatcher.

## Rules
- All new emitters (payments, exports, AI, security, admin actions) MUST use `emit()` / `emitServer()` instead of ad-hoc analytics inserts or direct `notifyOps()` calls.
- Subscriptions live in `SUBSCRIPTIONS` array inside dispatcher for now; will move to DB2 `event_subscriptions` table when that migration ships.
- `event_log` tables on analytics DB need columns: `severity text`, `source text`, `dedupe_key text`. Add via DB2 migration when available — `safeAnalyticsInsert` swallows errors so missing columns won't break the path.
- Add new event names to BOTH `AppEvent` union AND severity/category maps to keep types exhaustive.

## Phases that consume this
- Phase 4 ops dashboard — reads `event_log` + `event_failures`.
- Phase 5 audit logs — reads `event_log` filtered by category.
- Phase 6 automation engine — subscribes via `event_subscriptions(channel='automation')`.
