---
name: OAuth Account Linking Hardening
description: P0 defense against OAuth pre-account takeover. Blocks silent same-email linking, requires verified ownership before activation, and migrates ownership safely via auth-link-verify.
type: feature
---
# OAuth Pre-Account Takeover — Hardening

## Threat
Attacker pre-registers `victim@gmail.com` with password (unconfirmed). Victim later signs in with Google. Without defenses, Supabase may auto-link the OAuth identity to the attacker's shell account via matching email.

## Defense layers
1. **Auth config** — `auto_confirm_email=false`, `password_hibp_enabled=true`, `external_anonymous_users_enabled=false`. Manual "Account Linking → Manual only" toggle must be set in Cloud → Auth.
2. **`signup-guard`** — rejects email/password signup when any `auth.users` row exists for the email. Confirmed → `email_already_registered`. Unconfirmed → `verification_pending`; stale shells (>24h) are suspended via `auto_suspend_unverified()` before rejection.
3. **`handle_new_user`** — populates `auth_provider`, `email_verified`, `account_origin`, `oauth_linked_at`. OAuth → `verified`. Email/password → `pending` with 24h deadline.
4. **`handle_user_identity_change` trigger** — on `auth.identities` insert. If existing profile is unverified, sets `restricted_pending_ownership_review=true` and logs `oauth_conflict_detected` (critical). Otherwise logs `oauth_link_attempt`.
5. **`auth-link-verify` edge function** — invoked from `useAuth` after every `SIGNED_IN`. Validates all identities agree on email + verification. On collision → revokes sessions, locks profile, signs user out globally. On valid OAuth claim of a locked profile → calls `claim_account_ownership()`, revokes sessions, forces re-auth.

## Conflict audit
`security_account_conflicts` view (admin-only via `get_security_account_conflicts()` RPC) surfaces duplicates, mixed-provider, stale unverified, ownership-review locked.

## Security events
`account.created`, `account.verified`, `account.suspended`, `auth.signup_blocked`, `oauth_link_attempt`, `oauth_conflict_detected`, `provider_merge_blocked`, `provider_ownership_migrated`, `forced_session_revocation`.

## Not done automatically
- No auto-revoke of existing mixed-provider accounts (manual review only).
- No `auth.users`/`auth.identities` schema mutations.
- No parallel identity table; `auth.identities` is source of truth, profiles only annotate.

## Rollback
`scripts/security/oauth-takeover-rollback.sql`.