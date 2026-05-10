## UX + Delivery Reliability Cleanup Pass

A focused, architecture-aligned cleanup integrating with the existing capability engine, feature flags, quota system, async infra, and Telegram admin ops. No ad-hoc logic.

---

### 1. Capability-Aware Action Rendering (Telegram + others)

**New**: `src/components/usage/CapabilityAction.tsx`
- Wraps any button/action.
- Resolves capability via `useCapability(key)` + `useFeatureFlag(flag?)`.
- Three states: `available`, `locked` (tier), `unavailable` (flag/integration missing).
- Renders disabled button + tier badge + tooltip + opens `<UpgradeSheet>` on click when locked.
- Variants: `button | menu-item | icon`.

**New hook**: `useTelegramConnection()` → `{ connected, loading }` from `notification_integrations` (provider=telegram, status=connected).

**Wire into**:
- `src/pages/settings/Exports.tsx` Telegram-related buttons
- `ActivityCard` Telegram delivery action
- Anywhere "Send to Telegram" / "Deep link" appears (search `export-tg-deeplink`, `deliverToTelegram`).

Behavior:
- Free tier → disabled "Telegram Delivery · Pro" badge, click → upgrade sheet.
- Pro+ but Telegram not connected → "Connect Telegram" CTA → routes to `/settings/telegram`.
- Connected + allowed → real action.
- Flag killed/maintenance → disabled "Temporarily unavailable" tooltip.

---

### 2. Public Share Link Architecture

Two distinct link types — currently `export-issue-token` requires user_id binding via JWT for private, but UI mixed semantics.

**Schema** (`generated_exports` and `export_download_tokens` already exist; we add):
- `export_download_tokens.is_public boolean default false`
- `export_download_tokens.created_via text` ('private' | 'share')

**Edge function changes**:
- `export-issue-token`: accept `mode: 'private' | 'public'`. 
  - `private` → binds `user_id = caller`, requires auth on download.
  - `public` → `user_id = null`, `is_public = true`, max_uses & expiry tier-gated, optional OTP.
- `export-download`: when `tok.is_public`, skip JWT user check entirely. Keep OTP, expiry, use_count, revocation.
- `export-tg-deeplink`: unchanged — always private bot-bound.

**Frontend** (`src/lib/exports/api.ts`):
- `issueShareLink({ mode })` → public URL works in incognito.
- UI: split "Share" into `Private link (auth required)` and `Public link (anyone with link)`.

---

### 3. Branded Public Recovery Page

Replace raw "Forbidden / failed to fetch" on invalid public links.

**New**: `src/pages/PublicLinkUnavailable.tsx`
- Branded HustleAI hero
- Reason chip: `expired | revoked | not_found | limit_reached | otp_required`
- Sample tools grid (3-4 cards linking to `/tools/*`)
- "Create your own" CTA → `/signup`
- SEO-friendly (indexable noindex, canonical to /)

**New**: `src/pages/Download.tsx` already exists — refactor to:
- Detect token from URL
- Call `export-download` (no JSON-only mode)
- On error → render `<PublicLinkUnavailable reason={...} />`
- On OTP required → render OTP form
- On success → trigger download + thank-you state with growth CTAs

Wire route `/d/:token` → `Download`.

---

### 4. Error Sanitization Layer

**New**: `src/lib/errors/sanitize.ts`
```ts
export function humanizeError(e: unknown, context?: string): { 
  title: string; message: string; action?: 'retry'|'reconnect'|'upgrade'|'wait'; 
  reportToAdmin?: boolean 
}
```

Maps:
- `FunctionsHttpError`, `Edge Function returned`, `fetch failed`, `Failed to send a request` → "Something interrupted that request. Try again."
- `quota`, `tier_locked` → upgrade
- `telegram` + (`bot_blocked`, `chat not found`, `unauthorized`) → "Reconnect Telegram"
- `otp` → "Enter the access code"
- `expired`, `revoked` → "This link is no longer available"
- Unknown → generic + report to admin.

**New**: `src/lib/errors/toast.ts` → `notifyError(e, ctx)` uses `humanizeError` then `toast`. Optionally fires `admin-alert` edge function for `reportToAdmin`.

**Replace** raw `toast.error(String(e))` / `e.message` patterns in:
- `src/lib/exports/api.ts` callers
- `ActivityCard.tsx`
- `NewsletterOps.tsx`
- `Exports.tsx`, `Telegram.tsx` settings pages
(Search for `toast({.*error|toast.error|String\(e`.)

---

### 5. Admin Diagnostics & Telegram Alerts

**New edge function**: `supabase/functions/admin-alert/index.ts`
- Body: `{ kind, severity, user_id?, feature?, message, meta? }`
- Inserts into new table `admin_alerts` (id, kind, severity, user_id, message, meta, created_at, acknowledged_at).
- If `severity in ('error','critical')`: sends to Telegram admin chat using existing `_shared/notifications/telegram.ts`.

**Migration**: `admin_alerts` table + RLS (admin-only read).

**Wire**:
- `export-deliver-telegram`, `export-create`, `ai-job-runner` failure paths → call `admin-alert` with structured payload.
- Frontend `notifyError(reportToAdmin=true)` → invokes `admin-alert`.

**Admin UI**: extend `src/pages/admin/Notifications.tsx` (or new `AdminAlerts.tsx`) with feed + ack + retry deep-links to existing AI Jobs / Telegram Ops.

---

### 6. PDF Typography System

**New**: `src/lib/pdf/typography.ts` — centralized constants:
```ts
export const PDF_TYPO = {
  base: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, lineHeight: 1.6 },
  h1: { fontSize: 22, lineHeight: 1.3, marginBottom: 14 },
  h2: { fontSize: 16, lineHeight: 1.35, marginTop: 20, marginBottom: 10 },
  h3: { fontSize: 13, lineHeight: 1.4, marginTop: 14, marginBottom: 6 },
  paragraph: { marginBottom: 10 },
  section: { marginBottom: 22 },
  page: { padding: '20mm 18mm' },
};
```
And `pdfBaseCss()` returning a CSS string for html2pdf-style flows.

**Apply** to:
- `src/lib/blueprint-print.ts`
- `src/lib/roadmap-print.ts`
- `src/lib/workspace-docs/export-pdf.ts`
- `src/lib/tools/print-meta.ts`
- Any invoice/proposal/resume PDF pipeline.

Replace inline tight CSS with shared base + section spacing.

---

### 7. Export Delivery Flow Polish

In `ActivityCard.tsx` and `Exports.tsx`:
- Use `<CapabilityAction>` for Telegram buttons.
- Show async chip when `status='pending'` ("Processing — we'll notify you").
- Telegram not connected → inline "Connect Telegram" link instead of failing action.
- All errors via `notifyError`.

---

### 8. Files Summary

**Created**
- `src/components/usage/CapabilityAction.tsx`
- `src/lib/usage/useTelegramConnection.ts`
- `src/lib/errors/sanitize.ts`
- `src/lib/errors/toast.ts`
- `src/lib/pdf/typography.ts`
- `src/pages/PublicLinkUnavailable.tsx`
- `supabase/functions/admin-alert/index.ts`
- Migration: `admin_alerts` + `export_download_tokens.is_public`

**Edited**
- `supabase/functions/export-issue-token/index.ts` (mode public/private)
- `supabase/functions/export-download/index.ts` (skip auth when public)
- `supabase/functions/export-deliver-telegram/index.ts` (admin-alert on failure)
- `supabase/functions/export-create/index.ts` (admin-alert on failure)
- `src/lib/exports/api.ts` (mode arg)
- `src/pages/Download.tsx` (branded fallback + OTP UI)
- `src/pages/settings/Exports.tsx`
- `src/components/async/ActivityCard.tsx`
- `src/pages/admin/NewsletterOps.tsx` (notifyError)
- `src/App.tsx` (route `/link-unavailable` if needed)
- `src/lib/blueprint-print.ts`, `src/lib/roadmap-print.ts`, `src/lib/workspace-docs/export-pdf.ts` (typography)

**No new** websocket/realtime infra. No resumable workflow work.

---

### Execution Order
1. Migration (admin_alerts + is_public column)
2. Error sanitization lib (foundation)
3. CapabilityAction + useTelegramConnection
4. Public/private link split (edge + frontend)
5. Branded Download/PublicLinkUnavailable
6. admin-alert function + wire failures
7. PDF typography refactor
8. Settings + ActivityCard polish