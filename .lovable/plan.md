# Polish Phase: Payment, Settings, Admin, Users, Design System

5 large workstreams. I'll ship them in this order so each phase is reviewable and the next one builds on the previous design language.

## Phase A — Design System Consistency Pass (foundation, ship first)

This belongs **before** Payment/Settings/Admin so all three inherit it.

- Audit `index.css` + `tailwind.config.ts` for tokens: spacing scale, radii (`--radius-sm/md/lg/xl`), shadow tiers (`--shadow-sm/md/lg/glow`), elevation, typography ramp.
- Standardize: button hierarchy (primary/secondary/ghost/destructive + size scale), card surfaces, input styles, focus rings, hover states.
- Unify: skeleton loaders (single `<Skeleton>` variant + shimmer), empty states (single `<EmptyState>` component with icon/title/desc/CTA), modal/sheet padding, toast patterns (sonner only — kill remaining `useToast` mixed usage).
- Icon sizing: standardize `w-4 h-4` (inline), `w-5 h-5` (button), `w-8 h-8` (feature) — codify in lint comment.
- Typography: 1 display font + 1 body font, ramp `text-xs → text-4xl` with line-height tokens.
- Output: `src/components/ui/empty-state.tsx`, `src/components/ui/section-header.tsx`, refresh of `Skeleton` patterns, doc in `src/lib/design-tokens.ts`.

## Phase B — Payment Page Premium Refresh (`/payment`)

Visual target: Linear / Vercel / Stripe Billing. **Not** generic indie SaaS.

Layout:
```
┌─────────────────────────────────────────────────────┐
│  Hero: "Pick your hustle plan"  + monthly/yearly    │
│  Trust strip: 🔒 Secure · 🧾 GST · ⚡ Instant       │
├─────────────────────────────────────────────────────┤
│  3 plan cards · "Most Popular" on Elite             │
│  Annual: -20% badge, "Best Value" ribbon            │
│  Inline savings calculator under yearly             │
├─────────────────────────────────────────────────────┤
│  Wallet pay-as-you-go strip (4 packs, horizontal)   │
│  Tooltip: "1 credit = 1 AI search"                  │
├─────────────────────────────────────────────────────┤
│  [Compare features] → opens Sheet drawer            │
│  Payment methods strip: Visa MC UPI Netbanking      │
│  FAQ accordion (refunds, cancel, trial, GST)        │
└─────────────────────────────────────────────────────┘
```

States: skeleton on initial load, optimistic CTA spinner, success → existing celebration modal, error → inline alert with retry.

## Phase C — User Settings Expansion (`/profile?tab=settings` or new `/settings`)

Tabbed shell with sticky left nav (mobile: top tabs):
- **Account** — avatar, display name, username, timezone, language, bio, social links (uses existing `social_links` infra)
- **Billing** — pulls active sub from `dodo_subscriptions`, invoices from `payments`, wallet from `user_wallets`, coupon history from `dodo_events`. Single "Manage in portal" CTA → `dodo-portal`.
- **Notifications** — `notification_preferences` table (new): email_receipts, newsletter, ai_digest, marketing, payment_alerts, product_updates
- **Security** — sessions list (best-effort from auth), login history (new `login_events` table, opt-in), password reset link, Google connection status, 2FA section (placeholder card "Coming soon")
- **AI Preferences** — provider preference, tone (concise/balanced/detailed), creativity (low/med/high), auto-save toggle, AI memory toggle. Stored in `user_ai_preferences` table (new).
- **Workspace Preferences** — default dashboard route, compact mode, animations toggle, accent color picker. Stored in `user_ui_preferences` table (new).

## Phase D — Admin Panel Operational Polish

Restructure `AdminDashboard.tsx` (currently 2340 lines, single page) into:
- `src/pages/admin/` route shell with sidebar groups: **Overview, Users, Billing, Content, Communications, Infrastructure, Settings**
- Searchable sidebar (cmd-K command palette via `cmdk`)
- Pinned sections (localStorage)
- Activity feed widget on Overview (reads `dodo_events` + future `audit_logs`)
- Metrics cards: MRR, active subs, wallet revenue, churn 30d, signups 7d, failed payments
- Quick actions row: "Grant credits", "Issue coupon", "Resend invoice", "Send broadcast"
- Provider health monitor (already partial in SystemHealth — promote to Overview card)
- Email queue + failed webhook viewers (read `dodo_events` where status=failed; retry button calls webhook replay)
- Coupon analytics (redemptions over time per code from `dodo_coupons.times_redeemed` + events)

## Phase E — Advanced Users View (admin)

New `/admin/users` route. Stripe/Clerk-style:
- Top: search bar (email/name/id/dodo_customer_id), saved filters
- Filter chips: tier, status, trialing, cancelled, has_wallet>0, is_affiliate, email_verified, signup_source, last_active range, ai_usage_bucket, country, payment_status, churn_risk, referral_count
- Sort: revenue (sum of payments), activity (last_seen), signup date, MRR
- Row click → right-side **user drawer** with tabs: Overview, Subscriptions, Payments, AI usage, Emails, Referrals, Notes, Audit
- Admin actions: subscription override (set tier + period_end), grant credits, assign role, add internal tag, send email, export profile JSON
- Bulk actions: tag, email, export CSV
- Audit trail: every admin write logged to `admin_audit_logs` (new table)
- Safe impersonation: read-only "preview as user" (existing impersonation flow already exists per memory)

## Recommended order

A → B → C → E → D. (E before D because the Users view is the biggest single deliverable and benefits from being built standalone before wiring into the admin shell restructure.)

## Questions before I start

1. **Aesthetic anchor for Payment page** — should I lean Linear (dark, precise, monospace accents), Stripe (clean white-on-warm, soft shadows), or your existing dark+gradient `glass` look — just polished?
2. **Settings location** — promote to top-level `/settings` route, or keep nested under `/profile?tab=...`?
3. **Admin restructure** — okay to break the 2340-line `AdminDashboard.tsx` into `src/pages/admin/*` sub-routes (cleaner, but bigger diff), or keep single-page with internal section state?
4. **New tables** I'll need: `notification_preferences`, `user_ai_preferences`, `user_ui_preferences`, `admin_audit_logs`, `login_events` — green-light all in one migration, or want to skip any?

Once you answer, I'll start with **Phase A (Design System pass)** since both B and the admin work depend on it.
