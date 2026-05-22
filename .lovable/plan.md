# OAuth Pre-Account Takeover — P0 Hardening Plan

This builds on the existing verification system (`profiles.verification_status`, `security_auth_events`, `handle_new_user`) already in place from the trust rollout. We will NOT touch `auth.users`/`auth.identities` schemas (read-only). All defense lives in `public.*`, edge functions, and Supabase auth config.

## Threat being closed

Attacker pre-registers `victim@gmail.com` with password (unconfirmed). Later the victim signs in with Google; Supabase's default same-email auto-link could attach the Google identity to the attacker's shell account. Even without auto-link, the attacker keeps an unconfirmed `auth.users` row that creates ambiguity and may be reactivated.

## Strategy — 4 layers, each shipped as a separate approval

### Layer 1 — Auth config + DB hardening (one migration + `configure_auth`)

**Auth config**
- `auto_confirm_email = false`, `password_hibp_enabled = true`, `external_anonymous_users_enabled = false`, `disable_signup = false`.
- The "Manual linking only" toggle in Cloud → Auth → Account Linking cannot be set via tool — we surface it in the admin panel (Layer 4) and in the runbook memory file.

**Migration additions to `public.profiles`**
- `auth_provider TEXT NOT NULL DEFAULT 'email'` — first provider that successfully owned the account.
- `auth_provider_user_id TEXT` — provider subject (`sub`).
- `email_verified BOOLEAN NOT NULL DEFAULT false` — mirror of `auth.users.email_confirmed_at IS NOT NULL`, kept in sync by trigger.
- `oauth_linked_at TIMESTAMPTZ` — when an OAuth identity first attached.
- `account_origin TEXT NOT NULL DEFAULT 'email'` — `email | oauth_google | oauth_apple | magic_link | admin_created`.
- `restricted_pending_ownership_review BOOLEAN NOT NULL DEFAULT false` — emergency lock flag.

**`handle_new_user` rewrite (additive, safe fallback)**
- Detects provider from `raw_app_meta_data->>'provider'` + `providers[]`.
- Populates the new columns.
- If `email_confirmed_at IS NULL` and provider is `email`: profile created with `verification_status='pending'`, `email_verified=false`, NO downstream provisioning (wallet/roles/workspace memberships gated on `is_user_verified`).
- If provider is OAuth (`google`, `apple`): mark `email_verified=true`, `verification_status='verified'`, set `oauth_linked_at=now()`, `account_origin='oauth_<provider>'`.

**New trigger `handle_user_identity_change`**
- Fires `AFTER INSERT OR UPDATE ON auth.identities` (read-only schema allows triggers on it from `public` definer functions — verified in current Supabase).
- On insert of a new identity for an existing user:
  - If the existing profile is `email_verified=false`: mark `restricted_pending_ownership_review=true`, log `oauth_conflict_detected` (severity=critical).
  - If the existing profile is `email_verified=true` AND the new identity's `provider='google'`: log `oauth_link_attempt` (severity=warn). The link is allowed (user owns the verified email) but session is downgraded — `auth-link-verify` (Layer 3) re-checks on next sign-in.

**New view `security_account_conflicts`** — admin-only RLS:
- Confirmed users with duplicate emails (should be 0).
- Profiles where `account_origin='email'` AND `email_verified=false` AND `auth.identities` already contains an OAuth row for the same `user_id` (the takeover symptom).
- Mixed-provider accounts (informational — 5 today).
- Unconfirmed accounts older than 24h.

**Helper RPCs**
- `claim_account_ownership(_user_id uuid, _provider text)` — service-role only, called by Layer 3 to safely migrate ownership.
- `revoke_user_sessions(_user_id uuid)` — wraps `auth.sessions` delete via service role (the only auth-schema mutation we make, and only for sessions, never users/identities).

### Layer 2 — Edge function hardening

**`signup-guard` (existing — extended)**
- Before allowing email/password signup, look up `auth.users` (service role) by lowercased email:
  - If a confirmed row exists → reject with `email_already_registered` (no enumeration tell — same response timing).
  - If an unconfirmed row exists < 24h old → reject with `verification_pending` (instruct user to check inbox).
  - If an unconfirmed row exists ≥ 24h old → call `auto_suspend_unverified()` first, then reject; the stale shell is now `suspended` and cannot be reactivated by attacker.
- Log every block to `security_auth_events` as `auth.signup_blocked` (already present).

**`auth-link-verify` (NEW)** — called client-side after every successful sign-in:
- Reads `auth.identities` for `auth.uid()`.
- If multiple providers: require both identity emails match (case-insensitive) AND both have `identity_data->>'email_verified'='true'`. Otherwise:
  - `revoke_user_sessions(user_id)`, mark profile `restricted_pending_ownership_review=true`, log `provider_merge_blocked` (critical).
  - Return `{ ok: false, action: 'force_signout', reason: 'provider_collision' }` → client signs out globally.
- If profile is `restricted_pending_ownership_review=true` AND current session is OAuth-verified for the same email:
  - Call `claim_account_ownership(user_id, provider)` which: sets `auth_provider`, `account_origin='oauth_<provider>'`, clears the lock, logs `provider_ownership_migrated` (critical), revokes all sessions older than 1 minute (everything except the current OAuth session).
- Returns `{ ok: true }` for the normal path.

**`admin-utils` audit**
- All admin-created accounts must use `email_confirm: false` and send a verification email. Verified, patched if any path bypasses.

### Layer 3 — Client wiring (minimal)

- `useAuth.tsx`: after `SIGNED_IN` event, invoke `auth-link-verify` once per session. On `force_signout` response, call `supabase.auth.signOut({ scope: 'global' })` and route to `/login?reason=ownership_review`.
- `Login.tsx` / `Signup.tsx`: surface server-returned reason codes (`email_already_registered`, `verification_pending`, `ownership_review`) with clear copy. No silent failures.
- `VerificationOverlay.tsx`: if `restricted_pending_ownership_review=true`, swap the banner to an ownership-review variant with "Verify ownership via email" CTA → triggers a magic link to the canonical address.

### Layer 4 — Admin panel + reports

- `/admin/security/auth-integrity` reading `security_account_conflicts` and `security_auth_events`:
  - Counts: confirmed duplicates, mixed-provider, unconfirmed >24h, ownership-review locked.
  - Per-row actions (manual only): "Send ownership verification", "Force re-auth (revoke sessions)", "Mark resolved".
- One-time backfill report (read-only) listing profiles created pre-patch where hydration occurred before verification — triage list, no auto-mutation.
- Memory docs:
  - `mem/security/oauth-account-linking-hardening.md` — threat model, defense layers, runbook for the Cloud "Manual linking only" toggle.
  - `mem/security/account-ownership-model.md` — column meanings, provider lifecycle states, allowed transitions.

## Safety + rollback

- All triggers wrapped in `BEGIN/EXCEPTION WHEN OTHERS` falling back to legacy path so signup never outages.
- Every new column is additive with safe defaults — no existing rows break.
- Rollback SQL: `scripts/security/oauth-takeover-rollback.sql` (drops triggers, restores prior `handle_new_user`, removes new columns).
- I will NOT:
  - Force-logout existing mixed-provider users (5 accounts) — they get surfaced in admin panel for manual action.
  - Delete or merge any `auth.users` rows.
  - Build a parallel `identity_links` table — Supabase's `auth.identities` is the source of truth; we only annotate via profile columns.

## What I need from you

This plan ships in 4 PRs gated on your approval. To start I'll execute **Layer 1 (migration + auth config)** only. Reply "go" to proceed with Layer 1; I will pause and confirm before Layer 2.

## Files touched (full plan)

```
supabase/migrations/<ts>_oauth_takeover_layer1.sql      [new]
supabase/functions/auth-link-verify/index.ts            [new]
supabase/functions/signup-guard/index.ts                [edit]
supabase/functions/admin-utils/index.ts                 [audit]
src/hooks/useAuth.tsx                                   [edit, +20 lines]
src/pages/Login.tsx, src/pages/Signup.tsx               [edit, reason codes]
src/components/auth/VerificationOverlay.tsx            [edit, ownership variant]
src/pages/admin/SecurityUsers.tsx                       [edit, new panel section]
scripts/security/oauth-takeover-rollback.sql            [new]
mem/security/oauth-account-linking-hardening.md         [new]
mem/security/account-ownership-model.md                 [new]
mem/index.md                                            [edit, +2 links]
```

Total: ~13 files, 1 migration, 1 new edge function. No `auth.users`/`auth.identities` schema mutations.
