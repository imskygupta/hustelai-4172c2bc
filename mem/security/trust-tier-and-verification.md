---
name: Trust Tier & Verification Gate
description: Centralized account-verification model, trust tiers, and the rollout checklist for the requireVerifiedUser edge guard
type: feature
---

# Trust Tier & Verification Gate

Foundational policy layer. Do NOT branch verification logic in individual
components or edge functions — go through the shared primitives below.

## DB model (public schema)
- `profiles.verification_status` — `pending | verified | suspended | flagged`
- `profiles.verification_deadline` — 24h grace window for new email/password signups
- `profiles.verified_at` — set when `auth.users.email_confirmed_at` flips
- `profiles.restricted_reason` — populated when status becomes `suspended`/`flagged`
- `security_auth_events` — append-only audit log, admin-only RLS read, writes via `log_security_auth_event` RPC (service role)
- Triggers:
  - `on_auth_user_created` (existing, rewired) — inserts profile with status based on `email_confirmed_at`
  - `on_auth_user_email_confirmed` — promotes `pending` → `verified` automatically
- RPCs:
  - `auto_suspend_unverified()` — flips expired `pending` to `suspended` (admin button + future cron)
  - `is_user_verified(uuid)` — cheap stable boolean for RLS reuse
  - `log_security_auth_event(...)` — service-role event writer

## Trust tiers
`src/lib/auth/trustTier.ts` + `supabase/functions/_shared/require-verified.ts`:
- Tier 0 — guest (no session)
- Tier 1 — authenticated, email NOT verified (browse only)
- Tier 2 — verified free user (AI tools, exports, automations)
- Tier 3 — verified paying user (`pro|elite|infinity`, high-cost ops)

## Frontend
- `<VerificationLock />` mounted once inside `<AuthProvider>` in `App.tsx`. Non-dismissable; shows countdown, resend (60s cooldown), sign out. Auto-closes when profile flips to `verified`.
- `useAuth` `Profile` type now includes the four verification fields.
- Never duplicate the lock; gate features via the trust tier helper.

## Edge functions
- `supabase/functions/_shared/require-verified.ts` exports `requireVerifiedUser(req, { minTier? })`.
  Returns either `{ ok: true, user, profile, trustTier }` or `{ ok: false, response }`.
  Response is HTTP 401/403 with `{ verification_required: true, verification_status, verification_deadline, email }` — the frontend uses these fields to refresh the lock.
- Helper fails CLOSED on missing service-role secret (503). Logging via `logSecurityAuthEvent`.

## Rollout checklist (must be migrated to the helper)
High-priority functions that currently DO NOT enforce verification — must add `requireVerifiedUser` at the top:
- All AI runtime functions (any function under `supabase/functions/ai-*`, `hustlebot*`, `roadmap*`, `proposal*`, `resume*`, `red-flag-scanner`, `skill-gap`, `gig-*`, `faceless-content`)
- Exports (`exports-*`, `pdf-*`)
- Workspace mutations (`workspace-*` that write)
- Automations / workflows producers
- BYOK key writes
- Telegram / Discord linking initiators
- Admin write functions (already role-gated; add verification too for defense in depth)

Allowed to skip (browsing / public):
- `signup-guard`, `discord-oauth/callback`, blog/docs read functions, public marketing endpoints, healthcheck.

## Rules
1. No new privileged edge function ships without `requireVerifiedUser`.
2. No new UI gate may re-implement verification — read `profile.verification_status` and rely on `<VerificationLock />`.
3. OAuth identities are trusted only when the provider says `email_verified` (Google/Apple do; `handle_new_user` reads `email_confirmed_at` which Supabase sets only for verified provider emails).
4. Admin manual verify writes a `account.manual_verify` event — never silent.
5. Resend cooldown is 60s client + must be rate-limited server-side once Supabase resend is fronted by an edge function.
6. `auto_suspend_unverified()` should be called by a cron (TODO) every 15 minutes; meanwhile the admin panel button runs it on demand.