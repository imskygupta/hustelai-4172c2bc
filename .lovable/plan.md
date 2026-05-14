## Goal

Treat the app as two products served from one codebase:

- `hustlaiapp.in` — marketing, pricing, blog, trust, SEO surfaces
- `workspace.hustlaiapp.in` — authenticated operational cockpit (dashboard, work, CRM, documents, portals, HustleBot)

Plus: pause dark mode rollout, reposition HustleBot as a calm "Workspace Copilot," and keep tightening visual noise.

---

## 1. Domain split (incremental, non-breaking)

Same codebase, host-aware routing — no separate deploy yet.

**Detection helper** `src/lib/host.ts`:
- `isWorkspaceHost()` → host starts with `workspace.`
- `isMarketingHost()` → root domain, `www.`, or preview/lovable hosts
- `WORKSPACE_ORIGIN` / `MARKETING_ORIGIN` constants (env-aware, fallback to current origin in preview)

**App-level routing** (`src/App.tsx`):
- On `workspace.*`: only mount app-shell routes (dashboard, workspaces, clients, documents, hustlebot, work, settings, plans, payment, client portal, tools). Hitting `/`, `/about`, `/pricing`, etc. → redirect to `MARKETING_ORIGIN + path`.
- On marketing host: keep current behavior, but redirect any app-shell route (`/dashboard`, `/work*`, `/workspaces*`, `/clients*`, `/hustlebot`, `/documents*`, `/dashboard/tools*`, `/settings*`) to `WORKSPACE_ORIGIN + path` (preserving query/hash).
- Preview/lovable/localhost hosts: behave as today (both shells available) so devs and the in-product preview keep working.

**Cross-domain CTAs**:
- `Navbar` "Open dashboard" / "Sign in" → absolute URL to workspace host when on marketing.
- Workspace "Marketing site" / footer links → absolute URL to marketing host.
- Helper `appUrl(path)` / `marketingUrl(path)` to centralize.

**Auth/session continuity**:
- Supabase session lives in `localStorage` per origin → cannot share directly across subdomains with current client config.
- Pragmatic step now: when redirecting marketing→workspace for an authed CTA, append `#access_token` is NOT viable; instead rely on the user signing in on workspace host (login already mounted there). Add a short note in `Login.tsx` that the workspace lives on `workspace.*` and ensure post-login redirects stay on workspace host.
- Document a follow-up: switch Supabase storage to a cookie scoped to `.hustlaiapp.in` for true SSO. Out of scope for this pass; called out in memory.

**Vercel**:
- `vercel.json` already SPA-rewrites `/(.*)` → `/index.html`. Same build serves both hosts; no changes needed beyond confirming the `workspace.hustlaiapp.in` domain is attached to the project (user-side).

---

## 2. Dark mode pause

- `ThemeToggle`: keep the icon visible but, on click, show a toast "Dark mode is under maintenance" instead of toggling. Do not write to localStorage; do not add `dark` class.
- `AppShell` mount effect: stop applying persisted dark theme. Force-remove `.dark` from `<html>` on mount.
- Leave existing dark CSS tokens in place (no churn), just don't activate them.
- Calm mode toggle stays fully functional.

---

## 3. HustleBot → "Workspace Copilot"

**Positioning**:
- Rename user-facing label everywhere visible to "Workspace Copilot" (keep internal route `/hustlebot` and code identifiers to avoid breakage; only swap copy).
- Update: `HustleBotIntro` title/body, `Chatbot` launcher tooltip/header, sidebar entry, tool-finder entry, dashboard nudges.

**Visual calm-down** (`src/components/Chatbot.tsx` + launcher):
- Smaller floating button (h-12 w-12 → h-11 w-11), remove pulsing glow / gradient ring, use `bg-card border border-border shadow-sm` with a subtle primary dot.
- Panel header: drop gradient, use solid `bg-card` + `border-b`.
- Reduce entrance animation intensity (respect `html.calm`).

**Contextual entry points**:
- New `<CopilotPrompt context="proposal|intake|client-notes|invoice" label="…" />` component. Fires `open-hustlebot` with a `prefill` detail.
- `Chatbot` listens for `prefill` and seeds the input.
- Drop instances into: `ProposalGenerator` ("Need help drafting this proposal?"), `OnboardingFormBuilder` / intake ("Generate onboarding checklist?"), `Clients` detail ("Summarize client notes?"). Small inline links, not modals.

**Command/search integration**:
- In `AppShell` tool finder, when query has no matches, add a second action row: "Ask Workspace Copilot about '{q}'" → opens copilot with prefill.

---

## 4. Workspace UI cleanup (scoped, incremental)

Don't refactor everything. This pass targets the highest-noise surfaces visible on the cockpit:

- `AppShell` top bar: remove violet-tinted search background, use `bg-muted/40` + `border-border`. Drop the `Command` icon's hard violet, use `text-muted-foreground`.
- Dashboard: audit `ContextualNudge` and `OperationalFlows` for hardcoded gradients; replace ambient gradient backgrounds with flat `bg-card`. Keep one accent-gradient slot for the primary CTA only.
- Remove any oversized hero card on `/dashboard` if duplicated by the cockpit.

(Deeper page-by-page normalization remains the ongoing governance task; this pass keeps it bounded.)

---

## 5. Memory updates

- `mem://tech/workspace-subdomain.md` — host detection, redirect rules, future cookie-based SSO TODO.
- `mem://style/ui-governance.md` — append "Dark mode paused; toggle shows maintenance toast."
- `mem://features/ai-mentor-hustlebot.md` (existing reference in index) — append rename to "Workspace Copilot," contextual prompt pattern, calmer launcher spec.
- Update `mem/index.md` Core to note workspace subdomain split and dark-mode pause.

---

## Files (planned)

**New**
- `src/lib/host.ts`
- `src/components/copilot/CopilotPrompt.tsx`
- `mem/tech/workspace-subdomain.md`

**Edited**
- `src/App.tsx` — host-aware route gating + cross-host redirects
- `src/components/Navbar.tsx`, `src/components/Footer.tsx` — cross-host CTAs
- `src/components/ThemeToggle.tsx` — maintenance toast
- `src/components/AppShell.tsx` — drop dark mount, calmer top bar, copilot label
- `src/components/Chatbot.tsx` — calmer launcher, "Workspace Copilot" copy, prefill listener
- `src/components/HustleBotIntro.tsx` — rename + softer visuals
- `src/pages/tools/ProposalGenerator.tsx`, `src/pages/tools/OnboardingFormBuilder.tsx`, `src/pages/workspace-os/Clients.tsx` — drop in `<CopilotPrompt>`
- `src/pages/Dashboard.tsx` + `src/components/dashboard/ContextualNudge.tsx`, `OperationalFlows.tsx` — flatten gradients
- `mem/index.md`, `mem/style/ui-governance.md`

---

## Out of scope (called out, deferred)

- True cross-subdomain SSO via `.hustlaiapp.in` cookie storage for Supabase — needs a careful auth-storage swap; documented in memory.
- Full dark-mode rewrite — paused.
- Dedicated workspace build/deploy split — single codebase keeps shipping both surfaces.
