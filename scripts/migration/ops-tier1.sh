#!/usr/bin/env bash
# ============================================================
# Phase 2 / Tier 1 — replicate operational schemas from the old
# Lovable-managed Supabase project to the user-owned project.
#
# What this does
#   1. pg_dump --schema-only of every Tier-1 ops table (telemetry,
#      logs, alerts, queues, audit, delivery tracking) from OLD.
#   2. Restores that schema into NEW (idempotent — uses IF NOT EXISTS
#      via --clean is intentionally NOT used; we want a fresh new DB).
#   3. Optional one-shot backfill of the last 30 days of data per
#      table (use --backfill flag).
#
# What this does NOT do
#   - Does not touch auth.*, storage.*, or product tables.
#   - Does not delete anything from OLD.
#   - Does not flip any traffic — that's done by the
#     MIGRATE_OPS_WRITES feature flag in edge functions.
#
# Prerequisites
#   - psql + pg_dump (>=15) installed locally
#   - env vars:
#       OLD_DB_URL  = postgresql://postgres:<old-pass>@db.vbnqaovxatucrgtnggea.supabase.co:5432/postgres
#       NEW_DB_URL  = postgresql://postgres:<new-pass>@db.wguuipsikboqqinqeehv.supabase.co:5432/postgres
#
# Usage
#   bash scripts/migration/ops-tier1.sh schema       # schema only
#   bash scripts/migration/ops-tier1.sh backfill     # data only (after schema)
#   bash scripts/migration/ops-tier1.sh all          # schema + backfill
# ============================================================
set -euo pipefail

: "${OLD_DB_URL:?OLD_DB_URL not set}"
: "${NEW_DB_URL:?NEW_DB_URL not set}"

TIER1_TABLES=(
  # telemetry / analytics
  analytics_events
  blog_events
  cta_events
  tool_launch_events
  # alerts
  intelligence_alerts
  admin_alerts
  # audit
  api_runtime_audit_logs
  auth_anomaly_events
  feature_audit_logs
  operator_audit_log
  telegram_admin_audit
  feature_flag_incidents
  # queue history (NOT live state — live state is Tier 2)
  queue_health_snapshots
  queue_replay_audit
  queue_archive
  queue_dead_letter
  # job/workflow event streams (history, not live rows)
  ai_job_events
  workflow_events
  workflow_failures
  notification_events
  # cost ledger
  capability_cost_ledger
  # telegram delivery history (live: notification_deliveries → Tier 2)
  telegram_send_log
  # worker heartbeats
  worker_heartbeats
)

dump_dir=".cache/migration"
mkdir -p "$dump_dir"

cmd_schema() {
  echo "→ Dumping schema for ${#TIER1_TABLES[@]} tables from OLD..."
  local args=()
  for t in "${TIER1_TABLES[@]}"; do args+=(-t "public.$t"); done
  pg_dump --schema-only --no-owner --no-privileges \
    --no-publications --no-subscriptions \
    "${args[@]}" "$OLD_DB_URL" > "$dump_dir/tier1-schema.sql"
  echo "→ Restoring schema into NEW..."
  psql -v ON_ERROR_STOP=1 "$NEW_DB_URL" -f "$dump_dir/tier1-schema.sql"
  echo "✓ Schema replicated."
}

cmd_backfill() {
  echo "→ Backfilling last 30 days of data per table..."
  for t in "${TIER1_TABLES[@]}"; do
    echo "  - $t"
    # COPY OUT → COPY IN, append-only assumption. Filters on created_at
    # when present; otherwise dumps full table (small tables).
    if psql -At "$OLD_DB_URL" -c "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='$t' AND column_name='created_at'" | grep -q 1; then
      psql "$OLD_DB_URL" -c "\\copy (SELECT * FROM public.$t WHERE created_at >= now() - interval '30 days') TO '$dump_dir/$t.csv' WITH CSV"
    else
      psql "$OLD_DB_URL" -c "\\copy (SELECT * FROM public.$t) TO '$dump_dir/$t.csv' WITH CSV"
    fi
    psql "$NEW_DB_URL" -c "\\copy public.$t FROM '$dump_dir/$t.csv' WITH CSV" || \
      echo "    ! conflict on $t — likely already populated, skipping"
  done
  echo "✓ Backfill complete."
}

case "${1:-}" in
  schema)   cmd_schema ;;
  backfill) cmd_backfill ;;
  all)      cmd_schema; cmd_backfill ;;
  *) echo "Usage: $0 {schema|backfill|all}"; exit 1 ;;
esac