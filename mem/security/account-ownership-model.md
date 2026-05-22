---
name: Account ownership model
description: Identity provenance, restricted states, ownership migration semantics
type: feature
---

# Account ownership model

## States (`profiles.verification_status`)
- `pending` — email/password account, awaiting email confirmation (24h deadline)
- `verified` — fully trusted
- `suspended` — admin or auto-suspend action
- `flagged` — manual review
- `restricted_security_review` — collision/ownership dispute detected; read-only, no privileged actions

## Provenance columns
- `auth_provider` — primary provider (email | google | apple | ...)
- `account_origin` — `email` or `oauth_<provider>`
- `email_verified` — mirror of `auth.users.email_confirmed_at`
- `oauth_linked_at` — first OAuth identity attached
- `password_enabled` — explicit user choice to enable password sign-in
- `restricted_pending_ownership_review` — lock pending OAuth ownership claim
- `provider_change_locked_until`, `email_change_locked_until` — 24h cooldowns after migration
- `last_reauth_at` — used to gate sensitive actions (10-minute freshness)

## Migration
`claim_account_ownership(user_id, provider)` + `start_ownership_cooldown(user_id)` are called inside `auth-link-verify` when a locked unverified shell is claimed by a verified OAuth identity. Sessions are revoked immediately after.
