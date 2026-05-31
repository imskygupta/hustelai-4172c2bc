# Sprint: Email Reliability + Newsletter Launch

## Root cause found during audit (worth knowing before we build)

`send-welcome-email` is invoked **only from `src/pages/Signup.tsx`** (password signup + OTP verify paths).
**Google OAuth signups never go through that file** — they return via OAuth callback and land straight on the app. That is why `skycart65@gmail.com` got no welcome email. It is not a provider failure.

Second issue: `send-welcome-email` does not write to `email_logs`, so the admin can't see what happened either way.

Both are fixed in Part B below.

---

## Part B — Email Reliability + Admin Email

### B1. Universal email logging

- Patch `send-welcome-email` to insert into `email_logs` (sent / failed / skipped) with `template = "welcome"` and provider used (resend / smtp). No new table — we already have `email_logs`, `email_settings`, `mailing_provider_config`.
- Add a `welcome_email_dispatch(user_id, email, source)` SECURITY DEFINER RPC that:
  1. checks whether a `welcome` row already exists in `email_logs` for that email,
  2. if not, invokes `send-welcome-email` via service role,
  3. records the attempt.
  This makes welcome sending idempotent regardless of trigger source.

### B2. Welcome email for OAuth users (the actual fix)

- New tiny edge function `welcome-dispatch` (callable from the client right after `auth.getSession()` resolves with a Google OAuth user). It calls the RPC above. Idempotent — safe to call on every login; only fires once per user.
- Hook it into `src/contexts/AuthContext.tsx` (or wherever session is bootstrapped) on first session where `profiles.created_at` is within the last 5 minutes AND no welcome row exists.
- Keep the existing direct invokes in `Signup.tsx` as a fast path (still idempotent thanks to the RPC).

### B3. `/admin/email` dashboard

New page `src/pages/admin/EmailOps.tsx`, linked from Communications.

Sections, in order:

1. **Provider Health** — pings Resend (`GET /domains`) and Brevo (`GET /account`) via a new `email-provider-health` edge function, shows green/red + last successful send timestamp from `email_logs`.
2. **Delivery Dashboard (last 7d / 30d toggle)** — Total / Sent / Failed / Queued (from `email_logs`), broken down by template. Bounce % = failed / sent. No "opened" yet (no provider webhook wired — show "Coming with webhook").
3. **Recent Emails** — table: time, recipient, template, provider, status, error. Filters: status, template, search by recipient. Paginated 50/page. Dedupe by `message_id` per the dashboard guide.
4. **Retry Failed** — single-click retry for `status='failed'` rows; re-invokes the same template via `workspace-email`.
5. **Welcome Email Audit Strip** — banner at the top: "Last welcome email sent: X minutes ago" + "Users signed up in last 24h without welcome: N" → click to backfill.

Route: `/admin/email` (admin-only, reuse existing admin guard pattern).

### B4. Send Test button

Top of the dashboard: "Send test welcome to [input]" → invokes `send-welcome-email`. This is the acceptance test (`skycart65@gmail.com` retest).

---

## Part C — Minimal Newsletter (explicit consent)

### C1. Schema

Migration adds to `public.profiles`:
- `newsletter_enabled boolean NOT NULL DEFAULT false` (NEW signups default false — explicit consent)
- `newsletter_preferences jsonb DEFAULT '{}'::jsonb` (for future category granularity)

Existing users: left `false` (no auto-enrollment). Per your direction — we'll prompt them later, not now.

### C2. Signup UX

In `src/pages/Signup.tsx`: add an **unchecked** checkbox before the submit button:

> ☐ Keep me updated about product launches, tips, and weekly updates.
> *You can unsubscribe anytime.*

Bound state passed to `signUp(...)`; written to `profiles.newsletter_enabled` after user row exists.

### C3. Preference Center

New page `src/pages/settings/EmailPreferences.tsx`:
- Lifecycle emails (Welcome / Security / Billing) — shown as "Always on", not toggleable.
- Marketing toggles (master `newsletter_enabled`, plus category toggles in `newsletter_preferences`).
- Link from Settings nav and from email unsubscribe footer.

### C4. Campaign send screen (extend existing `Communications.tsx`)

Add a **Recipients** picker:
- `subscribed_only` (joins `profiles.newsletter_enabled = true`)
- `selected_users` (paste comma-separated emails)
- `imported_csv` (file upload, parsed client-side)

Send pipeline already blocks via the SQL filter — server-side the `workspace-email` function will additionally check `newsletter_enabled` before delivering anything marked `category='newsletter'`.

Add: **Send test**, **Preview** (already partly there via NewsletterOps), **Schedule** uses existing `newsletter_schedules` table.

### C5. Sunday-only rule

Add a guard in the dispatch path: if `category='newsletter'` and a campaign has already sent today AND today is not Sunday → refuse. (Existing pg_cron only fires Sunday so this is belt-and-braces for manual sends.)

---

## Out of scope (per your decision)

- Workspace integrations / OAuth (Google Workspace, Slack, Discord, etc.)
- Drip campaigns, journeys, segments, multi-template editor
- Open / click tracking webhooks (placeholder UI only — wiring deferred)
- Auto-enrollment of historical users (you said: do not)

---

## Acceptance test (run after Part B is in)

1. New signup with fresh email → welcome email arrives within 60s, logged in `email_logs` with provider=resend.
2. Google OAuth signup with fresh email → same, triggered via `welcome-dispatch`.
3. `/admin/email` → Send Test to `skycart65@gmail.com` → arrives, logged.
4. Force a failed send (invalid SMTP creds for a test category) → row appears in Failed tab → Retry button re-sends successfully.
5. Newsletter test send to one address → arrives.
6. `newsletter_enabled=false` user is excluded from a subscribed-only broadcast.

## Technical notes

- No new email provider — reuse `workspace-email` + `mailer-send` + `send-welcome-email` (Resend → SMTP fallback already exists).
- All new tables: none. We extend `profiles` and lean on existing `email_logs`, `email_campaigns`, `newsletter_subscribers`, `newsletter_schedules`.
- One migration: add 2 columns to `profiles` + the `welcome_email_dispatch` RPC.
- New edge functions: `welcome-dispatch`, `email-provider-health` (small, read-only).
- One new admin page (`EmailOps.tsx`) and one new user page (`EmailPreferences.tsx`).
