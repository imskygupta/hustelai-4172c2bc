# Telegram Delivery Layer + Exports V2

Evolve Telegram into a delivery/CDN layer (not primary storage) and polish the Exports + Settings experience. Supabase remains source of truth.

## 1. Database changes (additive migration)

Extend `generated_exports` with delivery/cache columns:
- `telegram_file_id text` — Telegram's reusable file handle
- `telegram_storage_message_id text` — message id in private storage channel
- `telegram_storage_channel_id text` — channel where the master copy lives
- `delivery_method text default 'supabase'` — `supabase | telegram | hybrid`
- `download_limit int` — null = unlimited
- `download_count int default 0`
- `last_accessed_at timestamptz`
- `is_favorite bool default false` (used by V2 UI)
- `tags text[] default '{}'`
- `watermarked bool default false`

Free-tier rule update: `expires_at = now() + 7 days` (was 24h). Paid tiers stay null/persistent.

Extend `notification_integrations` view usage (no schema change needed) — already stores provider_chat_id, provider_username.

Add column to `profiles`: `phone_number text`.

New helper function `consume_export_download(_export_id, _user_id)` — increments counter, enforces `download_limit`, updates `last_accessed_at`.

## 2. Telegram private storage channel

New env: `TELEGRAM_STORAGE_CHANNEL_ID` (admin-configured group/channel where bot is admin).

Edge function `export-cache-telegram`:
- Called after `export-create` for any export with a storage_path
- Uploads file to private storage channel via `sendDocument`
- Saves returned `file_id`, `message_id`, `channel_id` back to `generated_exports`
- Used as fast-path for repeat deliveries (re-send by `file_id` instead of re-uploading)

`export-deliver-telegram` updated:
- If `telegram_file_id` exists → `sendDocument` with `document: file_id` (zero re-upload)
- Else upload from Supabase signed URL, then cache the resulting `file_id`
- Free users: only Telegram delivery, link auto-expires in 7d, watermark flag set
- Paid: dual mirror (link + Telegram)

## 3. Deep-link auth flow

`/d/:token` already exists for browser downloads. Add:
- `export-tg-deeplink` edge function that returns `https://t.me/<bot_username>?start=dl_<token>`
- `telegram-webhook` `/start dl_<token>` branch:
  - Looks up token in `export_download_tokens`
  - Verifies the bound user owns the chat (notification_integrations)
  - Sends file via cached `file_id` or signed URL fallback
  - Increments `download_count`, sets `last_accessed_at`

## 4. Telegram bot commands (foundation)

Add command handlers in `telegram-webhook` (lightweight stubs that share one dispatcher):
- `/exports` → alias of `/files`
- `/resume` → most recent `export_type='resume'`
- `/history` → last 10 exports w/ status
- `/storage` → quota summary (count, total bytes, tier limits)
- `/verify` → echoes chat_id + username for support
- Existing `/files /latest /security /plan /disconnect /help` retained

Refactor command routing into a single `commands` map for scalability.

## 5. Export Center V2 (`/settings/exports`)

Rewrite UI:
- Sticky filter bar: search, type chip filters (resume/pdf/workspace_doc/...), status, "Favorites only"
- Card grid with: title, type icon, size, created, expiry badge (color by remaining time), delivery badges (Supabase / Telegram / Watermarked), download counter
- Per-card actions: Download · Send to Telegram · Copy Share Link · Toggle Favorite · Expire/Revoke
- Empty state + skeleton shimmer
- Recent activity strip from `export_access_logs`

## 6. Integrations page polish

- Connect Telegram CTA with status pill, username, chat_id (masked)
- Tier-gated panel: paid tiers show "Advanced automations" toggles (storage mirroring, deep-link auth, command access); free shows basic delivery only with upgrade nudge

## 7. Settings polish

- Add phone number field on Profile
- Tier badges next to gated settings (Workspace, API Keys, Advanced integrations)
- Integration status dots in sidebar items (Telegram connected, etc.)
- Better card spacing, responsive 1-col on <768px

## 8. Frontend API additions (`src/lib/exports/api.ts`)

- `toggleFavorite(id, value)`
- `getTelegramDeeplink(export_id)` → invokes `export-tg-deeplink`
- Filters/search params on `listExports`
- `recentAccessLogs(limit)`

## What stays untouched
Dodo webhook, UPI verify, admin payment lock, invoice emails, Telegram admin alerts. Strictly additive — no edits to those files.

## Files (new)
- `supabase/migrations/<ts>_exports_v2.sql`
- `supabase/functions/export-cache-telegram/index.ts`
- `supabase/functions/export-tg-deeplink/index.ts`
- `src/components/settings/ExportCard.tsx`
- `src/components/settings/IntegrationStatusPill.tsx`

## Files (edited)
- `supabase/functions/export-create/index.ts` — fire cache-telegram async
- `supabase/functions/export-deliver-telegram/index.ts` — file_id fast path, watermark + 7d for free
- `supabase/functions/telegram-webhook/index.ts` — deep-link branch + command map + new commands
- `supabase/functions/_shared/exports/createExport.ts` — 7-day TTL for free
- `src/lib/exports/api.ts` — new helpers
- `src/pages/settings/Exports.tsx` — V2 UI
- `src/pages/settings/Integrations.tsx` — tier-gated panel + status pill
- `src/pages/settings/Profile.tsx` — phone field
- `src/components/settings/SettingsLayout.tsx` — sidebar status dots

## Secret needed
`TELEGRAM_STORAGE_CHANNEL_ID` — will request after plan approval (user creates a private channel, adds bot as admin, forwards a message to @userinfobot to grab id).

Approve to proceed.