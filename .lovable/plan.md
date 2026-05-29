# Homepage Variants Experiment — Audit & Plan

The current `/` stays untouched. We add three experimental homepages at fixed routes, plus an admin-controlled flag that decides which variant `/` actually renders. No SEO, sitemap, auth, pricing, or routing changes.

---

## 1. Audit of current `/` (Index.tsx)

**Section order (top → bottom):**
1. Hero — badge, H1 ("Run your freelance and client operations from one workspace."), subhead, capability chips (Proposals · Onboarding · Invoices · Delivery), `PersonalizedHeroCTA`, trust microcopy, secondary nav chips.
2. `ReturningUserContinuity` (authed-only continuity strip).
3. `TrustStrip`.
4. `WhoIsHustleAIFor` — persona positioning.
5. `OpsStats` — operational social proof.
6. `WorkflowRibbon` ("System rhythm").
7. `WorkflowStorySection` — 6-stage operational story (Generate → Export → Deliver → Continue → Async → Workspace), already has scroll-activated stages via `useStageActivation`.
8. `UnifiedWorkspaceSection`, `AsyncOperationsSection`.
9. `OperatingSystemArchitecture` — module grid + live ribbon.
10. `ConnectedWorkflowSection`.
11. `OperationalContinuitySection`.
12. `WorkflowRibbon` ("Deliverables lane") → `RealDeliverablesSection`.
13. `IntegrationsNotificationsSection` + `IntegrationsMarquee`.
14. `WorkflowRibbon` ("Governance lane") → `ControlGovernanceSection`.
15. `FreeToolsStrip`, `FlexibleUsageSection`.
16. `Pricing` (+ "View all plans" CTA).
17. `Testimonials`.
18. Dark CTA card ("Send your first proposal in under five minutes").
19. `Footer` + sticky mobile CTA after 520px scroll.

**Strengths:** clear positioning (client operations workspace), trustworthy chrome, persona clarity, real workflow narrative, good information density, mobile sticky CTA.

**Weaknesses (matches user's read):**
- Almost no real motion below the hero — `useStageActivation` is the only scroll-tied effect.
- Visual rhythm is uniform: card grid → card grid → card grid. Eye fatigues by section 8.
- Hero text is strong but static; "operating system" claim is asserted, not shown.
- No live/async feeling on the page itself.
- Pricing + dark CTA feel detached from the workflow narrative above.

**Messaging hierarchy:** Hero promise → who it's for → ops proof → 6-stage story → platform sections → deliverables → integrations → governance → free tools → pricing → testimonials → final CTA. Solid; we keep this on every variant.

**Conversion path:** `PersonalizedHeroCTA` (primary) → pricing CTA → bottom dark CTA → mobile sticky. Each variant must preserve all four.

---

## 2. Variant system architecture

**Routes (always live, indexable by us but `noindex` on the variants):**
- `/` → renders the variant selected by the flag (defaults to V1).
- `/homepage-2`, `/homepage-3`, `/homepage-4` → always render that specific variant, regardless of flag. Used for admin preview + A/B links.

**Flag storage:** new row in existing `app_settings` table (or equivalent platform settings table on the primary DB — confirm during build). Single key `active_homepage` with values `v1 | v2 | v3 | v4`. Default `v1`. Read once on app boot via existing settings client, cached in a small `useActiveHomepage()` hook with a sane fallback to `v1` so a fetch failure never breaks `/`.

**Admin UI:** `Admin → Marketing → Homepage Variants` panel (new tab inside `src/pages/admin/MarketingPages.tsx` or a new sibling). Four radio cards (V1 current, V2 motion, V3 3D, V4 live ops) with preview links to the `/homepage-N` routes and a Save button that writes `active_homepage`.

**SEO / sitemap guardrails:**
- `/` continues to emit the existing `SEO` component (unchanged title, description, JSON-LD).
- `/homepage-2|3|4` render with `<meta name="robots" content="noindex,nofollow">` and are NOT added to `sitemap.xml`.
- No canonical changes. No new auth, pricing, or workspace touchpoints.

**Shared shell:** All variants reuse `Navbar`, `Footer`, `PersonalizedHeroCTA`, `Pricing`, `Testimonials`, dark CTA card, and the mobile sticky CTA. Only the middle narrative changes per variant.

---

## 3. Wireframes

### V2 — Motion-first (Linear / Vercel / Raycast energy)

```text
┌──────────────────────────────────────────────┐
│ Navbar                                       │
├──────────────────────────────────────────────┤
│ HERO  (existing copy)                        │
│  • Headline split-letter reveal (GSAP)       │
│  • Chips fade-in stagger                     │
│  • Floating capability cards parallax        │
├──────────────────────────────────────────────┤
│ ScrollTrigger pinned panel:                  │
│  6 workflow stages animate IN as you scroll  │
│  Lanes light up sequentially (existing       │
│  AsyncLane primitives, amplified)            │
├──────────────────────────────────────────────┤
│ Floating module stack (CRM/Invoices/Proposal │
│  /AI/Portal/Notifications) — cards drift on  │
│  mouse + reorder on scroll                   │
├──────────────────────────────────────────────┤
│ Integrations marquee (existing)              │
├──────────────────────────────────────────────┤
│ Pricing → Testimonials → Dark CTA → Footer   │
└──────────────────────────────────────────────┘
```

### V3 — 3D Operating Command Center

```text
┌──────────────────────────────────────────────┐
│ Navbar                                       │
├──────────────────────────────────────────────┤
│ HERO                                         │
│ ┌───────────────┐  Your business runs        │
│ │  R3F canvas   │  itself.                   │
│ │  floating     │  [PersonalizedHeroCTA]     │
│ │  layered      │                            │
│ │  workspace    │                            │
│ └───────────────┘                            │
├──────────────────────────────────────────────┤
│ Scroll-unfold sequence (pinned R3F scene):   │
│  Client → Proposal → AI → Export → Approval  │
│        → Invoice → Payment                   │
│  Each scroll step lights one layer + caption │
├──────────────────────────────────────────────┤
│ Static fallback grid for reduced-motion /    │
│  mobile / no-WebGL                           │
├──────────────────────────────────────────────┤
│ Pricing → Testimonials → Dark CTA → Footer   │
└──────────────────────────────────────────────┘
```

Strict rule: the 3D scene **only** visualizes that pipeline. No decorative cubes.

### V4 — Live Operations

```text
┌──────────────────────────────────────────────┐
│ Navbar                                       │
├──────────────────────────────────────────────┤
│ HERO                                         │
│  Proposal delivered.                         │
│  Invoice paid.                               │
│  Resume exported.                            │
│  Client approved.                            │
│  While you slept.                            │
│  [PersonalizedHeroCTA]                       │
├──────────────────────────────────────────────┤
│ Operations telemetry strip (always running): │
│  ✓ Proposal exported    2s ago               │
│  ✓ Invoice paid         11s ago              │
│  ✓ Resume generated     17s ago              │
│  ✓ Contract signed      29s ago              │
│  (driven by real recent events from          │
│   public ops feed if available, else a       │
│   seeded rotating set — never fake counters) │
├──────────────────────────────────────────────┤
│ Async delivery pipeline animation            │
│ (Generate → Export → Deliver → Continue)     │
├──────────────────────────────────────────────┤
│ Pricing → Testimonials → Dark CTA → Footer   │
└──────────────────────────────────────────────┘
```

---

## 4. Component inventory

**New shared:**
- `src/lib/homepage/useActiveHomepage.ts` — fetch + cache `active_homepage`.
- `src/components/home/variants/VariantSEO.tsx` — noindex wrapper for /homepage-N.
- `src/components/home/variants/SharedShell.tsx` — Navbar + Footer + Pricing + Testimonials + dark CTA + sticky mobile CTA composed once.

**V2 (`src/pages/HomepageV2.tsx` + `src/components/home/v2/*`):**
- `HeroMotion.tsx` (GSAP split-text + chip stagger)
- `PinnedWorkflowScroll.tsx` (ScrollTrigger pinned 6-stage)
- `FloatingModuleStack.tsx` (mouse parallax cards)

**V3 (`src/pages/HomepageV3.tsx` + `src/components/home/v3/*`):**
- `CommandCenterCanvas.tsx` (`@react-three/fiber@^8.18` + `@react-three/drei@^9.122` + `three@>=0.133`)
- `PipelineScene.tsx` (7 nodes: Client→Payment, instanced meshes, glow on active)
- `ScrollPipelineController.tsx` (ScrollTrigger drives `activeNodeIndex`)
- `CommandCenterFallback.tsx` (static SVG isometric for reduced-motion + mobile)

**V4 (`src/pages/HomepageV4.tsx` + `src/components/home/v4/*`):**
- `LiveOpsHero.tsx` (rotating verbs, cursor caret)
- `OpsTelemetryStream.tsx` (Supabase realtime channel on a sanitized public `ops_public_feed` view if exists; else local seeded rotation)
- `AsyncPipelineAnimation.tsx` (reuse existing `ops-primitives` AsyncLane scaled up)

**Admin:**
- `src/pages/admin/HomepageVariants.tsx` — 4 radio cards + Save, links to `/homepage-2|3|4`.
- Nav entry under `Admin → Marketing`.

**Routing:** add 4 routes in the marketing router section of `App.tsx`. `/` continues to point at `Index.tsx`, which gains a tiny dispatcher: if flag === v1 → render existing JSX as-is; else lazy-load the chosen variant page.

---

## 5. Performance budget

Per variant, gzipped, on `/`:
- V1: unchanged baseline.
- V2: ≤ +25 KB JS over V1 (no new deps; GSAP + ScrollTrigger already in the bundle).
- V3: ≤ +180 KB JS over V1 (three + R3F + drei, lazy-loaded only when active variant === v3 or route === /homepage-3). Hero static poster shown until canvas mounts. Reduced-motion / `matchMedia('(max-width: 768px)')` / no-WebGL → render fallback (no three import).
- V4: ≤ +20 KB JS over V1. Telemetry stream throttled to 1 event / 1.5 s, max 8 visible rows, virtualized.

LCP target on all variants: ≤ 2.5 s on simulated 4G. CLS < 0.05. INP < 200 ms. R3F canvas behind `IntersectionObserver` so it doesn't run when off-screen. All variants honor `prefers-reduced-motion`.

---

## 6. Implementation plan

**Phase A — Plumbing (no UI risk)**
1. Add `active_homepage` setting (default `v1`) + tiny admin write path. Migration only if a settings table doesn't already cover it.
2. Add `useActiveHomepage()` hook with SWR-style cache + V1 fallback.
3. Wrap `Index.tsx` return in a dispatcher; V1 path unchanged (literally the current JSX).
4. Add `/homepage-2|3|4` routes pointing at stub pages that render `SharedShell` + "Coming soon".
5. Add `Admin → Marketing → Homepage Variants` panel.

**Phase B — V2 Motion-first**
6. Build V2 components, port existing copy verbatim, layer GSAP/ScrollTrigger, ship behind `/homepage-2`.

**Phase C — V4 Live Operations** (built before V3 because cheaper and higher-signal)
7. Build V4 hero + telemetry stream + async pipeline. Wire to existing ops feed if a safe public view exists; otherwise seeded rotation with clear "Recent activity" framing (never fake counters).

**Phase D — V3 3D Command Center**
8. Install `three@>=0.133`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122` (pinned per R3F constraints).
9. Build `PipelineScene` strictly mapping Client → Proposal → AI → Export → Approval → Invoice → Payment.
10. Build scroll controller + fallback. Lazy-load entire V3 chunk.

**Phase E — Hand-off**
11. Admin can flip the flag; `/` swaps without redeploy.
12. Verify Lighthouse on each variant, confirm `noindex` on `/homepage-N`, confirm sitemap unchanged.

**Explicit non-goals:** no changes to `Index.tsx` V1 JSX, no SEO/sitemap/robots changes, no auth/pricing/workspace edits, no new tracking, no removal of any existing section.

Ready to start with Phase A on your approval.