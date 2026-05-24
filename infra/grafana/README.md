# infra/grafana/

Version-controlled, reproducible monitoring stack for
<https://vedicpanchanga.com>. Everything here is the source of truth: the
installer copies these files into place, so the live config can always be
rebuilt from git.

## Install / refresh

```bash
sudo bash infra/grafana/install.sh
```

Idempotent - safe to re-run. Binaries are re-downloaded only when missing or a
pinned version changes; config files and dashboards are always re-synced from
this folder; the Grafana admin password is never touched.

## What runs (all bound to 127.0.0.1)

| Component         | Port | Reachable from outside? |
|-------------------|------|-------------------------|
| Grafana           | 3002 | Yes, via Nginx `/health/` proxy only |
| Prometheus        | 9090 | No (SSH tunnel)         |
| Node Exporter     | 9100 | No (SSH tunnel)         |
| Blackbox Exporter | 9115 | No (SSH tunnel)         |

Grafana server settings (`root_url=https://vedicpanchanga.com/health/`,
`serve_from_sub_path`, 127.0.0.1 bind) are applied via a systemd drop-in
(`/etc/systemd/system/grafana-server.service.d/override.conf`) so the installer
never rewrites `grafana.ini` and never resets the admin password.

## Layout

```
grafana/
|-- install.sh                              idempotent installer + provisioner
|-- prometheus/prometheus.yml               scrape config (self, node, blackbox jobs)
|-- blackbox/blackbox.yml                   http_2xx prober module
|-- provisioning/
|   |-- datasources/prometheus.yml          Prometheus datasource (uid: prometheus)
|   +-- dashboards/provider.yml             file provider -> /var/lib/grafana/dashboards
+-- dashboards/
    +-- application-monitoring.json         uid apps-mon (the dashboard below)
```

## Application Monitoring dashboard

UID `apps-mon`, served at:

```
https://vedicpanchanga.com/health/d/apps-mon/application-monitoring
```

Panels: app up (end-to-end probe of `/api/health` through Cloudflare + Nginx),
backend up (origin probe), HTTP status, TLS cert days remaining, availability /
probe-duration / HTTP-phase timeseries, and host CPU / memory / disk.

Blackbox probe targets (defined in `prometheus/prometheus.yml`):

- `https://vedicpanchanga.com/api/health` - full chain (Cloudflare -> Nginx -> backend)
- `https://vedicpanchanga.com/` - homepage
- `http://127.0.0.1:8001/api/health` - backend origin (isolates FastAPI)

> The backend readiness endpoint is `GET /api/health` (returns 200 + `status:ok`
> when the Swiss Ephemeris data is present, 503 + `status:degraded` otherwise).
> `/health` itself is the Grafana UI, which is why app health lives under `/api`.

## Editing the dashboard

Edit it in the Grafana UI, then export the model (Dashboard settings -> JSON
Model / Export) and overwrite `dashboards/application-monitoring.json`, keeping
`"uid": "apps-mon"`. Commit the file so the change is reproducible. The file
provider reloads every 30s.
