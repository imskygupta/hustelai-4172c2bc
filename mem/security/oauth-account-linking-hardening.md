---
name: OAuth account-linking hardening
description: Layered defenses against pre-account takeover and silent identity merges
type: feature
---

# OAuth account-linking hardening

## Defense layers (deployed)
1. **Platform** — Supabase `Account Linking = Manual only` (user must toggle in Cloud → Auth)
2. **DB triggers** — `handle_user_identity_change` flags OAuth-on-unverified as `restricted_security_review` + enqueues conflict
3. **Pre-signup** — `signup-guard` blocks new password rows for existing emails, suspends stale shells, IP rate-limited
4. **Post sign-in** — `auth-link-verify` validates identities every SIGNED_IN, force-signout on collision, ownership claim on locked shells, 24h cooldown after migration
5. **User UX** — passive overlay; "Linked sign-in methods" + "Recent security events" surfaced in Settings → Security
6. **Admin UX** — Identity Conflicts queue + post-hardening audit snapshot in `/admin/security/users`

## Password reset rule
Direct password reset is allowed only if `password_enabled = true` OR `auth_provider = 'password'`. Otherwise the flow returns `password_auth_not_enabled` and guides the user to "Enable password login" inside Security.

## Notifications matrix (security_auth_events → admin alerts)
- new provider linked → `oauth_link_attempt` (warn)
- ownership migrated → `provider_ownership_migrated` (critical)
- session revoked → `forced_session_revocation` (critical)
- collision detected → `oauth_collision_detected` / `provider_merge_blocked` (critical)
- password enabled → `password_enabled` (critical)
- email changed → `account.email_changed` (warn)

## Rate limits
- `signup-guard` — 20/IP/10min (existing `_shared/rate-limit`)
- `rl_hit` RPC available for future use on ownership claim / resend / password reset
