# Operations OS — Final Architecture (Phase 9.3)

## Canonical entry point

- **`/admin/operations`** — single Operations Center. All Phase 7–9 surfaces
  consolidate here as sections under one nav.

## Navigation tree

```
/admin
├── /admin-dashboard            (operator home)
└── /admin/operations           (Operations OS)
    ├── Overview                phase, DB health, breakers, flags rollup
    ├── Databases               primary-detox monitor
    ├── Stability               circuit breakers + platform hardening
    ├── Security                violations + RLS audit (flag-gated)
    ├── AI Runtime              ai_ai DB metrics, job queues
    ├── Realtime Fabric         channels, presence, reconnect storms
    ├── Backups / DR            backup runs, lag, retention
    ├── Cost Control            storage, WAL, function minutes
    ├── Feature Flags           runtime_feature_flags toggles
    ├── Docs Ops                docs_categories/pages + edge cache probe
    └── Topology                boundary map + DB ownership graph
```

Legacy routes (`/admin/infrastructure`, `/admin/runtime/*`) remain as deep-links
but are no longer the primary surface. Phase terminology disappears from UI.

## Runtime layering

```
┌────────────────────────────────────────────────┐
│  Phase A — auth + session + shell render       │ blocking
├────────────────────────────────────────────────┤
│  Phase B — profile, notifications, workspace   │ fail-open
├────────────────────────────────────────────────┤
│  Phase C — infra panels, telemetry, drift,     │ lazy + flag-gated
│            detox, provider analytics            │
└────────────────────────────────────────────────┘
```

## Subsystem responsibilities

| Subsystem        | DB        | Surface                  | Failure mode      |
|------------------|-----------|--------------------------|-------------------|
| Auth / Billing   | primary   | global                   | retry+timeout     |
| Admin telemetry  | admin     | Operations OS            | degraded card     |
| Blogs / SEO      | blogs     | /blog, /admin/blog       | empty state       |
| AI runtime       | api_ai    | chatbot, AI tools        | stub responses    |
| Realtime fabric  | realtime  | presence, live updates   | disabled silently |
| Workspace        | workspace | /work/*                  | summary degraded  |
| Community        | community | forums                   | unavailable card  |
| Docs             | admin     | /docs, Docs Ops          | starter fallback  |

## Degradation strategy

1. Every sibling-DB call is wrapped in `failOpen` (timeout + fallback).
2. Every polling endpoint goes through `withBreaker` (3 failures → open).
3. Every panel renders a `<DegradedCard>` instead of spinning forever.
4. `runtime_feature_flags` lets operators kill a subsystem from Admin DB.
5. Safe mode (`VITE_INFRA_SAFE_MODE=true`) forces all infra flags off.

## Routing model

- Single SPA, single host.
- Operations OS is the only canonical infra surface.
- Subdomain bundles (docs, blogs, workspace) keep independent routes.

## Observability model

- `AdminStatusBar` — global per-DB status pill, always visible in admin.
- `?debug_runtime=1` — overlay for hydration phase, breakers, tasks, DBs.
- `runtime_feature_flags_snapshot()` — RPC drives remote flag refresh.
- `runtime_direct_write_violations` — Admin DB sink for boundary drift.
- Hydration metrics: `getHydrationMetrics()` per phase.

## Freeze

Architecture is now FROZEN. New infra work goes under
`/admin/operations` as a new section, never as a new route.
