---
name: Multi-bot Telegram architecture
description: HustleAI user bot vs SkyMedia admin bot — separate webhooks, command surfaces, allowlists, audit
type: feature
---
# Multi-bot Telegram

## Bots
- **HustleAI** (`@hustlaiapp_bot`) — user-facing. Token: `TELEGRAM_BOT_TOKEN`. Webhook: `telegram-webhook` edge fn. `role='user'`.
- **SkyMedia Ops** (`@theskymediabot`) — admin ops. Token: `SKYMEDIA_BOT_TOKEN`. Webhook: `skymedia-webhook` edge fn. `role='admin'`.

Tokens are NEVER in DB or frontend — only `telegram_bots.token_secret_name` references the env var.

## Authorization (admin bot)
1. `telegram_admin_users` row (enabled=true) for the sender's `telegram_chat_id`, OR
2. fallback env list `TELEGRAM_ADMIN_CHAT_IDS` (comma-separated).

Every command attempt is logged to `telegram_admin_audit` (allowed/denied + reason).

## Admin commands
`/runtime /flags /incidents /queues /aijobs /payments /exports /broadcast /maintenance /whoami /help`
- Destructive ops (`/broadcast`, `/maintenance`) use 2-step confirm via inline keyboard (`bcast_ok|bcast_no`, `maint_ok|maint_no`).
- Each command writes a `.result` audit row with the outcome JSON.

## Health/visibility (`/admin/communications/telegram` → Bots tab)
- `telegram-bot-health` calls both `getMe` and `getWebhookInfo`, persists `webhook_info`, `pending_update_count`, `webhook_last_checked_at`.
- `telegram-webhook-set` (admin-only) registers the correct webhook URL based on `username` (skymedia → `skymedia-webhook`, else `telegram-webhook`).
- Bots tab shows: webhook ok/warn/unset, pending updates, last command + time, runtime toggle, last_response.

## Runtime kill
`telegram_bots.runtime_enabled=false` makes the SkyMedia webhook short-circuit with a "disabled by operator" reply. Independent of `enabled` (which gates broadcasts/health UI).
