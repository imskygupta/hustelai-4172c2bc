# HustleAI Stabilization + UX Restoration Sprint

This is a large multi-phase sprint touching async delivery, notifications, auth UX, and the Explore/generation engine. Before I implement, I need to confirm scope and audit a few systems — going in blind risks breaking production flows (export queue, websocket hydration, Explore template engine).

## Sprint 1 — Operational Fixes (highest priority)

### 1A. Telegram routing hardening
- **Centralize delivery routing** in a single `resolveDeliveryTarget(user, export)` helper used by `export-create`, `export-deliver-telegram`, `export-cache-telegram`, and the shared `createExport.ts`.
- **Hard guard**: never enqueue TG delivery when `plan === "free"` OR `telegram_connected === false`. Today `createExport.ts` fires `export-cache-telegram` for everyone and `export-create/index.ts` re-fires it again — both need the guard.
- **Free users**: browser download + in-app completion only. Strip `deliver_to_telegram` server-side rather than trusting the flag.
- **Paid users**: keep TG sync, async delivery, large-file relay.
- **Idempotency**: dedupe export jobs by `(export_id, delivery_target)` so retry storms can't enqueue duplicate TG jobs for dead paths.

### 1B. Notification resurrection fix
- **Schema**: add `dismissed_at`, `read_at`, `client_hidden` to `workspace_notifications` (and the legacy `notifications` table if it backs export events).
- **Event producer**: notification creation must upsert on `(user_id, dedupe_key)` where `dedupe_key = "export:<export_id>"`. If a row exists with `dismissed_at IS NOT NULL`, do NOT recreate or clear the flag.
- **Frontend** (`NotificationCenter.tsx`, `NotificationPopup.tsx`): respect `dismissed_at`/`client_hidden` on every realtime merge and poll refresh. Today `NotificationPopup` already uses localStorage for dismissal — migrate that to server-side so it survives reloads and devices.
- **Audit**: export completion event emitter, async queue replay, websocket hydration reducer.

## Sprint 2 — Auth UX

### 2A. Email verification full-screen modal
- Replace `EmailVerificationBanner` (small destructive banner) with a full-screen centered modal: blurred backdrop, branded illustration, large heading "Verify your email to activate your workspace", resend with countdown timer, spam-folder reminder, animated success state, mobile responsive.
- Keep existing `supabase.auth.resend()` call and `AUTH_EMAIL_REDIRECT_TO` — UI swap only.
- Audit all call sites of the old banner and toast-style auth confirmations; route them through the new modal.

## Sprint 3 — Explore + Generation Engine

### 3A. Remove dead marketing structure
- Audit current Explore page for static featured content, marketing blocks, repetitive template cards, dead discovery sections — remove.

### 3B. Restore dynamic generation engine
- Replace `loadSavedTemplates()` path with `generateSuggestionsFromPrompt()` calling Lovable AI Gateway (`google/gemini-2.5-flash` for low-latency suggestions, escalate to `gemini-2.5-pro` for roadmap synthesis).
- Inference inputs: user prompt + workspace content + exports + niche + connected tools + prior roadmap graph + operational gaps.

### 3C. New Explore structure (3 dynamic sections)
- **Continue Building** — unfinished systems, expandable workflows, recent generations, roadmap continuations, operational follow-ups. Sourced from existing workspace/roadmap/export tables.
- **AI Suggestions** — dynamically generated, not hardcoded.
- **Operational Packs** — AI-generated contextual packs (Freelancer OS, Agency Ops, Creator Pipeline, Lead Gen, CRM Automation), not static cards.

## What I need from you before I start

This sprint touches 25+ files across 4 unrelated subsystems. To avoid a wedged half-done state, I'd like to confirm:

1. **Sprint sequencing** — ship Sprint 1 (Telegram + notifications) end-to-end first, then return for Sprints 2 and 3 in follow-up turns? Or batch everything into one giant patch?
2. **DB migrations OK?** Sprint 1B and 3C need schema additions (`dismissed_at`, `read_at`, `client_hidden`, possibly a `delivery_target` column on the export jobs table). You said "preserve existing DB compatibility wherever possible" — confirming additive columns are acceptable.
3. **Explore page entry point** — which route is "Explore" today? I see `src/pages/seo/*`, no `Explore.tsx`. Is it `WorkspaceLanding`, `dashboard/AutomationsHub`, or somewhere else? Need the file before I rewrite it.
4. **Free-tier export delivery** — do free users currently have ANY async path, or is it strictly synchronous browser download? (Affects whether I keep the async export job row for free users at all, or short-circuit to inline response.)

Recommended sequencing: **Sprint 1 first** (these are active production bugs causing ghost notifications and trust degradation), confirm green, then Sprint 2, then Sprint 3 (largest scope, needs the Explore file pointer).