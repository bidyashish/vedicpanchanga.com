#!/bin/bash

# Setup cron job for auto-updates

echo "Setting up auto-update cron job for Panchanga..."

# Create log file with correct permissions
sudo touch /var/log/panchanga-auto-update.log
sudo chown ubuntu:ubuntu /var/log/panchanga-auto-update.log

# Add cron job (runs every 6 hours)
(crontab -l 2>/dev/null | grep -v "panchanga/auto-update-cron.sh"; echo "0 */6 * * * /apps/panchanga/auto-update-cron.sh >> /var/log/panchanga-auto-update.log 2>&1") | crontab -

echo ""
echo "✅ Cron job setup complete!"
echo ""
echo "Auto-update schedule: Every 6 hours"
echo "Log file: /var/log/panchanga-auto-update.log"
echo ""
echo "Current cron jobs:"
crontab -l
echo ""
echo "To change schedule, edit with: crontab -e"
echo ""
echo "Schedule options:"
echo "  Every 6 hours:  0 */6 * * *"
echo "  Every 12 hours: 0 */12 * * *"
echo "  Daily at 2am:   0 2 * * *"
echo "  Twice daily:    0 2,14 * * *"
echo ""
echo "View logs: tail -f /var/log/panchanga-auto-update.log"
echo "Test now:  bash /apps/panchanga/auto-update-cron.sh"
echo ""
