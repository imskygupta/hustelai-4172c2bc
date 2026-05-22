---
name: ux-friction-audit
description: UX friction audit — canvas/execution loops, landing/identity clarity, docs as onboarding engine, AI runtime perception
type: feature
---

# UX Friction Audit (Phases B, C, D, F)

Companion to `workspace-consolidation-v2` (Phase A) and `route-reduction-plan` (Phase E).
UX-only. No infra. No telemetry. No new admin views.

---

## B. Canvas + Execution UX

### Friction inventory
1. **No persistent working memory.** Reload `/canvas` and the prompt context is gone. Users restart from zero.
2. **Unclear AI actions.** Buttons say "Generate" / "Run" — the user can't predict the output shape (doc? table? draft? message?).
3. **Weak execution loops.** Output appears once and dies. No "iterate on this" affordance, no "send to project".
4. **Modal soup.** Provider picker, model picker, settings, save dialogs — 4 modal layers stack during one execution.
5. **No session continuity.** Switching tabs (Canvas → Project → Canvas) loses in-flight state.
6. **No resumability for long jobs.** AI job queue exists but UI doesn't reflect "this is running in the background — come back later".

### Fix direction (no new infra)
- **Persistent canvas session**: cache last prompt + last output in `localStorage` keyed by `(user, canvas)`. Restore on mount.
- **Action verbs**: rename CTAs to outcomes — "Draft proposal", "Summarize call notes", "Generate invoice line items". Already established pattern in `ProjectQuickActions`.
- **Result-as-document**: every output gets pinned to `workspace_outputs` automatically and shows "Open in project" / "Iterate" buttons inline.
- **Collapse modals into a single sticky sidebar.** Provider + model + settings live in one rail, never as overlapping dialogs.
- **Tab-switch continuity**: in-flight `ai-job-enqueue` jobs surface as a toast that survives navigation ("Proposal still drafting — view").
- **Execution-first layout**: prompt input at top, output below, iteration controls underneath. No tabs, no accordions.

### Command palette as primary flow
⌘K becomes the dominant execution surface across the cockpit:
- type intent → choose target project → run.
- Recently-used commands at top.
- Same palette opens from any workspace route — single muscle memory.

---

## C. Landing Page + Identity

### Current problem
Page reads as "we have many AI tools." Visitor leaves without grasping the product.

### Positioning lock
> **HustleAI is the AI Freelancer OS.**
> One workspace for clients, projects, money, and AI execution.

Every above-the-fold word must reinforce this. Drop "AI tools", "platform", "suite".

### 10-second comprehension test
A first-time visitor must finish 10s knowing:
1. **What** — "Operating system for freelancers."
2. **For whom** — "freelancers, agencies, creators."
3. **Why now** — "AI does the drafting; you stay in control."
4. **Proof** — one testimonial OR one live metric (e.g. "12,400 invoices sent this month").
5. **Next step** — single primary CTA: "Open your workspace".

### Hierarchy rewrite

```text
H1   "The AI Freelancer OS"
sub  "Run clients, projects, money, and AI in one workspace."
CTA  [ Open your workspace ]   (secondary: "See how it works")
proof  1 line · social proof or live counter
hero   single product screenshot — /workspace Overview, real data
```

### What to remove from landing
- Feature grids with >6 tiles
- Multiple competing CTAs (currently 4+ above the fold)
- Logo walls until we have 6+ real ones
- Animated marquee carousels of tools
- "Why HustleAI" + "How it works" + "Features" + "Use cases" stacked walls

### What to add
- ONE screenshot of `/workspace` Overview (real, not mockup).
- ONE 30-sec workflow GIF: prompt → output → pinned to project.
- ONE trust line: data residency / no-training-on-your-data / cancel anytime.

### CTA structure
Primary CTA appears 3 times max: hero, mid-page after workflow demo, footer.
Stop sprinkling "Sign up" buttons in every section.

---

## D. Docs System Recovery + Evolution

Docs already audited in `mem/runtime/docs-recovery-audit.md` — pipeline healthy.
This memo defines product role, not infra.

### New role for docs
Docs is not a reference manual. It is the:
1. **Onboarding engine** — first 5 docs are "Day 1", "Day 2", "Send your first invoice", "Pin your first AI output", "Connect a provider".
2. **Workflow education layer** — every doc maps to ONE concrete workflow.
3. **Contextual help system** — every workspace section gets a "Learn this in 60s" link → docs slug.
4. **Feature discovery** — new features added to a "What's new" doc category, surfaced in cockpit only when relevant.

### Route restoration
Canonical: `/docs`, `/docs/:slug`. Verify both render via `docs-read-public`.
Verify `/docs` sitemap entry is in `public/sitemap.xml`.

### In-app contextual linking map
Each workspace section gets ONE help link in its header:

| Section | Help slug |
|---|---|
| `/workspace` overview | `getting-started` |
| `/workspace/clients` | `crm-basics` |
| `/workspace/pipeline` | `pipeline-flow` |
| `/workspace/revenue` | `invoices-and-time` |
| `/workspace/roadmap` | `deadlines` |
| `/workspace/library` | `brand-kit-and-blocks` |
| `/workspace/settings` | `connect-ai-provider` |
| `/canvas` | `canvas-quick-start` |
| `/hustlebot` | `mentor-how-to-ask` |

If a slug doesn't exist yet, write the doc — don't add the link.

### Discovery rules
- Surface "What's new" tooltip on a feature ONCE per user, then never again.
- Never surface unrelated features mid-workflow (no "did you know?" interrupts).

---

## F. AI Runtime Experience

Infra is stable (`runtime-stability-verification.md`). This is about *perception*.

### Latency perception
- **Optimistic UI** for AI calls under 3s: show skeleton with the user's prompt echoed back immediately.
- **Progressive disclosure** for 3–8s calls: stream the response token-by-token even if backend returns whole; the *appearance* of progress matters.
- **Background mode** for 8s+ calls: dismiss to a "Running…" pill in the header; toast on completion.

### Loading states
- One canonical skeleton style for AI output (already in design system as shimmer). Stop using spinners.
- Loading copy: rotate motivational tips (already established pattern). Never just "Loading…".

### Trust & confidence
- Every AI output gets a tiny footer: `Generated by <model> · <timestamp> · [Regenerate]`.
- Watermark on generated images/PDFs (already established pattern).
- "Why this output?" expandable explainer for proposals/contracts (the AI's stated reasoning, not chain of thought — a 1-line summary).

### Interruption handling
- If user navigates away mid-generation: keep job running, show toast on return.
- If the 8s deadline fires (`runWithDeadline`): show "Taking longer than usual — keep waiting or run again" — NOT a dead error.
- Failed jobs auto-suggest "Retry with smaller scope" instead of just error text.

### Resumability
- `workspace_outputs` already persists every result. Surface the last 5 in the cockpit Overview ("Recent AI outputs") and inside each project.
- A failed/canceled job stays in the list with a "Resume" button.

### Memory continuity (no new tables)
- Reuse `workspace_outputs` + project context as implicit memory: every new AI run inside a project auto-injects the last 3 outputs as context.
- Surface to user: "Using context from: Proposal draft, Client brief, Last invoice".

---

## Acceptance signals

We're done with this audit when:
- Time-to-first-AI-output (signup → first generation) ≤ 90s.
- 95% of frequent actions ≤ 2 clicks from `/workspace`.
- Landing page: visitor can answer "what is this?" in 10s.
- Zero permanent spinners under any failure mode.
- Every workspace section has a working contextual docs link.
