# Panchanga VPS Deployment Guide

Simple deployment guide for Vedic Panchanga application on Ubuntu/Debian VPS.

## Quick Start (New VPS)

```bash
# 1. Clone repository
sudo mkdir -p /apps
cd /apps
sudo git clone https://github.com/bidyashish/drik-panchanga panchanga
sudo chown -R ubuntu:ubuntu /apps/panchanga

# 2. Run setup script (one time)
cd /apps/panchanga
sudo bash setup-vps.sh

# 3. Setup auto-updates (optional)
bash setup-cron.sh

# 4. Setup SSL (optional)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d vedicpanchanga.com
```

Done! Your app is now running and will auto-update every 6 hours.

## Scripts Overview

### 1. `setup-vps.sh` - Initial Setup
First-time VPS setup. Installs everything and configures services.

```bash
sudo bash setup-vps.sh
```

**What it does:**
- Installs nginx, Python, Node.js
- Creates virtual environment
- Builds frontend
- Creates systemd services
- Configures nginx reverse proxy
- Sets up firewall
- Starts all services

### 2. `update-deploy.sh` - Manual Update
Manually update and redeploy application.

```bash
bash update-deploy.sh
```

**What it does:**
- Pulls latest code from GitHub
- Updates Python dependencies
- Rebuilds Next.js frontend
- Restarts services

### 3. `auto-update-cron.sh` - Auto-Update (Cron)
Automatic update script that runs via cron.

**Features:**
- Checks for new commits
- Only updates if changes detected
- Rebuilds and restarts services
- Logs all activity
- Prevents concurrent runs

### 4. `setup-cron.sh` - Setup Auto-Updates
Configures cron job for automatic updates.

```bash
bash setup-cron.sh
```

**Default schedule:** Every 6 hours
**Log location:** `/var/log/panchanga-auto-update.log`

## Auto-Update Configuration

### Setup Auto-Updates

```bash
cd /apps/panchanga
bash setup-cron.sh
```

### View Auto-Update Logs

```bash
# Real-time logs
tail -f /var/log/panchanga-auto-update.log

# Last 50 lines
tail -50 /var/log/panchanga-auto-update.log
```

### Test Auto-Update Manually

```bash
bash /apps/panchanga/auto-update-cron.sh
```

### Change Update Frequency

```bash
# Edit cron schedule
crontab -e

# Common schedules:
# Every 6 hours:  0 */6 * * *
# Every 12 hours: 0 */12 * * *
# Daily at 2am:   0 2 * * *
# Twice daily:    0 2,14 * * *
```

### Disable Auto-Updates

```bash
crontab -l | grep -v "auto-update-cron.sh" | crontab -
```

## Service Management

### Check Status

```bash
sudo systemctl status panchanga-backend
sudo systemctl status panchanga-frontend
```

### View Logs

```bash
# Backend logs
sudo journalctl -u panchanga-backend -f

# Frontend logs
sudo journalctl -u panchanga-frontend -f

# Both logs
sudo journalctl -u panchanga-backend -u panchanga-frontend -f
```

### Restart Services

```bash
# Restart both
sudo systemctl restart panchanga-backend panchanga-frontend

# Restart individually
sudo systemctl restart panchanga-backend
sudo systemctl restart panchanga-frontend
```

### Stop/Start Services

```bash
# Stop
sudo systemctl stop panchanga-backend panchanga-frontend

# Start
sudo systemctl start panchanga-backend panchanga-frontend
```

## Nginx Management

### Test Configuration

```bash
sudo nginx -t
```

### Reload Nginx

```bash
sudo systemctl reload nginx
```

### View Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

## SSL Certificate (Optional)

### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Get SSL Certificate

```bash
sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com
```

### Auto-Renew Test

```bash
sudo certbot renew --dry-run
```

Certificates auto-renew via cron.

## Troubleshooting

### Application Not Working

1. **Check services:**
   ```bash
   sudo systemctl status panchanga-backend panchanga-frontend
   ```

2. **Check logs:**
   ```bash
   sudo journalctl -u panchanga-backend -n 100
   sudo journalctl -u panchanga-frontend -n 100
   ```

3. **Restart services:**
   ```bash
   sudo systemctl restart panchanga-backend panchanga-frontend
   ```

### Auto-Update Not Working

1. **Check cron job exists:**
   ```bash
   crontab -l | grep auto-update
   ```

2. **Check log file:**
   ```bash
   tail -50 /var/log/panchanga-auto-update.log
   ```

3. **Test manually:**
   ```bash
   bash /apps/panchanga/auto-update-cron.sh
   ```

4. **Check permissions:**
   ```bash
   ls -l /apps/panchanga/auto-update-cron.sh
   ls -l /var/log/panchanga-auto-update.log
   ```

### Git Pull Fails

```bash
cd /apps/panchanga
git status
git stash  # If you have local changes
git pull origin main
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :3001
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>

# Restart service
sudo systemctl restart panchanga-frontend
```

## File Locations

- **Application:** `/apps/panchanga/`
- **Backend venv:** `/apps/panchanga/backend/venv/`
- **Frontend build:** `/apps/panchanga/frontend/.next/`
- **Systemd services:** `/etc/systemd/system/panchanga-*.service`
- **Nginx config:** `/etc/nginx/sites-available/vedicpanchanga`
- **Auto-update log:** `/var/log/panchanga-auto-update.log`
- **Service logs:** `journalctl -u panchanga-backend` or `-frontend`

## Architecture

```
GitHub Repo → Auto-Update (every 6h) → Build → Restart Services
                                              ↓
Internet → Cloudflare → Nginx → Next.js (3001) → Python API (8000)
```

**Security:**
- Python API only accessible from localhost
- Nginx handles SSL/TLS
- Cloudflare provides DDoS protection
- UFW firewall blocks unnecessary ports

## Monitoring

### Check if services are running

```bash
# Quick check
systemctl is-active panchanga-backend panchanga-frontend

# Detailed status
sudo systemctl status panchanga-backend panchanga-frontend
```

### Monitor resource usage

```bash
# CPU and memory
htop

# Disk usage
df -h

# Service resource usage
systemctl status panchanga-backend
```

### Check recent updates

```bash
# Auto-update log
tail -20 /var/log/panchanga-auto-update.log

# Git commit history
cd /apps/panchanga
git log --oneline -10
```

## Backup

### Backup Script (Optional)

```bash
#!/bin/bash
# Save as /apps/panchanga/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/panchanga"

mkdir -p "$BACKUP_DIR"

# Backup code
tar -czf "$BACKUP_DIR/panchanga-$DATE.tar.gz" /apps/panchanga

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/panchanga-*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup created: panchanga-$DATE.tar.gz"
```

## Update Frequency Recommendations

- **Development/Testing:** Every 1-6 hours
- **Production (active development):** Every 12 hours
- **Production (stable):** Daily or manual updates only

## Commands Cheat Sheet

```bash
# Setup (one time)
sudo bash /apps/panchanga/setup-vps.sh
bash /apps/panchanga/setup-cron.sh

# Manual update
bash /apps/panchanga/update-deploy.sh

# Check status
sudo systemctl status panchanga-backend panchanga-frontend

# View logs
sudo journalctl -u panchanga-backend -f
tail -f /var/log/panchanga-auto-update.log

# Restart services
sudo systemctl restart panchanga-backend panchanga-frontend

# Check auto-update schedule
crontab -l

# Test auto-update
bash /apps/panchanga/auto-update-cron.sh
```

## Support

- **Application:** https://github.com/bidyashish/drik-panchanga
- **Issues:** https://github.com/bidyashish/drik-panchanga/issues
- **Website:** https://vedicpanchanga.com/

---

**Created for Vedic Panchanga - Open Source Hindu Calendar**
