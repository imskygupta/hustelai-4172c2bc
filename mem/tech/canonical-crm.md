---
name: Canonical CRM
description: work_clients on DB2 is the single source of truth for clients; workspace_docs ClientProfile is legacy
type: constraint
---
# Canonical CRM = `work_clients` (DB2)

**Decision (Stability Week, P0):** `work_clients` on the secondary workspace
Supabase (`workspaceDb`) is the canonical client table for the entire
product. Every surface that reads or writes a "client" must use it.

Consumers that are already correct:
- `Deliver` (auto-creates / reuses `work_clients` on every send)
- `ClientPickerDialog` (`listWorkClients`)
- `PersonaFlowCard` (count badges from `work_clients`)
- `/dashboard/clients/:id` (`getClientDetail`)
- `/dashboard/deliveries` timeline (`listRecentDeliveries`)

**Phase A (done):** `src/pages/workspace-os/Clients.tsx` now CRUDs DB2
`work_clients` directly via `src/lib/workspace/work-clients.ts`. The page
also surfaces a one-click "Import legacy clients" banner that calls the
`migrate-clientprofile-to-work-clients` edge function (idempotent — dedupes
by phone → email → name lc; preserves DB1-only fields by appending to
`notes`). DB1-only fields lost from the form: `address`, `timezone`,
`currency`, `default_payment_terms` (currency/terms now live on Brand Kit).

**Phase B (pending — last DB1 client callers):**
1. `src/pages/workspace-os/docs/DocEditor.tsx` — client picker dropdown
   still reads `listClients()` (DB1). Switch to `listWorkClientsFull()` and
   adapt `applyClientToDoc()` to the `work_clients` shape (same core
   fields; address/timezone/currency/terms come from Brand Kit instead of
   the client row).
2. `src/lib/intake-os/convert.ts` — intake submission inserts into
   `client_profiles`. Switch to inserting `work_clients` (dedupe by
   email/phone) and drop the FK `workspace_docs.client_profile_id` (or
   relax it to a free-form uuid pointing at DB2).
3. After both callers move, drop the `@deprecated` helpers in
   `src/lib/workspace-docs/infra.ts` and archive the `client_profiles`
   table.

Do NOT add a sync layer between DB1 and DB2 — finish Phase B instead.

**Why:** Two CRMs = two truths. The Deliver layer (the highest-leverage
surface) was already on DB2, and migrating one CRUD page is cheaper than
rewriting the entire delivery pipeline.

**How to apply:** When touching any client-related UI, default to
`workspaceDb.from("work_clients")`. If you find code reading from
`ClientProfile` / `workspace_docs/infra` for client data, treat that as a
bug and migrate it.