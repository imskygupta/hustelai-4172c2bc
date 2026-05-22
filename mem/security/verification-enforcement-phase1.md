---
name: Verification Enforcement — Phase 1 (AI Runtime)
description: Patched AI runtime entrypoints with requireVerifiedUser gate + structured denial events
type: feature
---
# Phase 1 Report — AI Runtime Lockdown

## Patched (22)
ai-chatbot, ai-search, workspace-ai, workspace-doc-ai, hustle-blueprint,
hustle-roadmap, hustle-templates, blog-ai-draft, narrative-generate,
narrative-bootstrap, proposal-draft, skill-gap-consultant, tool-matcher,
gig-arbitrage, gig-price-calculator, faceless-content, knowledge-graph,
resume-optimizer, workspace-roadmap, workspace-followup, ai-job-enqueue,
ai-key-test

## Gate pattern
`requireVerifiedUser(req, { denialEvent: "verification_blocked_ai", fn })`
- Fail-closed, returns 401/403/503 with structured payload
- Emits `security_auth_events` row with severity=warn, metadata={fn,reason}
- Placed immediately after OPTIONS preflight, before any business logic

## Deferred to later phases
- ai-job-runner, workflow-runner → Phase 4 (background — guard *enqueue* not *run*; runner must check job creator's status at execute-time)
- workspace-doc-ai/proposal-draft tool *exports* → Phase 2 (export surface)
- BYOK key validation routing → Phase 3

## Risky unknowns (need manual check)
- ai-chatbot/ai-search still contain their own ad-hoc auth blocks after the gate. Harmless (gate runs first) but should be cleaned up in Phase 8 hardening.
- Some AI functions accept service-role calls from other edge functions (notifications-broadcast → ai-*). Verify with logs after deploy that internal callers carry user context, otherwise mark those entrypoints as system-internal and add a service-role bypass token.

## Remaining AI entrypoints not yet enumerated
- editorial-pipeline, editorial-center
- crawl-orchestrator
- blog-intelligence, blog-link-engine, blog-scheduler, blog-automation-audit
- intelligence-anomaly-scan (system cron — Phase 4)
- workspace-doc-ai sub-tasks already covered
