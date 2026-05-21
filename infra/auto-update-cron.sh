#!/bin/bash

# Auto-update script for Panchanga (runs via cron).
# Also doubles as a manual deploy: just run it directly.
#
# Usage:
#   bash infra/auto-update-cron.sh              # normal update (cron or manual)
#   sudo bash infra/auto-update-cron.sh --install  # install crontab entry

set -euo pipefail

APP_DIR="/apps/panchanga"
LOG_FILE="/var/log/panchanga-auto-update.log"
LOCK_FILE="/tmp/panchanga-update.lock"
SCRIPT_PATH="$APP_DIR/infra/auto-update-cron.sh"

# ── --install: add crontab entry then exit ──────────────────────────────────
if [ "${1:-}" = "--install" ]; then
    sudo touch "$LOG_FILE"
    RUN_USER="${SUDO_USER:-$(whoami)}"
    sudo chown "$RUN_USER" "$LOG_FILE"
    (crontab -l 2>/dev/null | grep -v "auto-update-cron.sh"; \
     echo "0 */6 * * * $SCRIPT_PATH >> $LOG_FILE 2>&1") | crontab -
    echo "Cron installed (every 6 h). Log: $LOG_FILE"
    echo "Current crontab:"
    crontab -l
    exit 0
fi

# ── helpers ─────────────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

if [ -f "$LOCK_FILE" ]; then
    log "Update already in progress, exiting"
    exit 0
fi
touch "$LOCK_FILE"
trap 'rm -f $LOCK_FILE' EXIT

log "========================================="
log "Starting auto-update check..."

cd "$APP_DIR" || { log "ERROR: Cannot access $APP_DIR"; exit 1; }

# ── check for updates ──────────────────────────────────────────────────────
git fetch origin main >> "$LOG_FILE" 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "No updates available, exiting"
    exit 0
fi

log "Updates found! Local: ${LOCAL:0:8} Remote: ${REMOTE:0:8}"

if ! git pull origin main >> "$LOG_FILE" 2>&1; then
    log "ERROR: Git pull failed"
    exit 1
fi
log "Code updated successfully"

# ── rebuild backend ────────────────────────────────────────────────────────
log "Updating Python backend..."
cd "$APP_DIR/backend"
if [ -f "venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source venv/bin/activate
    pip install -r requirements.txt >> "$LOG_FILE" 2>&1
    deactivate
    log "Backend dependencies updated"
else
    log "WARNING: Virtual environment not found"
fi

# ── rebuild frontend ───────────────────────────────────────────────────────
log "Updating frontend..."
cd "$APP_DIR/frontend"
if npm install >> "$LOG_FILE" 2>&1; then
    log "Frontend dependencies installed"
else
    log "ERROR: npm install failed"; exit 1
fi
if npm run build >> "$LOG_FILE" 2>&1; then
    log "Frontend build successful (dist/ updated)"
else
    log "ERROR: Frontend build failed"; exit 1
fi

# ── restart services ───────────────────────────────────────────────────────
log "Restarting backend and reloading nginx..."
systemctl restart panchanga-backend >> "$LOG_FILE" 2>&1
systemctl reload nginx >> "$LOG_FILE" 2>&1

sleep 5

if systemctl is-active --quiet panchanga-backend && systemctl is-active --quiet nginx; then
    log "Services restarted successfully"
    log "New version deployed: ${REMOTE:0:8}"
else
    log "WARNING: One or more services failed"
    systemctl status panchanga-backend --no-pager >> "$LOG_FILE" 2>&1
    systemctl status nginx --no-pager >> "$LOG_FILE" 2>&1
fi

log "Auto-update complete!"
log "========================================="
