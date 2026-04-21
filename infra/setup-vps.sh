#!/bin/bash

# Simple VPS Setup Script for Panchanga App
# Works on Ubuntu/Debian
# Run after: git clone https://github.com/bidyashish/drik-panchanga /apps/panchanga

set -e

echo "========================================="
echo "  Panchanga VPS Setup Script"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS"
    exit 1
fi

echo "Detected OS: $OS"
echo ""

# Install packages based on OS
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "Installing packages..."
    apt update
    apt install -y nginx python3 python3-pip python3-venv curl ufw

    # Install Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs

elif [ "$OS" = "freebsd" ]; then
    echo "Installing packages..."
    pkg install -y nginx python39 py39-pip curl node20 npm
else
    echo "Unsupported OS: $OS"
    exit 1
fi

echo ""
echo "1. Setting up Python backend..."
cd /apps/panchanga/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Create backend service
cat > /etc/systemd/system/panchanga-backend.service <<'EOF'
[Unit]
Description=Panchanga Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/apps/panchanga/backend
Environment=PATH=/apps/panchanga/backend/venv/bin:/usr/bin:/bin
ExecStart=/apps/panchanga/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "2. Setting up Next.js frontend..."
cd /apps/panchanga/frontend

# Install dependencies
npm install --legacy-peer-deps

# Build production
npm run build

# Create .env.local
cat > .env.local <<'EOF'
REACT_APP_BACKEND_URL=""
PORT=3121
EOF

# We don't need a systemd service for the frontend because NGINX will serve the static build!

echo ""
echo "3. Setting up Nginx..."

# Create nginx config
cat > /etc/nginx/sites-available/vedicpanchanga <<'EOF'
server {
    listen 80;
    server_name vedicpanchanga.com www.vedicpanchanga.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Serve the static React build
    root /apps/panchanga/frontend/build;
    index index.html;

    # Frontend routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API routes -> Python Backend (FastAPI)
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Block access via IP
server {
    listen 80 default_server;
    server_name _;
    return 444;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/vedicpanchanga /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx
nginx -t

echo ""
echo "4. Setting up firewall..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Monitoring ports (external access)
ufw allow 3002/tcp comment 'Grafana'
ufw allow 9090/tcp comment 'Prometheus'
ufw allow 9100/tcp comment 'Node Exporter'

# Block direct backend access
ufw deny 8000 comment 'Block direct backend access (legacy)'
ufw deny 8001 comment 'Block direct backend access (current)'

ufw --force enable

echo ""
echo "5. Starting services..."
systemctl daemon-reload
systemctl enable panchanga-backend nginx
systemctl restart panchanga-backend nginx

echo ""
echo "========================================="
echo "  ✅ Setup Complete!"
echo "========================================="
echo ""
echo "Services status:"
systemctl status panchanga-backend --no-pager -l
echo ""
echo "Ports:"
echo "  Frontend: 80/443 (Nginx static files)"
echo "  Backend:  8001 (localhost only)"

echo ""
echo "Next steps:"
echo "1. Point your domain DNS to this server IP"
echo "2. Install SSL: sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com"

echo ""
echo "Useful commands:"
echo "  Check logs: sudo journalctl -u panchanga-backend -f"
echo "  Restart:    sudo systemctl restart panchanga-backend"
echo ""
