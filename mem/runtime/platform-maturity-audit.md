# Platform Maturity Audit — Phase 9.4

Scoring scale: 1 (early) · 3 (working) · 5 (production-grade).

| Dimension              | Score | Notes |
|------------------------|:-----:|-------|
| Resiliency             |  4    | fail-open + retries everywhere, breakers active |
| Isolation              |  4    | per-DB clients, sibling failure does not cascade |
| Observability          |  3    | event stream + status bar + `?debug_runtime=1`; no metrics export yet |
| Operator UX            |  4    | single Operations OS, calm vocabulary, no phase jargon in UI |
| Degradation behavior   |  4    | `DegradedCard`/`TimedSection` standard; no permanent spinners |
| Self-healing           |  3    | breakers half-open, DB health auto-clears; flag auto-restore manual |
| Runtime recovery       |  4    | Incident Mode + playbook + freeze noncritical polling |
| DB separation          |  5    | identity/billing kernel only; 7 sibling DBs own their domain |
| Deployment safety      |  3    | safe-mode default, but no canary tier yet |
| Incident handling      |  4    | dedicated `/admin/incident-mode`, event timeline, summary |

## Weakest remaining areas

- **Observability export**: events stay in-memory; need an Admin DB sink
  (`runtime_event_log`) for cross-session forensics.
- **Self-healing of flags**: noncritical flags do not auto-re-arm after
  Incident Mode release — operator must toggle.
- **Edge function latency tracking**: no per-function SLO board yet.

## Technical debt

- Legacy admin routes (`/admin/infrastructure`, `/admin/runtime/*`) are kept
  as deep-links; should be redirected to `/admin/operations?section=…`.
- `Chatbot.tsx` realtime subscription should adopt `withBreaker`.
- A handful of admin panels still call `getApi()` eagerly on mount.

## Hidden coupling risks

- Status-bar primary probe uses `supabase.auth.getSession`; any auth outage
  paints every pill amber. Consider a dedicated lightweight health endpoint.
- Event stream is process-local; multiple tabs see independent streams.

## 30-day stabilization roadmap

1. `runtime_event_log` table on Admin DB + `runtime-event-sink` edge fn.
2. Auto-restore feature flags 10 min after Incident Mode release.
3. SLO board: p50/p95 per edge function (provider-health, docs-read-public,
   ai-chatbot, primary-detox-stats).
4. Redirect deprecated admin routes to canonical Operations sections.
5. Replace `summarizeRecent()` heuristic with `ai_realtime_enabled`-gated
   model call (Lovable AI Gateway, Gemini Flash, 1-shot).
6. Canary deploy tier for edge functions (5% → 100%).

## New shipping rule

No new infrastructure feature ships unless ALL apply:
- degrades gracefully (`failOpen` + `DegradedCard`)
- has timeout protection (`withTimeout` / `retryWithTimeout`)
- emits at least one `pushEvent`
- has auto-recovery behavior (no manual reset)
- has a section under `/admin/operations` (no new top-level route)
- does not run in Phase A
