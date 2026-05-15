---
name: workspace-premium-os
description: Workspace.* is a cinematic, dark, exclusive execution surface with a portal-gate auth experience and BYOK "AI Fuel" positioning
type: feature
---

# Workspace Premium OS

Positioning: workspace.hustlaiapp.in is **the product** — a dark, cinematic
execution kingdom for agencies/freelancers. Marketing host (hustlaiapp.in)
stays a discovery + billing surface. The two surfaces must feel different.

## Auth as a portal, not a form

- Workspace routes are wrapped by `WorkspaceAuthGate` (not `RequireAuth`).
- No session → render `<PortalGate />`: cosmic background, twinkling stars,
  spinning conic-gradient ring, copy: *"Oh no dear… seems you arrived
  without your magic powers ✨"* + a single CTA back to
  `hustlaiapp.in/workspaces`. Never a generic "please log in" error.
- Loading state is a small spinning portal ring with "Opening portal…",
  not a spinner.
- When the cross-host handoff is detected (`access_token=` in URL hash on
  first paint) and the user resolves, briefly show a "Welcome back. Your
  throne awaits." overlay (~1.7s) before fading into the cockpit.
- Wording: always say **portal access / workspace access token** — never
  "magic link".

## Header / topbar (workspace host only)

- Logo wrapped in the brand `--ws-gradient` with emerald glow.
- Live presence dot (`.ws-presence`) + "Live" + provider chip
  (`<ProviderChip>`): green dot + provider/model when a key is connected,
  amber "No AI fuel" when not.
- Account avatar dropdown contains:
  - **Leave workspace** → returns to `hustlaiapp.in/workspaces` without
    signing out (session preserved).
  - **Sign out** → kills the supabase session and returns to the marketing
    portal page. Tagline: *"You can always re-enter through your HustleAI
    portal."*
- Dark glass top bar with a hairline gradient line under it.

## Ambient surface

- `.ws-ambient` fixed radial-gradient layer behind the cockpit on workspace
  host only (skipped on dual/marketing host so light mode stays usable).
- All portal animations are CSS keyframes (no canvas / particle JS) — GPU
  friendly: `ws-portal-breathe`, `ws-twinkle`, `ws-orb-float`, `ws-ring-spin`,
  `ws-presence-pulse`.

## AI Providers = "AI Fuel · BYOK"

- `AISettings` page now opens with a cinematic hero badged **AI Fuel · BYOK**
  with the line *"Use your own AI power. Unlimited workflows. No platform
  credits."* and four micro-benefit tiles (Cheaper / Faster / Yours /
  Limitless). This is the workspace's strongest differentiator and must
  remain visually loud.

## Files

- `src/components/workspace/PortalGate.tsx`
- `src/components/workspace/WorkspaceAuthGate.tsx`
- `src/pages/workspace-os/WorkspaceOS.tsx` (header + ambient)
- `src/pages/workspace-os/AISettings.tsx` (BYOK hero)
- `src/styles/workspace.css` (portal/ambient/presence keyframes)
- `src/App.tsx` (workspace host root uses `WorkspaceAuthGate`)