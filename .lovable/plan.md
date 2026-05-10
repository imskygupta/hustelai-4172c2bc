# AI-Curated Newsletter Automation

Build a lean newsletter pipeline: **capture → AI draft → admin approval → multi-provider send**, plugged into existing workflows + async-job infra. Telegram-channel ready, no auto-send.

## 1. Database (single migration)

New tables (all RLS-enabled, audited):

- `newsletter_subscribers` — `email` (unique), `user_id?`, `status` (`pending|active|unsubscribed|suppressed|bounced`), `source` (`onboarding|exit_intent|scroll|footer|manual|signup`), `tags text[]`, `confirmed_at`, `unsubscribed_at`, `last_sent_at`, `engagement_score`.
- `newsletter_issues` — weekly drafts. Fields: `slug`, `subject`, `preheader`, `status` (`draft|generating|ready|approved|scheduled|sending|sent|failed|rejected`), `sections jsonb` (array of `{id,title,kind,body_md,sources}`), `generated_by` (`ai_job_id`), `provider` (`brevo|mailersend`), `channel` (`email|telegram|both`), `scheduled_at`, `sent_at`, `approved_by`, `rejected_by`, `reject_reason`, `model`, `cost_units`, `metadata`.
- `newsletter_sends` — per-recipient delivery row (idempotent on `issue_id+subscriber_id`): `provider`, `provider_message_id`, `status` (`queued|sent|failed|bounced|opened|clicked`), `error`, `sent_at`, `opened_at`, `clicked_at`.
- `newsletter_capture_dismissals` — anonymous + user dismiss persistence (`anon_id` cookie or `user_id`, `surface`, `dismissed_at`).

RLS:
- Subscribers: insert open (capture); select/update only owner via `user_id` or admin.
- Issues / sends / dismissals: admin-only writes; subscribers table reads admin-only except own row.

Helper RPCs:
- `newsletter_create_draft(_subject text, _sections jsonb)` → returns issue id (admin only).
- `newsletter_mark_approved(_issue uuid)` (admin only, sets `approved_by`, `status=approved`).
- `newsletter_dispatch_counts(_issue uuid)` → `{queued, sent, failed}` for admin live view.

## 2. Edge Functions

All deployed under `supabase/functions/`:

- `newsletter-subscribe` — public, validates email (Zod), upserts `newsletter_subscribers`, dedupes, sets source. Returns `{ok}`. CORS open.
- `newsletter-unsubscribe` — token-based one-click unsubscribe (signed token using `SUPABASE_JWT_SECRET`-style HMAC). Marks status `unsubscribed`.
- `newsletter-generate` — admin-gated. Enqueues an `ai_job` of kind `newsletter_digest` with structured prompt covering: AI trends, creator economy, freelancing, automation, HustleAI updates, tool picks, opportunities. On completion (handled in `ai-job-runner`), inserts a `newsletter_issues` row with `status=ready`.
- `newsletter-regenerate-section` — admin-gated. Re-runs a single section through Lovable AI Gateway, replaces the section in `sections` jsonb.
- `newsletter-send-test` — admin-gated. Sends one email to a provided test address via the chosen provider.
- `newsletter-dispatch` — admin-gated. Reads approved issue, expands recipients (`status=active`), enqueues `newsletter_sends` rows, then drains in batches calling Brevo (default) or MailerSend through their existing client patterns. Honors suppression.
- `newsletter-telegram-digest` (optional, stub) — same issue, sends Markdown digest to subscribed Telegram users via existing `telegram-send` infra.

`ai-job-runner` extension: add `newsletter_digest` kind handler → calls Lovable AI Gateway with structured JSON output (sections array), then inserts the issue row using service role.

## 3. Workflow Wiring

- New workflow event `newsletter.weekly_cron` (Sunday 09:00 IST) → enqueues an AI job via `enqueue_ai_job` for `newsletter_digest`.
- New workflow event `newsletter.draft_ready` (emitted by `ai-job-runner` after insert) → notifies admins (existing `notification_deliveries` + Telegram admin chat).
- New workflow event `newsletter.approved` → triggers `newsletter-dispatch` automatically once admin approves (still manual approval, dispatch is post-approval).
- pg_cron job (using `supabase--insert`) hits `workflow-event-emit` weekly with name `newsletter.weekly_cron`.

## 4. Capture UX (frontend, mobile-safe)

New component: `src/components/newsletter/NewsletterCapture.tsx`
- Variants: `inline-footer`, `bottom-sheet` (mobile), `modal` (desktop), `toast`.
- Triggers via `src/lib/newsletter/triggers.ts`:
  - `onboarding` step (post-signup checklist).
  - Time-on-site ≥ 60s.
  - Scroll depth ≥ 60%.
  - Exit-intent (desktop only, `mouseleave` toward top).
- Dismiss persistence: `localStorage` key `nlc:dismissed:<surface>` + server row in `newsletter_capture_dismissals` for logged-in users.
- Copy: "Get the weekly AI freelance & creator brief. No spam, unsubscribe anytime."
- Animations: subtle fade-up (Framer-style classes already in project), auto-close after success, respects `prefers-reduced-motion`.
- Mobile: `vaul` Drawer for the bottom-sheet variant; safe-area padding.
- Footer wiring: replace existing newsletter input in `src/components/Footer.tsx` with the new component (inline variant).

## 5. Admin Panel

New page: `src/pages/admin/NewsletterOps.tsx` mounted under existing `/admin/communications/newsletter`.

Tabs:
1. **Drafts** — list `newsletter_issues` filtered by `draft|generating|ready`. Each row → preview drawer with markdown render, regenerate-section buttons, edit-in-place subject/preheader/body, "Send test", "Approve & Schedule", "Reject".
2. **Scheduled & Sent** — past issues with stats (queued/sent/failed, open rate placeholder).
3. **Subscribers** — searchable table, status filters, manual add, bulk unsubscribe, source breakdown.
4. **Automation** — cron toggle, provider routing (transactional → MailerSend, newsletter → Brevo), next-run countdown, last AI cost.
5. **Telegram digest** — toggle channel, list opted-in users (stub).

Reuses existing admin shell + RLS; no new auth surface.

## 6. Provider Routing

`src/lib/newsletter/providers.ts` — single dispatcher:
- `transactional` → MailerSend (uses existing `MAILERSEND_API_KEY`).
- `bulk_newsletter` → Brevo (uses existing `BREVO_API_KEY`).
- Selectable per-issue in admin UI; default Brevo for newsletters.

## 7. UX / Async Integration

- New AI job kind `newsletter_digest` registered in `KIND_LABELS` + `KIND_HREF` in `src/lib/async-activity/hook.ts` so admins see generation in the global activity indicator.
- `newsletter-dispatch` writes per-batch progress to a small `newsletter_dispatch_runs` row (re-uses `ai_jobs` only if cleaner; otherwise lightweight table).
- Failed sends visible in admin Drafts tab with one-tap retry (same pattern as the async retry actions just shipped).

## 8. What is NOT in this plan

- No new email provider added.
- No segmentation engine, A/B testing, or campaign builder.
- No realtime websockets — polling reuse.
- No Telegram-only auto-send — Telegram is opt-in, manually approved per issue.
- No resumable workflow engine.

## 9. Memory Updates

After ship: add `mem://features/newsletter-automation` covering pipeline, approval rule, provider routing, and Sunday cron. Update index.

## 10. Rollout Order

1. Migration (tables + RLS + RPCs).
2. Edge functions: subscribe, unsubscribe, generate, regenerate-section, send-test, dispatch.
3. AI-job-runner `newsletter_digest` handler + workflow events + Sunday cron.
4. Frontend capture component + footer integration + trigger hook.
5. Admin Newsletter Ops page + nav entry.
6. Memory update + manual end-to-end check via `curl_edge_functions`.
