# infra/grafana/

Version-controlled, reproducible monitoring stack for this VPS (vedicpanchanga.com
plus the other sites it hosts). Everything here is the source of truth: the
installer copies these files into place, so the live config can always be
rebuilt from git - or replicated onto a brand-new server.

## Install / refresh (this server)

```bash
sudo bash infra/grafana/install.sh
```

Idempotent - safe to re-run. Binaries are re-downloaded only when missing or a
pinned version changes; config files and dashboards are always re-synced from
this folder; the Grafana admin password is never touched. An existing Grafana
(apt package or manual /opt build) is detected and reused, never duplicated.

## Replicating on a new server

1. Clone the repo, then edit for the new host:
   - `prometheus/prometheus.yml` - replace the blackbox `static_configs`
     targets with the sites that run there (keep the `app` / `scope: public|origin`
     label scheme - the web-traffic dashboard groups by it), and drop scrape
     jobs for exporters you will not run (e.g. `cadvisor` if there is no Docker,
     `panchanga-backend` if the FastAPI app is not deployed).
   - `process-exporter/process-exporter.yml` - list that server's app processes.
     Keep `groupname`s stable; the apps-containers dashboard filters on them.
   - `install.sh` - set `GRAFANA_ROOT_URL` to the new domain.
2. `sudo bash infra/grafana/install.sh`
3. Point Nginx at Grafana (see `infra/setup-vps.sh` for the exact block):
   `location /grafana/ { proxy_pass http://127.0.0.1:3002; }` - no trailing
   slash on the proxy_pass, no proxy_redirect; a trailing slash strips the
   prefix and Grafana's assets 404 ("failed to load application files").
4. Set the admin password (the value in grafana.ini only applies on first boot):
   `sudo -u grafana /opt/grafana/bin/grafana cli --homepath /opt/grafana --config /etc/grafana/grafana.ini admin reset-admin-password <new>`
   (apt installs: `grafana-cli admin reset-admin-password <new>`).
5. Firewall: keep only 22/80/443 open (UFW default deny incoming). Every
   component below binds to 127.0.0.1, so nothing else is exposed. Remember
   UFW cannot block Docker-published ports - containers must publish on
   `127.0.0.1:...`, which `install.sh` does for cadvisor.

## What runs (all bound to 127.0.0.1)

| Component               | Port | Purpose                                   | Reachable from outside? |
|-------------------------|------|-------------------------------------------|-------------------------|
| Grafana                 | 3002 | dashboards                                | via Nginx `/grafana/` only |
| Prometheus              | 9090 | metrics store, 15s scrape, hot-reloadable | no (SSH tunnel)         |
| node_exporter           | 9100 | host CPU/mem/disk/net/PSI                 | no                      |
| blackbox_exporter       | 9115 | HTTP probes of every site (public+origin) | no                      |
| nginx-prometheus-exporter | 9113 | nginx requests + connection states (stub_status on 8081) | no |
| process-exporter        | 9256 | per-application CPU/mem/threads/fds       | no                      |
| cadvisor (Docker)       | 8080 | Docker containers + systemd service cgroups | no                    |

cadvisor is pinned to `v0.52.1`: older images (the previous `:latest`, v0.49.1)
ship a Docker client the current daemon rejects (API 1.41 < min 1.44), and
container `name` labels silently disappear.

Config changes: `prometheus.yml` can be hot-reloaded with
`curl -X POST http://127.0.0.1:9090/-/reload` after copying it to
`/etc/prometheus/`; dashboards re-provision within 30s of landing in
`/var/lib/grafana/dashboards/`; everything else needs a service restart
(`install.sh` does all of this for you).

## Layout

```
grafana/
|-- install.sh                                idempotent installer + provisioner
|-- prometheus/prometheus.yml                 scrape config (node, backend, blackbox,
|                                             nginx, process-exporter, cadvisor)
|-- blackbox/blackbox.yml                     http_2xx prober module
|-- process-exporter/process-exporter.yml     per-app process groups
|-- nginx/stub_status.conf                    localhost stub_status for the exporter
|-- provisioning/
|   |-- datasources/prometheus.yml            Prometheus datasource (uid: prometheus)
|   +-- dashboards/provider.yml               file provider -> /var/lib/grafana/dashboards
+-- dashboards/
    |-- generate.py                           regenerates the three dashboards below
    |-- server-overview.json                  uid server-overview
    |-- web-traffic.json                      uid web-traffic
    |-- apps-containers.json                  uid apps-containers
    +-- application-monitoring.json           uid apps-mon (legacy, vedicpanchanga app)
```

## Dashboards

All served under `${GRAFANA_ROOT_URL}d/<uid>`:

- **server-overview** - Server Overview - Host and System. At-a-glance stats
  (uptime, CPU, load, memory, disk, TCP), CPU by mode, load vs cores, PSI
  pressure stall, memory breakdown, swap/fds, filesystem usage, disk
  IOPS/throughput/busy, network traffic and errors.
- **web-traffic** - Web Traffic and Uptime - All Sites. Per-site UP/DOWN and
  TLS expiry stats, nginx requests/s and connection states, per-site probe
  latency split public chain (Cloudflare -> Nginx -> app) vs origin
  (127.0.0.1) so network and app slowness are distinguishable, HTTP phase
  breakdown (DNS/connect/TLS/processing/transfer), status codes, 1h rolling
  availability, and the panchanga FastAPI process (CPU, RSS, fds, GC).
- **apps-containers** - Applications and Containers - Per App. process-exporter
  groups (CPU, resident memory, process/thread counts, fds, disk IO per app),
  Docker containers by name (CPU, working set, network, disk IO via cadvisor),
  and systemd service cgroups (CPU, memory).
- **apps-mon** - the original vedicpanchanga application dashboard (service
  health, availability, host utilisation). Kept as-is.

## Editing dashboards

Preferred: edit `dashboards/generate.py` (panel definitions are short Python)
and run `python3 dashboards/generate.py` - it rewrites the three JSON files in
place. Alternatively edit in the Grafana UI, export the JSON model, and
overwrite the file, keeping its `"uid"`. Either way commit the JSON; deploy by
re-running `install.sh` or copying to `/var/lib/grafana/dashboards/` (the file
provider rescans every 30s).

## Probe targets (prometheus/prometheus.yml)

Each site gets a `public` probe (full chain through Cloudflare and Nginx) and
an `origin` probe (the local app port, isolating the app from the network):

| app            | public                              | origin                            |
|----------------|-------------------------------------|-----------------------------------|
| vedicpanchanga | https://vedicpanchanga.com/ + /api/health | http://127.0.0.1:8001/api/health |
| fizgpt         | https://fizgpt.com/                 | http://127.0.0.1:3000/            |
| exportaichat   | https://exportaichat.com/           | http://127.0.0.1:3003/            |

> The panchanga backend readiness endpoint is `GET /api/health` (200 +
> `status:ok` when the Swiss Ephemeris data is present, 503 otherwise). Its
> `/metrics` endpoint is not proxied by Nginx; Prometheus scrapes it directly
> on `127.0.0.1:8001`, so it never reaches the public internet.
