## Plan: Calendar AI prompt + dashboard-style tool shell + tier templates + shared-link promo

### 1. AI prompt block on Content Calendar (parity with Pricing/Intake)
- Add `AiCalendarPrompt` section at top of `ContentCalendar.tsx`: textarea ("Tell us about your business / niche / audience"), generate button.
- Free → opens `SignupCTADialog`. Signed-in → calls `workspace-doc-ai` with new task `tool_content_calendar` returning `{ niche, audience, brand, ideas: [{week, day, pillar, idea}] }` (20 items). Result hydrates the calendar.
- Add `tool_content_calendar` task to `supabase/functions/workspace-doc-ai/index.ts`. Quota: same `consume_ai_quota` flow. Quota error → toast with Upgrade.
- Lock icon for free, Sparkles for signed-in. Same styling language as Pricing prompt (gradient card, slate text).

### 2. "Dashboard mirage" shell on free tool pages
Goal: every `/tools/*` page feels like it's already inside the signed-in dashboard, so when a guest signs up the experience is continuous.
- New `src/components/tools/ToolDashboardShell.tsx`: faux sidebar (left, sticky, narrow) listing the 8 tools with active state + "More inside" disabled rows (Workspaces, HustleBot, Roadmaps, Knowledge Hub, Lead Pipeline) all linking to signup. Faux top bar with HustleAI logo, "Free workspace" pill, search affordance, and "Sign in / Get started" CTA.
- Wrap `ToolPageLayout` content in this shell when `toolKey` is set and user is signed-out. Signed-in users keep the existing AppShell.
- Add subtle "You're using the free preview — sign up to save & sync" ribbon top of canvas.
- Keep current SEO/FAQ/RelatedRail blocks below the shell so SEO is unchanged.

### 3. Tier-gated template library (Elite / Infinity unlocks)
- New `src/lib/tools/template-packs.ts`: per-tool template arrays tagged `free | pro | elite | infinity`.
  - Invoice: Modern, Classic (free) · Minimal Studio, Agency Bold (pro) · Boutique Luxe, Stripe-clean, Investor-grade (elite) · Animated header, Multi-currency hero, Whitelabel ultra (infinity).
  - Proposal: 2 free → +3 pro → +3 elite → +3 infinity.
  - Contract, Pricing, Portfolio, Intake, Card, Calendar: 2 free baseline + tiered unlocks.
- New `<TemplatePicker tool="invoice" />` rendering a horizontal scroll strip with locked cards (lock icon + tier badge). Click locked → toast "Unlock 12+ templates with Elite" with Upgrade CTA. Plug into the 3 doc tools first; same component reused on the other tools.
- Marketing copy on `/tools` hub: "8 free templates. Unlock 40+ inside Elite & Infinity."

### 4. Shared-link footer promo + watermark on free outputs
- New `src/components/tools/SharedLinkPromo.tsx`: rendered at bottom of any public-shared output (intake form public view, exported HTML preview, printable PDF footer). Shows: HustleAI logo, "Made with HustleAI · 8 free freelancer tools", icon row (Invoice, Proposal, Contract, Pricing, Portfolio, Calendar, Card, Intake) each linking back to `https://hustlaiapp.in/tools/<slug>?ref=share`, plus "Try free →" pill.
- Watermark: extend existing `watermarkModeForTier` usage. For free tier, every print/PDF gets a diagonal "HustleAI · hustlaiapp.in" watermark; pro = small datetime footer; elite/infinity = none. Apply to Invoice, Proposal, Contract, Pricing, Portfolio, Card print paths.
- Public intake form submission page (`/intake/...`) shows the `SharedLinkPromo` strip when the form was created on a free plan.

### 5. Touch-points & verification
- Update `mem/features/free-tools-funnel.md` if it exists with the new mirage-shell rule.
- Build check: ensure `ToolDashboardShell` doesn't break existing `AppShell` route exclusion list (`src/components/app-shell-routes.ts`).
- Quick visual smoke: open `/tools/content-calendar` signed-out → see shell + AI prompt + locked templates + share promo on export.

### Technical notes
- Reuse existing `useAuth`, `SignupCTADialog`, `useToolGate`, `printWithMeta`, `watermarkModeForTier`.
- No DB migration needed; quota piggybacks on `consume_ai_quota`.
- Keep all colors via tokens (`text-slate-*` already used across tools — fine, matches Stripe/Linear minimal direction).
- New edge-function task is a simple addition to the `TASKS` map; no config change.

Files to add: `ToolDashboardShell.tsx`, `TemplatePicker.tsx`, `SharedLinkPromo.tsx`, `template-packs.ts`.
Files to edit: `ContentCalendar.tsx`, `workspace-doc-ai/index.ts`, `ToolPageLayout.tsx`, the 8 tool pages (shell wrap + template picker), print helpers in Invoice/Proposal/Contract/Card.
