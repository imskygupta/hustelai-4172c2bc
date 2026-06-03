# PDF Revision Studio

A Pro+ tool where users upload an existing PDF (proposal, invoice, contract, any doc) and get an AI-assisted editor to make seamless revisions — v1, v2, v3 — instead of starting from scratch. Each revision can be shared via a public link where the client can annotate; annotations flow back to the workspace as notifications.

Lives at `workspace.hustleai.in/tools/pdf-studio` (frontend route in the existing workspace shell — no new subdomain infra needed; the workspace already routes from `workspace.*`).

## User flow

1. User opens **PDF Studio** from the workspace tools grid.
2. Uploads a PDF (proposal / invoice / contract / any doc).
3. AI parses it into structured editable blocks (headings, paragraphs, line items, totals, signature fields).
4. User edits inline OR types a natural-language instruction: *"change total from 20k to 5k, keep everything else"*. AI returns a diff preview; user accepts → **Revision 2** is created.
5. Every accepted edit creates a new immutable revision (v1, v2, v3 …) with a visible history rail.
6. **One-click "Share with client"** generates a public link (same pattern as client intake). CTA copy: *"Share with clients in 1 second — get instant feedback."*
7. Client opens link → sees current revision → can highlight text / drop sticky-note annotations (no download, no edit).
8. Each annotation creates a workspace notification + appears in an **Annotations** panel inside the editor. User responds with another AI revision → v3 → re-share (same link auto-updates).

## Scope rules

- **PDF only** for input (per request — "we will do it for pdfs only").
- **No download** of the revised file → keeps storage cheap; sharing is link-only.
- **Tier-gated**: Pro, Elite, Infinity. Same per-tool quota system as other AI tools (reuse `enforceAIQuota` + `requireQuota`).
- **Watermark** on public-share view (free-tier client viewer) per existing UI rule.

## Data model (primary DB, new tables)

```
pdf_documents          -- one row per uploaded source PDF
  id, user_id, title, source_storage_path, parsed_blocks_json, created_at

pdf_revisions          -- immutable snapshots; v1 = original parse
  id, document_id, version, blocks_json, ai_instruction, created_by, created_at

pdf_share_links        -- one per document, always points to latest revision
  id, document_id, slug (public), is_active, created_at, expires_at

pdf_annotations        -- client feedback on a specific revision
  id, revision_id, anchor_json (block_id + offset / coords),
  comment, client_name, status (open|addressed), created_at
```

Storage bucket: `pdf-studio` (private). Only parsed JSON is rendered publicly — original PDF never exposed.

RLS: owner-only on documents/revisions/annotations; public share resolves via slug → server function returns latest revision JSON + accepts annotation inserts (rate-limited).

## Edge functions

- `pdf-studio-parse` — accepts uploaded PDF, runs Lovable AI (Gemini 2.5 Pro multimodal) to extract structured blocks → v1.
- `pdf-studio-revise` — input: revision_id + instruction → AI returns updated blocks_json → inserts new revision row.
- `pdf-studio-share-resolve` — public, no JWT: slug → latest revision JSON (sanitized).
- `pdf-studio-annotate` — public, no JWT: slug + annotation payload → inserts row + emits notification to owner.

All gated by `enforceAIQuota` + tier check (`pro|elite|infinity`).

## Frontend

New route: `src/pages/workspace-os/PdfStudio.tsx`

- Left: revision timeline rail (v1, v2, v3 …)
- Center: block editor (Uizard-style canvas — clean, single-doc focus, zoom controls)
- Right: tabbed panel — **AI Assist** (instruction box + diff preview) / **Annotations** (live client feedback) / **Share** (link + copy CTA)
- Sticky bottom CTA on first revision: *"Share with clients in 1 second"*

Public viewer route: `src/pages/PdfShare.tsx` at `/s/pdf/:slug`

- Renders read-only blocks
- Floating annotation tool (highlight → comment)
- Watermark + "Powered by HustleAI" footer
- No auth required; client just types name + comment

## Reuse (no duplication)

- Quota: `src/lib/usage/guards.ts` → register `pdf_studio_revision` capability.
- Share-link pattern: copy from client-intake (`src/pages/IntakeSubmit.tsx`).
- AI calls: existing `callAIWithFallback` in shared edge fn helpers.
- Notifications: existing in-app notification table → new event type `pdf_annotation`.
- UI shell: workspace layout already in place; reuse `TONE_GRADIENT` card style from recent polish.

## Implementation order

1. **DB migration** — 4 tables + RLS + GRANTs + storage bucket.
2. **Edge functions** — parse, revise, share-resolve, annotate.
3. **Tool entry** — add card to workspace tools grid + register capability + tier gate.
4. **Editor page** — `PdfStudio.tsx` with upload → parse → revision rail → AI assist.
5. **Share + public viewer** — slug generation, `/s/pdf/:slug` page, annotation tool.
6. **Annotation inbox** — panel inside editor + notification badge.
7. **QA pass** — upload sample PDF, run 2 revisions, share, annotate from incognito, verify notification.  
  
  
Build PDF Studio as a layer on top of existing Proposal, Contract, Invoice, Intake Share Link, Notification and CRM systems. Do not create a standalone document product. Every document revision must belong to a client record and appear in the client timeline. Reuse existing quota, share-link, notification, public-viewer and workflow infrastructure wherever possible. The goal is to strengthen the Lead → Proposal → Onboarding → Delivery → Billing lifecycle, not add another disconnected tool.

## Open questions before I build

- Confirm `workspace.hustleai.in/tools/pdf-studio` (frontend route in workspace shell) is acceptable — no new subdomain.
- Allow **DOCX too**, or strict PDF-only for v1? You said "all types of docs" once but "pdfs only" twice — going PDF-only for v1 unless you say otherwise.
- Public share: clients identify by **name + email** (lightweight, no signup) — OK?