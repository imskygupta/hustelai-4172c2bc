# V3 Mobile Polish & IA Plan

Freeze new sections on `/homepage-3`. Focus only on polish, IA, and mobile UX.  
  
  
This is actually a good plan. I'd make only a few adjustments before giving it to Lovable.

### Changes I'd make

#### 1. Footer first, but don't duplicate code

Add this:

```text
Do not recreate footer markup.

Homepage V3 must import and render the exact production Footer component.

Single source of truth only.

Any future footer update should automatically appear on V3.

```

---

#### 2. Audience cards can become much more premium

Instead of:

```text
2 automations active
1 approval pending

```

Use mini workflow visualizations.

Example Freelancer:

```text
Lead      ✓
Proposal  ✓
Approval  ●
Invoice   ○
Payment   ○

───────────────
Flow progressing

```

Agency:

```text
Client A  ✓
Client B  ✓
Client C  ●
Client D  ○

───────────────
Multi-client workspace

```

This feels like a living product rather than dashboard metrics.

---

#### 3. Add hover expansion on desktop

Current cards are still a little static.

Add:

```text
Desktop:
hover expands card height by ~40-60px

reveals:
- workflow summary
- outcome statement
- CTA

Mobile:
always visible
no hover dependency

```

This is the biggest upgrade I'd make to the audience section.

---

#### 4. Blog Hub should become a magazine

Current scope is good but I'd extend it:

```text
Featured article

Latest articles

Popular categories

Documentation guide

Template spotlight

View all blog posts →

```

Reason:

You already have 29+ articles.

Use them.

SEO should be visible.

---

#### 5. Docs section should feel connected

Instead of:

```text
Learn the system

```

Rename:

```text
Start with your workflow

```

Example:

```text
Freelancer
→ Client onboarding guide

Creator
→ Content production workflow

Agency
→ Multi-client operations

Consultant
→ Proposal to payment system

```

Much stronger positioning.

---

#### 6. Mobile Hero Audit (missing)

This is actually more important than spacing.

Add:

```text
Mobile hero audit

Current desktop typography scales poorly.

Requirements:

- max 3 lines per headline
- no orphan words
- CTA visible without scrolling
- audience section visible quickly
- avoid excessive vertical whitespace

```

---

#### 7. Mission Control Mobile

I would completely skip the 3D scene on mobile.

Not fallback 3D.

Not reduced 3D.

Not simplified 3D.

Replace with:

```text
Animated SVG workflow

Lead
↓
Proposal
↓
Approval
↓
Invoice
↓
Payment

with subtle GSAP motion

```

Mobile users won't sit through a cinematic sequence.

They want understanding in 5 seconds.

---

### One additional section I'd add

Between Audience Cards and Blog:

```text
What actually happens inside HustleAI?

```

4 horizontal cards:

```text
Capture
Everything enters one place

Think
AI drafts, researches and organizes

Deliver
Exports, portals, approvals

Earn
Invoices, payments, retention

```

Very small section.

Very high clarity.

---

### Final Version I'd Send

Keep your plan.

Add:

```text
8. Mobile hero audit
9. Desktop hover expansion for audience cards
10. Replace mobile Mission Control with lightweight SVG workflow
11. Blog hub includes Template Spotlight
12. Docs section renamed "Start with your workflow"
13. Use production Footer component directly
14. Add lightweight "What actually happens inside HustleAI?" clarity strip

```

After those changes, `/homepage-3` is getting close to something you could realistically make the default homepage and put behind the "Preview ✨" banner without it feeling experimental anymore.

## Scope (in order)

### 1. Footer parity with production

- Audit production Footer (`src/components/Footer.tsx` or equivalent used by `Index.tsx`) and reuse the **same** component on V3 instead of the custom V3 footer.
- Guarantee links: Pricing, Free Tools, Docs, Blog, Templates, About, Contact, Privacy, Terms, Cookie, Refund, Security, Status, Sitemap, Newsletter signup, Social.
- Desktop: 4–6 column grid. Mobile: collapsible accordion groups (Radix Accordion, single-open).

### 2. Mobile navbar redesign (V3 only)

- Floating sticky capsule at top with: logo, "Preview ✨" badge, primary CTA always visible, hamburger.
- Hamburger sheet contains: Pricing, Docs, Blog, Free Tools, Search, Sign in.
- Desktop nav unchanged.
- Implementation: extend existing `Navbar` with a `variant="v3-mobile"` branch, or new `NavbarV3Mobile` rendered only below `md`.

### 3. Audience card depth (`WhoItsFor` section)

- Already has progress dots — add:
  - "2 automations active" line
  - "1 approval pending" line
  - tiny horizontal timeline strip beneath the step list
- Derive counts from existing `AUDIENCES` data (`active` index + steps length). No fake metrics.

### 4. Mobile spacing audit

- Reduce on `< md`: card padding (p-6 → p-4), icon size (w-10 → w-8), heading margin-bottom, workflow row height (py-1.5 → py-1), heading clamp.
- Verify with viewport 412×915 (Galaxy S23) screenshot.

### 5. Blog hub expansion

- Replace flat list with: 1 featured (latest), 4 latest in a 2×2 grid, popular-category chips, "Read the docs" link card.
- Pull from existing blog client (`@/integrations/blog/latest`).
- Inspiration: Linear/Stripe/Framer editorial layout.

### 6. "Learn the system" docs section (new lightweight block, not a new feature)

- Cards mapping audience → guide: Freelancer→Client onboarding, Agency→Team workflows, Creator→Content workflows, Coach→Booking flow.
- Pull doc slugs from `src/integrations/docs/client.ts` if available; otherwise hardcode known doc routes.
- Sits between Audience grid and Blog.

### 7. Mobile performance audit

- Confirm `MissionControlScene` (R3F) is gated: `useIsMobile()` → render static fallback, no Three import on mobile.
- Lazy-import all heavy sections via `React.lazy` with `Suspense`.
- Kill any GSAP timelines whose ScrollTrigger target is `display:none` on mobile.
- Spot-check with `browser--performance_profile` at 412×915 after build.

## Explicitly out of scope

Testimonials, partner logos, customer counts, trust claims, new feature sections, percentage rollout, analytics dashboard.

## Files likely touched

- `src/pages/HomepageV3.tsx` (footer swap, spacing, card depth, blog hub, docs section)
- `src/components/Footer.tsx` (verify reusability)
- `src/components/Navbar.tsx` or new `src/components/home/NavbarV3Mobile.tsx`
- `src/components/home/MissionControlScene*.tsx` (mobile gating verification)
- No DB migrations, no new tables, no new edge functions.

## Verification

- Browser at 412×915 (mobile) + 1280×720 (desktop) after each priority.
- Console clean of new errors. CSP/log-event 400s are pre-existing and out of scope.

Shipping order: 1 → 2 → 4 → 3 → 5 → 6 → 7 (footer + nav first because they unblock everything else; perf audit last so it covers final bundle).