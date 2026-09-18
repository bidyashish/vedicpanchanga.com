#!/bin/bash

# Reproducible monitoring installer for vedicpanchanga.com (and clones)
# ---------------------------------------------------------------------
# Installs / refreshes the full observability stack and provisions it from the
# version-controlled files in this folder:
#
#   prometheus/prometheus.yml                 -> /etc/prometheus/prometheus.yml
#   blackbox/blackbox.yml                     -> /etc/blackbox_exporter/blackbox.yml
#   process-exporter/process-exporter.yml     -> /etc/process-exporter/process-exporter.yml
#   nginx/stub_status.conf                    -> /etc/nginx/conf.d/stub_status.conf
#   provisioning/datasources/prometheus.yml   -> /etc/grafana/provisioning/datasources/
#   provisioning/dashboards/provider.yml      -> /etc/grafana/provisioning/dashboards/
#   dashboards/*.json                         -> /var/lib/grafana/dashboards/
#
# Stack (everything bound to 127.0.0.1):
#   Prometheus 9090 | Grafana 3002 (via Nginx /grafana/ proxy)
#   node_exporter 9100 | blackbox_exporter 9115 | nginx-exporter 9113
#   process-exporter 9256 | cadvisor 8080 (Docker container, optional)
#
# Replicating on a NEW server - edit before running:
#   - prometheus/prometheus.yml: blackbox targets + app scrape jobs for the
#     sites that actually run there
#   - process-exporter/process-exporter.yml: the per-app process groups
#   - GRAFANA_ROOT_URL below
#   Then: sudo bash infra/grafana/install.sh
#   Finally point Nginx at /grafana/ (see infra/setup-vps.sh) and set the
#   admin password: sudo -u grafana grafana cli admin reset-admin-password ...
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
PROC_EXP_VERSION="0.7.10"
NGINX_EXP_VERSION="1.1.0"
CADVISOR_TAG="v0.52.1"      # >= v0.52 required: older Docker clients (API 1.41)
                            # are rejected by current Docker daemons (min 1.44)
                            # and container name labels silently disappear.
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

# install_exporter <github-org> <project> <version> <user>: download+install a
# single-binary exporter packaged as <project>-<version>.<arch>.tar.gz with the
# binary at <dir>/<project> (the prometheus/ncabatoff release convention).
install_exporter() {
    local org=$1 proj=$2 ver=$3 user=$4 tgz="$2-$3.${ARCH}"
    useradd --no-create-home --shell /bin/false "$user" 2>/dev/null || true
    if need "/usr/local/bin/$proj" "$ver"; then
        cd /tmp
        wget -q "https://github.com/${org}/${proj}/releases/download/v${ver}/${tgz}.tar.gz"
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
install_exporter prometheus node_exporter "$NODE_EXP_VERSION" node_exporter
write_unit node_exporter "Node Exporter" node_exporter \
    "/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100"

# ── Blackbox Exporter ─────────────────────────────────────────────────────────
echo "3. Blackbox Exporter ${BLACKBOX_VERSION}..."
install_exporter prometheus blackbox_exporter "$BLACKBOX_VERSION" blackbox
mkdir -p /etc/blackbox_exporter
install -m 0644 "$SCRIPT_DIR/blackbox/blackbox.yml" /etc/blackbox_exporter/blackbox.yml
chown -R blackbox:blackbox /etc/blackbox_exporter
write_unit blackbox_exporter "Blackbox Exporter" blackbox \
    "/usr/local/bin/blackbox_exporter --config.file=/etc/blackbox_exporter/blackbox.yml --web.listen-address=127.0.0.1:9115"

# ── Process Exporter (per-app CPU/memory/fds) ────────────────────────────────
echo "4. Process Exporter ${PROC_EXP_VERSION}..."
install_exporter ncabatoff process-exporter "$PROC_EXP_VERSION" process_exporter
mkdir -p /etc/process-exporter
install -m 0644 "$SCRIPT_DIR/process-exporter/process-exporter.yml" /etc/process-exporter/process-exporter.yml
write_unit process-exporter "Process Exporter" process_exporter \
    "/usr/local/bin/process-exporter --config.path=/etc/process-exporter/process-exporter.yml --web.listen-address=127.0.0.1:9256"

# ── Nginx Exporter (stub_status) ──────────────────────────────────────────────
echo "5. Nginx Prometheus Exporter ${NGINX_EXP_VERSION}..."
useradd --no-create-home --shell /bin/false nginx_exporter 2>/dev/null || true
if need /usr/local/bin/nginx-prometheus-exporter "$NGINX_EXP_VERSION"; then
    cd /tmp
    tgz="nginx-prometheus-exporter_${NGINX_EXP_VERSION}_linux_amd64"
    wget -q "https://github.com/nginx/nginx-prometheus-exporter/releases/download/v${NGINX_EXP_VERSION}/${tgz}.tar.gz"
    mkdir -p "$tgz" && tar xzf "${tgz}.tar.gz" -C "$tgz"
    install -m 0755 "${tgz}/nginx-prometheus-exporter" /usr/local/bin/nginx-prometheus-exporter
    rm -rf "${tgz}" "${tgz}.tar.gz"
    echo "   installed /usr/local/bin/nginx-prometheus-exporter"
else
    echo "   already current"
fi
if [ -d /etc/nginx/conf.d ]; then
    install -m 0644 "$SCRIPT_DIR/nginx/stub_status.conf" /etc/nginx/conf.d/stub_status.conf
    nginx -t >/dev/null 2>&1 && systemctl reload nginx && echo "   stub_status on 127.0.0.1:8081"
else
    echo "   nginx not present - skipping stub_status.conf"
fi
write_unit nginx-exporter "Nginx Prometheus Exporter" nginx_exporter \
    "/usr/local/bin/nginx-prometheus-exporter --nginx.scrape-uri=http://127.0.0.1:8081/nginx_status --web.listen-address=127.0.0.1:9113"

# ── cAdvisor (Docker containers + systemd service cgroups) ────────────────────
echo "6. cAdvisor ${CADVISOR_TAG}..."
if command -v docker >/dev/null 2>&1; then
    docker rm -f cadvisor >/dev/null 2>&1 || true
    docker run -d --name cadvisor --restart unless-stopped \
        -p 127.0.0.1:8080:8080 \
        -v /:/rootfs:ro \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v /sys:/sys:ro \
        -v /var/lib/docker/:/var/lib/docker:ro \
        -v /dev/disk/:/dev/disk:ro \
        --device=/dev/kmsg \
        "gcr.io/cadvisor/cadvisor:${CADVISOR_TAG}" -logtostderr >/dev/null
    echo "   cadvisor running on 127.0.0.1:8080"
else
    echo "   docker not present - skipped (also remove the cadvisor job from prometheus.yml)"
fi

# ── Grafana ─────────────────────────────────────────────────────────────────
echo "7. Grafana..."
# Detect an existing install first: a manual /opt build ships its own
# 'grafana' unit, the apt package ships 'grafana-server'. Never install a
# second copy next to a running one. (No `grep -q` on systemctl output: under
# pipefail the early-exit SIGPIPEs systemctl and the condition silently fails.)
if [ -x /opt/grafana/bin/grafana ] || systemctl list-unit-files grafana.service 2>/dev/null | grep -E '^grafana\.service' >/dev/null; then
    GRAFANA_UNIT="grafana"
    echo "   already installed (manual /opt build, unit: grafana)"
elif command -v grafana-server >/dev/null 2>&1 || [ -x /usr/sbin/grafana-server ]; then
    GRAFANA_UNIT="grafana-server"
    echo "   already installed (apt package)"
else
    apt-get install -y apt-transport-https gnupg >/dev/null
    mkdir -p /etc/apt/keyrings
    wget -qO- https://apt.grafana.com/gpg.key | gpg --batch --yes --dearmor -o /etc/apt/keyrings/grafana.gpg
    echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
        > /etc/apt/sources.list.d/grafana.list
    apt-get update >/dev/null
    apt-get install -y grafana
    GRAFANA_UNIT="grafana-server"
    echo "   installed grafana"
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
echo "8. (Re)starting services..."
SERVICES="prometheus node_exporter blackbox_exporter process-exporter nginx-exporter $GRAFANA_UNIT"
systemctl daemon-reload
# shellcheck disable=SC2086
systemctl enable $SERVICES >/dev/null 2>&1 || true
# shellcheck disable=SC2086
systemctl restart $SERVICES
sleep 4

echo
echo "  Done. Everything bound to 127.0.0.1; Grafana via the Nginx /grafana/ proxy."
for svc in $SERVICES; do
    printf '  %-20s %s\n' "$svc" "$(systemctl is-active "$svc")"
done
command -v docker >/dev/null 2>&1 && printf '  %-20s %s\n' "cadvisor (docker)" "$(docker inspect -f '{{.State.Status}}' cadvisor 2>/dev/null || echo absent)"
echo
echo "  Grafana:     ${GRAFANA_ROOT_URL%/}"
echo "  Dashboards:  ${GRAFANA_ROOT_URL%/}/d/server-overview   (host and system)"
echo "               ${GRAFANA_ROOT_URL%/}/d/web-traffic       (all sites, nginx, uptime)"
echo "               ${GRAFANA_ROOT_URL%/}/d/apps-containers   (per app and container)"
echo "               ${GRAFANA_ROOT_URL%/}/d/apps-mon          (vedicpanchanga app)"
echo "  NOTE: run infra/setup-vps.sh so Nginx proxies /grafana/ and UFW keeps"
echo "        the exporter ports off the public internet."
