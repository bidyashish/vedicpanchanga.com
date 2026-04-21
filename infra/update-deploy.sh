#!/bin/bash

# Simple Update & Deploy Script
# Pulls latest code and restarts services

set -e

echo "========================================="
echo "  Updating Panchanga Application"
echo "========================================="
echo ""

cd /apps/panchanga

echo "1. Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "2. Updating Python backend..."
cd /apps/panchanga/backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo ""
echo "3. Updating Next.js frontend..."
cd /apps/panchanga/frontend
npm install --legacy-peer-deps
npm run build

echo ""
echo "4. Restarting services..."
sudo systemctl restart panchanga-backend
sudo systemctl restart nginx

echo ""
echo "5. Checking service status..."
sleep 3
sudo systemctl status panchanga-backend --no-pager -l | head -15

echo ""
echo "========================================="
echo "  ✅ Update Complete!"
echo "========================================="
echo ""
echo "Check website: https://vedicpanchanga.com/"
echo "View logs: sudo journalctl -u panchanga-backend -f"
echo ""
