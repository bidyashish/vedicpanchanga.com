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
| Grafana           | 3002 | Yes, via Nginx `/grafana/` proxy only |
| Prometheus        | 9090 | No (SSH tunnel)         |
| Node Exporter     | 9100 | No (SSH tunnel)         |
| Blackbox Exporter | 9115 | No (SSH tunnel)         |

Grafana `[server]` settings (`root_url=https://vedicpanchanga.com/grafana/`,
`serve_from_sub_path = true`, `http_addr = 127.0.0.1`) are set idempotently in
`grafana.ini` by `install.sh` - only those keys are touched, so the admin
password and everything else are preserved. The matching Nginx rule passes the
`/grafana/` prefix through unchanged (`proxy_pass http://127.0.0.1:3002;`, no
trailing slash, no `proxy_redirect`); a trailing slash would strip the prefix
and Grafana's assets would 404 ("failed to load application files").

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
https://vedicpanchanga.com/grafana/d/apps-mon/application-monitoring
```

Detailed, grouped into rows: **Service health** (status, 24h uptime, response
time, HTTP status, TLS expiry), **Application performance** (request rate, 5xx
error rate, latency p50/p90/p95/p99, request rate + p95 latency by endpoint),
**Availability & latency** (per-target timeseries + status table), **HTTP & TLS
detail** (status code over time, HTTP phase durations, DNS lookup, redirects,
content length, HTTPS flag), **Host utilisation** (CPU / memory / disk gauges +
load average), **Host resources over time** (CPU, memory breakdown, network,
disk I/O, filesystem-by-mount), and **Host info** (uptime, CPU cores, total
memory).

The application metrics come from the FastAPI backend, instrumented with
`prometheus-fastapi-instrumentator` and exposed at `/metrics`. That path is not
proxied by Nginx, so Prometheus scrapes it directly on `127.0.0.1:8001` and it
never reaches the public internet.

Blackbox probe targets (defined in `prometheus/prometheus.yml`):

- `https://vedicpanchanga.com/api/health` - full chain (Cloudflare -> Nginx -> backend)
- `https://vedicpanchanga.com/` - homepage
- `http://127.0.0.1:8001/api/health` - backend origin (isolates FastAPI)

> The backend readiness endpoint is `GET /api/health` (returns 200 + `status:ok`
> when the Swiss Ephemeris data is present, 503 + `status:degraded` otherwise).
> The Grafana UI lives under `/grafana/`; the app's health is `/api/health`
> (also exposed at `/health`).

## Editing the dashboard

Edit it in the Grafana UI, then export the model (Dashboard settings -> JSON
Model / Export) and overwrite `dashboards/application-monitoring.json`, keeping
`"uid": "apps-mon"`. Commit the file so the change is reproducible. The file
provider reloads every 30s.
