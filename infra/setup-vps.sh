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

# TLS via Cloudflare Origin Cert (free, 15-year, no rate limits, no auto-renew).
# Generate in Cloudflare → SSL/TLS → Origin Server → Create Certificate, then:
#   sudo mkdir -p /etc/ssl/cloudflare
#   sudo nano /etc/ssl/cloudflare/origin.pem    (paste certificate)
#   sudo nano /etc/ssl/cloudflare/origin.key    (paste private key)
#   sudo chmod 600 /etc/ssl/cloudflare/origin.key
#   sudo bash infra/setup-vps.sh                (re-run; this script is idempotent)
# Cloudflare → SSL/TLS → Overview → Full (strict).
CF_CERT="/etc/ssl/cloudflare/origin.pem"
CF_KEY="/etc/ssl/cloudflare/origin.key"

if [ -f "$CF_CERT" ] && [ -f "$CF_KEY" ]; then
    TLS_ENABLED=1
    echo "  Cloudflare Origin Cert found — Nginx will serve HTTPS on :443"
else
    TLS_ENABLED=0
    cat <<'WARN'

  ⚠️  No Cloudflare Origin Cert found at /etc/ssl/cloudflare/origin.{pem,key}
      Nginx will be configured for HTTP-only on port 80. To enable HTTPS:
        1. Cloudflare → SSL/TLS → Origin Server → Create Certificate (15 years)
        2. Paste the cert + key into /etc/ssl/cloudflare/origin.{pem,key}
        3. Re-run this script (sudo bash infra/setup-vps.sh)
      Until then, set Cloudflare SSL/TLS mode to "Flexible" so the site loads.

WARN
fi

if [ "$TLS_ENABLED" = "1" ]; then
cat > /etc/nginx/sites-available/vedicpanchanga <<EOF
# Redirect plain HTTP to HTTPS (Cloudflare honours this on the edge too).
server {
    listen 80;
    listen [::]:80;
    server_name vedicpanchanga.com www.vedicpanchanga.com;
    return 301 https://\$host\$request_uri;
}

# Public site over TLS.
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name vedicpanchanga.com www.vedicpanchanga.com;

    ssl_certificate     $CF_CERT;
    ssl_certificate_key $CF_KEY;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5:!3DES;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    # Cloudflare-aware client IP (adjust trusted CIDRs if you proxy elsewhere).
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root $APP_DIR/frontend/dist;
    index index.html;

    location /assets/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Direct-IP probes get dropped (port 80 and 443).
server {
    listen 80  default_server;
    listen 443 ssl default_server;
    ssl_certificate     $CF_CERT;
    ssl_certificate_key $CF_KEY;
    server_name _;
    return 444;
}
EOF
else
cat > /etc/nginx/sites-available/vedicpanchanga <<EOF
server {
    listen 80;
    server_name vedicpanchanga.com www.vedicpanchanga.com;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root $APP_DIR/frontend/dist;
    index index.html;

    location /assets/ {
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 80 default_server;
    server_name _;
    return 444;
}
EOF
fi

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
if [ "$TLS_ENABLED" = "1" ]; then
echo "Next steps:"
echo "  1. Cloudflare → SSL/TLS → Overview → set mode to 'Full (strict)'"
echo "  2. Restrict monitoring ports 3002/9090/9100 to your admin IP (ufw)"
else
echo "Next steps:"
echo "  1. Cloudflare DNS: A record vedicpanchanga.com → this server IP (proxied)"
echo "  2. Cloudflare → SSL/TLS → Origin Server → Create Certificate (15 years)"
echo "  3. Paste cert + key into /etc/ssl/cloudflare/origin.{pem,key}"
echo "       sudo mkdir -p /etc/ssl/cloudflare"
echo "       sudo nano  /etc/ssl/cloudflare/origin.pem    # paste certificate"
echo "       sudo nano  /etc/ssl/cloudflare/origin.key    # paste private key"
echo "       sudo chmod 600 /etc/ssl/cloudflare/origin.key"
echo "  4. Re-run this script:  sudo bash $APP_DIR/infra/setup-vps.sh"
echo "  5. Cloudflare → SSL/TLS → Overview → set mode to 'Full (strict)'"
echo "  6. (Meanwhile) Cloudflare SSL/TLS mode 'Flexible' brings the site up immediately."
fi
echo
echo "Useful commands:"
echo "  sudo journalctl -u panchanga-backend -f      # backend logs"
echo "  sudo systemctl restart panchanga-backend     # restart backend"
echo "  sudo bash $APP_DIR/infra/update-deploy.sh    # rebuild & redeploy"
echo
