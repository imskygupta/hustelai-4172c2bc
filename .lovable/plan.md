# Adaptive Cockpits — Persona-driven Lenses

Goal: same database, same tools — different default view per user persona. Nothing is removed; everything is re-ranked and grouped.

## 1. Persona model

Add a `profile_mode` to profiles:

- `freelancer` | `creator` | `agency` | `consultant` | `coach` | `operator`
- Default: `freelancer`
- Settable from: onboarding (Homepage V3 persona tabs), Settings, and a header switcher.

Migration:

- `ALTER TABLE public.profiles ADD COLUMN profile_mode text DEFAULT 'freelancer';`
- Lightweight `useProfileMode()` hook with React Query + localStorage fallback for guests so Homepage clicks pre-seed the mode before signup.

## 2. Cockpit config (single source of truth)

`src/config/cockpits.ts` exports one record per persona:

```ts
type Cockpit = {
  mode: ProfileMode;
  todaySteps: { label: string; href: string; icon: LucideIcon }[];   // 4 steps
  priorityTools: string[];        // tool ids, ordered
  sidebarOrder: string[];         // section ids, ordered
  dashboardWidgets: string[];     // widget ids, ordered
  ctaDestination: string;         // primary CTA route
};
```

Presets:

- **Freelancer** — Today: Find Client → Send Proposal → Get Paid → Deliver. Tools: Proposal, Contract, Invoice, Red Flag, Pricing Calc.
- **Creator** — Today: Research → Create → Publish → Monetize. Tools: Faceless Content, Calendar, Lead Finder, Growth.
- **Agency** — Today: Clients → Team → Delivery → Revenue. Sidebar promotes Workspace OS.
- **Consultant** — Today: Discovery → Strategy → Proposal → Retainer.
- **Coach** / **Operator** — sensible defaults (reuse Consultant/Agency for v1).

## 3. UI changes (presentation only, no tools removed)

- **Dashboard `TodayCockpit` (new):** top-of-page card driven by `cockpit.todaySteps` — 4 numbered actions, replaces nothing, sits above Operations Today.
- `**OperationsTodayCard`, `ClientsHeadlineCard`, `RecentClientActivityFeed`, `ResumeWorkflow**` — re-ordered by `dashboardWidgets`.
- `**AppSidebar`:** reorder existing groups by `sidebarOrder`. Group renames (no deletions):
  - `Client OS` → Clients, Activity, Portals, Intake, Retainers
  - `Document Studio` → Proposal, Invoice, Contract, Cards, Templates
  - `Discovery` → HustleBot, Explore, Blueprint, Ideas
  - All other items remain available; just collapsed by default outside the active persona's priority set.
- **Header persona switcher:** small pill ("Freelancer ▾") next to workspace selector. Changing it instantly re-renders dashboard + sidebar.
- **Search / Tools Hub:** unchanged — always exposes everything.

## 4. Onboarding wiring

- Homepage V3 persona tabs (`Freelancer / Creator / Agency / Consultant`): on click → store `pendingMode` in localStorage.
- On signup completion → write `profile_mode` to `profiles`.
- First dashboard load → opens directly in that cockpit.

## 5. Out of scope (intentionally)

- No deletions of tools, pages, or routes.
- No new generators (Email Generator still parked).
- No persona-specific data — same `work_clients`, `work_deliveries`, etc.
- Coach/Operator personas ship as aliases of Consultant/Agency for v1; dedicated configs later.

## Files

New:

- `supabase/migrations/<ts>_profile_mode.sql`
- `src/config/cockpits.ts`
- `src/hooks/useProfileMode.ts`
- `src/components/dashboard/TodayCockpit.tsx`
- `src/components/layout/PersonaSwitcher.tsx`

Edited:

- `src/pages/Dashboard.tsx` (mount TodayCockpit, reorder widgets via cockpit config)
- `src/components/AppSidebar.tsx` (reorder + regroup by cockpit config; nothing removed)
- `src/pages/Homepage*.tsx` (persist persona click to localStorage)
- `src/pages/auth/*` (write profile_mode on signup)
- `mem/features/adaptive-cockpits.md` (new memory)

## Validation

- Switch persona in header → dashboard "Today" steps + sidebar order update without reload.
- All previously-reachable routes still reachable via Search / Tools Hub.
- New signup from Homepage "Agency" tab lands in Agency cockpit.  
  
  
This is the right direction.
  I'd make **one refinement before Lovable builds it**:
  ### Don't store only `profile_mode`
  Store:
  ```ts
  profile_mode
  profile_mode_locked

  ```
  Example:
  ```ts
  freelancer
  creator
  agency
  consultant
  coach
  operator

  ```
  and
  ```ts
  profile_mode_locked = false

  ```
  Reason:
  A freelancer can later become an agency.
  You don't want onboarding permanently locking the product.
  ---
  ## I'd also evolve your model slightly
  Instead of:
  ```ts
  profile_mode

  ```
  thinking only as a persona,
  think:
  ```ts
  Operating Style

  ```
  Because users don't identify cleanly.
  Example:
  ```text
  Creator + Agency
  Coach + Consultant
  Freelancer + Operator

  ```
  So V1:
  ```ts
  profile_mode

  ```
  is perfect.
  Later:
  ```ts
  primary_mode
  secondary_mode

  ```
  can exist.
  No migration pain.
  ---
  # Biggest thing I would add
  Your Dashboard currently has:
  ```text
  Operations Today
  Clients
  Activity
  Resume Workflow

  ```
  For Adaptive Cockpits I would add:
  ```text
  TodayCockpit

  ```
  but make it visually dominant.
  Not another card.
  Make it the hero.
  ---
  Freelancer:
  ```text
  TODAY

  1. Find Client
  2. Send Proposal
  3. Deliver Work
  4. Get Paid

  [ Start Proposal ]

  ```
  Creator:
  ```text
  TODAY

  1. Research
  2. Create
  3. Publish
  4. Monetize

  [ Open Content OS ]

  ```
  Agency:
  ```text
  TODAY

  1. Client Health
  2. Team Workload
  3. Delivery Queue
  4. Revenue

  [ Open Workspace ]

  ```
  This becomes:
  > "What should I do next?"
  which is the most valuable dashboard question.
  ---
  # About the sidebar
  I strongly recommend:
  ### Don't reorder everything aggressively.
  Users hate:
  ```text
  Freelancer Mode
  Sidebar A

  Agency Mode
  Sidebar B

  ```
  because muscle memory breaks.
  Instead:
  ### Pin + Highlight
  Keep:
  ```text
  Overview
  Tools
  Projects
  Clients
  Roadmap
  ...

  ```
  same order.
  But add:
  ```text
  ⭐ Recommended

  ```
  at the top.
  Example:
  Agency:
  ```text
  ⭐ Clients
  ⭐ Projects
  ⭐ Revenue
  ⭐ Team

  ```
  then normal sidebar below.
  Much safer UX.
  ---
  # Homepage V3 integration
  This is where it becomes powerful.
  Current:
  ```text
  Freelancer
  Creator
  Agency
  Consultant

  ```
  tabs are just marketing.
  After this change:
  ```text
  Click Agency
  ↓
  localStorage.pendingMode = agency
  ↓
  signup
  ↓
  dashboard
  ↓
  agency cockpit
  ↓
  workspace
  ↓
  agency workflows preselected

  ```
  Now Homepage V3 isn't marketing anymore.
  It's product onboarding.
  Huge difference.
  ---
  # One more thing I'd tell Lovable
  Create:
  ```ts
  src/config/cockpits.ts

  ```
  but include:
  ```ts
  emptyState

  ```
  inside every cockpit.
  Example:
  ```ts
  {
    mode: "freelancer",

    emptyState: {
      title: "Get your first client",
      cta: "/proposal-generator"
    }
  }

  ```
  Agency:
  ```ts
  {
    mode: "agency",

    emptyState: {
      title: "Create your first project",
      cta: "/workspace/projects/new"
    }
  }

  ```
  Then all empty screens become persona-aware automatically.
  ---
  ### Priority order I'd ship
  **Phase A**
  - profile_mode column
  - localStorage onboarding handoff
  - cockpit config
  - TodayCockpit hero
  - persona switcher
  **Phase B**
  - sidebar recommendations
  - widget reordering
  - persona-specific empty states
  **Phase C**
  - workspace-aware cockpit
  - agency workspace defaults
  - creator workspace defaults
  - consultant workspace defaults
  That gets you 80% of the value with 20% of the engineering effort and keeps all your existing tools intact.