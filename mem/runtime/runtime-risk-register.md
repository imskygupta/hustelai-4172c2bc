# Runtime Risk Register

Snapshot taken after the Runtime Stability Verification pass. Update when
a risk is mitigated or a new one is observed.

## Confirmed fixes

| ID | Area | Fix | Verification |
|---|---|---|---|
| RF-01 | Recursive 403 loop | `handleVerificationDenied` debounced (750ms) and no longer triggers session refresh recursively | Leak detector: listenerΔ stable, no `unhandledrejection` spikes |
| RF-02 | Unbounded AI invoke | Global `runWithDeadline(8s)` monkey-patches `supabase.functions.invoke` in `primary-guard.ts` | Watchdog dispatches `hai:runtime-deadlock` on overrun |
| RF-03 | Explore concurrent mount storm | `searchSeq` token discards stale responses | Manual reproduction no longer pegs CPU |
| RF-04 | Docs blank after Admin-DB migration | Legacy fallback inside `docs-read-public` | `op=audit` returns `active_source` |
| RF-05 | Boot-time deadlocks | `installDeadlockWatchdog` + 4s boot watchdog warning | `getActiveBootTasks()` empty after 4s in dev |
| RF-06 | Edge guard hang on profile lookup | `requireVerifiedUser` profile read wrapped in `withDeadline` | Edge logs show clean returns |

## Remaining risks

| ID | Area | Risk | Severity | Owner / Next step |
|---|---|---|---|---|
| RR-01 | Service-to-service signing | `INTERNAL_SERVICE_SECRET` not yet provisioned in env | Medium | Add secret before Phase 2 — fail-closed today |
| RR-02 | Docs Admin-DB content | Admin DB still empty in some envs; relies on legacy fallback | Medium | Run backfill from `mem/transfer/docs-content-recovery.md` |
| RR-03 | `setInterval` patch in dev | Leak detector patches global timer functions in DEV only; could mask exotic third-party timer accounting | Low | Disable via removing `installLeakDetector()` once verification window closes |
| RR-04 | `hai:runtime-deadlock` consumers | No automated alerting on this event yet (intentional — no new telemetry) | Low | Reassess in Phase 8 hardening |
| RR-05 | OAuth pre-account-takeover | Email-only linking removed; manual audit of legacy rows still pending | Medium | Run the verification report from the original security patch ask |

## Known degraded surfaces

- AI surfaces under 8s+ provider latency render a "took too long" message
  instead of streaming output. This is intentional fail-open behavior.
- Docs Admin source returns empty in envs missing the legacy secret pair —
  surface renders an empty sidebar (no error toast).

## Blocked areas

- Phase 2 (workspace/canvas mutation gating) — gated on RR-01 + smoke
  tests of the trust matrix.
- New panels / routes / infra / telemetry — explicitly out of scope until
  stabilization window closes.

## Safe-to-resume recommendation

Resume Phase 2 once **RR-01** is closed (secret added) and a fresh
`?debug_runtime=1` session shows:
- 0 active runtime requests after 60s idle,
- intervals count flat,
- no `hai:runtime-deadlock` events in a 10-minute soak.
