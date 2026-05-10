---
name: Newsletter Automation
description: AI-curated weekly digest pipeline with mandatory admin approval before send
type: feature
---
- **Subscribers**: `newsletter_subscribers` (extended with `status`, `user_id`, `engagement_score`). Public opt-in via `newsletter-subscribe` edge function (validated, dedupe, re-activates).
- **Issues**: `newsletter_issues` holds sectioned drafts. Status flow: draft → ready → approved/scheduled → sending → sent (or rejected/failed). Admin-only RLS.
- **Dispatch log**: `newsletter_sends` per-recipient (idempotent on issue+subscriber), with retry support.
- **Approval gate**: `dispatch_issue` action in `brevo-newsletter` REFUSES anything not in status `approved`/`scheduled`. Use RPCs `newsletter_approve_issue` / `newsletter_reject_issue`.
- **AI generation**: `brevo-newsletter` action `generate_sections` produces 7-section JSON digest (AI trends, creator economy, freelancing, automation, HustleAI updates, tools, opportunities) via Lovable AI Gateway (gemini-2.5-flash). Single section regeneration via `regenerate_section`.
- **Provider routing**: Brevo for bulk newsletter; MailerSend reserved for transactional. Don't add new providers.
- **Capture UX**: `NewsletterCapture` component (inline + popup variants, vaul drawer on mobile). `NewsletterCaptureAutoTrigger` fires on time-on-site (60s), scroll depth (60%), or exit-intent (desktop only). Dismiss persistence via `localStorage` + `newsletter_capture_dismissals`. Footer uses inline variant.
- **Channel-agnostic**: `channel` column supports `email|telegram|both` for future Telegram digest.
- **Global auto-trigger**: `NewsletterCaptureAutoTrigger` is mounted in `App.tsx` (inside `BrowserRouter`). Suppressed on `/admin`, `/payment`, `/onboarding`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/unsubscribe`, `/workspace-os`, `/workspaces`, `/hustle-canvas`, `/hustlebot`, `/work/`, `/intake/`, `/_preview` to avoid interrupting sensitive flows.
- **Admin Ops UI**: `/admin/communications/newsletter` (`NewsletterOps.tsx`). Tabs: Draft queue, Approved, Sent, Failed, Subscribers. Inline section editing + per-section regeneration; preview, send-test, approve/reject, dispatch, retry-failed.
- **Sunday auto-draft**: pg_cron job `newsletter-weekly-draft` runs Sundays 03:30 UTC (09:00 IST) → calls `brevo-newsletter` action `weekly_cron`. Generates a `ready` issue, emits `newsletter.draft_ready` workflow event, and sends a Telegram admin alert. NEVER auto-sends.
