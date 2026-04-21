#!/bin/bash

# Auto-update script for Panchanga (runs via cron)
# Checks for updates, pulls code, rebuilds and restarts

# Set paths
APP_DIR="/apps/panchanga"
LOG_FILE="/var/log/panchanga-auto-update.log"
LOCK_FILE="/tmp/panchanga-update.lock"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    log "Update already in progress, exiting"
    exit 0
fi

# Create lock file
touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

log "========================================="
log "Starting auto-update check..."

cd "$APP_DIR" || {
    log "ERROR: Cannot access $APP_DIR"
    exit 1
}

# Fetch latest changes
git fetch origin main >> "$LOG_FILE" 2>&1

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "No updates available, exiting"
    exit 0
fi

log "Updates found! Local: ${LOCAL:0:8} Remote: ${REMOTE:0:8}"
log "Pulling latest code..."

# Pull latest code
if ! git pull origin main >> "$LOG_FILE" 2>&1; then
    log "ERROR: Git pull failed"
    exit 1
fi

log "Code updated successfully"

# Update backend
log "Updating Python backend..."
cd "$APP_DIR/backend"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    pip install -r requirements.txt >> "$LOG_FILE" 2>&1
    deactivate
    log "Backend dependencies updated"
else
    log "WARNING: Virtual environment not found"
fi

# Update frontend
log "Updating Next.js frontend..."
cd "$APP_DIR/frontend"
if npm install >> "$LOG_FILE" 2>&1; then
    log "Frontend dependencies installed"
else
    log "ERROR: npm install failed"
    exit 1
fi

if npm run build >> "$LOG_FILE" 2>&1; then
    log "Frontend build successful"
else
    log "ERROR: Frontend build failed"
    exit 1
fi

# Restart services
log "Restarting services..."
systemctl restart panchanga-backend >> "$LOG_FILE" 2>&1
systemctl restart panchanga-frontend >> "$LOG_FILE" 2>&1

# Wait a moment for services to start
sleep 5

# Check service status
if systemctl is-active --quiet panchanga-backend && systemctl is-active --quiet panchanga-frontend; then
    log "✅ Services restarted successfully"
    log "New version deployed: ${REMOTE:0:8}"
else
    log "⚠️  WARNING: One or more services failed to start"
    systemctl status panchanga-backend --no-pager >> "$LOG_FILE" 2>&1
    systemctl status panchanga-frontend --no-pager >> "$LOG_FILE" 2>&1
fi

log "Auto-update complete!"
log "========================================="

exit 0
