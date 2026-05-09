# Product Maturity Phase — Settings Architecture v2

Transform settings from scattered pages into a cohesive, modern SaaS settings hub that reflects HustleAI's positioning as an "AI Operating System for Freelancers."

## Scope

### 1. Settings Shell (`SettingsLayout`)
- Persistent left sidebar (collapsible on mobile) with grouped sections:
  - **Account**: Profile, Account, Security, Notifications
  - **Workspace**: Workspace, Exports, AI Runs (read-only feed)
  - **Platform**: Integrations, Billing, API
- Sticky header with breadcrumb + section title + save state indicator
- Unsaved changes warning, toast confirmations
- Section grouping cards with consistent spacing, typography (display font for H1, body for fields)
- Trust signals: "Last saved", "Encrypted", connection badges

### 2. Routes (all under `/settings/*`)
- `/settings/profile` — overhaul with avatar upload, headline, username, timezone, company, website, freelancer category, social links (Twitter/LinkedIn/GitHub/IG/YouTube), portfolio links (multi)
- `/settings/account` — email, password change, language, timezone, delete account
- `/settings/security` — sessions list (current device highlighted), login history, OTP logs, suspicious activity, Telegram auth state, export access log summary, 2FA toggle
- `/settings/integrations` — existing page polished (Telegram primary, placeholder cards for Discord/Slack/WhatsApp coming soon)
- `/settings/billing` — existing billing page reused as a settings tab
- `/settings/workspace` — AI workspace overview: recent exports, recent AI runs, saved prompts, saved workflows, pinned items, templates, recent activity feed
- `/settings/exports` — upgrade existing Exports page: thumbnails (mime-based icon + preview if image/pdf), tags, favorite toggle, search/filter by AI tool/type, export analytics (count by type, by week), download history
- `/settings/notifications` — preferences (presets + per-event toggles) + analytics (delivery rate, last 7d) + grouped notification feed with dismiss/mark-read, richer cards (icon+title+meta+timestamp), event grouping
- `/settings/api` — personal API keys (placeholder for now: list + create + revoke), webhook endpoints (placeholder)

### 3. Backend additions (lightweight)
- `profiles` columns: `headline`, `username` (unique citext), `timezone`, `company`, `website`, `freelancer_category`, `social_links` jsonb, `portfolio_links` jsonb (additive only; nullable)
- `user_sessions_view` — derived from existing auth signals + login_history if present (read-only); fallback to current Supabase session info if table missing
- `saved_prompts` table (user_id, title, prompt, tags, pinned, timestamps) + RLS
- `saved_workflows` table (user_id, title, definition jsonb, pinned) + RLS
- `pinned_items` table (user_id, ref_type, ref_id, label) + RLS
- `export_favorites` flag → add `is_favorite` and `tags text[]` to `generated_exports`
- View/aggregate query for export + notification analytics done client-side from existing tables (no new tables needed for analytics)

### 4. UX polish principles
- Tighter spacing scale, generous whitespace
- One H1 per page, supporting eyebrow label
- Card surfaces use `bg-card` with `border-border/50`, soft shadows
- Section dividers via `border-t border-border/40` not heavy lines
- Status pills for connected/disconnected/pending
- Empty states with single CTA, no clutter
- Dark-mode safe, semantic tokens only

### 5. Out of scope (deferred)
- Real device fingerprinting (we display Supabase session metadata only)
- Webhook delivery system on `/settings/api` (UI shell only)
- Discord/Slack/WhatsApp providers (cards marked "Coming soon")
- AI runs persistence (we read from existing `ai_daily_usage` + recent exports as proxy if no runs table)
- Notification analytics deep dashboards (basic counts only)

## Technical notes
- New shared `SettingsLayout` component wraps all `/settings/*` routes via nested route in `App.tsx`
- All new pages use `SettingsSection`, `SettingsField`, `SettingsRow` primitives for consistency
- Migration is additive only — no breaking changes to existing tables
- Existing `Integrations.tsx`, `Exports.tsx`, billing page get re-mounted inside `SettingsLayout` (light refactor of imports/wrappers)
- File count target: ~15 new files, ~5 edits

## Deliverable
A single coherent settings experience accessible from navbar dropdown ("Settings"), with all 9 routes working, profile overhaul live, workspace + security + notifications hubs functional, exports center upgraded with favorites/tags/search.
