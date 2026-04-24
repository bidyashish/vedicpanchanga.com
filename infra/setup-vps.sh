#!/bin/bash

# VPS setup script for vedicpanchanga.com
# Provisions Python/FastAPI backend + Vite/React frontend behind Nginx.
# Tested on Ubuntu 22.04 / 24.04. Run:  sudo bash infra/setup-vps.sh

set -euo pipefail

echo "========================================="
echo "  Panchanga VPS Setup"
echo "========================================="
echo

# ── preflight ────────────────────────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    echo "Please run as root (use sudo bash infra/setup-vps.sh)" >&2
    exit 1
fi

APP_DIR="${APP_DIR:-/apps/panchanga}"
RUN_USER="${SUDO_USER:-ubuntu}"
RUN_GROUP="$(id -gn "$RUN_USER" 2>/dev/null || echo ubuntu)"

if [ ! -d "$APP_DIR/backend" ] || [ ! -d "$APP_DIR/frontend" ]; then
    echo "Expected $APP_DIR/{backend,frontend} — did you clone to the right path?" >&2
    echo "  sudo mkdir -p /apps && cd /apps" >&2
    echo "  sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga" >&2
    exit 1
fi

if [ ! -d "$APP_DIR/backend/ephe" ]; then
    echo "WARNING: $APP_DIR/backend/ephe/ is missing — Swiss Ephemeris needs it." >&2
fi

if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS="${ID:-unknown}"
else
    echo "Cannot detect OS (missing /etc/os-release)" >&2
    exit 1
fi
echo "OS: $OS · service user: $RUN_USER:$RUN_GROUP · APP_DIR: $APP_DIR"
echo

# ── system packages ──────────────────────────────────────────────────────────
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "Installing system packages..."
    apt-get update
    apt-get install -y nginx python3 python3-pip python3-venv curl ufw git
    if ! command -v node >/dev/null 2>&1; then
        echo "Installing Node.js 20.x from NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
elif [ "$OS" = "freebsd" ]; then
    pkg install -y nginx python39 py39-pip curl node20 npm git
else
    echo "Unsupported OS: $OS" >&2
    exit 1
fi
echo "node:  $(node --version 2>/dev/null || echo 'missing')"
echo "npm:   $(npm --version 2>/dev/null || echo 'missing')"
echo

# ── backend ──────────────────────────────────────────────────────────────────
echo "1. Setting up Python backend..."
cd "$APP_DIR/backend"
if [ ! -d venv ]; then
    python3 -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt
deactivate
chown -R "$RUN_USER:$RUN_GROUP" "$APP_DIR/backend/venv"

# Production CORS allowlist — only the public domain, no localhost. Frontend is
# served same-origin via Nginx so cross-origin XHR is impossible from the app
# itself; this lockdown blocks third-party sites from calling the API directly.
cat > "$APP_DIR/backend/.env" <<'EOF'
CORS_ORIGINS=https://vedicpanchanga.com,https://www.vedicpanchanga.com
EOF
chown "$RUN_USER:$RUN_GROUP" "$APP_DIR/backend/.env"
chmod 640 "$APP_DIR/backend/.env"

cat > /etc/systemd/system/panchanga-backend.service <<EOF
[Unit]
Description=Panchanga Backend API (FastAPI on :8001)
After=network.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_GROUP
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$APP_DIR/backend/venv/bin:/usr/bin:/bin
ExecStart=$APP_DIR/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# ── frontend ─────────────────────────────────────────────────────────────────
echo
echo "2. Building Vite + React frontend..."
cd "$APP_DIR/frontend"

# Write production env so Vite bakes it in. Empty VITE_BACKEND_URL means the
# browser calls /api on the same origin (proxied by Nginx below).
cat > .env.production <<'EOF'
VITE_BACKEND_URL=""
EOF

# Run install/build as the service user so ~/.npm and node_modules aren't root-owned
sudo -u "$RUN_USER" -H bash -c "cd '$APP_DIR/frontend' && npm install && npm run build"

# ── nginx ────────────────────────────────────────────────────────────────────
echo
echo "3. Configuring Nginx..."
cat > /etc/nginx/sites-available/vedicpanchanga <<EOF
server {
    listen 80;
    server_name vedicpanchanga.com www.vedicpanchanga.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root $APP_DIR/frontend/dist;
    index index.html;

    # Long-cache fingerprinted assets (Vite emits /assets/*-[hash].{js,css,woff2,...}).
    location /assets/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Never cache index.html — it references the hashed assets.
    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }

    # SPA fallback for client-side routes (/, /#kundali, /#panchang, /#muhurta).
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # FastAPI backend (loopback only).
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Direct-IP probes get dropped.
server {
    listen 80 default_server;
    server_name _;
    return 444;
}
EOF

ln -sf /etc/nginx/sites-available/vedicpanchanga /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# ── firewall ─────────────────────────────────────────────────────────────────
echo
echo "4. Firewall (UFW)..."
ufw allow 22/tcp  comment 'SSH'   >/dev/null
ufw allow 80/tcp  comment 'HTTP'  >/dev/null
ufw allow 443/tcp comment 'HTTPS' >/dev/null
# Monitoring (see AGENTS.md §8 — restrict to admin IP in prod).
ufw allow 3002/tcp comment 'Grafana'       >/dev/null
ufw allow 9090/tcp comment 'Prometheus'    >/dev/null
ufw allow 9100/tcp comment 'Node Exporter' >/dev/null
# Backend must never be directly reachable.
ufw deny 8000 comment 'Block direct backend (legacy)' >/dev/null
ufw deny 8001 comment 'Block direct backend'          >/dev/null
ufw --force enable

# ── services ─────────────────────────────────────────────────────────────────
echo
echo "5. Starting services..."
systemctl daemon-reload
systemctl enable panchanga-backend nginx
systemctl restart panchanga-backend nginx

echo
echo "========================================="
echo "  ✅ Setup complete"
echo "========================================="
echo
systemctl status panchanga-backend --no-pager -l | head -10
echo
echo "Ports:  Frontend 80/443 (Nginx static files)  ·  Backend 127.0.0.1:8001"
echo
echo "Next steps:"
echo "  1. Point your domain DNS to this server IP"
echo "  2. Install SSL:"
echo "       sudo apt install -y certbot python3-certbot-nginx"
echo "       sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com"
echo "  3. Restrict monitoring ports 3002/9090/9100 to your admin IP (ufw)"
echo
echo "Useful commands:"
echo "  sudo journalctl -u panchanga-backend -f      # backend logs"
echo "  sudo systemctl restart panchanga-backend     # restart backend"
echo "  sudo bash $APP_DIR/infra/update-deploy.sh    # rebuild & redeploy"
echo
