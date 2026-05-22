# Layer 4 — Final OAuth & Identity Hardening

Closes the remaining items after Layers 1–3. No new infra abstractions — extends existing tables, edge functions, and `/admin/security/users`.

## 0. Manual platform action (user-side, mandatory)

Surface a one-time instruction in the response:
**Cloud → Auth → Account Linking → Linking mode = Manual only.**
Lovable cannot toggle this via API; without it Supabase may silently auto-link identities under our logic.

## 1. DB migration — extend trust + audit model

Single migration adds:

- `profiles.verification_status` enum value: `restricted_security_review` (string column, no schema break).
- `profiles.provider_change_locked_until timestamptz`, `email_change_locked_until timestamptz`, `last_reauth_at timestamptz`, `password_enabled boolean default false`.
- `auth_anomaly_events.severity text` (`info|warn|critical`) + `retain_until timestamptz` (default `now()+90d`).
- `identity_conflict_queue` table: `id, user_id, kind, detected_at, resolved_at, resolver_admin_id, resolution, notes, evidence jsonb`. RLS: admin-only via existing `has_role(_,'admin')`.
- `rate_limit_buckets` table (`bucket text, key text, window_started_at timestamptz, count int, primary key(bucket,key)`) + `rl_hit(bucket,key,limit,window_seconds)` SECURITY DEFINER RPC returning `{allowed, retry_after}`.
- Trigger: when `password_enabled` flips false→true, write `auth_anomaly_events('password_enabled', critical)` and send security email.
- View `v_security_audit_summary` for the post-hardening audit (multi-provider emails, orphan password accounts, suspended shells, repeated collisions, same-IP shell bursts, OAuth→password transitions).

## 2. Edge function changes (no new functions)

- `auth-link-verify`:
  - On collision/mismatch/ownership dispute → set `verification_status='restricted_security_review'`, emit `oauth_collision_detected|provider_identity_mismatch|forced_session_revocation` at **critical** severity, enqueue admin alert + `identity_conflict_queue` row.
  - Call `rl_hit('auth_link_verify', user_id, 30, 60)`.
- `signup-guard`: wrap with `rl_hit('signup_guard', ip, 10, 60)` → 429 with `Retry-After`.
- `ownership-claim` path inside existing claim RPC: `rl_hit('ownership_claim', email, 5, 3600)`; on success set `provider_change_locked_until = now()+24h`, `email_change_locked_until = now()+24h`, require `last_reauth_at > now()-10min` else 401 `reauth_required`.
- `resend-verification` (existing): `rl_hit('resend_verify', email, 5, 3600)`.
- New helper `security-notify` (utility module imported by the above, **not a new public function**) → enqueues templated email via existing transactional queue for: new provider linked, ownership migration, session revoked, collision detected, password enabled, email changed.

## 3. Password reset hardening

- `password-reset-request` edge function (or existing flow): reject if `profiles.password_enabled = false` AND `auth_provider != 'password'` → respond `password_auth_not_enabled`.
- Frontend `ForgotPassword.tsx`: surface friendly copy + link to "Enable password login" inside Security tab.
- Setting a password for the first time requires recent reauth + emits `password_enabled` critical event + email.

## 4. Frontend — restricted state + security center

- `src/lib/auth/restriction.ts`: extend `trustState` to recognize `restricted_security_review`. Effects centralised: read-only, no AI, no exports, no settings mutations, no password reset, no email change.
- `VerificationOverlay.tsx`: new variant `security_review` with copy "Account under security review" + contact support CTA. No resend button in this variant.
- Gate hooks (`useCanRunAi`, `useCanExport`, `useCanMutateSettings`) read the new state.
- New page `src/pages/profile/SecurityCenter.tsx` mounted as **tab inside existing Profile → Security** (no new route):
  - Linked Login Methods list (provider, linked_at, last_used_at, unlink button → requires reauth modal).
  - Recent security events (last 30, from `auth_anomaly_events`).
  - "Enable password login" / "Change password" with reauth gate.
- Reauth modal component reused across unlink / password set / email change → writes `last_reauth_at`.

## 5. Admin — Identity Conflicts section

Extend existing `/admin/security/users` (no new route):
- New tab "Identity Conflicts" → table of `identity_conflict_queue` open items.
- Row actions: **Merge recommendation**, **Revoke sessions** (calls `revoke_user_sessions`), **Force ownership reset**, **Mark safe**.
- Audit timeline pulls from `auth_anomaly_events` filtered by `user_id`.
- Critical events pinned at top with red severity badge; 90d retention enforced by `retain_until`.

## 6. Memory & audit deliverables

- `mem/security/post-hardening-audit.md` — initial run of `v_security_audit_summary` snapshot + interpretation.
- Update `mem/security/account-ownership-model.md` with `restricted_security_review` state + cooldown semantics.
- Update `mem/security/oauth-account-linking-hardening.md` with rate limits, password-reset rule, notification matrix.
- Update `mem/index.md`.

## 7. Files touched (estimate)

- 1 migration
- 4 edge functions edited, 0 new public functions (1 shared util module)
- ~8 frontend files (restriction lib, overlay, gate hooks, SecurityCenter tab, ReauthModal, ForgotPassword copy, admin conflicts tab, types)
- 3 memory docs + index

## 8. Execution order

1. Migration (await approval)
2. Edge function updates + deploy
3. Frontend restriction + Security Center + Admin tab
4. Run audit, write `post-hardening-audit.md`
5. Surface manual "Manual Linking Only" instruction to user

## 9. Out of scope (per freeze rules)

- No new admin route
- No new telemetry layer (reuses `auth_anomaly_events`)
- No new DB extraction
- No new runtime shell
