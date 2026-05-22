---
name: Post-hardening audit (Layer 4)
description: OAuth/identity hardening final state, audit surface, manual platform action required
type: feature
---

# Post-hardening audit — Layer 4

## Required manual action (one-time, platform-level)
**Cloud → Auth → Account Linking → Linking mode = Manual only.**
Until this is set, Supabase may auto-link OAuth identities under our logic.

## Restricted state
`profiles.verification_status = 'restricted_security_review'` blocks AI, exports, settings mutations, password reset, email change. The verification overlay renders the "Account under security review" variant with a contact-support link (no resend button).

## Cooldowns
After ownership migration: `provider_change_locked_until` and `email_change_locked_until` are set to `now() + 24h`. `last_reauth_at` must be within 10 minutes for unlink / password set / email change.

## Critical events (90-day retention via `security_auth_events.retain_until`)
- oauth_collision_detected
- provider_identity_mismatch / provider_merge_blocked
- forced_session_revocation
- ownership_claim_failed
- password_enabled
- provider_ownership_migrated

## Admin surface
`/admin/security/users` now shows:
- Audit snapshot (multi-provider emails, orphan password accounts, suspended/review, repeat collisions)
- Identity Conflicts queue (Revoke sessions / Force reset / Mark safe)

## User surface
`/settings/security` now shows:
- Linked sign-in methods (provider + last used)
- Recent security events (`get_my_security_events`, last 25)

## RPCs added
- `rl_hit(bucket,key,limit,window_seconds)` — generic atomic rate limiter (service-role)
- `start_ownership_cooldown(user_id)` — 24h provider/email lock
- `mark_reauth(user_id)` — stamp last_reauth_at
- `set_password_enabled(user_id)` — flips password_enabled + critical event
- `enqueue_identity_conflict(user_id, kind, evidence)` — admin queue write
- `get_my_security_events(limit)` — user-scoped event view
- `get_security_audit_summary()` — admin-only snapshot wrapper around `v_security_audit_summary`

## Notes
- Rate limiting on `signup-guard` continues to use the existing `_shared/rate-limit.ts` (no duplication).
- Backend lacks generalised rate limiting primitives; the new `rl_hit` RPC is the in-DB primitive for future endpoints (ownership claim, resend, password reset).
