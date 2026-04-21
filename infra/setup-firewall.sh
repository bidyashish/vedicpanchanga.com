#!/bin/bash

# Firewall setup script for Panchanga VPS
# Configures UFW with necessary ports for application and monitoring

echo "========================================="
echo "  Configuring UFW Firewall"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

echo "Setting up firewall rules..."

# Essential services
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Monitoring ports (external access)
ufw allow 3002/tcp comment 'Grafana'
ufw allow 9090/tcp comment 'Prometheus'
ufw allow 9100/tcp comment 'Node Exporter'
ufw allow 8080/tcp comment 'cAdvisor'
ufw allow 9256/tcp comment 'Process Exporter'

# Block direct backend access
ufw deny 8000 comment 'Block direct backend access'
ufw deny 8121 comment 'Block direct backend access'

# Enable firewall
echo "Enabling firewall..."
ufw --force enable

echo ""
echo "✅ Firewall configured successfully!"
echo ""
echo "Current firewall status:"
ufw status verbose
echo ""
