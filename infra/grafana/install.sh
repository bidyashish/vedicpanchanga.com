#!/bin/bash

# Reproducible monitoring installer for vedicpanchanga.com
# ---------------------------------------------------------
# Installs / refreshes the full observability stack and provisions it from the
# version-controlled files in this folder:
#
#   prometheus/prometheus.yml               -> /etc/prometheus/prometheus.yml
#   blackbox/blackbox.yml                   -> /etc/blackbox_exporter/blackbox.yml
#   provisioning/datasources/prometheus.yml -> /etc/grafana/provisioning/datasources/
#   provisioning/dashboards/provider.yml    -> /etc/grafana/provisioning/dashboards/
#   dashboards/*.json                       -> /var/lib/grafana/dashboards/
#
# Stack: Prometheus + Node Exporter + Blackbox Exporter + Grafana.
# Everything binds to 127.0.0.1. Grafana is reached over the public internet
# only through the Nginx reverse proxy at https://vedicpanchanga.com/health/
# (configured by infra/setup-vps.sh). Prometheus (9090), Node Exporter (9100)
# and Blackbox (9115) are localhost-only - tunnel over SSH to inspect them.
#
# IDEMPOTENT: safe to re-run. Binaries are only re-downloaded when missing or a
# version changes; config files are always re-synced from this folder; the
# Grafana admin password is never touched (server settings come from a systemd
# drop-in, not a grafana.ini rewrite).
#
# Usage:  sudo bash infra/grafana/install.sh

set -euo pipefail

PROM_VERSION="2.53.0"
NODE_EXP_VERSION="1.8.1"
BLACKBOX_VERSION="0.25.0"

GRAFANA_ROOT_URL="https://vedicpanchanga.com/health/"
GRAFANA_PORT="3002"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "  Monitoring Stack (reproducible)"
echo "========================================="
echo

if [ "$(id -u)" -ne 0 ]; then
    echo "Please run as root (use sudo)" >&2
    exit 1
fi

# ── helpers ───────────────────────────────────────────────────────────────────
# install_tarball_binary <name> <version> <url> <relative-path-to-binary-in-tar> <dest>
# Downloads + installs only when the binary is missing or the version differs.
have_version() { command -v "$1" >/dev/null 2>&1 && "$1" --version 2>&1 | grep -q "$2"; }

# ── Prometheus ──────────────────────────────────────────────────────────────
echo "1. Prometheus ${PROM_VERSION}..."
if [ ! -x /opt/prometheus/prometheus ] || ! /opt/prometheus/prometheus --version 2>&1 | grep -q "$PROM_VERSION"; then
    cd /tmp
    wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz"
    tar xzf "prometheus-${PROM_VERSION}.linux-amd64.tar.gz"
    rm -rf /opt/prometheus
    mv "prometheus-${PROM_VERSION}.linux-amd64" /opt/prometheus
    rm -f "prometheus-${PROM_VERSION}.linux-amd64.tar.gz"
    echo "   installed /opt/prometheus"
else
    echo "   already current"
fi
useradd --no-create-home --shell /bin/false prometheus 2>/dev/null || true
mkdir -p /var/lib/prometheus /etc/prometheus
install -m 0644 "$SCRIPT_DIR/prometheus/prometheus.yml" /etc/prometheus/prometheus.yml
chown -R prometheus:prometheus /opt/prometheus /var/lib/prometheus /etc/prometheus

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
echo "2. Node Exporter ${NODE_EXP_VERSION}..."
if [ ! -x /usr/local/bin/node_exporter ] || ! /usr/local/bin/node_exporter --version 2>&1 | grep -q "$NODE_EXP_VERSION"; then
    cd /tmp
    wget -q "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VERSION}/node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz"
    tar xzf "node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz"
    install -m 0755 "node_exporter-${NODE_EXP_VERSION}.linux-amd64/node_exporter" /usr/local/bin/node_exporter
    rm -rf "node_exporter-${NODE_EXP_VERSION}.linux-amd64" "node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz"
    echo "   installed /usr/local/bin/node_exporter"
else
    echo "   already current"
fi
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
ExecStart=/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100

[Install]
WantedBy=multi-user.target
EOF

# ── Blackbox Exporter ─────────────────────────────────────────────────────────
echo "3. Blackbox Exporter ${BLACKBOX_VERSION}..."
if [ ! -x /usr/local/bin/blackbox_exporter ] || ! /usr/local/bin/blackbox_exporter --version 2>&1 | grep -q "$BLACKBOX_VERSION"; then
    cd /tmp
    wget -q "https://github.com/prometheus/blackbox_exporter/releases/download/v${BLACKBOX_VERSION}/blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64.tar.gz"
    tar xzf "blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64.tar.gz"
    install -m 0755 "blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64/blackbox_exporter" /usr/local/bin/blackbox_exporter
    rm -rf "blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64" "blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64.tar.gz"
    echo "   installed /usr/local/bin/blackbox_exporter"
else
    echo "   already current"
fi
useradd --no-create-home --shell /bin/false blackbox 2>/dev/null || true
mkdir -p /etc/blackbox_exporter
install -m 0644 "$SCRIPT_DIR/blackbox/blackbox.yml" /etc/blackbox_exporter/blackbox.yml
chown -R blackbox:blackbox /etc/blackbox_exporter

cat > /etc/systemd/system/blackbox_exporter.service <<'EOF'
[Unit]
Description=Blackbox Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=blackbox
Group=blackbox
Type=simple
Restart=always
RestartSec=5
ExecStart=/usr/local/bin/blackbox_exporter \
  --config.file=/etc/blackbox_exporter/blackbox.yml \
  --web.listen-address=127.0.0.1:9115

[Install]
WantedBy=multi-user.target
EOF

# ── Grafana ─────────────────────────────────────────────────────────────────
echo "4. Grafana..."
if ! command -v grafana-server >/dev/null 2>&1 && [ ! -x /usr/sbin/grafana-server ]; then
    apt-get install -y apt-transport-https software-properties-common gnupg >/dev/null
    mkdir -p /etc/apt/keyrings
    wget -qO- https://apt.grafana.com/gpg.key | gpg --dearmor -o /etc/apt/keyrings/grafana.gpg
    echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
        > /etc/apt/sources.list.d/grafana.list
    apt-get update >/dev/null
    apt-get install -y grafana
    echo "   installed grafana"
else
    echo "   already installed"
fi

# Provisioning (datasource + dashboard provider) - always re-synced from repo.
mkdir -p /etc/grafana/provisioning/datasources /etc/grafana/provisioning/dashboards /var/lib/grafana/dashboards
install -m 0644 "$SCRIPT_DIR/provisioning/datasources/prometheus.yml" \
    /etc/grafana/provisioning/datasources/prometheus.yml
install -m 0644 "$SCRIPT_DIR/provisioning/dashboards/provider.yml" \
    /etc/grafana/provisioning/dashboards/provider.yml
# Drop any legacy provisioning files so we don't end up with duplicate file
# providers / duplicate datasource UIDs pointing at the same resources.
rm -f /etc/grafana/provisioning/dashboards/dashboard-provider.yml
rm -f /etc/grafana/provisioning/datasources/prometheus-datasource.yml

# Dashboards - copy every JSON from the repo (adds/updates apps-mon, leaves
# any other dashboards already in /var/lib/grafana/dashboards untouched).
install -m 0644 "$SCRIPT_DIR"/dashboards/*.json /var/lib/grafana/dashboards/
chown -R grafana:grafana /etc/grafana/provisioning /var/lib/grafana/dashboards

# Server settings via a systemd drop-in (env overrides win over grafana.ini and
# leave the admin password alone). Forces 127.0.0.1 bind + the /health subpath.
mkdir -p /etc/systemd/system/grafana-server.service.d
cat > /etc/systemd/system/grafana-server.service.d/override.conf <<EOF
[Service]
Environment=GF_SERVER_HTTP_ADDR=127.0.0.1
Environment=GF_SERVER_HTTP_PORT=${GRAFANA_PORT}
Environment=GF_SERVER_ROOT_URL=${GRAFANA_ROOT_URL}
Environment=GF_SERVER_SERVE_FROM_SUB_PATH=true
Environment=GF_USERS_ALLOW_SIGN_UP=false
Environment=GF_AUTH_ANONYMOUS_ENABLED=false
EOF

# ── Start / restart ───────────────────────────────────────────────────────────
echo
echo "5. (Re)starting services..."
systemctl daemon-reload
systemctl enable prometheus node_exporter blackbox_exporter grafana-server >/dev/null 2>&1 || true
systemctl restart prometheus node_exporter blackbox_exporter grafana-server

sleep 4

echo
echo "========================================="
echo "  Done. All exporters bound to 127.0.0.1."
echo "========================================="
for svc in prometheus node_exporter blackbox_exporter grafana-server; do
    printf '  %-20s %s\n' "$svc" "$(systemctl is-active "$svc")"
done
echo
echo "Grafana (via Nginx):  ${GRAFANA_ROOT_URL%/}"
echo "Dashboard:            ${GRAFANA_ROOT_URL%/}/d/apps-mon/application-monitoring"
echo
echo "Local-only (SSH tunnel to inspect):"
echo "  Prometheus  127.0.0.1:9090   Node 127.0.0.1:9100   Blackbox 127.0.0.1:9115"
echo
echo "NOTE: ensure infra/setup-vps.sh has been run so Nginx proxies /health/ -> Grafana,"
echo "      and that UFW does NOT expose 3002/9090/9100/9115 publicly."
