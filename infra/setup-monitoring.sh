#!/bin/bash

# Monitoring Stack Setup - Prometheus, Grafana, Node Exporter
# Run once on a fresh VPS:  sudo bash infra/setup-monitoring.sh
# NOT idempotent - re-running will skip existing users but may move binaries.

set -euo pipefail

echo "========================================="
echo "  Monitoring Stack Setup"
echo "========================================="
echo

if [ "$(id -u)" -ne 0 ]; then
    echo "Please run as root (use sudo)" >&2
    exit 1
fi

# ── Prometheus ──────────────────────────────────────────────────────────────
echo "1. Installing Prometheus..."
cd /tmp
PROM_VERSION="2.53.0"
wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz"
tar xzf "prometheus-${PROM_VERSION}.linux-amd64.tar.gz"
rm -rf /opt/prometheus
mv "prometheus-${PROM_VERSION}.linux-amd64" /opt/prometheus

useradd --no-create-home --shell /bin/false prometheus 2>/dev/null || true
chown -R prometheus:prometheus /opt/prometheus

mkdir -p /var/lib/prometheus
chown -R prometheus:prometheus /var/lib/prometheus

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
EOF
chown -R prometheus:prometheus /etc/prometheus

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
  --web.listen-address=127.0.0.1:9090 \
  --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF

# ── Node Exporter ───────────────────────────────────────────────────────────
echo
echo "2. Installing Node Exporter..."
NODE_EXP_VERSION="1.8.1"
wget -q "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VERSION}/node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz"
tar xzf "node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz"
mv "node_exporter-${NODE_EXP_VERSION}.linux-amd64/node_exporter" /usr/local/bin/

useradd --no-create-home --shell /bin/false node_exporter 2>/dev/null || true

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
  --web.listen-address=127.0.0.1:9100

[Install]
WantedBy=multi-user.target
EOF

# ── Grafana ─────────────────────────────────────────────────────────────────
echo
echo "3. Installing Grafana..."
apt-get install -y apt-transport-https software-properties-common
mkdir -p /etc/apt/keyrings
wget -qO- https://apt.grafana.com/gpg.key | gpg --dearmor -o /etc/apt/keyrings/grafana.gpg
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
    > /etc/apt/sources.list.d/grafana.list
apt-get update
apt-get install -y grafana

GRAFANA_PASS=$(openssl rand -base64 16)

cat > /etc/grafana/grafana.ini <<EOF
[server]
http_addr = 127.0.0.1
http_port = 3002

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

mkdir -p /var/lib/grafana/dashboards
chown -R grafana:grafana /var/lib/grafana

# ── Start ───────────────────────────────────────────────────────────────────
echo
echo "4. Starting services..."
systemctl daemon-reload
systemctl enable prometheus node_exporter grafana-server
systemctl start prometheus node_exporter grafana-server

sleep 5

echo
echo "========================================="
echo "  Monitoring Stack Setup Complete"
echo "========================================="
echo
echo "Service Status:"
systemctl status prometheus --no-pager -l | head -5
echo
systemctl status node_exporter --no-pager -l | head -5
echo
systemctl status grafana-server --no-pager -l | head -5
echo
echo "All services bind to 127.0.0.1."
echo "To access remotely, use SSH tunnels or add UFW rules for your admin IP."
echo
echo "Grafana Credentials:"
echo "  Username: admin"
echo "  Password: $GRAFANA_PASS"
echo
echo "IMPORTANT: Save the Grafana password above!"
echo
