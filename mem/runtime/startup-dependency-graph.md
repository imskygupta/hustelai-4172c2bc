# Startup Dependency Graph (Phase 9.2)

Goal: only `auth` and `session` may block first paint. Everything else hydrates in
later phases or fails open.

## Phase A — blocks first paint (critical only)

| Dependency                | Type     | Owner DB | Status   | Notes |
|---------------------------|----------|----------|----------|-------|
| `supabase.auth.getSession`| network  | primary  | critical | timeout-wrapped (5s), retry x1 |
| Auth state hydrate        | local    | —        | critical | fails open to `unauthenticated` |
| Shell render (App routes) | render   | —        | critical | must be reachable in <2s |

Nothing else is allowed to block Phase A.

## Phase B — runs after first paint (optional, fail-open)

| Dependency                | Type     | Owner DB | Status   |
|---------------------------|----------|----------|----------|
| `fetchProfile`            | network  | primary  | optional |
| `user_roles` admin check  | network  | primary  | optional |
| Notifications poll        | network  | primary  | optional |
| Workspace summary         | network  | workspace| optional |
| Wallet/quota fetch        | network  | primary  | optional |

## Phase C — lazy, never auto-mounted on hot routes

| Dependency                | Type      | Owner DB | Status   |
|---------------------------|-----------|----------|----------|
| Infra panels              | render    | admin    | lazy     |
| `platform-hardening-status` | edge fn | admin    | lazy     |
| `primary-detox-stats`     | edge fn   | admin    | lazy     |
| `platform-drift-scan`     | edge fn   | admin    | lazy     |
| `provider-health-public`  | edge fn   | admin    | lazy     |
| Telemetry polling         | network   | admin    | lazy     |
| Realtime presence probes  | websocket | realtime | lazy     |
| Backup monitor            | edge fn   | admin    | lazy     |

## Route-level blocking calls (audited)

| Route             | Blocking? | Mitigation |
|-------------------|-----------|------------|
| `/`               | no        | static + lazy sections |
| `/dashboard`      | no        | `failOpen` wrappers on profile/quota |
| `/admin-dashboard`| no        | safe-mode disables polling |
| `/admin/*`        | no        | panels mounted behind feature flags |

## Realtime subscriptions during boot

None. All realtime channels are now created lazily inside the components that
consume them and gated by `realtime_monitor_enabled` / `ai_realtime_enabled`.

## Unsafe paths (open work)

- Some legacy admin panels still call `getApi()` synchronously on mount; they
  are guarded by `INFRA_SAFE_MODE` but should migrate to `useFeatureFlag`.
- `Chatbot.tsx` subscribes to `chat_messages` realtime on mount — gated, but
  should be wrapped in a circuit breaker.
