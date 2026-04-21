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

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

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

# Copy prometheus config
mkdir -p /etc/prometheus
cp "$SCRIPT_DIR/prometheus.yml" /etc/prometheus/prometheus.yml
chown -R prometheus:prometheus /etc/prometheus

# Install prometheus service
cp "$SCRIPT_DIR/prometheus.service" /etc/systemd/system/prometheus.service

echo ""
echo "2. Installing Node Exporter..."
NODE_EXP_VERSION="1.6.1"
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VERSION}/node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz
tar xzf node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz
mv node_exporter-${NODE_EXP_VERSION}.linux-amd64/node_exporter /usr/local/bin/

# Create node_exporter user
useradd --no-create-home --shell /bin/false node_exporter || true

# Install node_exporter service
cp "$SCRIPT_DIR/node_exporter.service" /etc/systemd/system/node_exporter.service

echo ""
echo "3. Installing Grafana..."
# Add Grafana GPG key and repository
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list
apt update
apt install -y grafana

# Copy Grafana configuration
cp "$SCRIPT_DIR/grafana.ini" /etc/grafana/grafana.ini

# Generate random password for Grafana admin
GRAFANA_PASS=$(openssl rand -base64 16)
sed -i "s/CHANGE_THIS_PASSWORD/$GRAFANA_PASS/" /etc/grafana/grafana.ini

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
sed -i "s/YOUR_SERVER_IP_OR_DOMAIN/$SERVER_IP/" /etc/grafana/grafana.ini

# Setup Grafana provisioning
mkdir -p /etc/grafana/provisioning/{datasources,dashboards}
cp "$SCRIPT_DIR/grafana-datasource.yml" /etc/grafana/provisioning/datasources/prometheus-datasource.yml
cp "$SCRIPT_DIR/grafana-dashboard-provider.yml" /etc/grafana/provisioning/dashboards/dashboard-provider.yml

# Create dashboard directory
mkdir -p /var/lib/grafana/dashboards
chown -R grafana:grafana /var/lib/grafana

# Copy Grafana service (if using custom binary)
# cp "$SCRIPT_DIR/grafana.service" /etc/systemd/system/grafana.service

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
