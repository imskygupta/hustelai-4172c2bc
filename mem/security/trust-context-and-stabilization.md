---
name: Trust Context Model & Phase 1 Stabilization
description: TrustContext enum, requireExecutionTrust gate, internal HMAC signing, test matrix, cleanup inventory
type: feature
---
# Trust Context Model

## Contexts
```ts
type TrustContext =
  | "user_verified"     // bearer JWT + profile.verification_status='verified'
  | "user_unverified"   // bearer present but verification failed
  | "internal_service"  // x-hustle-internal-signature HMAC valid, service allowlisted
  | "cron_system"       // internal signature with service="cron-system"
  | "admin_operator";   // user_verified + user_roles.role in (admin,super_admin)
```
Detection is **explicit** — never inferred. Internal callers MUST sign;
service-role token alone is no longer accepted as proof of trust.

## Shared helpers
- `supabase/functions/_shared/require-verified.ts` — user verification gate (Phase 1)
- `supabase/functions/_shared/execution-trust.ts` — `requireExecutionTrust({allow,fn,minTier})` + `signInternalRequest(caller,targetFn)`

## Internal signing envelope
Headers required on internal calls:
- `x-hustle-internal-signature` — `HMAC_SHA256(INTERNAL_SERVICE_SECRET, "<svc>.<ts>.<nonce>.<targetFn>")`
- `x-hustle-service` — allowlisted caller name
- `x-hustle-timestamp` — ms since epoch, ±5min window
- `x-hustle-nonce` — UUID, in-memory replay cache per instance

Allowlist: workflow-runner, ai-job-runner, notifications-broadcast,
telemetry-router, event-dispatcher, intelligence-anomaly-scan,
blog-automation-audit, editorial-pipeline, retention-worker, cron-system.

**Secret**: `INTERNAL_SERVICE_SECRET` (Cloud secret).

## Frontend contract
- `src/lib/auth/verificationDenied.ts` — `isVerificationDenied(payload)`, `handleVerificationDenied()`, `invokeWithTrust(name,body)`.
- On 403 with `verification_required: true`:
  - dispatch `hai:verification-denied` window event
  - debounced `supabase.auth.refreshSession()` → `<VerificationLock />` opens
  - callers stop polling/retrying. No spinner loops.

## Observability
- `/admin/security/runtime-trust` — 24h counts of:
  `verification_blocked_ai`, `verification_blocked_runtime`,
  `verification_blocked_export`, `invalid_service_signature`,
  `replay_attempt`, `blocked_internal_call` + top denied surfaces.
- All rows land in `public.security_auth_events` via `log_security_auth_event` RPC.

## AI Job snapshot rule
`ai-job-enqueue` writes `input._trust = { verification_status, trust_tier, snapshot_at }` onto every enqueued job. Phase 4 runner contract:
1. Read `_trust` snapshot for audit.
2. Re-query `profiles.verification_status` at execute time.
3. Abort + log `verification_blocked_runtime` if not verified or suspended.

## Phase 2 rules
- MUTATIONS → `requireVerifiedUser` (or `requireExecutionTrust` if also called internally)
- READ-ONLY → degraded allowed, no gate
- Never block: dashboard shell, docs, onboarding, settings → these must load so users can complete verification.

## Stabilization test matrix
| Case | Expected |
|---|---|
| verified user | 200 |
| unverified user | 403 `verification_required` + lock opens |
| suspended user | 403 `account_suspended` |
| expired verification (deadline passed, auto_suspend ran) | 403 `account_suspended` |
| invalid token | 401 `unauthenticated` |
| missing token | 401 `unauthenticated` |
| internal orchestrator (valid HMAC, allow:[internal_service]) | 200 |
| internal orchestrator (allow:[user_verified] only) | 403 `context_not_allowed` |
| cron caller (service=cron-system) | context=cron_system |
| admin operator | context=admin_operator |
| replayed nonce | 401 `nonce_replay` + event logged |
| stale timestamp (>5min) | 401 `stale_signature` |
| service not allowlisted | 403 `service_not_allowed` |
| partial signature headers | 401 `invalid_internal_signature` |

Smoke-test plan: hit `ai-chatbot` from preview (verified), from incognito (unauthenticated), and from another edge function with `signInternalRequest`. Verify `security_auth_events` rows.

## Cleanup inventory (deferred to Phase 8)
- Inline auth blocks duplicated *after* the gate in ai-chatbot, ai-search, ai-job-enqueue, etc. → remove once gate fully trusted.
- `src/lib/auth-config.ts` legacy `isAuthenticated()` helpers → replace with profile.verification_status checks.
- Edge functions reading `user.email` to imply trust → migrate to `gate.profile.verification_status`.
- Any function still calling another via service-role key without signing → must adopt `signInternalRequest`.

## Priority lock (per user directive)
Until enforcement is fully stable:
1. auth integrity
2. runtime stability
3. trust enforcement consistency
4. observability
5. cleanup
**No feature evolution** during this window.
