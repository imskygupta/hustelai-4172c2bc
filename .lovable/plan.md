## Goal
Make daily AI assist usage visible to users, gracefully handle exhaustion with an upgrade/BYOK/credits popup, and give admins a rich targeting + messaging panel for users who burned through their daily quota.

---

## 1. Unified daily usage tracking (source of truth)

Today usage is scattered: `localStorage` (`tool-limits.ts`) for free tool autofills + a `consume_ai_quota` RPC + `ai_daily_usage` table for some flows. Users on the dashboard see nothing.

**Switch the doc tools (Invoice, Proposal, Contract autofill) to the server-backed `consume_ai_quota` RPC** so usage is visible across devices and to admins.

- New helper `src/lib/ai-usage.ts`:
  - `consumeDailyAI(feature)` → calls `consume_ai_quota` RPC, returns `{allowed, used, max, bypass}`.
  - `getDailyUsage(userId)` → reads `ai_daily_usage` for today across all features, returns `{totalUsed, totalMax, perFeature[]}`.
- Update `AIAutofillButton.tsx` `ByokDialog` flow:
  - On "Use my free fill" → call `consumeDailyAI('doc_autofill')` instead of localStorage `bumpUsage`.
  - If `allowed === false` → open new `<CreditsExhaustedDialog />` instead of running.
- Keep `tool-limits.ts` as a thin localStorage fallback only for guests (no userId).

---

## 2. Dashboard "Daily AI Usage" widget

New `src/components/dashboard/DailyUsageWidget.tsx`:
- Card on `/dashboard` showing: `Used X / Y today` with progress bar, per-tool breakdown chips (autofill, proposal, etc.), reset-time hint ("Resets at 00:00 UTC").
- Pulls from `ai_daily_usage` for `auth.uid()` + today.
- Realtime: subscribe to `ai_daily_usage` filtered on `user_id=eq.{uid}` so the bar updates live after each AI use.
- Mounted in `src/pages/Dashboard.tsx` near the top.

---

## 3. CreditsExhaustedDialog (the friendly upsell)

New `src/components/tools/CreditsExhaustedDialog.tsx`:
- Title: "You've used today's free AI assists"
- Body: friendly copy, "Don't worry — pick what fits."
- 3 actions:
  1. **Add your own AI key (unlimited)** → `/workspaces/ai-settings`
  2. **Buy credits — from ₹10** → `/payments?intent=ai_credits&amount=10` (auto-saves current draft state to `localStorage` keyed by route so user doesn't lose work)
  3. **Maybe later** (close)
- Triggered automatically by `AIAutofillButton` when RPC returns `allowed=false`, and reusable from any tool.

---

## 4. Admin: per-user usage view + targeted messaging

Extend `src/components/admin/UsageAnalyticsManager.tsx` (already lists users by `ai_calls_30d`):

- New view: `admin_daily_usage_summary` (DB view) → per user today: `tier, ai_used_today, ai_max_today, exhausted (bool), last_use_at, has_byo_key`.
- Tabs in the admin component:
  - **All users** (existing 30d table)
  - **Exhausted today** ← filter `exhausted = true AND last_use_at >= today` AND now() before midnight UTC (auto). Sortable by `last_use_at`.
  - **Heavy users** (top 30d ai calls)
- Row actions per user: **View details** (drawer with usage timeline + tier + BYOK status) and **Send notification** (opens `SendUserNotificationDialog`).

### SendUserNotificationDialog
- Fields: `title`, `message`, `type` (info/offer/alert), `link` (optional CTA), `expires_at` (optional).
- "AI draft" button → calls `workspace-ai` edge function with a prompt like "Write a friendly nudge for a {tier} user who finished their daily AI credits at {time}. Suggest BYOK or ₹10 credits. ≤2 sentences." → fills the textarea.
- Submit inserts into existing `workspace_notifications` table with `user_id` set to that user. (Already shown via `NotificationCenter.tsx` bell with realtime + unread badge — perfect.)

### Bulk action
- Select multiple users from "Exhausted today" tab → "Send to selected" → inserts one notification per user. Toast feedback.

---

## 5. User-side notification surfacing (already mostly built — polish)

`NotificationCenter.tsx` already does bell + realtime + unread count. Two small improvements:
- On new notification INSERT (realtime), pop a `toast()` (sonner) with title + "View" action linking to `link || /dashboard`.
- Make sure it's mounted in the AppShell topbar (verify; add if missing).

---

## 6. Database migration

```sql
-- DB view for admin
create or replace view public.admin_daily_usage_summary as
select
  p.user_id,
  p.email,
  p.subscription_tier,
  coalesce(sum(u.count) filter (where u.usage_date = (now() at time zone 'utc')::date), 0)::int as ai_used_today,
  case p.subscription_tier
    when 'pro' then 5 when 'elite' then 10 when 'infinity' then 20 else 3 end as ai_max_today,
  max(u.updated_at) filter (where u.usage_date = (now() at time zone 'utc')::date) as last_use_at,
  exists(select 1 from public.user_ai_keys k where k.user_id = p.user_id and k.is_active) as has_byo_key
from public.profiles p
left join public.ai_daily_usage u on u.user_id = p.user_id
group by p.user_id, p.email, p.subscription_tier;

-- RLS: admins only (view inherits underlying RLS; add explicit policy via security definer wrapper or grant)
```

Plus a helper RPC `is_ai_exhausted_today(uid)` if needed (computed in view already, optional).

No new tables — reuses `workspace_notifications`, `ai_daily_usage`, `user_ai_keys`, `profiles`.

---

## 7. Files touched

**New**
- `src/lib/ai-usage.ts`
- `src/components/dashboard/DailyUsageWidget.tsx`
- `src/components/tools/CreditsExhaustedDialog.tsx`
- `src/components/admin/SendUserNotificationDialog.tsx`

**Edited**
- `src/components/tools/AIAutofillButton.tsx` — RPC-based quota + open exhausted dialog
- `src/components/admin/UsageAnalyticsManager.tsx` — tabs, exhausted filter, row actions
- `src/pages/Dashboard.tsx` — mount widget
- `src/components/workspace-os/NotificationCenter.tsx` — sonner toast on realtime insert
- `src/pages/Payment.tsx` — accept `?intent=ai_credits&amount=10` preset (small)

**Migration**: 1 file creating the view.

---

## Out of scope (call out, do not build)
- Actual ₹10 Cashfree SKU wiring beyond passing intent params (existing wallet/payment plumbing handles the rest; flag if missing on test).
- Refactoring the older localStorage-based limits in non-doc tools (separate pass).
