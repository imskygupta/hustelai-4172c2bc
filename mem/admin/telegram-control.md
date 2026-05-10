---
name: Telegram Control Center
description: Admin DB-driven telegram bots, routes, commands, broadcasts, link tokens at /admin/telegram-control
type: feature
---
# Telegram Bot Control Center

Route: `/admin/telegram-control` (admin-only). Existing `/admin/telegram` (TelegramOps) stays for export delivery monitoring — these are sibling pages.

## DB tables (primary)
- `telegram_bots` — registry. Tokens stored as Lovable Cloud secret names (e.g. `TELEGRAM_BOT_TOKEN`, `SKYMEDIA_BOT_TOKEN`); never in DB.
- `notification_routes` — `event_pattern` (`payment.*`, `export.failed`, …) → `channel` + `target_bot_id` + `severity_min`. Read by `event-dispatcher`; falls back to in-code `FALLBACK_SUBSCRIPTIONS` if empty.
- `telegram_link_tokens` — secure 10-min one-time tokens via `issue_telegram_link_token(_user)` / `consume_telegram_link_token(_token)` RPCs.
- `telegram_commands` — DB-driven command registry (tier-gated, admin/beta flags, rate limits, handler_key).
- `broadcast_jobs` — queued tier-targeted broadcasts; sent by `telegram-broadcast` edge fn (50ms gap, sequential, status updated atomically).

## Edge functions
- `telegram-bot-health` — admin-only `/getMe` ping; updates bot status + last_ping_at. Token never returned.
- `telegram-broadcast` — admin-only; resolves audience from `profiles.subscription_tier` + `telegram_chat_id`, sends, updates `broadcast_jobs.{sent_count,failed_count,status}`.
- `event-dispatcher` — now reads `notification_routes` first, falls back to in-code list.

## Linking flow
Client calls `issue_telegram_link_token` RPC → opens `https://t.me/<bot>?start=<token>` → bot webhook calls `consume_telegram_link_token(token)` → maps `telegram_chat_id` to user_id. Admin can revoke any active token from the Links tab.

## Backward compat
- Existing `notify-ops` / `TELEGRAM_BOT_TOKEN` secret continue to work unchanged.
- TelegramOps page (export delivery) untouched.
- Old hardcoded subscriptions kept as fallback so dispatcher never breaks if DB is empty.
