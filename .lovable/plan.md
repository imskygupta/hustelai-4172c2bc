# HustleAI Workspace OS — Build Plan

## North Star
Freelancer Operating System. Premium cockpit, NOT a generic AI generator.
- Layouts/templates = code-driven, deterministic, reusable.
- AI = fills structured fields only (JSON), drafts wording, extracts info.
- BYO AI key = user can plug their own Gemini/OpenRouter key. We never subsidize heavy generators.

## Routing
- New route: `/workspaces` (cinematic shell, replaces today's flat client list page).
- Existing `/work` stays untouched. Modules migrate one-by-one to `/workspaces/:module`.
- Sub-routes:
  - `/workspaces` — workspace list / "+ New Workspace"
  - `/workspaces/:id` — workspace home (overview + AI panel)
  - `/workspaces/:id/quotations`, `/agreements`, `/invoices`, `/payments`,
    `/service-cards`, `/business-cards`, `/checklist`, `/files`, `/timeline`,
    `/notes`, `/ai`
- Old `/work/*` URLs continue to work; superseded modules link out to the new route.

## Data Model (primary Lovable Cloud DB)
New tables (RLS: owner-only, admins all):
- `workspaces` — id, owner_id, client_name, project_scope, deadlines jsonb, deliverables jsonb, pricing jsonb, payment_terms jsonb, status, ai_summary, created_at, updated_at
- `workspace_documents` — id, workspace_id, owner_id, doc_type ('quotation'|'agreement'|'invoice'|'service_card'|'business_card'), title, content jsonb (structured fields), template_id, status, pdf_url, watermark bool, created_at
- `workspace_checklists` — id, workspace_id, owner_id, template, tasks jsonb
- `workspace_files` — id, workspace_id, owner_id, name, url, kind, version
- `workspace_timeline` — id, workspace_id, owner_id, kind, payload jsonb, occurred_at
- `workspace_notes` — id, workspace_id, owner_id, content, created_at
- `user_ai_keys` — id, user_id (unique), provider ('gemini'|'openrouter'|'longcat'|'custom'), api_key (encrypted at-rest via pgcrypto in edge fn), model, is_active, last_tested_at, created_at
- `ai_usage_log` — id, user_id, provider_used ('hustlai'|'user'), feature, tokens_in, tokens_out, ok bool, created_at

Reuse existing `profiles.subscription_tier` for tier gating. No changes there.

## BYO AI Key Architecture
Edge function `workspace-ai` (already exists) refactored to:
1. Look up `user_ai_keys` for current user.
2. If active key exists → call provider with user's key. Cost = $0 to us. No quota deducted.
3. Else → use platform key with daily free assist counter (existing `enforceLimit`, "workspace-ai" tool key, tier limits 3/5/10/20).
4. Always returns **structured JSON** matching the requested action's schema.
5. Logs to `ai_usage_log`.

New page: `Settings → AI Providers` (new tab on `/profile`).
- Connect Gemini (3-step visual guide: open AI Studio → generate key → paste).
- Test key button (1 cheap roundtrip).
- Toggle active provider.
- Show this month's usage (HustleAI vs User key).

Positioning copy: **"Connect your AI fuel."** Never "BYO because we're cheap."

## Templates (code-driven, NOT AI-generated)
Folder: `src/templates/workspace/`
Each template is a React component that takes structured data → renders to PDF via existing html2canvas+jsPDF (matches your "theme-first canvas" memory).
- `QuotationClassic.tsx`, `QuotationModern.tsx`
- `AgreementStandard.tsx` (revision policy, payment terms, IP, cancellation — fixed clauses, AI fills params)
- `InvoicePremium.tsx`, `InvoiceMinimal.tsx`
- `ServiceCardSquare.tsx`, `ServiceCardStory.tsx` (PNG export)
- `BusinessCardClassic.tsx` (PNG export)

Free tier: footer watermark "Designed with HustleAI Workspace Tools" — burned in at render time, not removable client-side.

## Workspace Onboarding Wizard ("Did you get a new client?")
Single multi-step modal triggered by `+ New Workspace`:
1. **Drop everything** — paste chat / upload PDF / type notes / paste voice transcript.
2. **AI extract** (one call, JSON schema):
   ```json
   { "client_name": "...", "scope": "...", "deliverables": [...], "deadlines": [...], "pricing": {...}, "payment_terms": "..." }
   ```
3. **Review & edit** — pre-filled form, user corrects.
4. **Save** → creates workspace row + suggests next actions:
   - Generate quotation
   - Generate agreement
   - Generate invoice
   - Build checklist (template picker)
   - Add follow-up reminder

## Phases

### Phase 1 (THIS APPROVED SLICE) — Workspace shell + onboarding
Deliverables:
- DB migration (workspaces table + user_ai_keys + ai_usage_log).
- `/workspaces` cinematic shell with sidebar (12 modules — disabled badges on Phase-2/3 items).
- `/workspaces/:id` home: hero KPIs + "HustleBot Recommendations" panel (rule-based for now).
- "+ New Workspace" wizard with AI extract (uses existing `workspace-ai` fn + new `extract` action).
- Settings → AI Providers tab with Gemini connect + test.
- Refactor `workspace-ai` edge fn to BYO-key-aware + structured JSON only.

Non-goals for Phase 1: PDF generators, CRM modules, payment tracking, service/business cards, files, timeline.

### Phase 2 — Document Generators
Quotation, Agreement, Invoice generators. PDF export with watermark gating. AI fills clauses only.

### Phase 3 — CRM + Operations
Client memory panel, project checklist engine, follow-up reminders, files, timeline, notes, service & business card generators.

### Phase 4 — Polish & Pro features
Multiple workspaces, custom branding, white-label exports (Elite/Infinity), team collaboration.

## Cost Discipline
- All AI calls return structured JSON (max ~500 output tokens/call).
- Default provider: existing fallback (LongCat → Gemini Lite → Zhipu).
- Heavy ops (chat extraction, deep clause drafting) require BYO key OR Pro+ tier.
- Free user without BYO key: 3 AI assists/day (existing `enforceLimit`).

## Memory updates after approval
- New: `mem://features/workspace-os` — overview + sub-routes
- New: `mem://features/byo-ai-keys` — architecture + UX positioning
- Update: `mem://style/template-architecture` — extend to workspace docs

## Open questions (defer to later phases)
- Encryption-at-rest strategy for `user_ai_keys.api_key` (pgcrypto vs Supabase Vault).
- Multi-workspace cap per tier (Free 1 / Pro 5 / Elite 20 / Infinity ∞ — tentative).
- Service/Business card PNG export library (html-to-image vs html2canvas — TBD Phase 3).