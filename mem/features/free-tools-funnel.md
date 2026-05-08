---
name: Free Tools Funnel
description: Public browser-only utility tools at /tools/* used as SEO + PLG signup funnel. No API/AI calls on public pages.
type: feature
---

**Strategy**: Free, browser-only tools at `/tools/*` to capture high-intent freelancer search traffic and convert via signup gate on Download/Save actions. Zero AI/API cost on public pages.

**Live tools (Phase 1)**:
- `/tools` — hub page (SEO pillar)
- `/tools/invoice-generator` — GST invoice builder, live preview, browser print
- `/tools/proposal-generator` — 4 pre-built scopes (web/social/consulting/video)
- `/tools/contract-generator` — Freelance / NDA / web-dev / social media agreements

**Pattern**:
- All state in `useState` + `localStorage` (per-tool key `hustleai-tool-*-v1`)
- Live A4 preview alongside form
- Gated actions (Download PDF) trigger `ToolGateDialog` from `src/components/tools/ToolGate.tsx` via `useToolGate(name, action)` hook
- Authenticated users skip the gate and trigger `window.print()` (browser PDF export with print-only CSS)
- Templates live in `src/lib/tools/templates.ts`

**Distinct from SEO landings**: existing `/proposal-generator`, `/ai-invoice-generator` etc. are marketing pages (in `src/pages/seo/landings.tsx`). The actual working tools are at `/tools/*` — keep them separate.

**Roadmap (Phase 2, not built)**: Pricing Calculator, Bio Generator, Onboarding Form Builder, Pomodoro widget, Content Calendar.
