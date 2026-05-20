# Stability Checkpoint — Phase 9.2

## Boot timings (target)

| Marker                | Budget  | Notes |
|-----------------------|---------|-------|
| Phase A complete      | < 800ms | auth + shell |
| First meaningful paint| < 2.0s  | guaranteed even with siblings offline |
| Phase B complete      | < 3.0s  | profile, notifications, workspace summary |
| Phase C complete      | < 8.0s  | infra panels, telemetry, drift, detox |

## Hydration timing

- Phase A starts at `performance.now() ~ 0`.
- Phase B is scheduled via `requestIdleCallback` after 50ms.
- Phase C is scheduled via `requestIdleCallback` after 1200ms.
- A 4s `boot-watchdog` logs any still-active boot task.

## Degraded-mode behavior

- `VITE_INFRA_SAFE_MODE` (default `true`) forces all `*_monitor_enabled` flags off.
- All sibling-DB calls go through `failOpen` (returns stub on failure).
- All polling endpoints route through `withBreaker` and stop after 3 failures.
- DB facades (`aiDb`, `blogDb`, `workspaceDb`, `communityDb`) never throw on
  missing env keys — they return empty result stubs.

## DB isolation matrix

| DB        | Failure impact (isolated)                     |
|-----------|-----------------------------------------------|
| primary   | auth/billing only — handled by retry+timeout  |
| admin     | infra panels degrade; app stays usable        |
| blogs     | blog index/newsletter unavailable             |
| api_ai    | chatbot/AI tools unavailable                  |
| realtime  | presence/live notifications disabled          |
| workspace | workspace summary degrades                    |
| community | forums unavailable                            |
| docs      | docs pages unavailable                        |

## Routes verified healthy (manual + boot-watchdog)

- `/` — static + lazy
- `/dashboard` — fail-open profile/quota
- `/admin-dashboard` — safe-mode disables polling
- `/admin/*` — feature-flag gated
- `/docs/*` — independent subdomain bundle

## Remaining unsafe paths

- `Chatbot.tsx` realtime subscription should be moved behind a breaker.
- Some admin panels still call `getApi()` eagerly on mount.
- `provider-health-public` polling should adopt `withBreaker` everywhere.

## Current blockers

None blocking first paint. Infra re-enable is gated by Admin DB flag rollout.

## Controlled re-enable order

1. `provider_health_enabled`
2. `infra_panels_enabled`
3. `detox_monitor_enabled`
4. `drift_monitor_enabled`
5. `realtime_monitor_enabled`
6. `ai_realtime_enabled`

Each step soaks ≥24h with debug overlay (`?debug_runtime=1`) before the next
flag is flipped from the Admin DB.
