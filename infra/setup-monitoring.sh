#!/bin/bash

# Monitoring Stack Setup Script
# Installs and configures Prometheus, Grafana, and Node Exporter

set -e

echo "========================================="
echo "  Monitoring Stack Setup"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Install Prometheus
echo "1. Installing Prometheus..."
cd /tmp
PROM_VERSION="2.45.0"
wget https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz
tar xzf prometheus-${PROM_VERSION}.linux-amd64.tar.gz
mv prometheus-${PROM_VERSION}.linux-amd64 /opt/prometheus

# Create prometheus user
useradd --no-create-home --shell /bin/false prometheus || true
chown -R prometheus:prometheus /opt/prometheus

# Create data directory
mkdir -p /var/lib/prometheus
chown -R prometheus:prometheus /var/lib/prometheus

# Configure prometheus
mkdir -p /etc/prometheus
cat > /etc/prometheus/prometheus.yml <<'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'process-exporter'
    static_configs:
      - targets: ['localhost:9256']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['localhost:8080']

  - job_name: 'grafana'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'panchanga-backend'
    static_configs:
      - targets: ['localhost:8001']
    metrics_path: '/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
EOF
chown -R prometheus:prometheus /etc/prometheus

# Install prometheus service
cat > /etc/systemd/system/prometheus.service <<'EOF'
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
Restart=always
RestartSec=5
ExecStart=/opt/prometheus/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus/ \
  --web.console.templates=/opt/prometheus/consoles \
  --web.console.libraries=/opt/prometheus/console_libraries \
  --web.listen-address=0.0.0.0:9090 \
  --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "2. Installing Node Exporter..."
NODE_EXP_VERSION="1.6.1"
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VERSION}/node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz
tar xzf node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz
mv node_exporter-${NODE_EXP_VERSION}.linux-amd64/node_exporter /usr/local/bin/

# Create node_exporter user
useradd --no-create-home --shell /bin/false node_exporter || true

# Install node_exporter service
cat > /etc/systemd/system/node_exporter.service <<'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
Restart=always
RestartSec=5
ExecStart=/usr/local/bin/node_exporter \
  --web.listen-address=:9100

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "3. Installing Grafana..."
# Add Grafana GPG key and repository
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list
apt update
apt install -y grafana

# Setup Grafana configuration
SERVER_IP=$(curl -s ifconfig.me)
GRAFANA_PASS=$(openssl rand -base64 16)

cat > /etc/grafana/grafana.ini <<EOF
[server]
http_addr = 0.0.0.0
http_port = 3002
domain = $SERVER_IP
root_url = http://$SERVER_IP:3002/

[database]
type = sqlite3
path = /var/lib/grafana/grafana.db

[security]
admin_user = admin
admin_password = $GRAFANA_PASS
allow_sign_up = false

[auth.anonymous]
enabled = false

[users]
allow_sign_up = false
auto_assign_org = true
auto_assign_org_role = Admin

[paths]
provisioning = /etc/grafana/provisioning
EOF

# Setup Grafana provisioning
mkdir -p /etc/grafana/provisioning/{datasources,dashboards}

cat > /etc/grafana/provisioning/datasources/prometheus-datasource.yml <<'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://localhost:9090
    isDefault: true
    editable: false
    uid: prometheus
EOF

cat > /etc/grafana/provisioning/dashboards/dashboard-provider.yml <<'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create dashboard directory
mkdir -p /var/lib/grafana/dashboards
chown -R grafana:grafana /var/lib/grafana

echo ""
echo "4. Starting services..."
systemctl daemon-reload
systemctl enable prometheus node_exporter grafana-server
systemctl start prometheus node_exporter grafana-server

# Wait for services to start
sleep 5

echo ""
echo "========================================="
echo "  ✅ Monitoring Stack Setup Complete!"
echo "========================================="
echo ""
echo "Service Status:"
systemctl status prometheus --no-pager -l | head -10
echo ""
systemctl status node_exporter --no-pager -l | head -10
echo ""
systemctl status grafana-server --no-pager -l | head -10
echo ""
echo "Access URLs:"
echo "  Prometheus:  http://$SERVER_IP:9090"
echo "  Grafana:     http://$SERVER_IP:3002"
echo "  Node Exporter: http://$SERVER_IP:9100/metrics"
echo ""
echo "Grafana Credentials:"
echo "  Username: admin"
echo "  Password: $GRAFANA_PASS"
echo ""
echo "⚠️  IMPORTANT: Save the Grafana password above!"
echo ""
echo "Useful commands:"
echo "  Check logs:     sudo journalctl -u prometheus -f"
echo "  Restart:        sudo systemctl restart prometheus grafana-server"
echo "  Stop:           sudo systemctl stop prometheus grafana-server"
echo ""
