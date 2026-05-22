---
name: Account Ownership Model
description: Profile column meanings, provider lifecycle states, and allowed transitions for the post-takeover-hardening account model.
type: feature
---
# Account Ownership Model

## Profile columns
- `auth_provider` — first provider that owned the account.
- `auth_provider_user_id` — provider subject (`sub`).
- `email_verified` — mirror of `auth.users.email_confirmed_at IS NOT NULL`.
- `oauth_linked_at` — first OAuth attachment timestamp.
- `account_origin` — `email | oauth_google | oauth_apple | magic_link | admin_created`.
- `restricted_pending_ownership_review` — emergency lock.
- `verification_status` — `pending | verified | suspended | flagged`.
- `verification_deadline` — grace before pending → suspended.

## State transitions
```
pending  --email confirmed-->         verified
pending  --24h elapsed-->             suspended (auto_suspend_unverified)
suspended --email confirmed-->        verified
verified --OAuth arrives-->           verified (oauth_link_attempt logged)
pending  --OAuth arrives-->           pending + restricted_pending_ownership_review=true
                                              (oauth_conflict_detected logged)
restricted_pending_ownership_review --valid OAuth claim via auth-link-verify-->
                                              verified, account_origin=oauth_<p>
                                              (provider_ownership_migrated logged, sessions revoked)
```

## Verified gating
- Frontend: unverified users can browse; banner overlay only.
- Backend: `requireVerifiedUser()` gates every privileged action.
- Wallet, roles, workspace memberships NOT provisioned until verified.

## Service-role-only helpers
`claim_account_ownership`, `revoke_user_sessions`, `auto_suspend_unverified`, `log_security_auth_event`. EXECUTE revoked from `anon`/`authenticated`.