---
name: UI Governance
description: Design system standards — spacing, radius, shadows, typography, CTA hierarchy, gradients, animation usage. Apply to every authenticated surface.
type: design
---
# UI Governance — single visual language for HustleAI

Apply to every authenticated surface. Marketing pages keep their lighter,
brighter identity but follow the same primitives.

## Dark mode (paused)
- Dark mode rollout is paused. Do not add new `dark:` variants and do not
  expand dark-token coverage.
- The `<ThemeToggle>` stays visible but, on click, surfaces a sonner toast
  ("Dark mode is currently under maintenance.") instead of toggling.
- `getInitialTheme()` always returns `"light"`; `initTheme()` strips the
  `.dark` class. AppShell mount also force-removes `.dark`.
- Calm mode (motion/gradient reduction) remains fully functional.

## Workspace Copilot (formerly HustleBot)
- User-facing label is **Workspace Copilot** / **Operations Assistant**.
  Internal route (`/hustlebot`), code identifiers, and DB tables stay as-is.
- Launcher must feel native: no pulsing glow, no oversized gradient ring.
  Use `bg-card border border-border shadow-sm`.
- Prefer **contextual** entry points inside tools using
  `<CopilotPrompt prefill="…" label="…" />` over the floating launcher.
  The Copilot listens for `open-hustlebot` events with `{ prefill }` detail.

## Tokens (semantic only — never hardcode)
- Surfaces: `bg-background` (page), `bg-card` (elevated), `bg-muted` (recessed)
- Text: `text-foreground`, `text-muted-foreground`
- Borders: `border-border` (default), `border-border/60` (subtle)
- Brand: `bg-primary` / `text-primary-foreground` (emerald, ≤10% of surface)
- Forbidden in components: `bg-white`, `bg-slate-*`, `text-slate-*`, `border-gray-*`, raw hex

## Spacing scale (Tailwind)
- Section vertical rhythm: `py-8 md:py-12`
- Card padding: `p-4 md:p-6`
- Inline gaps: `gap-2` (tight), `gap-3` (default), `gap-4` (cards)
- Page gutters: `px-4 md:px-8`

## Cards
- Radius: `rounded-xl` (default), `rounded-2xl` (hero only)
- Border: `border border-border`
- Shadow: `shadow-card` (default) — never combine with glow
- Background: `bg-card`

## Typography
- H1 page title: `text-2xl md:text-3xl font-display font-bold tracking-tight`
- H2 section: `text-lg md:text-xl font-semibold`
- Body: `text-sm md:text-base text-foreground`
- Meta/labels: `text-xs text-muted-foreground`
- Eyebrow: `text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground`

## CTA hierarchy
- Primary (one per view): `<Button>` default — emerald solid
- Secondary: `<Button variant="outline">`
- Tertiary: `<Button variant="ghost">`
- Destructive: `<Button variant="destructive">` — confirm dialogs only
- Never stack two primary CTAs side-by-side.

## Gradients & glows
Reserved for: primary CTA hover, AI Fuel surfaces, hero highlights.
Forbidden on: regular cards, list items, sidebars, default buttons, tool grids.
Use `.shadow-glow` and `.ops-glow` sparingly (≤1 per viewport).

## Animation
- Default transitions: `transition-colors duration-150`
- Hover lift: `hover-ops` utility (already calm)
- No bouncy springs; use `ease: "easeOut"`, duration 0.2–0.3s
- All motion must respect `prefers-reduced-motion` and `html.calm`

## Loading / empty states (tool pages)
- Loading: shimmer skeleton matching final layout (never spinners alone)
- Empty: icon + one-sentence guidance + single primary CTA
- Error: muted card + plain language + retry CTA

## Surface roles
- Marketing (`/`, `/platform`, `/how-it-works`, etc.): light only, no dark toggle
- AppShell (`/dashboard`, `/work`, `/workspaces`, …): dark mode opt-in, calm mode opt-in
- Client portal (`/client`, `/portal/:token`): minimal, low-stimulation, no AI showcase

## Review checklist before merging UI
- [ ] No hardcoded `bg-white` / `slate-*` / `gray-*` / hex colors
- [ ] Exactly one primary CTA per viewport
- [ ] At most one gradient/glow element per viewport
- [ ] Card uses `rounded-xl border border-border bg-card shadow-card`
- [ ] Spacing matches the scale above
- [ ] Works in light + dark + calm mode