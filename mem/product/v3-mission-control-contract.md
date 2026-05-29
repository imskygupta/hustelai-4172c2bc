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

1. **Incoming work** — Inputs layer materializes (Client nodes appear)
2. **Work gets organized** — Planning layer activates (Workspace lights)
3. **AI assists execution** — Intelligence layer ignites; Execution begins
4. **Deliverables leave the system** — Exports animate outward to Delivery
5. **Revenue returns** — Invoice → Payment lights up; Outcomes layer settles

Not a spinning model. Story-driven scrubbed timeline.

## Platform pillars to surface beside the scene

Proposal Engine · Invoice Engine · AI Workspace · Client Portal · Telegram Delivery · Workflow OS.
Goal: visitor understands the scale of HustleAI within 15 seconds.

## Device rules (strict)

- **Desktop only**: real R3F Mission Control scene.
- **Mobile / tablet / `prefers-reduced-motion` / no-WebGL**: existing isometric fallback. No exceptions (battery, LCP, INP, thermal).
- Lazy-mount canvas behind IntersectionObserver; budget ≤ 180 KB over V1.

## Hard no's

- No spinning cubes, no random floating cards, no fake architecture diagrams.
- No nodes not listed above. No edges not listed above.
- No metrics/numbers that aren't real.
