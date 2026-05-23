## Sprint A — Unified Artifact System + Telegram Persistence

### 1. Canonical table: `workspace_artifacts`

New migration creating:

- `workspace_artifacts` (id, user_id, workspace_id, artifact_type, source_module, title, preview_text, file_url, telegram_message_id, telegram_channel, telegram_deep_link, storage_mode default 'local', mime_type, size_bytes, metadata jsonb, status default 'ready', dedupe_key unique, created_at, updated_at, is_favorite, ref_export_id)
- Indexes: (user_id, created_at desc), artifact_type, source_module, dedupe_key
- RLS: owner only SELECT/UPDATE/DELETE; service_role full
- Trigger: `updated_at` autoset
- View `v_workspace_artifacts_unified` that UNIONs `workspace_artifacts` + legacy `generated_exports` so the Exports page surfaces both during transition

### 2. Shared helper

`supabase/functions/_shared/artifacts/createArtifact.ts`

- `createArtifact({ user_id, artifact_type, source_module, title, preview_text?, file_url?, mime_type?, size_bytes?, metadata?, ref_export_id?, storage_mode?, deliver_to_telegram? })`
- Auto-infers preview_text (truncate 280)
- Generates dedupe_key when not supplied (`${source_module}:${ref_export_id || hash}`)
- Inserts row (upsert on dedupe_key)
- If `deliver_to_telegram` + paid + connected → enqueue `export-deliver-telegram` and patches storage_mode='telegram' once message_id returns
- Never throws (returns null on failure, logs)

### 3. Wire-in points (single line each)

- `export-create/index.ts` → after `createExport()`, call `createArtifact()` with `ref_export_id`, type derived from `export_type`
- `export-deliver-telegram` → after successful send, update artifact row (`telegram_message_id`, `telegram_channel`, `telegram_deep_link`, `storage_mode='telegram'`)
- `export-cache-telegram` → on cache success, set artifact storage_mode='hybrid' + telegram_message_id

### 4. Telegram orphan fix

`supabase/functions/admin-alert/index.ts`:
- Reject (200 ok skipped) when `kind === 'client.unknown'` AND `!message?.trim()` AND `!feature`
- Always pass `parse_mode: "HTML"` via worker dispatch metadata

### 5. Exports page rebuild

`src/pages/settings/Exports.tsx`:
- Switch query to `workspace_artifacts` via new `src/lib/artifacts/api.ts`
- Cards: title, source_module badge, artifact_type pill, preview_text, created_at, storage_mode badge (Local / TG / Hybrid), TG badge with deep link
- Actions: Open (file_url or TG link), Resend to Telegram (calls existing `deliver-telegram`), Favorite, Revoke
- Filters: all / by artifact_type (chips from distinct values)
- Stats: total, TG-cached, favorites, storage bytes
- Empty state with semantic tokens

### 6. Visual polish

Bump contrast on:
- HustleDetail muted text → `text-muted-foreground` → `text-foreground/75`
- Roadmap cards: increase pill foreground opacity
- Tag pills (`bg-emerald-500/10 text-emerald-300`) → ensure WCAG by using `text-emerald-200` on dark, `text-emerald-700` on light
- Exports card already uses tokens — verified
- Empty states keep tokenized colors

### Technical notes

- No new infra
- No DB migration of existing `generated_exports` rows — surfaced via union view
- Helper is fire-and-forget from all generation paths
- `createArtifact` is callable from any edge function via shared import
- Frontend reads only `workspace_artifacts` (which includes mirrored exports going forward); historical exports surface through the union view used only by the Exports page
