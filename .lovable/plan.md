
# Telegram restructuring + onboarding hardening

Scope is large — broken into 7 phases. I'll execute them in order; each is independently testable.

---

## Phase 1 — Admin bot: receive-only ops channel (`@theskymediabot`)

Refactor `supabase/functions/skymedia-webhook/index.ts`:
- Remove ALL conversational command handlers (`/runtime`, `/flags`, `/incidents`, `/queues`, `/aijobs`, `/payments`, `/exports`, `/broadcast`, `/maintenance`, `/whoami`, `/help`).
- Remove inline-keyboard callback handlers (`bcast_ok`, `maint_ok`, etc.).
- Webhook becomes a stub that ignores all incoming updates with `200 ok` (Telegram requires a 200).
- Optional: reply once with "This bot is a one-way ops channel — no commands available" on first contact, then stay silent.
- Remove command-registration calls (delete `setMyCommands` if present).

Allowlist: hardcode chat ID `1378192648` as the single permanent admin recipient (in addition to existing `TELEGRAM_ADMIN_CHAT_IDS` env). Update `_shared/notifications/telegram.ts` admin dispatch and `admin-bot-notify` / `admin-alert` to always include `1378192648` if missing.

Send a one-time "✅ HustleAI Ops connected successfully" alert via the SkyMedia bot from a small one-shot edge call after deploy.

## Phase 2 — Route ALL ops alerts through admin bot only

Audit alert callers and ensure they use `SKYMEDIA_BOT_TOKEN` (not `TELEGRAM_BOT_TOKEN`):
- `admin-alert/index.ts` — switch to SkyMedia bot.
- `event-dispatcher` → `notifyOps` — verify uses SkyMedia path.
- `admin-bot-notify` — already prefers SkyMedia; keep.
- Any signup/payment notify call sites: route via `admin-bot-notify` event names: `signup`, `signup_blocked`, `payment_initiated`, `payment_succeeded`, `payment_failed`, `auth_suspicious`, `webhook_failed`, `critical_error`.

User bot (`@hustlaiapp_bot`) MUST never send admin-class events. Grep `TELEGRAM_BOT_TOKEN` in admin/ops paths and replace with SkyMedia.

## Phase 3 — User bot: polished onboarding

Refactor `supabase/functions/telegram-webhook/index.ts` `/start` handler:
- Replace raw text with branded welcome:
  > Welcome to HustleAI 🚀
  > Your AI operating system for freelance work, clients, and growth.
- Inline keyboard buttons:
  - 🌐 Visit Website → https://hustlaiapp.in
  - 📚 Documentation → https://docs.hustlaiapp.in
  - 🔗 Connect Account → deep link to existing connect flow
- Set persistent menu via `setMyCommands` to a curated short list: `/start`, `/connect`, `/help`.
- For unknown free-text messages, reply with a short "Tap a button below" + the same inline keyboard. No raw command surface.

## Phase 4 — Signup hardening (Gmail-only, blocklist)

New util `src/lib/auth/email-policy.ts`:
- Allow only `@gmail.com` (case-insensitive, trimmed). Reject everything else with: "We're currently in invite-only beta — only Gmail accounts are accepted."
- Hard blocklist (always reject, even if Gmail): `samratakash0000@gmail.com`, any `@skycart.xyz`, configurable list.
- Reject disposable domains: ship a small static list (mailinator, tempmail, 10minutemail, guerrillamail, yopmail, trashmail, getnada, dispostable, throwawaymail, fakeinbox, etc.).

Wire into:
- `src/pages/Signup.tsx` — pre-submit validation, friendly error.
- `src/pages/ForgotPassword.tsx` — same gate (no reset for blocked).
- New edge function `signup-guard` (or DB trigger on `auth.users` insert? — not allowed on auth schema). Use a **client-side guard + Edge Function** called pre-`signUp` that validates and logs blocked attempts to a new `signup_blocked_log` table, then fires `admin-bot-notify` with event `signup_blocked`.

Migration: create `signup_blocked_log` table with RLS (service-role only insert/read).

## Phase 5 — Signup/Login page polish

`src/pages/Signup.tsx` + `src/pages/Login.tsx`:
- Tighter spacing, larger heading, supporting subline, trust row ("10k+ creators • SOC-ready • EU/IN compliant").
- Smoother field focus states, better inline error styling (red ring + helper text).
- Subtle motion on mount (framer-motion fade/slide ≤200ms). No heavy graphics.
- Loading button with spinner, disabled correctly.
- Single Google + Email block, clean divider.

Match Linear/Notion feel — keep work in presentation only.

## Phase 6 — Admin panel UX: new-tab navigation

Audit admin nav components (`src/pages/admin/*` + admin sidebar/links). Replace `navigate()` onClick patterns on row links with proper `<Link>` / `<a>` so:
- Cmd/Ctrl+click opens new tab natively
- Middle-click works
- Add explicit `↗` external-link button on key dashboard rows where a side-by-side workflow helps (Payments, AI Jobs, Telegram Ops).

## Phase 7 — Verification

- Deploy edge functions: `skymedia-webhook`, `telegram-webhook`, `admin-bot-notify`, `admin-alert`, plus new `signup-guard`.
- Trigger test alert "✅ HustleAI Ops connected successfully" to admin chat.
- Test `/start` on user bot via Telegram screenshot from logs.
- Test signup with non-Gmail → blocked + admin alert received.
- Test signup with `samratakash0000@gmail.com` → blocked.
- Test Cmd+click on admin nav → new tab opens.

---

## Out of scope (per user)
- No auth rewrite.
- No bot merging.
- No AI chat on admin bot.
- No bidirectional admin messaging.

## Technical notes
- Disposable-email list is intentionally small + static (no external API call) to keep auth flow fast.
- Hardcoded admin chat `1378192648` is in-code constant + env override to stay resilient if env var is wiped.
- All admin-bot sends use `SKYMEDIA_BOT_TOKEN` exclusively; user-bot sends use `TELEGRAM_BOT_TOKEN`.
- Signup-guard runs BEFORE `supabase.auth.signUp` to avoid creating phantom users; blocklist log inserted via service role from edge function.
