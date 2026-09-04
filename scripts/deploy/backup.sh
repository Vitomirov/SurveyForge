#!/usr/bin/env bash
# Dump Postgres from the running stack. Optionally install a nightly cron job.
#
# Usage (on the VPS, from /opt/rescopesurveys):
#   ./scripts/deploy/backup.sh
#   ./scripts/deploy/backup.sh --install-cron
#
# Full guide: docs/DEPLOY.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

install_cron() {
  local line
  sudo_cmd mkdir -p "$BACKUP_DIR"
  sudo_cmd chmod 700 "$BACKUP_DIR"
  line="0 3 * * * $SCRIPT_DIR/backup.sh >> $BACKUP_DIR/backup.log 2>&1"
  if crontab -l 2>/dev/null | grep -F "$SCRIPT_DIR/backup.sh" >/dev/null; then
    echo "Cron entry already present."
  else
    (crontab -l 2>/dev/null || true; printf '%s\n' "$line") | crontab -
    echo "Installed nightly cron: $line"
  fi
  echo "Copy dumps off this VPS. A file that lives only here is not a backup."
  exit 0
}

if [[ "${1:-}" == "--install-cron" ]]; then
  install_cron
fi

need_cmd docker
need_cmd gzip
[[ -f "$ENV_FILE" ]] || fail ".env not found — cannot resolve database name"

pg_user="$(env_value POSTGRES_USER)"
pg_db="$(env_value POSTGRES_DB)"
pg_user="${pg_user:-rescopesurveys}"
pg_db="${pg_db:-rescopesurveys}"

sudo_cmd mkdir -p "$BACKUP_DIR"
sudo_cmd chmod 700 "$BACKUP_DIR"

stamp="$(date +%F-%H%M)"
outfile="$BACKUP_DIR/rescopesurveys-${stamp}.sql.gz"
tmp="$(mktemp)"

echo "==> Dumping $pg_db as $pg_user -> $outfile"
compose_cmd exec -T postgres pg_dump -U "$pg_user" "$pg_db" | gzip > "$tmp"
sudo_cmd mv "$tmp" "$outfile"
sudo_cmd chmod 600 "$outfile"

echo "==> Pruning dumps older than $KEEP_DAYS days in $BACKUP_DIR"
sudo_cmd find "$BACKUP_DIR" -name 'rescopesurveys-*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "Wrote $outfile"
echo "Copy this file off the VPS (scp, object storage). Restore:"
echo "  gunzip -c $outfile | docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres psql -U $pg_user -d $pg_db"
