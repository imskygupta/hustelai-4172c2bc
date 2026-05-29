# V3 — Contract (locked) — "The Quiet Machine"

V3 is a **bright, editorial, Awwwards-style marketing experience** about the
user's transformation, NOT a product architecture diagram. The cinematic 3D
scene is one memorable centerpiece *inside* a larger narrative — never the
whole page. The user is the center of the page; the workflow graph is the
payoff.

## Visual identity (locked)

- Base surface: `#FBF7F1` warm cream (`bg-[#FBF7F1]`) end-to-end on light frame.
- Cinematic block keeps a dark canvas (the 3D scene) but lives inside a
  bright rounded `rounded-[2.5rem]` frame so it reads as an editorial photo,
  not a dashboard.
- Ink: `#1A1A1F` for type. Accents: coral `#FF7A45`, peach `#FFB37A`,
  yellow `#FFE27A`, lavender mist `#E8DFF3`. Sunrise gradient sparingly.
- Typography: `font-display` (editorial) at very large sizes for headlines.
- Cards: `rounded-3xl`, generous padding, warm soft shadows, no neon.
- Motion: GSAP + ScrollTrigger only. Native scrolling preserved. Word-reveal
  headings via a custom `splitWords` util (no paid GSAP plugins).

## Page structure (locked order)

1. V3Nav — floating glass capsule navbar
2. Hero — positioning in 5 seconds + who it's for
3. WhoItsFor — six animated audience cards
4. ProblemEmotion — three "Stop ___" panels
5. Cinematic — the 6-scene 3D experience contained in a bright frame
6. Transformation — Before/After lived-experience strip
7. Workflows — four audience-specific flows
8. Proof — real-capability activity feed (no fake metrics)
9. V3CTA — "Run your business like software."
10. V3Footer — light footer

The cinematic block stays scroll-scrubbed but copy lives *beside* the canvas,
never overlapping it. Mobile / reduced-motion / no-WebGL → bright illustrated
fallback (no dark gradient).

## Allowed inventory (unchanged)

## Allowed layers & nodes (only these)

1. **Inputs** — Clients · Leads · Opportunities · Requests
2. **Planning** — Workspace · Roadmaps · Projects · Tasks
3. **Intelligence** — HustleBot · AI Workspace · Document AI · Research
4. **Execution** — Proposals · Contracts · Invoices · Exports
5. **Delivery** — Telegram · Client Portal · Shared Links · Notifications
6. **Outcomes** — Approvals · Payments · Retention · Repeat Work

## Allowed edges (only real platform relationships)

Primary spine:
Client → Proposal → Approval → Contract → Delivery → Invoice → Payment

Secondary spine:
Client → Workspace → AI → Export → Telegram

No other edges. No decorative connections.

## Scroll choreography (6 scenes — unchanged physics, calmer amplitudes)

Story arc — emotional state changes, never a feature tour. The system diagram
is the **payoff**, not the opener. Scene 1 must read as pain, not architecture.

1. **Bottleneck** — "Your business works. But only when you do." Chaotic drift:
   nodes float with random velocities, no grid, no edges, low emissive. Visible
   labels are pain artifacts (WhatsApp, Missed follow-up, Proposal draft,
   Invoice pending, Client waiting) — not module names.
2. **Capture** — "Everything enters one operating layer." Magnetic convergence:
   floating items lerp into their layer grid positions; edges fade in faintly.
3. **Intelligence** — "Work starts moving without permission." Pulse propagation:
   energy travels along edges from Inputs → Planning → Intelligence → Execution.
4. **Delivery** — "Work leaves the building." Outbound packets fly from
   Execution outward to Delivery nodes (Telegram, Portal, Shared Links).
5. **Revenue** — "The first payment is work. The second is a system." Circular
   loops orbit the Outcomes layer (Invoice → Payment → Retention → Repeat).
6. **Reveal** — "You stopped running tasks. You started running an OS." Camera
   pulls way back, the whole machine resolves at once with all layers lit.

Per-scene color wash + right-side progress rail + scene counter (no bouncing
arrows). Copy must speak transformation, never module names.

Not a spinning model. Story-driven scrubbed timeline with distinct physics.

## V3 personality (locked)

Bright editorial aesthetic — cream/peach/coral. No section may be reusable on V1.
No pricing block. Hero is human and positioning-first (NOT chaos). Cinematic
block is contained, not full-bleed dark. Telemetry stream stays as
environmental storytelling but rendered in warm light tokens.

## Hard no's (updated)

- No dark slate-950 page background. Dark only lives inside the cinematic canvas frame.
- No spinning cubes, no random floating cards, no fake architecture diagrams.
- No nodes or edges outside the inventory.
- No metrics/numbers that aren't real.
- No paid GSAP plugins (no ScrollSmoother / SplitText / DrawSVG club).
- No Lenis. Native scrolling only.

## Device rules (strict)

- **Desktop only**: real R3F Mission Control scene.
- **Mobile / tablet / `prefers-reduced-motion` / no-WebGL**: existing isometric fallback. No exceptions (battery, LCP, INP, thermal).
- Lazy-mount canvas behind IntersectionObserver; budget ≤ 180 KB over V1.

## Hard no's

- No spinning cubes, no random floating cards, no fake architecture diagrams.
- No nodes not listed above. No edges not listed above.
- No metrics/numbers that aren't real.
