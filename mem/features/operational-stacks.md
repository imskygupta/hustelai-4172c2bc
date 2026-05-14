---
name: Operational Stacks & Stories
description: Curated operator dependency journeys at /systems and workflow-setup stories at /stories
type: feature
---
- `/systems` lists curated OPERATIONAL_STACKS (src/lib/operational-stacks.ts) — operator dependency progressions (lead → proposal → onboarding → invoice → delivery → retention) mapped to existing tool routes.
- `/systems/:slug` renders stages with HowTo JSON-LD; cross-links operator stories + related stacks.
- `/stories` and `/stories/:slug` render OPERATOR_STORIES (src/lib/operator-stories.ts) — workflow setups (NOT testimonials, NO fake metrics). Each story maps to one or more stack slugs.
- `StackBadge` (src/components/blog/operational/StackBadge.tsx) auto-injects "Part of an operational stack" cards into blog posts via keyword match (tags + category + title).
- Insights index (`/insights`) shows a `StacksRail` linking into /systems.
- Stacks/stories are typed catalogs (no DB) so they're safe editorial content; behavioral data refines recommendations elsewhere.
