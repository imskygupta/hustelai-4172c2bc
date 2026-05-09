# Telegram Delivery Infrastructure + Export Center

Telegram evolves from "notifications only" into a transport layer for **notifications, auth confirmations, export delivery, and async job completions**. Storage stays in Supabase (Storage + Postgres). Telegram is *never* the source of truth.

---

## 1. Database (new migration)

### `generated_exports`
Source of truth for every file we hand back to a user (PDF, CSV, ZIP, AI export, doc, roadmap, etc).
- `id`, `user_id`, `tier_at_creation`
- `export_type` (e.g. `roadmap_pdf`, `resume_pdf`, `invoice_pdf`, `ai_chat_export`, `workspace_doc`, `data_export`)
- `title`, `mime_type`, `size_bytes`
- `storage_bucket`, `storage_path` (in `exports` bucket — new, private)
- `visibility` (`private` | `unlisted` | `team`)
- `status` (`pending` | `ready` | `delivered` | `expired` | `revoked` | `failed`)
- `telegram_message_id`, `telegram_chat_id`, `delivered_at`
- `expires_at` (free: now()+24h, pro+: NULL = persistent)
- `metadata` jsonb (source feature, params, ai usage)
- `created_at`, `updated_at`
- RLS: owner read/update; service role full.

### `export_download_tokens`
Single-use / scoped signed links.
- `id`, `export_id` -> generated_exports
- `token` (random 32-byte url-safe), unique
- `user_id` (intended recipient; NULL = anyone with token within scope)
- `expires_at`, `max_uses` (default 1), `use_count`
- `requires_otp` bool, `otp_hash` nullable
- `revoked_at` nullable
- `created_at`
- RLS: owner read; insert/use via edge function only.

### `export_access_logs`
Audit trail of every download attempt.
- `id`, `export_id`, `token_id` nullable, `user_id` nullable
- `ip`, `user_agent`, `outcome` (`ok` | `expired` | `revoked` | `wrong_user` | `bad_otp` | `not_found`)
- `created_at`
- RLS: owner read only.

### Storage bucket: `exports` (private)
- RLS: owner can read own files; writes via service role only.
- Free-tier sweeper deletes objects + rows when `expires_at < now()`.

### `pg_cron` (or scheduled edge fn fallback)
- `cleanup-expired-exports` — runs hourly: marks expired, removes storage objects for free tier.

---

## 2. Edge functions

### `export-create` (called by other features)
Internal helper invoked from server code (and other edge functions) when something is generated.
- Input: `{ user_id, export_type, file (base64) | storage_path, title, mime_type, deliver_to_telegram?: bool }`
- Computes `expires_at` based on tier (free=24h, pro/elite/infinity=NULL).
- Uploads to `exports` bucket if file payload provided.
- Inserts `generated_exports` row.
- Optionally enqueues Telegram delivery.
- Returns `{ export_id, download_url }`.

### `export-issue-token`
- Input: `{ export_id, expires_in?, requires_otp?, max_uses? }`
- Validates ownership. Creates `export_download_tokens` row. Returns share URL `{baseUrl}/d/{token}`.

### `export-download` (public, no JWT)
- Path: `/d/:token` (also accepts `?otp=`)
- Validates token (not revoked, not expired, under max_uses).
- If `requires_otp`, validates against `otp_hash`.
- If `user_id` set, requires authenticated session matching it (else logs `wrong_user`).
- Logs to `export_access_logs`.
- Increments `use_count`, then redirects to short-lived signed Storage URL (60s).

### `export-revoke`
- Owner revokes a token or whole export. Sets status, deletes storage if free.

### `export-deliver-telegram`
- Resolves user's connected `telegram` integration.
- For files <= 50MB: uses `sendDocument` via Bot API with our private signed URL or direct upload.
- For larger: sends a message with the secure share link only.
- Stores `telegram_message_id` and updates `delivered_at`.
- Fire-and-forget; failures captured in `notification_deliveries`.

### `telegram-webhook` (extend existing)
Add command handlers (text starts with `/`):
- `/files [n]` — last 10 exports w/ inline buttons (Download, Revoke).
- `/latest` — most recent export.
- `/exports` — same as `/files` (alias).
- `/connect <token>` — already exists.
- `/disconnect` — already exists (`/stop`).
- `/security` — shows last 5 security events from `notification_events` where category=`security`.
- `/plan` — current tier + usage caps + upgrade link.
- `/help` — list commands.
- Inline button callbacks (`callback_query`): `dl:<export_id>`, `rev:<export_id>` — issue fresh single-use token / revoke.

Add `inline_keyboard` rendering helper to `_shared/notifications/telegram.ts`.

---

## 3. Wiring existing flows into export pipeline

Non-invasive: add a small helper `_shared/exports/createExport.ts` and call from:
- `src/lib/blueprint-print.ts` and `roadmap-print.ts` PDF flows (client posts the rendered PDF to `export-create` with `deliver_to_telegram=true`).
- `workspace-docs/export-pdf.ts`.
- `resume-optimizer` PDF generation.
- AI chat / Hustlebot "export conversation".
This phase: implement helper + wire **two** flows (roadmap PDF + workspace doc PDF) to prove the path. Others can be added later without architectural change.

---

## 4. Frontend

### Export Center page — `/settings/exports`
- Lists `generated_exports` for user, filter by type/status, search by title.
- Each row: title, type badge, size, created, status, expiry countdown for free users, action menu (Download, Share link, Send to Telegram, Revoke, Delete).
- "Share" opens dialog — choose expiry, OTP toggle, single-use vs multi-use → calls `export-issue-token`, shows copyable link + QR.
- Free-tier banner: "Files expire in 24h. Upgrade to keep them forever."
- Empty state with link to features that produce exports.

### Settings architecture (sidebar reorg) — `/settings/*`
Routes (most exist; add shell + missing pages, no logic changes to existing):
- `/settings/profile` (existing Profile tab content)
- `/settings/account` (email, password, sessions, delete)
- `/settings/billing` (existing)
- `/settings/integrations` (existing)
- `/settings/ai-workspace` (AI keys, model prefs, memory toggle — wraps existing AISettings)
- `/settings/privacy` (data export request, deletion, security log)
- `/settings/exports` (NEW)
Add `SettingsLayout` with left nav. Old routes redirect to new ones.

### Public download page — `/d/:token`
- Lightweight page that calls `export-download` (or just `<a>` redirect via the function). Renders OTP input if required, shows file metadata, "Download" button. Auto-redirects when ready. Uses brand styling (zinc/emerald palette per existing pages).

### NotificationCenter
- Add new event types `export_ready`, `export_delivered` rendering with link to `/settings/exports`.

---

## 5. Tier behaviour summary

| Capability | Free | Pro / Elite / Infinity |
|---|---|---|
| Generate file | ✅ | ✅ |
| Telegram delivery | ✅ | ✅ |
| Persistent storage | ❌ (24h) | ✅ |
| Export center history | metadata only, 7d | ✅ full |
| Searchable exports | ❌ | ✅ |
| Share links w/ OTP | ❌ | ✅ |
| Multi-use links | ❌ | ✅ |
| AI workspace archive | ❌ | ✅ |

Enforced in `export-create` (`expires_at`) and `export-issue-token` (rejects OTP/multi-use for free).

---

## 6. Security

- All bucket access goes through edge fn → short-lived signed URL.
- Tokens are 32 bytes from `crypto.getRandomValues`, base64url.
- `requires_otp` stores `sha256(otp + token)`; OTP shown to owner once on creation.
- `export_access_logs` populated on every download attempt for audit + `/security` Telegram command.
- Rate-limit `export-download` by IP (in-memory bucket per fn instance + audit log).
- Telegram webhook: continue using HTTPS endpoint; commands are user-scoped via `chat_id` lookup in `notification_integrations`.

---

## 7. Out of scope this phase
- Wiring **every** existing PDF flow (only roadmap + workspace doc this round).
- Telegram file uploads >50MB direct (Bot API limit; we link instead).
- Discord/Slack delivery providers (interface stays provider-agnostic; add later).
- AI workspace archive UI (table + writes only; UI later).

---

## Files

**Created**
- `supabase/migrations/<ts>_export_infrastructure.sql`
- `supabase/functions/export-create/index.ts`
- `supabase/functions/export-issue-token/index.ts`
- `supabase/functions/export-download/index.ts`
- `supabase/functions/export-revoke/index.ts`
- `supabase/functions/export-deliver-telegram/index.ts`
- `supabase/functions/cleanup-expired-exports/index.ts`
- `supabase/functions/_shared/exports/createExport.ts`
- `src/pages/settings/SettingsLayout.tsx`
- `src/pages/settings/Exports.tsx`
- `src/pages/settings/Account.tsx`
- `src/pages/settings/Privacy.tsx`
- `src/pages/settings/AIWorkspace.tsx`
- `src/pages/Download.tsx` (public `/d/:token` page)
- `src/lib/exports/api.ts` (client helper)

**Edited**
- `supabase/functions/telegram-webhook/index.ts` — commands + callback_query
- `supabase/functions/_shared/notifications/telegram.ts` — `sendDocument`, inline keyboards
- `supabase/functions/_shared/notifications/dispatcher.ts` — `export_ready` channel routing
- `src/App.tsx` — new routes, redirects
- `src/components/NotificationCenter.tsx` — new event types
- `src/lib/roadmap-print.ts`, `src/lib/workspace-docs/export-pdf.ts` — call `export-create`
- `supabase/config.toml` — none (telegram-webhook already public)

---

Approve to implement, or tell me what to drop/change.