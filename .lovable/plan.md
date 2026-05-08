## Goal
Build a free-tools SEO/PLG funnel for HustleAI — browser-only utilities (zero AI/API cost) that rank for high-intent freelancer queries and convert visitors into signups.

## Phase 1 — Ship 3 tools (this round)

Public marketing pages, no login required to *use*. Signup gate triggers on **Export PDF / Save / Share** actions. Existing `SignupCTADialog` pattern reused.

### Routes (all public, indexable)
- `/tools` — hub/landing page listing all free tools (SEO pillar page)
- `/tools/invoice-generator` — GST-ready invoice builder, live PDF preview
- `/tools/proposal-generator` — freelance/agency proposal builder with templates
- `/tools/contract-generator` — freelance contract / NDA / web-dev agreement

### Tool UX (shared pattern)
1. Left = form fields, Right = live A4 preview (uses existing `ThemedSurface` + template architecture from `workspace-docs`)
2. Local state only (`useState` + `localStorage` for draft persistence)
3. **Free actions:** edit, preview, switch template, print preview (browser print)
4. **Gated actions:** Download PDF, Save to workspace, Share link → opens `SignupCTADialog` with contextual copy ("Sign up free to download your invoice")
5. After signup, redirect back to tool with draft restored from `localStorage`

### Reuse existing infra
- PDF export: `src/lib/workspace-docs/export-pdf.ts`
- Templates: `InvoiceTemplate`, `ProposalTemplate`, `AgreementTemplate` (already in `src/components/workspace-docs/templates/`)
- Theme picker: `ThemePicker` for visual variants
- Signup dialog: `SignupCTADialog` (extend with `action` prop for context-aware copy)

### SEO
- `<SEO>` component on each page with intent keywords:
  - Invoice: "Free GST Invoice Generator for Freelancers — HustleAI"
  - Proposal: "Free Freelance Proposal Generator & Template — HustleAI"
  - Contract: "Free Freelance Contract & NDA Generator — HustleAI"
- JSON-LD `SoftwareApplication` schema per tool
- Single H1, FAQ section (use existing `FaqSection`), breadcrumbs
- Add all 4 routes to `public/sitemap.xml`

### Navbar / Footer
- Add **Free Tools** dropdown to public Navbar (Invoice / Proposal / Contract / View all)
- Add **Free Tools** column to Footer

## Phase 2 — (queued, not built now)
Pricing Calculator, Bio Generator, Onboarding Form Builder, Pomodoro widget, Content Calendar.

## Files to create
```
src/pages/tools/ToolsHub.tsx
src/pages/tools/InvoiceGenerator.tsx
src/pages/tools/ProposalGenerator.tsx
src/pages/tools/ContractGenerator.tsx
src/lib/tools/contract-templates.ts   (3-4 boilerplate contracts)
src/lib/tools/proposal-templates.ts   (3-4 proposal scaffolds)
src/components/tools/ToolGateButton.tsx  (wraps gated actions → SignupCTADialog)
src/components/tools/ToolPageShell.tsx   (shared header/footer/SEO wrapper)
```

## Files to edit
- `src/App.tsx` — register 4 routes (public, outside AppShell)
- `src/components/Navbar.tsx` — add "Free Tools" dropdown
- `src/components/Footer.tsx` — add Free Tools column
- `src/components/SignupCTADialog.tsx` — accept `action`/`title`/`subtitle` props for context
- `public/sitemap.xml` — add new URLs
- `mem://index.md` + new `mem://features/free-tools-funnel.md` — record the strategy

## Out of scope (intentionally)
- No backend tables (everything client-side until signup)
- No AI calls on public pages — strictly template + form logic
- No "Save to cloud" feature on public route — that's the signup hook
