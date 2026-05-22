# Post-Hardening Audit — Stabilization Pass

_Updated: 2026-05-22 (Stabilization + Operational Cleanup pass)_

This document is the running soak-audit ledger for the identity-trust hardening
work (Layers 1–4 + P0 stabilization). It supersedes earlier "audit report"
fragments scattered across other files.

---

## 1. Live posture (snapshot from production DB)

| Metric | Value |
|---|---|
| `profiles` total | 56 |
| Unverified profiles | 2 |
| `restricted_pending_ownership_review` | 0 |
| `verification_status = restricted_security_review` | 0 |
| OAuth-only (no password enabled) | 18 |
| `auth_provider = 'password'` + `password_enabled != true` | 0 |
| Open rows in `identity_conflict_queue` | 0 |
| Critical events in last 24h | 0 |
| Active `rate_limit_buckets` last 24h | 0 |
| Security events last 7d | 2 (`account.created`, `account.verified`) |

**Interpretation:** Zero collisions, zero forced revocations, zero rate-limit
saturation, zero pending ownership reviews. The hardening layers are running
quietly — no false-positive churn.

The 18 OAuth-only accounts are the expected target of the password-reset
guard: any reset attempt for those emails will be denied with
`password_auth_not_enabled` and logged at `critical` severity.

## 2. Trust pipeline (single canonical path)

```
sign-in (password | google)
   │
   ▼
useAuth onAuthStateChange  ──►  verifyAuthLinkage()
                                    │
                                    ▼
                       auth-link-verify edge function
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
       ok: continue          collision detected         ownership claim
                                    │                       │
                          revoke_user_sessions       claim_account_ownership
                          enqueue conflict           clear restricted flag
                          restricted_security_review log account.claimed
                                    │
                                    ▼
                            force_signout
```

Frontend trust evaluation lives in `src/lib/auth/restriction.ts`. The
`<VerificationOverlay />` is the **only** UI surface that renders restriction
state. There is no longer a separate "restricted runtime shell".

Privileged edge functions go through `requireVerifiedUser()` server-side.
Frontend call sites use `invokeWithTrust()` from `src/lib/auth/verificationDenied.ts`.

## 3. Password reset guard

- Edge: `supabase/functions/password-reset-guard`
- Frontend: `src/pages/ForgotPassword.tsx`
- Denies when `profile.auth_provider != 'password' && !profile.password_enabled`
- Rate limit: 5 attempts / 10 min / (IP, email) via `rate_limit_hit`
- Logs: `password_reset_blocked` (critical), `password_reset_rate_limited` (warn),
  `password_reset_allowed` (info)
- Unknown emails return `allowed: true` (no enumeration)

## 4. Session revocation

- Edge: `supabase/functions/session-revoke-all`
- Frontend: `/settings/security` → "Sign out all devices"
- Step-up: password re-entry → `mark_reauth` RPC → must be within 10 min
- Rate limit: 5 / hour / user
- Calls `revoke_user_sessions` (deletes all `auth.sessions` rows)
- Logs `sessions_revoked` (warn)

## 5. Cleanup performed in this pass

| Removed | Reason |
|---|---|
| `src/components/auth/RestrictedVerificationShell.tsx` | Zero importers. Superseded by `VerificationOverlay`. |
| Dead `VerifyEmailGate` no-op export | Component returned `null`; only the hook is used. |

Refreshed copy:
- `useRequireVerifiedEmail` toast now points users at the verification banner
  instead of the (removed) "verification shell".
- `verificationDenied.ts` header comment now references `<VerificationOverlay />`.

## 6. Stability gate

| Check | Result |
|---|---|
| No browser hangs | ✅ no recorded runtime errors |
| No auth loops | ✅ `auth.refresh_failure_spike` not seen |
| No blocked dashboards | ✅ unverified users still render full app |
| No broken OAuth logins | ✅ 0 collisions in 24h |
| No collision false positives | ✅ `identity_conflict_queue` empty |
| No support spikes | ✅ no critical events logged |

**Conclusion:** Security foundation is stable for current scale.
Future security work paused; product-focused work resumes next.

## 7. Known external constraints

- Supabase Auth → Account Linking dashboard setting cannot be enforced from
  this codebase (Lovable-managed). Application-layer ownership checks
  (`auth-link-verify`, `restricted_pending_ownership_review`,
  `identity_conflict_queue`) are the authoritative defense and must remain
  the source of truth regardless of platform-level linking behavior.

## 8. What to watch in the next 48h

Run these queries periodically; alert if any go non-zero:

```sql
SELECT count(*) FROM security_auth_events
 WHERE severity = 'critical' AND created_at > now() - interval '24 hours';

SELECT count(*) FROM identity_conflict_queue WHERE resolved_at IS NULL;

SELECT bucket_key, hits FROM rate_limit_buckets
 WHERE bucket_key LIKE 'pwreset:%' OR bucket_key LIKE 'revokeall:%'
 ORDER BY hits DESC LIMIT 10;
```
