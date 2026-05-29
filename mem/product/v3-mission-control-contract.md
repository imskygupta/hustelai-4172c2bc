# V3 Mission Control — Contract (locked)

V3 is a **visual model of HustleAI's real operating system**, not a decorative 3D scene.
Every node in the scene MUST map 1:1 to a shipped platform capability. No filler.

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

## Scroll choreography (6 scenes, distinct physics per scene)

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

Dark Mission Control aesthetic — `bg-slate-950` end-to-end, gradient washes per scene.
No section may be reusable on V1. No pricing block, no testimonials grid, no feature
pills. Hero shows pain (chaos), not the diagram. Diagram only assembles from scene 2.
Telemetry stream provides environmental storytelling (live ops events, no fake metrics).

## Device rules (strict)

- **Desktop only**: real R3F Mission Control scene.
- **Mobile / tablet / `prefers-reduced-motion` / no-WebGL**: existing isometric fallback. No exceptions (battery, LCP, INP, thermal).
- Lazy-mount canvas behind IntersectionObserver; budget ≤ 180 KB over V1.

## Hard no's

- No spinning cubes, no random floating cards, no fake architecture diagrams.
- No nodes not listed above. No edges not listed above.
- No metrics/numbers that aren't real.
