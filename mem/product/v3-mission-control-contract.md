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

## Scroll choreography (5 scenes)

Narrative arc (transformation, not feature tour):

1. **Before** — "Your business is in nine tabs." Inputs layer materializes, chaos resolves.
2. **Capture** — "Everything lands in one place." Planning layer activates.
3. **Automation** — "Work starts moving without you." Intelligence layer ignites.
4. **Delivery** — "Deliverables ship themselves." Execution + Delivery layers light up.
5. **Outcomes** — "Money lands. Work repeats." Outcomes layer settles, invoice→payment pulse.

Camera drifts downward through layers as phase advances (depth movement, not pinning).
Per-scene color wash + right-side progress rail + scene counter (no bouncing arrows).
Copy must speak transformation ("never chase a payment again"), never feature listing.

Not a spinning model. Story-driven scrubbed timeline.

## V3 personality (locked)

Dark Mission Control aesthetic — `bg-slate-950` end-to-end, gradient washes per scene.
No section may be reusable on V1. No pricing block, no testimonials grid, no feature
pills. Replace with: Chaos hero, narrative arc, Before/After contrast, emotional close.
Telemetry stream provides environmental storytelling (live ops events, no fake metrics).

## Device rules (strict)

- **Desktop only**: real R3F Mission Control scene.
- **Mobile / tablet / `prefers-reduced-motion` / no-WebGL**: existing isometric fallback. No exceptions (battery, LCP, INP, thermal).
- Lazy-mount canvas behind IntersectionObserver; budget ≤ 180 KB over V1.

## Hard no's

- No spinning cubes, no random floating cards, no fake architecture diagrams.
- No nodes not listed above. No edges not listed above.
- No metrics/numbers that aren't real.
