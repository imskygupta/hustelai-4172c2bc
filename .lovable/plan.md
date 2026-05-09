## Telegram Delivery + Notification Infrastructure — Phase 2

Most backend pieces from the previous pass are already in place (`export-cache-telegram`, `export-deliver-telegram`, `export-tg-deeplink`, `notifications-connect`, `generated_exports` schema with `telegram_file_id`/`delivery_method`/`download_count`). With `TELEGRAM_STORAGE_CHANNEL_ID` now set, this phase wires the cache path end-to-end, adds admin tooling + UPI alerts, and ships the SaaS UX polish across Profile/Integrations/Settings.

### 1. Storage cache wiring (backend)
- `_shared/exports/createExport.ts`: after a row is inserted with a `storage_path`, fire-and-forget invoke `export-cache-telegram` so every new export gets cached to the storage channel automatically.
- `export-deliver-telegram`: already has fast-path via `telegram_file_id`; add a small "ensure cached" step after slow-path upload (already partly done — verify and tighten).
- New edge function `export-storage-cleanup` (cron-ready): deletes Supabase storage objects for rows where `telegram_file_id IS NOT NULL` AND tier is `free` AND `expires_at < now()`. Keeps DB row + Telegram file as the durable copy. (Cron wiring left for a follow-up insert; function is ready to call manually.)

### 2. Telegram binding security
- `notifications-connect` already issues a one-time `connect_token` with 15-min TTL → deep link to bot.
- `telegram-webhook` `/start <token>` handler: enforce single-account-per-user (reject if `provider_chat_id` already linked to a different user), set `status=connected`, send verification confirmation.
- Add `/disconnect` and `/status` bot commands.

### 3. UPI / manual payment admin alerts
- New edge function `payment-admin-notify` invoked from existing UPI/manual review submission flow:
  - Sends Telegram message to `TELEGRAM_ADMIN_CHAT_ID` with user email, amount, plan, payment ref, and inline keyboard buttons `Approve` / `Reject`.
  - Callback queries handled in `telegram-webhook` → updates payment row status, notifies user via their own Telegram (if linked) or email.
- Frontend: payment status page already says "under verification" — add a subtle Telegram-routing trust line.

### 4. Admin panel upgrades
- New page `src/pages/admin/TelegramOps.tsx` (linked from AdminDashboard):
  - Feature toggle (writes to existing `feature_flags`).
  - Delivery monitoring table (recent `generated_exports` with delivery_method, status, retry button → re-invoke `export-deliver-telegram`).
  - Failed delivery retry, manual cleanup trigger, export + notification analytics counts.

### 5. Profile / Settings / Integrations UX polish
- `src/pages/settings/Integrations.tsx`: redesign Telegram card — connection state pill, deep-link CTA, last verified, delivery preferences toggles (exports / payments / workspace / AI completions), disconnect button.
- `src/pages/settings/Profile.tsx`: phone number field gated for free tier (disabled with "Upgrade to Pro" hint).
- `src/pages/settings/Exports.tsx`: surface "Cached on Telegram" badge + "Resend instantly" action (already wired to `export-deliver-telegram` fast path).
- `src/components/settings/SettingsLayout.tsx`: tighten spacing, add status dots already in place — refine.
- Empty states + skeleton loaders across Exports / Integrations / Notifications.

### 6. Tier gating
Centralized in `src/lib/tier-gates.ts` (new): `canPersistentExports`, `canPriorityDelivery`, `canPhoneNumber`, `canAdvancedRouting`. Used in UI for badges + disabled controls. Backend continues to enforce via existing `consume_export_quota`/`PERSISTENT_TIERS` set.

### 7. Marketing sync
Already done in last pass (`InfrastructureSections`, `TrustStrip`, Pricing rewrite). This phase adds a dedicated `/integrations/telegram` marketing landing pulling from the same components, so SEO + footer link land on a clear page.

### Out of scope (untouched)
- Dodo webhook handler internals
- Auth / signup / OTP flow
- Existing payment-state machine

### Files
**New**: `supabase/functions/export-storage-cleanup/index.ts`, `supabase/functions/payment-admin-notify/index.ts`, `src/pages/admin/TelegramOps.tsx`, `src/lib/tier-gates.ts`, `src/pages/marketing/TelegramLanding.tsx`
**Edit**: `supabase/functions/_shared/exports/createExport.ts`, `supabase/functions/telegram-webhook/index.ts`, `supabase/functions/export-deliver-telegram/index.ts`, `src/pages/settings/Integrations.tsx`, `src/pages/settings/Profile.tsx`, `src/pages/settings/Exports.tsx`, `src/components/settings/SettingsLayout.tsx`, `src/pages/AdminDashboard.tsx`, `src/App.tsx`

No DB schema changes required — the previous migration already added all needed columns.
