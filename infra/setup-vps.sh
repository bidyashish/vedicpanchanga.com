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
ExecStart=/apps/panchanga/backend/venv/bin/uvicorn api:app --host 127.0.0.1 --port 8121
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "2. Setting up Next.js frontend..."
cd /apps/panchanga/frontend

# Install dependencies
npm install

# Build production
npm run build

# Create .env.local
cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8121
PORT=3121
EOF

# Create frontend service
cat > /etc/systemd/system/panchanga-frontend.service <<'EOF'
[Unit]
Description=Panchanga Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/apps/panchanga/frontend
Environment=PATH=/usr/bin:/bin
Environment=PORT=3121
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

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

    # Frontend
    location / {
        proxy_pass http://localhost:3121;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API v1 routes - through Next.js
    location /api/v1/ {
        proxy_pass http://localhost:3121;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Block direct Python backend access
    location /api/ {
        return 403;
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
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "5. Starting services..."
systemctl daemon-reload
systemctl enable panchanga-backend panchanga-frontend nginx
systemctl restart panchanga-backend panchanga-frontend nginx

echo ""
echo "========================================="
echo "  ✅ Setup Complete!"
echo "========================================="
echo ""
echo "Services status:"
systemctl status panchanga-backend --no-pager -l
echo ""
systemctl status panchanga-frontend --no-pager -l
echo ""
echo "Ports:"
echo "  Frontend: 3121"
echo "  Backend:  8121 (localhost only)"
echo ""
echo "Next steps:"
echo "1. Point your domain DNS to this server IP"
echo "2. Install SSL: sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com"
echo ""
echo "Useful commands:"
echo "  Check logs: sudo journalctl -u panchanga-backend -f"
echo "  Restart:    sudo systemctl restart panchanga-backend panchanga-frontend"
echo ""
