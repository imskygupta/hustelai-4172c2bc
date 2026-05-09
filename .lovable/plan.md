## HustleAI Platform Modernization Pass

Goal: align the public surface of the product with the infrastructure already shipped (Telegram delivery, Export Center, AI workspace, Dodo billing). No backend changes — pure UI/positioning/copy refresh.

---

### 1. Homepage repositioning (`src/pages/Index.tsx` + components)

- Rewrite hero: from "AI tools" → **"The AI Operating System for Freelancers"**, sub-copy referencing workspaces, exports, Telegram delivery, automations.
- New section: **AI Workspace** (CRM, docs, pipelines, brand kit).
- New section: **Telegram Delivery** (instant export delivery, secure share links, OTP).
- New section: **Export Center** (persistent history, watermarking, expiring links).
- New section: **Notifications & Automation**.
- New section: **Payments & Wallet** (Dodo, UPI, invoices).
- Refresh feature grid + trust strip (encrypted exports, verified payments, delivery tracking).

### 2. Pricing refresh (`src/components/Pricing.tsx`, `src/pages/Plans.tsx`, `src/pages/PricingPage.tsx`)

Re-shape feature lists per current architecture:

- **Free** — Telegram delivery, 7-day expiring exports, watermarked, basic notifications, limited workspace memory.
- **Pro** — persistent exports, OTP share links, export history, AI memory, Telegram integrations, cloud workspace.
- **Elite** — branded exports, advanced automations, priority generations, analytics, collaboration infra.
- **Infinity** — unlimited exports, premium automations, full infra access, future API.

Add: comparison table on `/plans`, trust badges row, mobile spacing pass, "Pay-as-you-go credits" repositioned.

### 3. Tools & templates pass (`src/pages/tools/ToolsHub.tsx` + tool pages)

- Add **Export badges** (Telegram-ready / Workspace-saved / Premium) on tool cards.
- Inline upgrade nudge component referencing branded exports + Telegram delivery.
- Reorder hub copy: "Free tools that plug into your AI workspace".

### 4. Settings polish (`src/components/settings/SettingsLayout.tsx`, settings pages)

- Sidebar: integration status dots (Telegram / Email / Payments).
- Profile: surface phone number prominently with verified badge slot.
- Cards: tighter spacing, stronger typography, better mobile stacking.
- Add **Workspace Identity** summary card on Profile.
- Exports page: surface Telegram-cached badge prominently (already partly done, add stat strip).

### 5. Telegram positioning

- New `src/components/home/TelegramDeliverySection.tsx` for homepage.
- Settings/Integrations: clearer "Connected via Telegram" state, gated automation rows for paid tiers with lock chip.

### 6. Billing/Payment UX (`src/pages/Payment.tsx`, `src/pages/PaymentStatus.tsx`, `src/pages/settings/Billing.tsx`)

- Remove any stale Cashfree-only copy; standardize on **Dodo + UPI** wording.
- Add trust strip: "Secure checkout · 256-bit · Verified merchant".
- Improve UPI pending-review state copy + iconography.
- Invoice list: cleaner status pills, structured invoice numbers (already there) — ensure visible.

### 7. Trust indicators (global)

- Reusable `TrustStrip` component (encrypted exports, verified payments, delivery tracking, activity logs).
- Drop into homepage, pricing, billing, exports pages.

### 8. UI/UX refinement (global tokens / components)

- Tighten card padding scale, unify empty states via existing `EmptyState`.
- Add shimmer skeletons where lists currently flash.
- Hover states harmonized to emerald accent (per existing brand).

---

### Files touched (new)

- `src/components/home/AIWorkspaceSection.tsx`
- `src/components/home/TelegramDeliverySection.tsx`
- `src/components/home/ExportCenterSection.tsx`
- `src/components/home/PaymentsAutomationSection.tsx`
- `src/components/TrustStrip.tsx`

### Files touched (edited)

- `src/pages/Index.tsx`
- `src/components/Pricing.tsx`
- `src/pages/Plans.tsx` / `src/pages/PricingPage.tsx`
- `src/pages/tools/ToolsHub.tsx`
- `src/components/settings/SettingsLayout.tsx`
- `src/pages/settings/Profile.tsx`, `Billing.tsx`, `Exports.tsx`, `Integrations.tsx`
- `src/pages/Payment.tsx`, `src/pages/PaymentStatus.tsx`

### Out of scope (untouched, per request)

- Dodo webhook + payment hardening
- Telegram infra edge functions
- DB distribution / migrations
- Export pipeline backend code

### Approach

Pure presentation layer. No DB migrations, no edge function changes, no business logic. Roll out section-by-section, verify build after each batch.
