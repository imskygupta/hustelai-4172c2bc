# Client Document Workspace (v2 of PDF Studio)

Rebuild the current parse-to-blocks tool into a **hybrid canvas document editor**: original PDF stays pixel-perfect as a background layer, AI-extracted fields become editable overlays, and the user's Brand Kit (logo, colors, typography, footer, signature) auto-applies to every new revision. Replaces "PDF Studio" naming with **Client Document Workspace** and becomes the single entry point for Proposal, Contract, NDA, Invoice, Quotation, and ad-hoc PDF uploads.

## User experience

1. Open `Documents` from the workspace (replaces the PDF Studio card; old Proposal/Contract/Invoice tools redirect here).
2. Choose entry:
  - **Upload PDF** (new) → required client selection → AI extracts overlay structure.
  - **Start from template** → Proposal / Contract / NDA / Invoice / Quotation, pre-themed with Brand Kit.
  - **Continue from client** → see the client's document timeline.
3. Editor opens with two synced layers:
  - **Background:** original PDF rendered with `pdf.js` (preserved verbatim).
  - **Overlay:** editable fields (totals, dates, names, line items, signatures) positioned by AI-detected bounding boxes.
4. Right panel tabs: **AI Assist** (instruction → diff → accept → new revision), **Brand** (toggle "apply brand kit" — replaces background with regenerated branded version while keeping overlay edits), **Share** (public link, comments, approval, revision request), **Activity** (revisions + client annotations).
5. Public viewer shows latest revision; clients can comment, request changes, or approve. All events flow into the client timeline + notifications.

## Architecture

```text
upload.pdf
    │
    ├── stored as-is in pdf-studio bucket            (background source of truth)
    │
    ├── pdf.js renders each page → <canvas>          (preserved pixels)
    │
    └── pdf-studio-extract (AI + bbox)
           │
           ▼
        overlays_json: [{ page, bbox, kind, value, brand_lock }]
           │
           ├── editor mutates overlays
           ├── AI revise creates new revision (immutable)
           └── "Apply Brand Kit" pipes overlays through template renderer
                 → regenerated background PDF + same overlays
```

## Data model changes

Reuse current tables, add fields + a unified `doc_kind`:

```text
pdf_studio_documents
  + client_profile_id   (NOT NULL going forward; backfill nullable old rows)
  + doc_kind            ('upload' | 'proposal' | 'contract' | 'nda' | 'invoice' | 'quotation')
  + brand_applied       boolean default false
  + status              ('draft' | 'shared' | 'approved' | 'revision_requested')

pdf_studio_revisions
  + overlays_json       jsonb     (new — replaces blocks_json as primary)
  + background_pdf_path text      (original or regenerated branded)
  + brand_snapshot      jsonb     (logo/colors/fonts at the time)
  (keep blocks_json for backward-compat; populate from overlays when missing)

pdf_studio_share_links     unchanged
pdf_studio_annotations
  + kind                ('comment' | 'change_request' | 'approval')
```

Migration: add columns, backfill `doc_kind='upload'`, leave existing rows readable.

## Edge functions

- `pdf-studio-extract` (replaces `pdf-studio-parse`): receives raw text + page dimensions; returns structured `overlays_json` with bounding boxes, field kinds, and brand-lockable flags. v1.
- `pdf-studio-revise` (existing): unchanged contract, operates on `overlays_json` instead of `blocks_json`.
- `pdf-studio-rebrand` (new): takes a revision id, fetches user's brand kit, renders branded background PDF (server-side via existing template renderer), uploads to bucket, returns new revision id.
- `pdf-studio-template-create` (new): instantiates a template (proposal/contract/nda/invoice/quotation) pre-filled with Brand Kit → first revision with both background and overlays.

All gated by `enforceAIQuota` and tier check (`pro|elite|infinity`).

## Frontend

- New route group: `/dashboard/documents` (canonical) and `/dashboard/documents/:id`. Keep `/dashboard/tools/pdf-studio` as redirect for backward links.
- New components in `src/pages/workspace-os/documents/`:
  - `DocumentsHub.tsx` — entry: upload, templates, recent, by-client.
  - `DocumentEditor.tsx` — left rail (revisions) · center (canvas viewer + overlay layer) · right (tabs).
  - `CanvasViewer.tsx` — `pdf.js` background renderer per page.
  - `OverlayLayer.tsx` — absolutely-positioned editable fields aligned to bbox.
  - `BrandPanel.tsx` — reads `brand_kit` from workspace, lets user re-skin.
- Public viewer: extend `PdfShare.tsx` to render canvas + read-only overlays + approve/request-changes/comment actions.
- Reuse `client_profiles` picker from CRM, `brand_kit` from workspace, notifications channel.

## Unification of doc tools

- Existing Proposal / Contract / Invoice / Quotation pages become **template entries** in DocumentsHub instead of separate routes. Each old page becomes a thin redirect that calls `pdf-studio-template-create` with the right `doc_kind`.
- DocsLibrary / DocsList stay as listing views but point rows to `/dashboard/documents/:id`.

## Tier + branding

- Pro+, Elite, Infinity only. Free/Starter see locked card with upgrade CTA.
- Watermark "Powered by HustleAI" on public share for non-Infinity tiers (per existing UI rule).
- Brand Kit application is automatic when user clicks "Apply brand" or creates from template.

## Implementation order

1. **Migration** — add columns (`doc_kind`, `overlays_json`, `background_pdf_path`, `brand_snapshot`, `client_profile_id` enforcement, `status`, annotation `kind`). One file.
2. **Library** — extend `src/lib/pdf-studio/api.ts` with overlays types, brand helpers, template helpers.
3. **Edge fns** — rename `parse` → `extract` (return bbox + kind), add `rebrand` and `template-create`.
4. **Editor rewrite** — replace `PdfStudio.tsx` with new `DocumentEditor.tsx` using canvas + overlay. Keep client picker mandatory on upload.
5. **Hub + redirects** — `DocumentsHub.tsx`, redirect old proposal/contract/invoice routes.
6. **Public viewer upgrade** — canvas + overlay + approval actions.
7. **Brand integration** — read workspace `brand_kit`, render brand panel, wire rebrand fn.
8. **QA** — upload 3 sample PDFs (proposal, invoice, contract); verify pixel-preserve, AI revise on overlay only, brand re-skin, client annotation roundtrip.

## Out of scope (v1)

- Editing the original background pixels (only overlays are editable until rebrand).
- DOCX upload (PDF only — confirmed earlier).
- Real-time multi-user editing on the same revision (revisions remain immutable snapshots).
- E-signature flow (approval click is enough for v1; signature pad later).

## Open questions

- Should the old Proposal/Contract/Invoice routes **redirect** to `/dashboard/documents` or stay as their own template-entry pages that deep-link into the editor? (I'll default to deep-link redirect.)
- For "Apply Brand Kit", regenerate background server-side using existing template renderer, or render a brand frame (header/footer) on top of the original PDF? I'll go with **server-rebuild** when user has a strong Brand Kit, else **frame overlay** as fallback.  
  
  
This v2 spec is **much closer to a real moat product** than the original PDF Studio.
  The biggest improvement is that it stopped being:
  > "AI PDF editor"
  and became:
  > "Document system attached to the client lifecycle"
  which aligns with the direction you've been moving the whole platform.
  ## What I like
  ### 1. Client is mandatory
  This is the right call.
  ```text
  Client
   ↓
  Proposal
   ↓
  Contract
   ↓
  Invoice
   ↓
  Revision
   ↓
  Approval

  ```
  Everything stays attached to a client record.
  That compounds.
  ---
  ### 2. PDF as background layer
  This is the strongest architectural decision.
  Not:
  ```text
  PDF
  ↓
  destroy formatting
  ↓
  rebuild

  ```
  But:
  ```text
  PDF
  ↓
  preserve
  ↓
  overlay edits

  ```
  Users care about:
  - logos
  - signatures
  - layout
  - spacing
  Keeping the original visual document solves that.
  ---
  ### 3. Brand Kit integration
  This is where HustleAI becomes different.
  Most PDF tools:
  ```text
  upload
  edit
  download

  ```
  You already have:
  - brand kit
  - templates
  - CRM
  - intake
  - workspace
  So:
  ```text
  upload
  ↓
  apply company branding
  ↓
  share
  ↓
  approve

  ```
  is stronger.
  ---
  ## Two changes I'd make before Lovable builds
  ### Change #1
  Don't name it:
  ```text
  Client Document Workspace

  ```
  internally yes.
  For users:
  ```text
  Documents

  ```
  Keep it stupid simple.
  Sidebar:
  ```text
  Documents

  ```
  Inside:
  ```text
  Proposals
  Contracts
  Invoices
  Uploads
  Templates

  ```
  People understand that instantly.
  ---
  ### Change #2
  Add Approval Status Immediately
  Right now:
  ```text
  draft
  shared
  approved
  revision_requested

  ```
  Good.
  Add:
  ```text
  viewed

  ```
  because viewed events are huge.
  Timeline:
  ```text
  Shared
  Viewed
  Commented
  Revision Requested
  Approved

  ```
  That becomes CRM intelligence.
  ---
  ## What I would NOT build yet
  ### Don't build PDF diff visualization
  You mention:
  ```text
  diff preview

  ```
  AI diff is enough.
  Don't build Figma-level visual diffs yet.
  Massive complexity.
  ---
  ### Don't build DOCX
  Stay PDF only.
  You already decided correctly.
  ---
  ### Don't build signatures
  Approval click is enough.
  E-signatures become their own product.
  ---
  ## Bigger Opportunity
  I'd actually merge:
  ```text
  Proposal Generator
  Contract Generator
  Invoice Generator
  Quotation Generator

  ```
  into:
  ```text
  Documents

  ```
  and never show them as separate primary products again.
  Because your new lifecycle is:
  ```text
  Lead
  Proposal
  Onboarding
  Delivery
  Billing

  ```
  and Documents sits across all of it.
  ---
  ## One extra thing I would tell Lovable
  Before implementation:
  ### Create a Document Timeline
  Inside client profile:
  ```text
  Client A

  Proposal v1
  Proposal v2
  Contract
  Invoice #1
  Invoice #2
  Approval

  ```
  Every document event.
  No new backend.
  Just reuse:
  - revisions
  - annotations
  - notifications
  This will make the CRM feel alive.
  ---
  ### My verdict
  I would approve this build **after one modification**:
  > Documents becomes the canonical document layer of the platform. Proposal, Contract, NDA, Quotation and Invoice become document templates inside Documents rather than separate tools. Every document must belong to a client and appear in the client timeline. Add a `viewed` state and timeline events. Do not build advanced visual diffing, DOCX support, or e-signatures in v1.
  That version fits perfectly with the platform direction:
  **Lead → Proposal → Onboarding → Delivery → Billing**
  instead of adding another standalone AI feature.