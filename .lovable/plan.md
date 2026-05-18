## Infrastructure Control Plane — `/admin/infrastructure`

Build an additive, read-only observability + registry layer. No production rewrites, no auth changes, no removal of env fallbacks.

### 1. Database (additive only)

New tables on the **primary Lovable Supabase** (admin-only RLS via `has_role('admin')`):

- `infra_supabase_projects` — registry rows (name, purpose, env, project_ref, url, owner_category, criticality, migration_state, failover_notes, connected_domains[], connected_modules[], tables_count, edge_functions_count, last_db_activity_at, last_function_call_at, est_daily_writes, est_storage_mb, lovable_dependency_score, extraction_readiness, risk_if_primary_dies, notes, is_active).
- `infra_dependencies` — edges (source_type: edge_function|cron|worker|domain|module, source_name, target_project_ref, target_kind: db|function|storage|auth, notes).
- `infra_runtime_health` — rolling samples (project_ref, reachable, paused, auth_healthy, functions_responding, last_cron_at, last_write_at, recent_errors jsonb, sampled_at).
- `infra_telegram_registry` — bots, worker ownership, webhook target, routing role (admin|relay|ops|storage), chat_ids[], last_message_at, delivery_success_pct_24h, env_dependencies[].
- `infra_railway_services` — service_name, purpose, domain, health_url, uptime_pct, status, restart_count, env_dependencies[], last_seen_at.
- `ops_telegram_recipients` — **prep table** for future DB-backed admin routing: bot, chat_id, label, role (admin|ops|relay), enabled, created_by, created_at. Not yet read by the worker; reserved for cutover. Env var remains the source of truth.

Seed `infra_supabase_projects` with: primary Lovable DB, owned ops DB (wguuipsikboqqinqeehv), blogs.hustlai, docs.hustlai, community/sicor (qeswhaytgvosfzzgraef), api.hustlai, work DB, intake-os DB2 — based on existing `src/integrations/*/client.ts`.

Seed `infra_telegram_registry` with: hustleai bot, skymedia bot, current admin chat, removed storage relay (marked deprecated).

Seed `infra_railway_services` with: telegram worker.

### 2. Edge function — `infrastructure-probe` (admin-only)

Read-only diagnostic aggregator. For each registered project:
- ping `migration_mirror_log`/any known table for reachability + latency
- read cached counts from registry (no schema introspection of foreign projects)
- ping Railway `/health` for each `infra_railway_services` row
- compute delivery_success_pct_24h from `admin_alerts` + `notification_deliveries`
- write a fresh `infra_runtime_health` sample

### 3. Admin UI — `/admin/infrastructure`

New page `src/pages/admin/Infrastructure.tsx` with tabs:

1. **Supabase Registry** — table of `infra_supabase_projects` with criticality/owner badges, edit drawer, runtime status pill.
2. **Dependency Map** — searchable table of `infra_dependencies` + simple force-free graph (grouped columns: projects → dependents). No new graph library; render as grouped lists + SVG lines.
3. **Runtime Health** — latest sample per project + warning banners (inactive >7d, paused, missing secrets, duplicated schedulers, orphaned functions). "Refresh" button calls `infrastructure-probe`.
4. **Telegram Infra** — registry table + delivery stats + last message timestamp.
5. **Railway** — service health cards.
6. **Extraction Readiness** — computed scorecard per project (Lovable dependency / extraction readiness / safe-to-isolate / risk-if-primary-dies), sortable.

Add to `src/App.tsx` under admin-protected routes. Link from existing `/admin/runtime`.

### 4. Final delivery

Report:
- full infra inventory (seeded rows)
- dependency map (seeded edges from code grep)
- dormant systems (notifications-broadcast, inngest, telegram-bot-health)
- duplicated schedulers (pg_cron vs railway ops loops for cleanup/queue_purge)
- env-dependent systems (worker → TELEGRAM_ADMIN_CHAT_IDS)
- highest-risk SPOFs (primary Lovable DB, hustleai bot token)
- recommended extraction order
- systems safe to pause/delete

### Constraints respected
- additive only, no auth changes, no frontend redesign of existing pages
- env fallback for Telegram preserved; `ops_telegram_recipients` created but unread
- no Redis/Kafka, no new infra dependencies
- read-only probe, no destructive ops
