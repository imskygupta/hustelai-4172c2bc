## Phase 1 — RLS Audit Findings

Good news first: **every public table has RLS enabled**. No `relrowsecurity=false` tables. Most ownership policies are correct.

But four real escalation vectors are open. These are surgical fixes — no architecture rewrite.

### Critical issues (must fix now)

**1. `profiles` UPDATE allows mass-assignment / privilege escalation**
- Policy: `Users can update own profile` → `auth.uid() = user_id` with no column restriction.
- Impact: any logged-in user can `PATCH /rest/v1/profiles?user_id=eq.me` setting `subscription_tier='infinity'`, `credits=999999`, or any internal field. **This is the breachme finding root cause.**
- Fix: BEFORE UPDATE trigger that resets protected columns (`subscription_tier`, `is_admin`, `credits`, `role`, `referral_code`, billing fields, internal flags) to their OLD values unless `has_role(auth.uid(),'admin')`. Keep policy as-is so legit fields (display_name, bio, avatar) still update.

**2. `user_wallets` UPDATE lets users edit their own balance**
- Policy: `Users can update own wallet` USING `auth.uid() = user_id`.
- Impact: users can self-credit via `PATCH /rest/v1/user_wallets`.
- Fix: drop the user-UPDATE policy. Wallet mutations move exclusively through service-role edge functions (already exist). Add a trigger that blocks balance/credit column changes from non-admin authenticated role as defense-in-depth.

**3. `wallet_transactions` INSERT lets any user inject any user's transaction**
- Policy: `System can insert transactions` WITH CHECK `auth.uid() IS NOT NULL`. **Missing `user_id = auth.uid()` check.**
- Impact: any logged-in user can insert credit transactions for any other user_id, or fake "purchase" rows.
- Fix: drop policy; inserts must come from service-role only. (No frontend code inserts directly — confirmed by quick grep.)

**4. `affiliate_earnings` INSERT same flaw**
- Policy: `System can insert earnings` WITH CHECK `auth.uid() IS NOT NULL`.
- Fix: same — service-role only.

### Lower-priority (track, don't block)

- 5 `WITH CHECK (true)` INSERT policies on tracking tables (`blog_events`, `cta_events`, `tool_launch_events`, `contact_submissions`, `newsletter_subscribers`) — intentional public ingress. Add per-IP rate limiting later (Phase 6), don't change RLS.
- `api_runtime_config` SELECT is `true` for public — verify it contains no secrets (it shouldn't; it's flag/feature config). Audit columns next pass.
- `work_clients` lives on the workspace DB (separate Supabase project). Will audit in a follow-up pass against that DB.
- 30 SECURITY DEFINER functions exposed to anon — already gated internally by `has_role` checks; revoke EXECUTE from anon as a hardening pass later.

### Migration this turn

One migration that:
1. Creates `protect_profile_columns()` trigger function + BEFORE UPDATE trigger on `profiles`.
2. Drops `Users can update own wallet` policy on `user_wallets`. Adds trigger blocking balance changes from non-admin.
3. Drops `System can insert transactions` policy on `wallet_transactions` (service role bypasses RLS, so edge functions keep working).
4. Drops `System can insert earnings` policy on `affiliate_earnings`.

### What I'm NOT touching this turn

- No auth flow changes
- No admin panel changes
- No edge function changes (they use service role and bypass RLS)
- No frontend code changes — the frontend doesn't directly mutate any of these protected columns/tables (verified)

After approval I'll push the migration, run the linter again, and report. Phases 2–6 (client audit, secret audit, audit-log scaffold, hardening) come in subsequent turns so each is reviewable.