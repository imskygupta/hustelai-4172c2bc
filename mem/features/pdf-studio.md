---
name: PDF Studio
description: Pro+ upload-and-revise tool — AI parses existing PDFs into blocks, creates versioned revisions, shares via public link with client annotations
type: feature
---
- Route: `/tools/pdf-studio` (also under `/dashboard/tools/pdf-studio`). Public viewer: `/s/pdf/:slug`.
- Tables (primary DB, public): `pdf_studio_documents`, `pdf_studio_revisions`, `pdf_studio_share_links`, `pdf_studio_annotations`. Owner-only RLS, optional link to `client_profiles`.
- Public access via security-definer RPCs `pdf_studio_resolve_share(slug)` and `pdf_studio_insert_annotation(slug, anchor, comment, name, email)`. Anonymous can read latest revision + insert annotations only.
- Storage bucket `pdf-studio` (private). Path = `{userId}/{uuid}_{filename}`. Source PDFs never exposed publicly.
- Edge functions: `pdf-studio-parse` (AI block extraction → v1) and `pdf-studio-revise` (instruction → new revision). Both gated by `enforceAIQuota(userId, "pdf_studio:parse"|":revise")`.
- Client extracts PDF text in-browser with `pdfjs-dist` then posts to parse function — no PDF parsing in Deno.
- Editor (`src/pages/workspace-os/PdfStudio.tsx`): left rail = revision history, center = block canvas, right = AI Assist / Annotations (realtime via Supabase channel) / Share tabs.
- Public viewer (`src/pages/PdfShare.tsx`): watermarked, click-any-block to leave annotation, no download.
- Share link is one slug per document, always points to latest revision (no re-share needed after v2/v3).
- Library: `src/lib/pdf-studio/api.ts`.