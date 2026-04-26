# infra/

Operational scripts for provisioning, deploying and monitoring the VPS
that runs <https://vedicpanchanga.com>. All paths assume the canonical
clone location `/apps/panchanga`.

> All scripts are **idempotent** unless marked otherwise — re-running
> them never breaks an existing deploy as long as prerequisites
> (Cloudflare Origin Cert, ephemeris files, etc.) are still in place.

## Production topology

```
Cloudflare (TLS edge, DDoS, caching)
    │     Cloudflare Origin Certificate (15-year, no auto-renew)
    ▼
Nginx :80 → 301 → :443 (TLS 1.2/1.3, HSTS, real-IP from CF, X-Frame-Options,
                         Referrer-Policy, return 444 on direct-IP)
    │
    ├── /assets/   → /apps/panchanga/frontend/dist/assets/  (1y immutable cache)
    ├── /          → try_files $uri $uri/ /index.html       (SPA fallback)
    └── /api/      → proxy → http://127.0.0.1:8001/api/     (FastAPI)
                                       │
                                       ▼
                              uvicorn server:app
                              (panchanga-backend.service)
                              bound to 127.0.0.1 — never exposed
```

## Scripts at a glance

| Script | When to run | Idempotent? | Needs root? |
|---|---|---|---|
| [`setup-vps.sh`](setup-vps.sh) | Once on a fresh Ubuntu/Debian VPS, then again after dropping in the Cloudflare Origin Cert | yes | yes |
| [`update-deploy.sh`](update-deploy.sh) | Manual redeploy after a `git push` | yes | yes (calls `systemctl`) |
| [`auto-update-cron.sh`](auto-update-cron.sh) | Run by cron (every 6 h by default). No-ops when remote HEAD == local HEAD. | yes | runs as the cron user (root via `setup-cron.sh`) |
| [`setup-cron.sh`](setup-cron.sh) | Once, after `setup-vps.sh`, to enable auto-updates | yes | adds to current user's crontab |
| [`setup-monitoring.sh`](setup-monitoring.sh) | Once, optional. Installs Prometheus + Grafana + node/process exporters + cAdvisor | **no** — will create duplicate users / fail on re-run | yes |

## `setup-vps.sh` — fresh VPS provisioning

What it does, in order:

1. **Preflight** — must be root; `APP_DIR=/apps/panchanga` (or override
   via env) must already contain `backend/` and `frontend/`; warns if
   `backend/ephe/` is missing (Swiss Ephemeris data).
2. **System packages** — `nginx python3-venv nodejs(20.x) ufw git curl`.
3. **Backend** — creates venv, installs `requirements.txt`, writes
   `backend/.env` with a tight `CORS_ORIGINS` allowlist
   (`https://vedicpanchanga.com,https://www.vedicpanchanga.com` only),
   writes `panchanga-backend.service` running
   `uvicorn server:app --host 127.0.0.1 --port 8001`.
4. **Frontend** — writes `.env.production` with empty `VITE_BACKEND_URL`
   (browser hits same-origin `/api`), runs `npm ci && npm run build` as
   the service user (so `node_modules` isn't root-owned).
5. **Nginx** — emits one of two vhosts:
   * **TLS vhost** if `/etc/ssl/cloudflare/origin.{pem,key}` exist —
     listens on 443 with TLS 1.2/1.3, HSTS, Cloudflare real-IP CIDRs,
     redirects HTTP → HTTPS, drops direct-IP probes with `return 444;`.
   * **HTTP-only vhost** otherwise — port 80 only. Use this with
     Cloudflare's "Flexible" SSL mode while you're still generating
     the origin cert.
6. **Firewall (UFW)** — opens `22/80/443`; opens monitoring ports
   `3002/9090/9100` (⚠️ restrict to your admin IP before going live);
   actively `deny`s `8000` (legacy) and `8001` (backend) — the backend
   must never be reachable from the internet.
7. **Systemd** — enables and restarts `panchanga-backend` + `nginx`.

### Generating the Cloudflare Origin Certificate

```text
Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate
Defaults: RSA 2048, vedicpanchanga.com + *.vedicpanchanga.com, 15 years.
```

Paste the two PEM blobs onto the VPS:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.pem    # paste certificate
sudo nano /etc/ssl/cloudflare/origin.key    # paste private key
sudo chmod 600 /etc/ssl/cloudflare/origin.key
sudo bash /apps/panchanga/infra/setup-vps.sh    # re-run; emits TLS vhost
```

Then in Cloudflare → SSL/TLS → Overview, set mode to **Full (strict)**.

### Common operations

```bash
sudo journalctl -u panchanga-backend -f      # tail backend logs
sudo systemctl restart panchanga-backend     # restart backend
sudo systemctl reload nginx                  # reload nginx config (no downtime)
sudo nginx -t                                # validate nginx config
sudo bash /apps/panchanga/infra/update-deploy.sh   # manual redeploy
```

## `update-deploy.sh` — manual redeploy

`git pull`, reinstall backend deps, `npm install && npm run build`,
restart backend + nginx. Run after any `git push` if you don't want to
wait for the cron.

## `auto-update-cron.sh` + `setup-cron.sh`

`setup-cron.sh` adds a crontab entry that runs `auto-update-cron.sh`
every 6 h. The auto-update script:

* Acquires `/tmp/panchanga-update.lock` to avoid concurrent runs.
* `git fetch` and compares local vs remote HEAD; exits early when
  there's nothing to do.
* Rebuilds backend and frontend, then `systemctl restart` backend and
  `systemctl reload` nginx.
* Logs to `/var/log/panchanga-auto-update.log`.

To change the cadence, `crontab -e` and edit the line; common patterns
are listed at the bottom of `setup-cron.sh`.

## `setup-monitoring.sh` — optional observability stack

Installs:

| Service          | Port | Purpose                                |
|------------------|------|----------------------------------------|
| Prometheus       | 9090 | Time-series store, scrapes the others  |
| Grafana          | 3002 | Dashboards (default admin/admin — change immediately) |
| Node Exporter    | 9100 | Host metrics (CPU, RAM, disk, net)     |
| Process Exporter | 9256 | Per-process resource usage             |
| cAdvisor         | 8080 | Container metrics (only useful with Docker) |

> ⚠️ **Not idempotent.** Re-running this on an already-provisioned host
> will fail at the `useradd` / wget steps. Treat it as a one-shot.
>
> ⚠️ **Lock down ports.** `setup-vps.sh` opens 3002/9090/9100 to the
> world for first-time access. Before you go to production, restrict
> them to your admin IP — e.g.
> `sudo ufw allow from YOUR.IP/32 to any port 3002 proto tcp`
> followed by removing the original rule.

## Layout

```
infra/
├── setup-vps.sh           one-shot provisioning (idempotent)
├── update-deploy.sh       manual redeploy helper
├── setup-cron.sh          install the auto-update crontab entry
├── auto-update-cron.sh    pulls, rebuilds, reloads — run by cron
├── setup-monitoring.sh    Prometheus + Grafana installer (NOT idempotent)
└── README.md              this file
```

## Troubleshooting

* **Site returns 502 Bad Gateway** — backend is down. Check
  `sudo journalctl -u panchanga-backend -e`. Most common cause:
  Swiss Ephemeris files missing from `backend/ephe/`.
* **Site returns 444 / connection closed** — you hit the direct-IP
  vhost. Use the domain (`https://vedicpanchanga.com`), not the raw IP.
* **Site loads but `/api/*` returns 502** — backend started but isn't
  responding. `curl -I http://127.0.0.1:8001/api/` from the VPS to
  isolate. Check that the service user can read `backend/ephe/` and
  `backend/venv/`.
* **TLS handshake fails after Origin Cert install** — `sudo nginx -t`,
  check both files exist and the key has `chmod 600`. Re-run
  `setup-vps.sh` to regenerate the vhost.
* **Cron updates aren't happening** — `tail -f /var/log/panchanga-auto-update.log`.
  If it says "Cannot access /apps/panchanga", the script's user
  doesn't own the repo. Adjust ownership or move the cron entry.
