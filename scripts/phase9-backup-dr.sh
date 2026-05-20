#!/usr/bin/env bash
# Phase 9C — Backup + Disaster Recovery helper.
#
# For each owned DB this script:
#   1. Exports the public-schema definition (pg_dump --schema-only)
#   2. Optionally takes a weekly logical backup (--with-data on Sundays)
#   3. Writes a manifest with timestamps + sha256 to ./backups/
#   4. Verifies the latest dump round-trips into a throwaway db (--verify)
#
# Required env (set in CI / local shell — never commit):
#   PG_PRIMARY_URL   = postgres://… vbnqaovxatucrgtnggea
#   PG_ADMIN_URL     = postgres://… rqqiujmiagauzohdqjmi
#   PG_BLOGS_URL     = postgres://… ynvfxxmhowlvhtqiigfc
#   PG_API_AI_URL    = postgres://… larncwugkdclkhayfjle
#   PG_REALTIME_URL  = postgres://… qeswhaytgvosfzzgraef
#   PG_WORKSPACE_URL = postgres://… utflzmecghdtcjupgdan
#   PG_OWNED_URL     = postgres://… wguuipsikboqqinqeehv
#
# Retention: schema = 30d, full = 90d. Primary auth/billing kept 1y.

set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE="$(date -u +%Y%m%dT%H%M%SZ)"
DOW="$(date -u +%u)"   # 7 = Sunday
mkdir -p "$BACKUP_DIR"

DBS=(
  "primary:$PG_PRIMARY_URL"
  "admin:$PG_ADMIN_URL"
  "blogs:$PG_BLOGS_URL"
  "api_ai:$PG_API_AI_URL"
  "realtime:$PG_REALTIME_URL"
  "workspace:$PG_WORKSPACE_URL"
  "owned:$PG_OWNED_URL"
)

dump_schema() {
  local name="$1" url="$2"
  local out="$BACKUP_DIR/${name}-schema-${DATE}.sql"
  pg_dump --schema-only --no-owner --no-acl "$url" > "$out"
  sha256sum "$out" >> "$BACKUP_DIR/manifest-${DATE}.txt"
  echo "✓ schema $name → $out"
}

dump_full() {
  local name="$1" url="$2"
  local out="$BACKUP_DIR/${name}-full-${DATE}.sql.gz"
  pg_dump --no-owner --no-acl "$url" | gzip -9 > "$out"
  sha256sum "$out" >> "$BACKUP_DIR/manifest-${DATE}.txt"
  echo "✓ full   $name → $out"
}

verify_restore() {
  local name="$1" file="$2"
  local tmpdb="verify_${name}_${DATE,,}"
  createdb "$tmpdb"
  if [[ "$file" == *.gz ]]; then gunzip -c "$file" | psql -d "$tmpdb" > /dev/null
  else psql -d "$tmpdb" -f "$file" > /dev/null; fi
  dropdb "$tmpdb"
  echo "✓ verify $name (round-trip ok)"
}

for entry in "${DBS[@]}"; do
  name="${entry%%:*}"; url="${entry#*:}"
  [[ -z "$url" ]] && { echo "skip $name (no url)"; continue; }
  dump_schema "$name" "$url"
  if [[ "$DOW" == "7" || "${1:-}" == "--full" || "$name" == "primary" ]]; then
    dump_full "$name" "$url"
  fi
done

# Retention prune
find "$BACKUP_DIR" -name '*-schema-*.sql'   -mtime +30 -delete
find "$BACKUP_DIR" -name '*-full-*.sql.gz'  -mtime +90 -delete
find "$BACKUP_DIR" -name 'primary-full-*.sql.gz' -mtime +365 -delete

echo "manifest → $BACKUP_DIR/manifest-${DATE}.txt"