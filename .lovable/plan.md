# Security Patch — OAuth Pre-Account Takeover

## Current state (audited)

- **Supabase Auth** is the identity store. `auth.identities` already maps by `provider + provider_id` (subject), not email — so OAuth itself does not link by email alone. The takeover surface is at the **edges around it**.
- **Email signup**: `Signup.tsx` calls `supabase.auth.signUp`. `signup-guard` edge function validates policy but does not enforce verification before profile hydration.
- **`handle_new_user` trigger** inserts into `public.profiles` immediately on `auth.users` insert — **before** email verification. This is the main pre-takeover hydration path: an attacker creates an unconfirmed row using a victim's email, our `profiles` row exists, and any later Google login that Supabase auto-links would inherit it.
- **Auth config**: need to confirm `auto_confirm_email = false` and that Supabase `Allow manual linking` / automatic linking flags are set safely. Currently 53/55 users are email-confirmed (2 unconfirmed in the wild).
- **No duplicate emails** in `auth.users` today (good). 5 accounts already have both `email` + `google` identities — these are the historical auto-link cases we must audit.
- **No identity-link table** of our own; we rely entirely on Supabase. That's actually correct — we should **not** build a parallel identity table, we should harden the boundary.

## Root cause

Profile + downstream rows (wallet, roles, workspace memberships) are provisioned on `auth.users` INSERT, regardless of whether the email is verified. Combined with Supabase's default behavior of attaching a later OAuth login to an existing same-email account when both sides are verified, an attacker who pre-registers an unconfirmed email/password account can have their `profiles` row promoted to the victim once the victim signs in with Google.

## Patch strategy (4 layers)

### Layer 1 — Auth config (immediate, reversible)
- `configure_auth`: ensure `auto_confirm_email = false`, `password_hibp_enabled = true`, `disable_signup = false`, `external_anonymous_users_enabled = false`.
- Document the required Cloud setting: **Authentication → Account Linking → Manual only** (cannot be set via tool; surface a one-click link in admin panel).

### Layer 2 — DB hardening (migration)
- Rewrite `handle_new_user` trigger so the `profiles` insert only fires when `NEW.email_confirmed_at IS NOT NULL` **OR** the provider is OAuth (Google identity always arrives pre-verified).
- Add a second trigger `AFTER UPDATE ON auth.users` that provisions the profile on the verification transition (`OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL`).
- Add `auth_identity_events` table in public schema (admin-only RLS) to log: provider attach, provider email change, password set after OAuth, collision attempts. Written from triggers on `auth.identities`.
- Add unique partial index `auth.users(lower(email)) WHERE email_confirmed_at IS NOT NULL` is not possible (auth schema is read-only) — instead enforce in our `signup-guard` by querying `auth.users` via service role and refusing signup when a **confirmed** account already exists for that email.

### Layer 3 — Edge function hardening
- `signup-guard`: before allowing signup, look up `auth.users` by email; reject if a confirmed account exists; reject if an unconfirmed account exists older than 24h (stale takeover bait).
- New edge function `auth-link-verify` invoked client-side after every successful sign-in to:
  1. Read `auth.identities` for the current user.
  2. If multiple providers present, require that **both** identity emails match AND both `email_verified` flags are true; otherwise force `signOut({scope:'global'})` and log a `provider_collision` event.
  3. Detect provider email drift (identity.email differs from users.email) → force logout, mark `requires_reauth`.
- All admin-created accounts (`admin-utils`) must set `email_confirm: false` and send a verification email — never bypass.

### Layer 4 — Detection + admin surface
- `/admin/security/auth-integrity` panel reading from new `auth_identity_events` plus a derived view `auth_integrity_summary`:
  - duplicate confirmed emails (should be 0)
  - mixed-provider accounts (5 today — flagged for review, not auto-action)
  - unconfirmed accounts > 24h
  - provider email mismatch
  - admin role assignments where target email is unconfirmed
- One-time backfill script (read-only report, no deletes) listing accounts created before the patch where profile hydration occurred pre-verification, so you can triage manually.

## What I will NOT do automatically
- **Not** force-logout all mixed-provider users. 5 accounts have both `email` + `google` — I'll list them in the admin panel with a "force re-auth" button; you decide.
- **Not** delete or merge any auth.users rows. Out of scope without explicit per-account approval.
- **Not** rotate refresh tokens globally. Will offer a per-user action in the panel.
- **Not** build a parallel `identity_links` table. Supabase `auth.identities` already keys on `(provider, provider_id)`; duplicating it would create drift. We log *events*, not identity-of-record.

## Migration safety
- All triggers wrapped so they fall back to the old behavior if the new path errors (no signup outage).
- New columns are additive only.
- Rollback: drop new triggers, restore the original `handle_new_user`, delete the events table. SQL kept in `scripts/security/oauth-takeover-rollback.sql`.

## Verification checklist (executed after patch)
1. Create unconfirmed email/password account for `victim+test@…` → assert no `profiles` row.
2. Sign in with Google as same address → assert single identity, `profiles` row created now, no link to the unconfirmed shell (which `signup-guard` should now have blocked entirely).
3. Existing mixed-provider users still log in normally.
4. Admin panel shows 0 duplicate confirmed emails, 5 historical mixed-provider, 2 unconfirmed.
5. `auth-link-verify` fires on every sign-in; logs visible in admin panel.

## Deliverable order (one PR per layer, gated on your approval)
1. Plan approval (this doc).
2. Layer 1 + Layer 2 migration.
3. Layer 3 edge functions + client wiring.
4. Layer 4 admin panel + report.

Total estimated diff: ~12 files, 1 migration, 2 new edge functions, 1 admin route.
