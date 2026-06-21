#!/bin/bash
# ============================================
# LedgerLite Database Backup Script
# ============================================
# Creates a timestamped pg_dump backup
# Keeps last 7 daily backups, retains first-of-month
# ============================================

set -e

BACKUP_DIR="/opt/ledgerlite/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ledgerlite_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Create backup
docker compose -f /opt/ledgerlite/vps/docker-compose.yml exec -T postgres \
  pg_dump -U ledgerlite ledgerlite | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Cleanup: keep last 7 days
find "$BACKUP_DIR" -name "ledgerlite_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Keep first backup of each month (check if this backup is from day 1-3)
DOM=$(date +%d)
if [ "$DOM" -le 3 ]; then
  cp "$BACKUP_FILE" "$BACKUP_DIR/monthly/ledgerlite_$(date +%Y%m).sql.gz"
  mkdir -p "$BACKUP_DIR/monthly"
  echo "[$(date)] Monthly snapshot saved"
fi
