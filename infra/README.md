# infra/

Operational scripts for provisioning, deploying and monitoring the VPS
that runs <https://vedicpanchanga.com>. All paths assume the canonical
clone location `/apps/panchanga`.

> All scripts are **idempotent** unless marked otherwise - re-running
> them never breaks an existing deploy as long as prerequisites
> (Cloudflare Origin Cert, ephemeris files, etc.) are still in place.

## Production topology

```
Cloudflare (TLS edge, DDoS, caching)
    |     Cloudflare Origin Certificate (15-year, no auto-renew)
    v
Nginx :80 -> 301 -> :443 (TLS 1.2/1.3, HSTS, real-IP from CF, X-Frame-Options,
                         Referrer-Policy, return 444 on direct-IP)
    |
    |-- /assets/   -> /apps/panchanga/frontend/dist/assets/  (1y immutable cache)
    |-- /          -> try_files $uri $uri/ /index.html       (SPA fallback)
    |-- /health/   -> proxy -> http://127.0.0.1:3002         (Grafana UI)
    +-- /api/      -> proxy -> http://127.0.0.1:8001/api/     (FastAPI)
                                       |     (incl. GET /api/health probe)
                                       v
                              uvicorn server:app
                              (panchanga-backend.service)
                              bound to 127.0.0.1 - never exposed
```

> `/health/` is the **Grafana** monitoring UI, not an app health check. The
> application's own readiness probe is `GET /api/health`
> (<https://vedicpanchanga.com/api/health>): 200 when the Swiss Ephemeris data
> is present, 503 otherwise. The exporters (Prometheus 9090, Node Exporter
> 9100, Blackbox 9115) and Grafana (3002) all bind to 127.0.0.1; only Grafana
> is reachable, and only via the `/health/` proxy. See [`grafana/`](grafana/).

## Scripts

| Script | When to run | Idempotent? | Needs root? |
|---|---|---|---|
| [`setup-vps.sh`](setup-vps.sh) | Once on a fresh Ubuntu/Debian VPS, then again after dropping in the Cloudflare Origin Cert | yes | yes |
| [`auto-update-cron.sh`](auto-update-cron.sh) | Run by cron (every 6 h), or manually to deploy. No-ops when remote HEAD == local HEAD. | yes | runs as cron user |
| [`auto-update-cron.sh --install`](auto-update-cron.sh) | Once, after `setup-vps.sh`, to add the crontab entry | yes | yes |
| [`grafana/install.sh`](grafana/install.sh) | Optional observability. Installs/refreshes Prometheus + Node Exporter + Blackbox + Grafana and provisions them from version-controlled config. | yes | yes |

## `setup-vps.sh` - fresh VPS provisioning

What it does, in order:

1. **Preflight** - must be root; `APP_DIR=/apps/panchanga` (or override
   via env) must already contain `backend/` and `frontend/`; warns if
   `backend/ephe/` is missing (Swiss Ephemeris data).
2. **System packages** - `nginx python3-venv nodejs(20.x) ufw git curl`.
3. **Backend** - creates venv, installs `requirements.txt`, writes
   `backend/.env` with a tight `CORS_ORIGINS` allowlist, writes
   `panchanga-backend.service` on port 8001.
4. **Frontend** - writes `.env.production` with empty `VITE_BACKEND_URL`
   (browser hits same-origin `/api`), runs `npm ci && npm run build`.
5. **Nginx** - emits TLS or HTTP-only vhost depending on whether
   `/etc/ssl/cloudflare/origin.{pem,key}` exist.
6. **Firewall (UFW)** - opens `22/80/443`; blocks `8000/8001` directly; and
   drops any public allow on the monitoring ports `3002/9090/9100/9115` (they
   stay localhost-only; Grafana is reached through the `/health/` proxy).
7. **Systemd** - enables and restarts `panchanga-backend` + `nginx`.

### Cloudflare Origin Certificate

```bash
# Cloudflare -> SSL/TLS -> Origin Server -> Create Certificate (15 years)
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.pem    # paste certificate
sudo nano /etc/ssl/cloudflare/origin.key    # paste private key
sudo chmod 600 /etc/ssl/cloudflare/origin.key
sudo bash /apps/panchanga/infra/setup-vps.sh    # re-run; emits TLS vhost
```

Then set Cloudflare SSL/TLS mode to **Full (strict)**.

## `auto-update-cron.sh` - deploy and auto-update

Handles both manual deploys and scheduled auto-updates:

```bash
bash infra/auto-update-cron.sh              # pull, rebuild, restart
sudo bash infra/auto-update-cron.sh --install  # install 6-hour crontab
```

The script acquires a lock file, compares local vs remote HEAD, and exits
early when there's nothing to do. Logs to `/var/log/panchanga-auto-update.log`.

## `grafana/` - reproducible observability stack

```bash
sudo bash infra/grafana/install.sh    # idempotent; safe to re-run
```

Installs Prometheus (2.53), Node Exporter (1.8.1), Blackbox Exporter (0.25),
and Grafana, then provisions all of them from the version-controlled files in
[`grafana/`](grafana/). Everything binds to `127.0.0.1`. Grafana is served only
through the Nginx `/health/` proxy; the other exporters are reachable only via
an SSH tunnel. The blackbox job probes `https://vedicpanchanga.com/api/health`
(end-to-end), the homepage, and the origin backend, surfaced on the
**Application Monitoring** dashboard (`/health/d/apps-mon/application-monitoring`).

## Common operations

```bash
sudo journalctl -u panchanga-backend -f      # tail backend logs
sudo systemctl restart panchanga-backend     # restart backend
sudo systemctl reload nginx                  # reload nginx (no downtime)
sudo nginx -t                                # validate nginx config
bash /apps/panchanga/infra/auto-update-cron.sh   # manual deploy
```

## Troubleshooting

* **502 Bad Gateway** - backend is down. Check `journalctl -u panchanga-backend -e`.
  Common cause: Swiss Ephemeris files missing from `backend/ephe/`.
* **444 / connection closed** - direct-IP hit. Use the domain, not the raw IP.
* **`/api/*` returns 502** - backend started but not responding.
  `curl -I http://127.0.0.1:8001/api/` from the VPS to isolate.
* **TLS handshake fails** - `sudo nginx -t`, check cert files exist with
  `chmod 600` on the key. Re-run `setup-vps.sh`.
* **Cron updates not happening** - `tail -f /var/log/panchanga-auto-update.log`.

## Layout

```
infra/
|-- setup-vps.sh           one-shot VPS provisioning (idempotent)
|-- auto-update-cron.sh    pull, rebuild, restart (cron + manual + --install)
|-- grafana/               reproducible monitoring stack (version-controlled)
|   |-- install.sh         idempotent installer + provisioner
|   |-- prometheus/        prometheus.yml (scrape + blackbox jobs)
|   |-- blackbox/          blackbox.yml (http_2xx module)
|   |-- provisioning/      grafana datasource + dashboard provider
|   |-- dashboards/        application-monitoring.json (uid apps-mon)
|   +-- README.md          monitoring docs
+-- README.md              this file
```
