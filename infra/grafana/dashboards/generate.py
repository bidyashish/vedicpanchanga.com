#!/usr/bin/env python3
"""Generate the three provisioned Grafana dashboards for this VPS."""
import json, os

OUT = os.path.dirname(os.path.abspath(__file__))
DS = {"type": "prometheus", "uid": "prometheus"}
_id = [0]

def nid():
    _id[0] += 1
    return _id[0]

def ts(title, queries, unit="short", w=12, h=8, stacked=False, percent_max=None,
       legend_calcs=("mean", "max", "lastNotNull"), fill=12, desc=""):
    return {
        "id": nid(), "type": "timeseries", "title": title, "description": desc,
        "datasource": DS,
        "gridPos": {"h": h, "w": w, "x": 0, "y": 0},
        "fieldConfig": {
            "defaults": {
                "color": {"mode": "palette-classic"},
                "unit": unit, "min": 0,
                **({"max": percent_max} if percent_max else {}),
                "custom": {
                    "drawStyle": "line", "lineWidth": 1, "fillOpacity": fill,
                    "showPoints": "never", "spanNulls": True, "pointSize": 5,
                    "stacking": {"mode": "normal" if stacked else "none", "group": "A"},
                    "axisPlacement": "auto", "gradientMode": "opacity",
                    "thresholdsStyle": {"mode": "off"},
                },
            },
            "overrides": [],
        },
        "options": {
            "legend": {"displayMode": "table", "placement": "bottom",
                       "showLegend": True, "calcs": list(legend_calcs)},
            "tooltip": {"mode": "multi", "sort": "desc"},
        },
        "targets": [
            {"refId": chr(65 + i), "datasource": DS, "expr": e, "legendFormat": l}
            for i, (e, l) in enumerate(queries)
        ],
    }

def stat(title, expr, unit="short", w=4, h=4, thresholds=None, mappings=None,
         decimals=None, desc=""):
    th = thresholds or [{"color": "green", "value": None}]
    return {
        "id": nid(), "type": "stat", "title": title, "description": desc,
        "datasource": DS,
        "gridPos": {"h": h, "w": w, "x": 0, "y": 0},
        "fieldConfig": {
            "defaults": {
                "unit": unit,
                **({"decimals": decimals} if decimals is not None else {}),
                "thresholds": {"mode": "absolute", "steps": th},
                "mappings": mappings or [],
                "color": {"mode": "thresholds"},
            },
            "overrides": [],
        },
        "options": {
            "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
            "colorMode": "value", "graphMode": "area", "justifyMode": "auto",
            "orientation": "auto", "textMode": "auto",
        },
        "targets": [{"refId": "A", "datasource": DS, "expr": expr, "legendFormat": ""}],
    }

def row(title):
    return {"id": nid(), "type": "row", "title": title, "collapsed": False,
            "gridPos": {"h": 1, "w": 24, "x": 0, "y": 0}, "panels": []}

def layout(panels):
    """Assign gridPos top to bottom; rows reset the cursor."""
    x = y = 0
    row_h = 0
    for p in panels:
        w, h = p["gridPos"]["w"], p["gridPos"]["h"]
        if p["type"] == "row":
            if x:
                y += row_h
                x = row_h = 0
            p["gridPos"].update({"x": 0, "y": y})
            y += 1
            continue
        if x + w > 24:
            y += row_h
            x = row_h = 0
        p["gridPos"].update({"x": x, "y": y})
        x += w
        row_h = max(row_h, h)
    return panels

def dashboard(uid, title, tags, panels, refresh="30s", time_from="now-6h"):
    return {
        "uid": uid, "title": title, "tags": tags, "editable": True,
        "graphTooltip": 1, "schemaVersion": 39, "version": 1,
        "refresh": refresh, "time": {"from": time_from, "to": "now"},
        "timezone": "browser", "links": [], "annotations": {"list": []},
        "templating": {"list": []}, "panels": layout(panels),
    }

PCT_TH = [{"color": "green", "value": None}, {"color": "yellow", "value": 70},
          {"color": "red", "value": 90}]
UPDOWN = [{"type": "value", "options": {
    "0": {"text": "DOWN", "color": "red", "index": 1},
    "1": {"text": "UP", "color": "green", "index": 0}}}]
APPS = "anyrouter|exportaichat|panchanga-backend|nginx|grafana|prometheus|node|node_exporter|next-server.*|claude"
NETDEV = 'device!~"lo|docker.*|veth.*|br-.*"'
FS = 'fstype!~"tmpfs|overlay|squashfs"'

# ---------------------------------------------------------------- dashboard 1
server = dashboard("server-overview", "Server Overview - Host and System",
    ["infra", "node-exporter", "host"], [
    row("At a glance"),
    stat("Uptime", "node_time_seconds - node_boot_time_seconds", unit="s"),
    stat("CPU Usage", '100 * (1 - avg(irate(node_cpu_seconds_total{mode="idle"}[5m])))',
         unit="percent", thresholds=PCT_TH, decimals=1),
    stat("Load (5m)", "node_load5", decimals=2,
         thresholds=[{"color": "green", "value": None}, {"color": "yellow", "value": 4},
                     {"color": "red", "value": 6}]),
    stat("Memory Used", "100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)",
         unit="percent", thresholds=PCT_TH, decimals=1),
    stat("Root Disk Used",
         '100 * (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})',
         unit="percent", thresholds=PCT_TH, decimals=1),
    stat("TCP Established", "node_netstat_Tcp_CurrEstab",
         thresholds=[{"color": "green", "value": None}, {"color": "yellow", "value": 500},
                     {"color": "red", "value": 2000}]),
    row("CPU"),
    ts("CPU usage by mode", [
        ('100 * avg by (mode) (irate(node_cpu_seconds_total{mode!="idle"}[5m]))', "{{mode}}")],
       unit="percent", stacked=True, percent_max=100),
    ts("Load average vs cores", [
        ("node_load1", "load 1m"), ("node_load5", "load 5m"), ("node_load15", "load 15m"),
        ('count(node_cpu_seconds_total{mode="idle"})', "cores")], fill=0),
    ts("Pressure stall (PSI) - share of time tasks waited", [
        ("irate(node_pressure_cpu_waiting_seconds_total[5m])", "cpu some"),
        ("irate(node_pressure_io_waiting_seconds_total[5m])", "io some"),
        ("irate(node_pressure_memory_waiting_seconds_total[5m])", "memory some")],
       unit="percentunit",
       desc="Sustained values above 0.1 mean real resource starvation."),
    ts("Context switches and interrupts", [
        ("irate(node_context_switches_total[5m])", "context switches"),
        ("irate(node_intr_total[5m])", "interrupts")], unit="ops"),
    row("Memory"),
    ts("Memory breakdown", [
        ("node_memory_MemTotal_bytes - node_memory_MemFree_bytes - node_memory_Buffers_bytes - node_memory_Cached_bytes", "used"),
        ("node_memory_Cached_bytes", "cached"),
        ("node_memory_Buffers_bytes", "buffers"),
        ("node_memory_MemFree_bytes", "free")],
       unit="bytes", stacked=True),
    ts("Swap and file descriptors", [
        ("node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes", "swap used"),
        ("node_filefd_allocated", "open fds (count)")], fill=0),
    row("Disk"),
    ts("Filesystem usage", [
        (f'100 * (1 - node_filesystem_avail_bytes{{{FS}}} / node_filesystem_size_bytes{{{FS}}})',
         "{{mountpoint}}")], unit="percent", percent_max=100, fill=0),
    ts("Disk IOPS", [
        ('irate(node_disk_reads_completed_total{device=~"sd.*|vd.*|nvme.*"}[5m])', "{{device}} read"),
        ('irate(node_disk_writes_completed_total{device=~"sd.*|vd.*|nvme.*"}[5m])', "{{device}} write")],
       unit="iops"),
    ts("Disk throughput", [
        ('irate(node_disk_read_bytes_total{device=~"sd.*|vd.*|nvme.*"}[5m])', "{{device}} read"),
        ('irate(node_disk_written_bytes_total{device=~"sd.*|vd.*|nvme.*"}[5m])', "{{device}} write")],
       unit="Bps"),
    ts("Disk busy time", [
        ('100 * irate(node_disk_io_time_seconds_total{device=~"sd.*|vd.*|nvme.*"}[5m])', "{{device}}")],
       unit="percent", percent_max=100),
    row("Network"),
    ts("Network traffic", [
        (f"8 * irate(node_network_receive_bytes_total{{{NETDEV}}}[5m])", "{{device}} rx"),
        (f"8 * irate(node_network_transmit_bytes_total{{{NETDEV}}}[5m])", "{{device}} tx")],
       unit="bps"),
    ts("Network errors and drops", [
        (f"irate(node_network_receive_errs_total{{{NETDEV}}}[5m])", "{{device}} rx errs"),
        (f"irate(node_network_transmit_errs_total{{{NETDEV}}}[5m])", "{{device}} tx errs"),
        (f"irate(node_network_receive_drop_total{{{NETDEV}}}[5m])", "{{device}} rx drop"),
        (f"irate(node_network_transmit_drop_total{{{NETDEV}}}[5m])", "{{device}} tx drop")],
       unit="ops"),
])

# ---------------------------------------------------------------- dashboard 2
web = dashboard("web-traffic", "Web Traffic and Uptime - All Sites",
    ["infra", "nginx", "blackbox", "uptime"], [
    row("Site status"),
    stat("vedicpanchanga.com",
         'min(probe_success{app="vedicpanchanga",scope="public"})',
         mappings=UPDOWN,
         thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 1}]),
    stat("fizgpt.com", 'min(probe_success{app="fizgpt",scope="public"})',
         mappings=UPDOWN,
         thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 1}]),
    stat("exportaichat.com", 'min(probe_success{app="exportaichat",scope="public"})',
         mappings=UPDOWN,
         thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 1}]),
    stat("Nginx req/s", "irate(nginx_http_requests_total[5m])", unit="reqps", decimals=2),
    stat("Active connections", "nginx_connections_active"),
    stat("Nearest TLS expiry",
         "min((probe_ssl_earliest_cert_expiry - time()) / 86400)", unit="d", decimals=0,
         thresholds=[{"color": "red", "value": None}, {"color": "yellow", "value": 14},
                     {"color": "green", "value": 30}]),
    row("Nginx (all sites combined)"),
    ts("HTTP requests per second", [
        ("irate(nginx_http_requests_total[5m])", "requests/s")], unit="reqps"),
    ts("Connection states", [
        ("nginx_connections_active", "active"),
        ("nginx_connections_reading", "reading"),
        ("nginx_connections_writing", "writing"),
        ("nginx_connections_waiting", "waiting (keepalive)")], fill=0),
    ts("Connections accepted vs handled", [
        ("irate(nginx_connections_accepted[5m])", "accepted/s"),
        ("irate(nginx_connections_handled[5m])", "handled/s")], unit="ops",
       desc="accepted > handled means connections are being dropped."),
    row("Per-site availability and latency (blackbox probes)"),
    ts("Probe success (1 = up)", [
        ("probe_success", "{{app}} {{scope}}")], percent_max=1, fill=0, h=7),
    ts("Probe duration - full chain vs origin", [
        ("probe_duration_seconds", "{{app}} {{scope}}")], unit="s", h=7),
    ts("HTTP phase breakdown (public probes)", [
        ('avg by (app, phase) (probe_http_duration_seconds{scope="public"})', "{{app}} {{phase}}")],
       unit="s", h=7,
       desc="resolve / connect / tls / processing / transfer - where slowness lives."),
    ts("HTTP status codes", [
        ("probe_http_status_code", "{{app}} {{scope}}")], fill=0, h=7),
    ts("TLS certificate days remaining", [
        ('(probe_ssl_earliest_cert_expiry{scope="public"} - time()) / 86400', "{{app}}")],
       unit="d", fill=0, h=7),
    ts("Availability (1h rolling)", [
        ('100 * avg_over_time(probe_success{scope="public"}[1h])', "{{app}}")],
       unit="percent", percent_max=100, fill=0, h=7),
    row("Panchanga API backend (FastAPI on :8001)"),
    ts("Backend CPU", [
        ('100 * irate(process_cpu_seconds_total{job="panchanga-backend"}[5m])', "cpu")],
       unit="percent"),
    ts("Backend memory (RSS)", [
        ('process_resident_memory_bytes{job="panchanga-backend"}', "resident")], unit="bytes"),
    ts("Backend open file descriptors", [
        ('process_open_fds{job="panchanga-backend"}', "open fds")], fill=0),
    ts("Python garbage collections", [
        ('irate(python_gc_collections_total{job="panchanga-backend"}[5m])', "gen {{generation}}")],
       unit="ops"),
])

# ---------------------------------------------------------------- dashboard 3
apps = dashboard("apps-containers", "Applications and Containers - Per App",
    ["infra", "process-exporter", "cadvisor", "docker"], [
    row("Per-application processes (process-exporter)"),
    ts("CPU by application", [
        (f'100 * sum by (groupname) (irate(namedprocess_namegroup_cpu_seconds_total{{groupname=~"{APPS}"}}[5m]))',
         "{{groupname}}")], unit="percent"),
    ts("Resident memory by application", [
        (f'sum by (groupname) (namedprocess_namegroup_memory_bytes{{groupname=~"{APPS}", memtype="resident"}})',
         "{{groupname}}")], unit="bytes"),
    ts("Process count by application", [
        (f'namedprocess_namegroup_num_procs{{groupname=~"{APPS}"}}', "{{groupname}}")], fill=0),
    ts("Threads by application", [
        (f'namedprocess_namegroup_num_threads{{groupname=~"{APPS}"}}', "{{groupname}}")], fill=0),
    ts("Open file descriptors by application", [
        (f'namedprocess_namegroup_open_filedesc{{groupname=~"{APPS}"}}', "{{groupname}}")], fill=0),
    ts("Disk IO by application", [
        (f'sum by (groupname) (irate(namedprocess_namegroup_read_bytes_total{{groupname=~"{APPS}"}}[5m]))',
         "{{groupname}} read"),
        (f'sum by (groupname) (irate(namedprocess_namegroup_write_bytes_total{{groupname=~"{APPS}"}}[5m]))',
         "{{groupname}} write")], unit="Bps"),
    row("Docker containers (cadvisor)"),
    ts("Container CPU", [
        ('100 * sum by (name) (irate(container_cpu_usage_seconds_total{name=~".+"}[5m]))', "{{name}}")],
       unit="percent"),
    ts("Container memory (working set)", [
        ('container_memory_working_set_bytes{name=~".+"}', "{{name}}")], unit="bytes"),
    ts("Container network", [
        ('sum by (name) (irate(container_network_receive_bytes_total{name=~".+"}[5m]))', "{{name}} rx"),
        ('sum by (name) (irate(container_network_transmit_bytes_total{name=~".+"}[5m]))', "{{name}} tx")],
       unit="Bps"),
    ts("Container disk IO", [
        ('sum by (name) (irate(container_fs_writes_bytes_total{name=~".+"}[5m]))', "{{name}} write"),
        ('sum by (name) (irate(container_fs_reads_bytes_total{name=~".+"}[5m]))', "{{name}} read")],
       unit="Bps"),
    row("Systemd services (cgroup accounting via cadvisor)"),
    ts("Service CPU", [
        ('100 * sum by (id) (irate(container_cpu_usage_seconds_total{id=~"/system.slice/(panchanga-backend|nginx|grafana|prometheus|anyrouter|exportaichat|fizgpt|docker|fail2ban)[^/]*\\\\.service"}[5m]))',
         "{{id}}")], unit="percent"),
    ts("Service memory (working set)", [
        ('container_memory_working_set_bytes{id=~"/system.slice/(panchanga-backend|nginx|grafana|prometheus|anyrouter|exportaichat|fizgpt|docker|fail2ban)[^/]*\\\\.service"}',
         "{{id}}")], unit="bytes"),
])

os.makedirs(OUT, exist_ok=True)
for d, fname in [(server, "server-overview.json"), (web, "web-traffic.json"),
                 (apps, "apps-containers.json")]:
    path = os.path.join(OUT, fname)
    with open(path, "w") as f:
        json.dump(d, f, indent=2)
        f.write("\n")
    print("wrote", path, len(d["panels"]), "panels")
