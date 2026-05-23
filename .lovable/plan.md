# Sprint C — Operational Continuity + Delivery Polish

Goal: HustleAI should feel like a durable AI operating system. No new infra. Polish + complete the execution chain wired up in Sprints A/B.

---

## Part 1 — Detail surface contrast pass

Audit and fix muted/low-contrast text + pale pills across:
- `src/pages/HustleDetail.tsx`
- `src/pages/RoadmapDetail.tsx` (and any roadmap viewer)
- `src/pages/Workspace*` detail views
- `src/components/artifacts/PreviewPane.tsx`
- `src/components/artifacts/DeliveryChip.tsx`
- Export/AI/proposal cards

Changes (semantic tokens only — `index.css`):
- Tighten `--muted-foreground` (raise lightness contrast vs `--card`).
- Add `--badge-*` token set for semantic delivery pills (queued/processing/delivered/cached/telegram_only/failed/retrying).
- Replace `text-muted-foreground` with `text-foreground/80` on metadata rows where contrast fails.
- Strengthen borders: `border-border` → `border-border/80` on pale cards; never pale-on-pale.
- Specifically replace the washed pale-green tag text with `bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30`.

## Part 2 — Exports → Operational Memory

Evolve `src/pages/settings/Exports.tsx`:
- Timeline grouping: Today / Yesterday / Earlier this week / Older (group by `created_at`).
- New `ArtifactCard` component (rich): icon by type, title, source_module, delivery chip with animated transitions, timestamp, metadata row.
- `ArtifactPreviewDrawer` (uses existing `PreviewPane`) opened from card click — keep current ShareDialog wired inside.
- CTAs on each card:
  - "Continue working" → routes back to `source_module` deep link.
  - "Open in Telegram" → uses `telegram_deep_link` if `telegram_message_id` present.
  - "Resend" / "Share" / "Delete" (existing).
- Type filter chips: AI, Docs, Roadmaps, Proposals, Workspace, Telegram-only.
- Use Framer Motion (already present) for chip transitions and drawer.

## Part 3 — Telegram delivery continuity

Ensure every persistent generation auto-registers + auto-delivers:
- Audit `export-create` callers; confirm `createArtifact` helper is invoked from roadmap/proposal/AI generators that currently bypass it. Patch the 2–3 obvious holdouts (no rebuilds).
- After `export-deliver-telegram` success, ensure `telegram_message_id` + `telegram_deep_link` patched into `workspace_artifacts` (already partially wired; verify and fix gaps).
- TG-only artifacts: when `storage_mode='telegram'` and no local path, card still renders with "Open in Telegram" primary CTA.

## Part 4 — Delivery health states

Formalize states (already in DB as `delivery_status`):
`queued | processing | delivered | cached | telegram_only | failed | retrying`

Update `DeliveryChip` with full state map + tokenized colors + tooltip showing `last_delivery_error` + retry button when `failed`/`retrying`.

## Part 5 — Admin alert payload formalization

Update `supabase/functions/_shared/alerts.ts` (or inline in `export-deliver-telegram` + `admin-alert`):

```ts
type DeliveryAlert = {
  kind: 'delivery.failed' | 'delivery.retry_storm' | 'artifact.malformed' | 'auth.failed' | 'pipeline.anomaly';
  artifact_id?: string;
  export_id?: string;
  user_id?: string;
  retry_count?: number;
  failure_reason?: string;
  pipeline_stage?: string;
};
```

Reject any alert missing `kind` or with `kind === 'client.unknown'` (already done, formalize).
Never accept user-export-shaped payloads.

## Part 6 — Workspace continuity rail

New component `src/components/workspace/ContinuityRail.tsx` shown on dashboard/workspace landing:
- "Reopen latest roadmap" (latest artifact where type=roadmap)
- "Continue proposal" (latest type=proposal, status≠delivered final)
- "Resume workspace" (latest workspace doc)
- "Open latest artifact" (most recent any)
- "Continue AI workflow" (latest AI chat artifact)

Fed by simple queries against `v_workspace_artifacts_unified` filtered by `user_id = auth.uid()`, limit 1 per type. No new tables.

## Part 7 — Storage strategy

No code change beyond reinforcing TG metadata:
- Verify `telegram_deep_link` derivation is stable (`https://t.me/c/<chat_id_no_prefix>/<message_id>` for private channel, or bot deep-link variant we already use).
- Add helper `src/lib/artifacts/telegram-link.ts` so frontend + edge both reconstruct identically.

---

## Files

**New**
- `src/components/artifacts/ArtifactCard.tsx`
- `src/components/artifacts/ArtifactPreviewDrawer.tsx`
- `src/components/artifacts/TimelineGroup.tsx`
- `src/components/workspace/ContinuityRail.tsx`
- `src/lib/artifacts/telegram-link.ts`
- `src/lib/artifacts/groupByTimeline.ts`

**Modified**
- `src/index.css` (badge tokens, muted contrast)
- `src/components/artifacts/DeliveryChip.tsx` (full state map + retry)
- `src/components/artifacts/PreviewPane.tsx` (contrast)
- `src/pages/settings/Exports.tsx` (timeline grouping, filters, drawer)
- `src/pages/HustleDetail.tsx`, `src/pages/RoadmapDetail.tsx` (contrast pass, scoped)
- `supabase/functions/admin-alert/index.ts` (formal payload schema)
- `supabase/functions/export-deliver-telegram/index.ts` (emit formal alert payloads, patch telegram_deep_link)
- Dashboard/Workspace landing page (mount `ContinuityRail`)

**Migrations**: none (all fields exist from Sprints A/B).

## Out of scope
No rebuild of Exports/Telegram/Explore/AI. No DB migrations. No new infra/storage backend. No payment changes.
