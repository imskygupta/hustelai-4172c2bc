# Client Acquisition Engine — Intake OS Polish

Transform the existing Intake OS (DB2) into a connected acquisition pipeline. Build in a focused order so each layer compounds value.

## Scope

### 1. Form Themes (visual polish)
- Add 5 themes to `IntakeSubmit.tsx`: `minimal`, `cinematic`, `startup`, `corporate`, `luxury`, `agency`
- Theme stored in `intake_forms.settings.theme`
- Theme picker on `IntakeForms.tsx` create/edit
- Themes use existing semantic tokens — no hardcoded colors

### 2. Smart Field Templates (1-click form creation)
- Add `INTAKE_TEMPLATES` library in `src/lib/intake-os/templates.ts`:
  - Website project, Video editing, Branding, SaaS MVP, Automation setup, Ghostwriting
- Template picker on `IntakeForms.tsx` — "Start from template" dropdown
- Each template = title + description + curated fields

### 3. Client Status Pipeline (CRM lane)
- Extend `intake_submissions.status` enum-like values: `lead`, `qualified`, `proposal_sent`, `negotiation`, `won`, `active`, `retainer`, `lost` (keep `new`/`reviewed`/`converted`/`archived` as legacy aliases)
- New `Pipeline` view on `IntakeInbox.tsx`: kanban-style columns by status with drag-or-click move
- Backend: `submission.update_status` already exists — relax validation to accept new values

### 4. AI Risk + Confidence Panel
- Already returns `risks`, `urgency`, `scope_clarity`. Add structured **risk badges** in `IntakeInbox.tsx` detail drawer:
  - Scope clarity (weak/medium/strong)
  - Urgency
  - Risk chips (color-coded)
  - Confidence score (derived from clarity + risk count)
- No new AI calls — reformat existing analysis output

### 5. Auto Workspace Creation
- New "Convert to Workspace" action on submission detail
- Frontend handler in `src/lib/intake-os/convert.ts`:
  - Calls existing workspace API to create workspace named after client
  - Creates client record (DB2 `clients` table via `work-api`)
  - Creates draft Proposal + Quotation docs (via `workspace-docs/infra.ts`) seeded from submission payload + AI analysis
  - Marks submission `status = 'converted'`, stores `workspace_id`
- Single button → all artifacts created

### 6. Generated Next Actions
- In submission detail panel, after AI analysis show action stack:
  - Generate Proposal, Create Agreement, Send Quote, Build Checklist, Schedule Follow-up
- Each maps to an existing route/handler (proposal draft, doc editor, follow-up scheduler)

### 7. Client Magic Portal (groundwork only)
- Use existing `client_portal_links` table
- Add "Generate Portal Link" action on converted submission
- Public route `/portal/:token` (already partly exists as `WorkspacePortal`) — wire link generation; leave full portal redesign for next phase

## Out of Scope (explicit)
- No new database project / DB4
- No new AI features beyond reformatting current analysis
- No full client portal redesign — link generation only

## Technical Notes
- All new tables/columns live on **DB2** (`utflzmecghdtcjupgdan`) — extend `INTAKE_SETUP_SQL` in `src/lib/work-sql.ts` with: `ALTER TABLE intake_submissions ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'lead'`, `portal_token text`, `converted_workspace_id uuid`
- User must re-run the Intake setup SQL block from `/admin-dashboard` → SQL Setup against DB2 after deploy
- Edge function `intake-api`: extend `submission.update_status` to allow new pipeline stages, add `submission.generate_portal_link` and `submission.set_stage`
- Frontend convert flow uses existing `workspace-docs/infra.ts` + `work-api` — no new edge functions for conversion
- Themes are pure CSS via Tailwind tokens; no new dependencies

## Build Order
1. SQL extension (work-sql) + edge function status/stage/portal endpoints
2. Form themes + template library + form builder UI
3. Pipeline view + risk panel reformat
4. Convert-to-workspace flow + next actions stack
5. Portal link generation
