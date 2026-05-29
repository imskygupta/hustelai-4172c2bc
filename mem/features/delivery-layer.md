---
name: Universal Delivery Layer
description: <Deliver/> component contract, channels, DB2 tables for every generator output
type: feature
---
# Universal Delivery Layer

Every AI generator surfaces a single `<Deliver />` (src/components/delivery/Deliver.tsx) instead of inventing its own share button. Do not build per-tool WhatsApp/Telegram buttons.

## Component
`<Deliver toolSlug title text pdf? />` — pdf prop is `{ blob? | url?, filename }`. Includes Copy + dropdown (WhatsApp client, Telegram text, Telegram PDF when pdf prop set, Save to client). Always opens `ClientPickerDialog` first; new clients auto-create.

## Channels (work_deliveries.channel)
- `whatsapp_opened` — wa.me launcher, NOT confirmed sent
- `telegram_sent` — text delivered to user's own connected chat
- `telegram_pdf_sent` — sendDocument to user's own chat
- `saved_to_client` — logged-only, no external send

## Storage (DB2 — utflzmecghdtcjupgdan)
- Reuse `work_clients` (added `last_delivery_at`, `delivery_count`). Never create a second clients namespace.
- `work_deliveries` append-only. Dedupe on insert: `(owner_id, phone)` then `(owner_id, lower(email))`.
- Schema lives in `src/lib/work-sql.ts` → `DELIVERY_SETUP_SQL` block, run via Admin → Bootstrap SQL Hub.

## Edge functions
- `delivery-record` — JWT-scoped; resolves/creates client + inserts delivery
- `delivery-telegram` — sends text via `TELEGRAM_BOT_TOKEN`, requires `notification_integrations` row
- `delivery-telegram-pdf` — accepts pdf_url or base64; 50MB cap

## Rules
- Phone normalization: digits only; 10-digit numbers default to `91` country code.
- Frontend never sends `owner_id` — server resolves from JWT.
- No new quota logic; respect existing tool limits at the generator level.
- Do NOT build Clients CRM / Timeline UI yet — collect data first.