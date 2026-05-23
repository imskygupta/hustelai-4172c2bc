
# Sprint B — Sharing Links + File Delivery Stabilization

Builds on Sprint A's `workspace_artifacts` + unified view. Everything below reads/writes real artifact + delivery state — no mocks, no placeholders.

## 1. Database — delivery state + share metadata

New migration on `public.workspace_artifacts`:

- Add columns:
  - `delivery_status text` — `pending | sending | sent | cached | delivered | failed | retrying | skipped` (default `pending`)
  - `delivery_attempts int` default 0
  - `last_delivery_error text`
  - `last_delivery_at timestamptz`
  - `share_token text` (unique, nullable) — stable public share token
  - `share_expires_at timestamptz`
  - `share_revoked_at timestamptz`
- Index on `(user_id, delivery_status)`, unique on `share_token`.
- Update `v_workspace_artifacts_unified` to surface the new fields, deriving delivery_status for legacy `generated_exports` from existing `status` + `delivered_at`.
- New SECURITY DEFINER RPC `public_artifact_get(_token text)` — returns sanitized columns (title, type, preview_text, mime_type, size_bytes, file_url candidate, created_at, source_module) only if token is unrevoked and not expired. Powers public share pages without exposing the table.

## 2. Edge functions

- New `artifact-share-issue` — owner-only. Body `{ artifact_id, expires_in_hours? }`. Generates/reuses `share_token`, returns `{ url: "<origin>/a/:token" }`. Idempotent (returns existing if not expired/revoked).
- New `artifact-share-revoke` — owner-only. Sets `share_revoked_at = now()`.
- New `artifact-public-view` — no JWT, validates token via the RPC, returns sanitized payload + a 60s signed Storage URL when applicable (delegates to `export-download` flow for legacy rows by `ref_export_id`).
- Update `export-deliver-telegram`: wrap each send in status transitions — set `delivery_status='sending'` then `sent`/`cached`/`delivered`/`failed`, increment `delivery_attempts`, store `last_delivery_error`. On `failed` after 3 attempts, fire `admin-alert` (kind `delivery.failed`) — never on user happy-path.
- New `artifact-resend` — owner-only thin wrapper that re-enqueues `export-deliver-telegram` with idempotency guard (skip if `delivery_status in ('sending','retrying')` newer than 30s). Replaces the direct invoke in `resendArtifactToTelegram`.
- Add CORS + JWT validation patterns matching existing functions; all paths return CORS headers including errors.

`supabase/config.toml` adds `verify_jwt = false` for `artifact-public-view` only.

## 3. Public share pages — `/a/:token`

New `src/pages/PublicArtifact.tsx` route, no auth required, mobile-first. Renders by `artifact_type`:

- `proposal_pdf` / `invoice_pdf` / `resume_pdf` / `roadmap_pdf` → PDF preview (`<iframe>` of signed URL) + download button
- `workspace_doc` / markdown → renders `preview_text` via existing `react-markdown` setup
- `ai_chat_export` / `data_export` → text preview (mono font, scroll container)
- Fallback → metadata card + download button

Includes:
- HustleAI branding header + footer
- "This link expires <relative time>" notice
- Open in new tab / Download actions
- `<SEO>` block with `noindex` (private share)
- Graceful states: `loading`, `not_found`, `expired`, `revoked` — links to existing `PublicLinkUnavailable` styling

## 4. Exports page upgrades

`src/pages/settings/Exports.tsx`:

- Add **delivery state chips** per row, color-coded via semantic tokens:
  - `delivered` emerald, `sent` sky, `cached` violet, `sending`/`retrying` amber pulse, `failed` destructive, `pending`/`skipped` muted
- **Timeline tooltip** on chip: attempts count + last_delivery_at + error
- **Retry button** for `failed` (calls `artifact-resend`), disabled while `sending`/`retrying`
- **Share** button → opens dialog with copyable `/a/:token` URL, expiry, and Revoke action (calls `artifact-share-issue` / `artifact-share-revoke`)
- **Filter** by delivery state in addition to type
- **Empty state** rewrite: when 0 artifacts, show educational card listing where artifacts come from (Roadmaps, Proposals, Invoices, AI Chats, Workspace Docs) with links to those features — no "0 exports" fake counters
- Telegram-not-connected banner with link to `/settings/telegram` when relevant

New `src/components/artifacts/`:
- `DeliveryChip.tsx`
- `ShareDialog.tsx`
- `PreviewPane.tsx` (PDF/markdown/text)
- `ArtifactEmptyState.tsx`

`src/lib/artifacts/api.ts` extended with: `issueShare`, `revokeShare`, `retryDelivery`, `fetchPublicArtifact`.

## 5. Admin observability

`admin-alert` already filters orphans. Wire new alert kinds emitted from delivery code:
- `delivery.failed` (after 3 attempts)
- `delivery.retry_storm` (>10 attempts in 1h per artifact)
- `share.malformed` (token RPC mismatch)

Strictly internal — never echoes user exports content, only counts + IDs.

## 6. Routing

`src/App.tsx`:
- Add `<Route path="/a/:token" element={<PublicArtifact />} />` in the public marketing tree (no auth gate)

## 7. Out of scope (explicit)

- No new infra/providers
- No DB migration of existing `generated_exports` rows
- No rebuild of Explore, AI routing, or Telegram bot infra
- No new payment flows

## File-level summary

**New migrations:** 1 (`workspace_artifacts` columns + view rebuild + `public_artifact_get` RPC)

**New edge functions (4):** `artifact-share-issue`, `artifact-share-revoke`, `artifact-public-view`, `artifact-resend`

**Modified edge functions:** `export-deliver-telegram` (status transitions + alerts)

**New frontend files (5):** `PublicArtifact.tsx`, `DeliveryChip.tsx`, `ShareDialog.tsx`, `PreviewPane.tsx`, `ArtifactEmptyState.tsx`

**Modified frontend:** `Exports.tsx`, `lib/artifacts/api.ts`, `App.tsx`, `supabase/config.toml`

Approve to implement.
