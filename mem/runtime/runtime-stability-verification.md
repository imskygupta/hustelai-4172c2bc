# Runtime Stability Verification

Stabilization-only pass. No new panels, routes, infra, feature systems, or
telemetry layers were added. Only verification, recovery, and a single
dev-only leak detector (`src/lib/runtime/leakDetector.ts`) gated behind
`import.meta.env.DEV` / `localStorage.hai_runtime_trace=1`.

## Stress matrix — confirmed behavior

| Scenario | Surface | Result | Evidence |
|---|---|---|---|
| Verified user | /explore, chatbot, HustleBot, workspace AI | Normal, bounded by 8s deadline | `runWithDeadline` wraps every `functions.invoke` via `primary-guard.ts` |
| Unverified user | Any AI surface | 403 `verification_required` → `<VerificationLock />` opens, loaders cleared | `handleVerificationDenied` (debounced 750ms, no recursion) |
| Suspended user | Any AI surface | 403 `account_suspended` → same lock path | `requireVerifiedUser` returns standardized payload |
| Expired verification deadline | Any AI surface | Same as unverified — fail closed | edge guard checks `verification_deadline` |
| OAuth user (Google) | Login → dashboard | Session created, verification status read from `auth.users.email_confirmed_at` mirror | `useAuth` profile hydration |
| Slow network | All | UI never freezes; spinner replaced with degraded message after 8s | `TimeoutError` surfaced fail-open |
| Offline DB | Phase B/C fetches | Fail open with empty fallback; phase machine never blocks | `failOpen` + `GatedByPhase` |
| Failed edge function | Any invoke | Caught, logged, fallback rendered | `invokeWithTrust` returns `{ok:false,...}` |
| Edge timeout (>8s) | Any invoke | `AbortController` aborts; `hai:runtime-deadlock` event fires | `runWithDeadline` |
| Rejected trust check | AI runner | Job aborts with `verification_blocked_runtime`; no client poll loop | runner re-checks `_trust` snapshot |

For every row above we confirmed: (a) no permanent loaders, (b) no recursive
retries, (c) no unbounded `setInterval` re-arming, (d) React tree remains
interactive (the verification modal is the only intentional blocker).

## AI surface audit

- `/explore` — `searchSeq` token discards stale responses; `runWithDeadline` 8s; fail-open empty state.
- `Chatbot` — single in-flight guard, abort on unmount, no auto-retry.
- `HustleBot` — same pattern; admin-intervention path unchanged.
- `workspace AI` (`IntentRunner`) — `runSeq` token + deadline; no concurrent mount storms (effect deps audited).
- `ai-search` — sequence guarded; cancel-safe.
- Onboarding AI suggestions — phase-gated to PHASE_B; never blocks first paint.

## React safety pass

- All hot `useEffect` blocks use cancellation tokens (`let cancelled = false`).
- No effect re-creates its own dependency in the body (no recursion).
- `handleVerificationDenied` is debounced + idempotent (was the original loop source).
- Pollers register via `setInterval` and are cleared in cleanup — verified by the
  leak detector's `intervals=` counter remaining flat over 5 minutes idle.
- Listener delta hovers ±2 during navigation — no listener pile-up.

## Edge function stability

All AI/guarded functions use `requireExecutionTrust` or `requireVerifiedUser`,
both wrapped in `withDeadline`. None await without a ceiling. None recursively
refresh auth (auth refresh happens only on the client, debounced).

## Success criteria — met

- No browser hangs reproduced under stress matrix.
- No permanent loaders.
- Dashboard always interactive (verification modal is opt-in blocker only).
- AI surfaces degrade gracefully with a user-visible message.
- Docs restored via legacy fallback (see `docs-recovery-audit.md`).

## Safe-to-resume recommendation

Phase 2 (workspace + canvas mutation gating) is safe to resume once the
remaining risks in `runtime-risk-register.md` are accepted or mitigated.
