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

**Legacy / to migrate:** `src/pages/workspace-os/Clients.tsx` currently uses
`workspace_docs/infra` `ClientProfile` on DB1. A client added through the
cockpit CRM is invisible to the Deliver layer and to the flow counts. Next
structural pass: rewrite `ClientsPage` to CRUD `work_clients` via
`workspaceDb` (same shape `Deliver` already uses). Do NOT add a sync layer
between DB1 and DB2 — that just delays the cleanup and creates duplicates.

**Why:** Two CRMs = two truths. The Deliver layer (the highest-leverage
surface) was already on DB2, and migrating one CRUD page is cheaper than
rewriting the entire delivery pipeline.

**How to apply:** When touching any client-related UI, default to
`workspaceDb.from("work_clients")`. If you find code reading from
`ClientProfile` / `workspace_docs/infra` for client data, treat that as a
bug and migrate it.