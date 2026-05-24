#!/bin/bash

# Reproducible monitoring installer for vedicpanchanga.com
# ---------------------------------------------------------
# Installs / refreshes the observability stack and provisions it from the
# version-controlled files in this folder:
#
#   prometheus/prometheus.yml               -> /etc/prometheus/prometheus.yml
#   blackbox/blackbox.yml                   -> /etc/blackbox_exporter/blackbox.yml
#   provisioning/datasources/prometheus.yml -> /etc/grafana/provisioning/datasources/
#   provisioning/dashboards/provider.yml    -> /etc/grafana/provisioning/dashboards/
#   dashboards/*.json                       -> /var/lib/grafana/dashboards/
#
# Stack: Prometheus + Node Exporter + Blackbox Exporter + Grafana, all bound to
# 127.0.0.1. Grafana is reachable only through the Nginx /grafana/ proxy (set up
# by infra/setup-vps.sh); the exporters are localhost-only (SSH-tunnel to view).
#
# IDEMPOTENT: safe to re-run. Binaries are re-downloaded only when missing or a
# pinned version changes; configs/dashboards are always re-synced; Grafana's
# [server] keys are patched in place in grafana.ini (admin password preserved).
#
# Usage:  sudo bash infra/grafana/install.sh

set -euo pipefail

PROM_VERSION="2.53.0"
NODE_EXP_VERSION="1.8.1"
BLACKBOX_VERSION="0.25.0"
GRAFANA_ROOT_URL="https://vedicpanchanga.com/grafana/"
GRAFANA_PORT="3002"
ARCH="linux-amd64"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "Please run as root (use sudo)" >&2; exit 1; }

# ── helpers ───────────────────────────────────────────────────────────────────

# need <binary> <version>: true when the binary is absent or not that version.
need() {
    [ -x "$1" ] || return 0
    case "$("$1" --version 2>&1)" in *"$2"*) return 1 ;; *) return 0 ;; esac
}

# write_unit <name> <description> <user> <ExecStart>: emit a systemd service.
write_unit() {
    cat > "/etc/systemd/system/$1.service" <<EOF
[Unit]
Description=$2
Wants=network-online.target
After=network-online.target

[Service]
User=$3
Group=$3
Type=simple
Restart=always
RestartSec=5
ExecStart=$4

[Install]
WantedBy=multi-user.target
EOF
}

# install_exporter <project> <version> <user>: download+install a single-binary
# prometheus exporter from GitHub into /usr/local/bin (project == binary name).
install_exporter() {
    local proj=$1 ver=$2 user=$3 tgz="$1-$2.${ARCH}"
    useradd --no-create-home --shell /bin/false "$user" 2>/dev/null || true
    if need "/usr/local/bin/$proj" "$ver"; then
        cd /tmp
        wget -q "https://github.com/prometheus/${proj}/releases/download/v${ver}/${tgz}.tar.gz"
        tar xzf "${tgz}.tar.gz"
        install -m 0755 "${tgz}/${proj}" "/usr/local/bin/${proj}"
        rm -rf "${tgz}" "${tgz}.tar.gz"
        echo "   installed /usr/local/bin/${proj}"
    else
        echo "   already current"
    fi
}

# ── Prometheus ──────────────────────────────────────────────────────────────
echo "1. Prometheus ${PROM_VERSION}..."
useradd --no-create-home --shell /bin/false prometheus 2>/dev/null || true
if need /opt/prometheus/prometheus "$PROM_VERSION"; then
    cd /tmp
    tgz="prometheus-${PROM_VERSION}.${ARCH}"
    wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/${tgz}.tar.gz"
    tar xzf "${tgz}.tar.gz"
    rm -rf /opt/prometheus && mv "${tgz}" /opt/prometheus && rm -f "${tgz}.tar.gz"
    echo "   installed /opt/prometheus"
else
    echo "   already current"
fi
mkdir -p /var/lib/prometheus /etc/prometheus
install -m 0644 "$SCRIPT_DIR/prometheus/prometheus.yml" /etc/prometheus/prometheus.yml
chown -R prometheus:prometheus /opt/prometheus /var/lib/prometheus /etc/prometheus
write_unit prometheus "Prometheus" prometheus \
    "/opt/prometheus/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus/ --web.console.templates=/opt/prometheus/consoles --web.console.libraries=/opt/prometheus/console_libraries --web.listen-address=127.0.0.1:9090 --web.enable-lifecycle"

# ── Node Exporter ─────────────────────────────────────────────────────────────
echo "2. Node Exporter ${NODE_EXP_VERSION}..."
install_exporter node_exporter "$NODE_EXP_VERSION" node_exporter
write_unit node_exporter "Node Exporter" node_exporter \
    "/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100"

# ── Blackbox Exporter ─────────────────────────────────────────────────────────
echo "3. Blackbox Exporter ${BLACKBOX_VERSION}..."
install_exporter blackbox_exporter "$BLACKBOX_VERSION" blackbox
mkdir -p /etc/blackbox_exporter
install -m 0644 "$SCRIPT_DIR/blackbox/blackbox.yml" /etc/blackbox_exporter/blackbox.yml
chown -R blackbox:blackbox /etc/blackbox_exporter
write_unit blackbox_exporter "Blackbox Exporter" blackbox \
    "/usr/local/bin/blackbox_exporter --config.file=/etc/blackbox_exporter/blackbox.yml --web.listen-address=127.0.0.1:9115"

# ── Grafana ─────────────────────────────────────────────────────────────────
echo "4. Grafana..."
if ! command -v grafana-server >/dev/null 2>&1 && [ ! -x /usr/sbin/grafana-server ]; then
    apt-get install -y apt-transport-https gnupg >/dev/null
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

# Provisioning + dashboards, always re-synced from this folder.
mkdir -p /etc/grafana/provisioning/datasources /etc/grafana/provisioning/dashboards /var/lib/grafana/dashboards
install -m 0644 "$SCRIPT_DIR/provisioning/datasources/prometheus.yml" /etc/grafana/provisioning/datasources/prometheus.yml
install -m 0644 "$SCRIPT_DIR/provisioning/dashboards/provider.yml"     /etc/grafana/provisioning/dashboards/provider.yml
# Drop legacy provisioning files (avoid duplicate providers / datasource UIDs).
rm -f /etc/grafana/provisioning/dashboards/dashboard-provider.yml \
      /etc/grafana/provisioning/datasources/prometheus-datasource.yml
install -m 0644 "$SCRIPT_DIR"/dashboards/*.json /var/lib/grafana/dashboards/
chown -R grafana:grafana /etc/grafana/provisioning /var/lib/grafana/dashboards

# Patch grafana.ini [server] in place for the /grafana/ subpath + localhost bind.
# Only these keys are touched; the admin password and everything else are kept.
# grafana.ini is read by both the apt package and a manual /opt install.
GRAFANA_ROOT_URL="$GRAFANA_ROOT_URL" GRAFANA_PORT="$GRAFANA_PORT" \
python3 - /etc/grafana/grafana.ini <<'PYEOF'
import os, re, sys
path = sys.argv[1]
want = {
    "http_addr": "127.0.0.1",
    "http_port": os.environ["GRAFANA_PORT"],
    "root_url": os.environ["GRAFANA_ROOT_URL"],
    "serve_from_sub_path": "true",
}
lines = open(path).readlines() if os.path.exists(path) else []
start = next((i for i, ln in enumerate(lines) if ln.strip().lower() == "[server]"), None)
if start is None:
    lines += ["\n[server]\n"] + [f"{k} = {v}\n" for k, v in want.items()]
else:
    end = next((j for j in range(start + 1, len(lines)) if re.match(r"\s*\[", lines[j])), len(lines))
    seen = set()
    for j in range(start + 1, end):
        m = re.match(r"\s*;?\s*([A-Za-z0-9_]+)\s*=", lines[j])
        if m and m.group(1) in want and m.group(1) not in seen:
            lines[j] = f"{m.group(1)} = {want[m.group(1)]}\n"
            seen.add(m.group(1))
    lines[start + 1:start + 1] = [f"{k} = {want[k]}\n" for k in want if k not in seen]
open(path, "w").writelines(lines)
print("  grafana.ini [server] set:", ", ".join(want))
PYEOF
chown root:grafana /etc/grafana/grafana.ini 2>/dev/null || true

# ── Start / restart ───────────────────────────────────────────────────────────
echo
echo "5. (Re)starting services..."
systemctl daemon-reload
systemctl enable prometheus node_exporter blackbox_exporter grafana-server >/dev/null 2>&1 || true
systemctl restart prometheus node_exporter blackbox_exporter grafana-server
sleep 4

echo
echo "  Done. Exporters bound to 127.0.0.1; Grafana via the Nginx /grafana/ proxy."
for svc in prometheus node_exporter blackbox_exporter grafana-server; do
    printf '  %-20s %s\n' "$svc" "$(systemctl is-active "$svc")"
done
echo
echo "  Grafana:    ${GRAFANA_ROOT_URL%/}"
echo "  Dashboard:  ${GRAFANA_ROOT_URL%/}/d/apps-mon/application-monitoring"
echo "  NOTE: run infra/setup-vps.sh so Nginx proxies /grafana/ and UFW keeps"
echo "        3002/9090/9100/9115 off the public internet."
