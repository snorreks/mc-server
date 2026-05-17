#!/bin/bash
# backup.sh — tars Minecraft world directories and uploads to GCS.
# Usage: bash /mnt/disks/data/mc-backup.sh [upload-url]
# If no upload-url is provided, just creates the tar in /tmp.
# With upload-url, it curl-uploads the tar and cleans up.

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
BACKUP_DIR="/mnt/disks/data"
DATE=$(date "+%Y-%m-%d_%H:00")
BUCKET_PATH="backup/$DATE.tar.gz"

echo "=== Backup started at $(date) ==="
echo "Path: ${BUCKET_PATH}"

# ── Save game state via RCON (inside Docker) ─────────────────────────────────
CONTAINER=$(docker ps -q --filter 'name=mc' 2>/dev/null || echo '')
if [ -n "$CONTAINER" ]; then
  echo "Saving game state via RCON..."
  docker exec "$CONTAINER" rcon-cli save-all 2>/dev/null || true
  docker exec "$CONTAINER" rcon-cli save-off 2>/dev/null || true
  echo "Game saved, auto-save disabled"
else
  echo "No Minecraft container found, proceeding without save"
fi

# ── Tar world directories ────────────────────────────────────────────────────
cd "$BACKUP_DIR" || { echo "ERROR: ${BACKUP_DIR} not found"; exit 1; }

echo "Creating tarball of world* directories..."
tar_file="/tmp/mc-backup-$(date +%s).tar.gz"
tar -czf "$tar_file" world* 2>/dev/null || {
  echo "ERROR: No world* directories found"
  rm -f "$tar_file"
  exit 1
}
echo "Archive: ${tar_file} ($(du -h "$tar_file" | cut -f1))"

# ── Upload if URL provided ───────────────────────────────────────────────────
UPLOAD_URL="${1:-}"

if [ -n "$UPLOAD_URL" ]; then
  echo "Uploading via signed URL..."
  HTTP_CODE=$(curl -s -o /tmp/upload-result.json -w "%{http_code}" \
    -X PUT \
    -H "Content-Type: application/gzip" \
    --data-binary @"$tar_file" \
    "${UPLOAD_URL}")
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "Upload succeeded (HTTP ${HTTP_CODE})"
  else
    echo "Upload FAILED (HTTP ${HTTP_CODE})"
    cat /tmp/upload-result.json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message','unknown'))" 2>/dev/null || true
    rm -f "$tar_file" /tmp/upload-result.json
    exit 1
  fi
  rm -f /tmp/upload-result.json
else
  echo "No upload URL provided — archive left at ${tar_file}"
fi

# ── Cleanup ──────────────────────────────────────────────────────────────────
rm -f "$tar_file"

# ── Re-enable auto-save ──────────────────────────────────────────────────────
if [ -n "$CONTAINER" ]; then
  docker exec "$CONTAINER" rcon-cli save-on 2>/dev/null || true
  echo "Auto-save re-enabled"
fi

echo "=== Backup completed at $(date) ==="
