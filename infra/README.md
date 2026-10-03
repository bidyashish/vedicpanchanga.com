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
    |-- /grafana/  -> proxy -> http://127.0.0.1:3002         (Grafana UI)
    |-- /health    -> proxy -> http://127.0.0.1:8001/api/health  (app health)
    +-- /api/      -> proxy -> http://127.0.0.1:8001/api/     (FastAPI)
                                       |     (incl. GET /api/health probe,
                                       |      Stripe -> /api/billing/webhook)
                                       v
                              uvicorn server:app
                              (panchanga-backend.service)
                              bound to 127.0.0.1 - never exposed
                                       |
                              backend/data/app.db  (SQLite: accounts, saved charts)
                                       |
                              panchanga-backup.timer (03:15 daily)
                                       -> Cloudflare R2 bucket (gzipped snapshots)
```

> `/grafana/` is the **Grafana** monitoring UI. The application's own readiness
> probe is `GET /api/health`, also exposed at `/health`
> (<https://vedicpanchanga.com/health>): 200 when the Swiss Ephemeris data is
> present, 503 otherwise. The exporters (Prometheus
> 9090, Node Exporter 9100, Blackbox 9115) and Grafana (3002) all bind to
> 127.0.0.1; only Grafana is reachable, and only via the `/grafana/` proxy. See
> [`grafana/`](grafana/).

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
   `backend/.env` with a tight `CORS_ORIGINS` allowlist, seeds
   `backend/.env.local` **once** (fresh `SESSION_SECRET`, commented
   placeholders for Google / Stripe / SMTP / R2; mode 600; never rewritten),
   creates `backend/data/` for the SQLite accounts database, writes
   `panchanga-backend.service` on port 8001 plus `panchanga-backup.service`
   + `.timer` (daily `python -m accounts.backup backup`).
4. **Frontend** - writes `.env.production` with empty `VITE_BACKEND_URL`
   (browser hits same-origin `/api`), runs `npm ci && npm run build`.
5. **Nginx** - installs the JSON `security` log format and a 365-day
   logrotate policy, then emits TLS or HTTP-only vhost depending on whether
   `/etc/ssl/cloudflare/origin.{pem,key}` exist.
6. **Firewall (UFW)** - opens `22/80/443`; blocks `8000/8001` directly; and
   drops any public allow on the monitoring ports `3002/9090/9100/9115` (they
   stay localhost-only; Grafana is reached through the `/grafana/` proxy).
7. **Systemd** - enables and restarts `panchanga-backend` + `nginx`, enables
   `panchanga-backup.timer`.

### Accounts, Premium and backups (optional)

Everything account-related is switched on by `SESSION_SECRET` in
`backend/.env.local`, which the first deploy generates. Each integration is
independent: leave a block commented out and its UI simply does not appear.

| Integration | Where to configure | What to paste into `.env.local` |
|---|---|---|
| Google Sign-In | Google Cloud Console, APIs & Services, Credentials, OAuth 2.0 Client (Web). Authorized JavaScript origins: `https://vedicpanchanga.com` (+ `http://localhost:3121` for dev). No redirect URI needed (ID-token flow). | `GOOGLE_CLIENT_ID` |
| Password-reset mail | Any SMTP relay (STARTTLS on 587 or implicit TLS on 465) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` |
| Premium (Stripe) | One Product with a monthly and a yearly recurring Price. Webhook endpoint `https://vedicpanchanga.com/api/billing/webhook` subscribed to `checkout.session.completed` and `customer.subscription.*`. Enable the Customer Portal in Stripe settings. | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` |
| DB backups | Cloudflare R2 bucket + an API token scoped to that bucket (Object Read & Write). Add a lifecycle rule or rely on `BACKUP_KEEP` (default 30 newest). | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, optional `R2_PREFIX` |

After editing `.env.local`: `sudo systemctl restart panchanga-backend`. The
webhook path is exempt from `API_KEYS`; it is protected by Stripe's
signature instead. Cookies are only marked `Secure` when Nginx forwards
`X-Forwarded-Proto: https`, which the shipped vhost does.

Restore drill, run as the deploy user (the one that ran `setup-vps.sh`,
owner of `backend/data/`), never against the live file:

```bash
cd /apps/panchanga/backend
venv/bin/python -m accounts.backup list
venv/bin/python -m accounts.backup restore backups/app-20261003T031500Z.db.gz --to /tmp/app.db
sqlite3 /tmp/app.db 'select count(*) from users;'
```

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

### Request logging

Every request that reaches Nginx for this vhost - static assets, redirects and
the direct-IP `444` catch-all included - is written as one JSON object per line
to `/var/log/nginx/vedicpanchanga/access.log` using the `security` log format
from `/etc/nginx/conf.d/vedicpanchanga-logging.conf`. Each line carries the
Cloudflare-resolved client IP and edge IP, `CF-Ray`, country, the Nginx request
ID (also forwarded to the backend as `X-Request-ID`), method, URI, protocol,
status, byte counts, request and upstream timings, upstream status, TLS
protocol and cipher, referer, user agent and an `api_key_present` flag (the key
itself is never logged). Logs rotate daily with `dateext`, are compressed and
kept for 365 days (`/etc/logrotate.d/vedicpanchanga-nginx`). Vhost errors go
to `/var/log/nginx/vedicpanchanga/error.log` at `warn` and above.

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
through the Nginx `/grafana/` proxy; the other exporters are reachable only via
an SSH tunnel. The blackbox job probes `https://vedicpanchanga.com/api/health`
(end-to-end), the homepage, and the origin backend, surfaced on the
**Application Monitoring** dashboard (`/grafana/d/apps-mon/application-monitoring`).

## Common operations

```bash
sudo journalctl -u panchanga-backend -f      # tail backend logs
sudo systemctl restart panchanga-backend     # restart backend
sudo systemctl start panchanga-backup        # run a DB backup now
sudo systemctl list-timers panchanga-backup.timer   # next scheduled backup
sudo journalctl -u panchanga-backup -e       # last backup run output
sudo systemctl reload nginx                  # reload nginx (no downtime)
sudo nginx -t                                # validate nginx config
sudo tail -f /var/log/nginx/vedicpanchanga/access.log   # JSON request log
sudo tail -f /var/log/nginx/vedicpanchanga/error.log    # vhost errors (warn+)
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
* **No "Sign in" button on the site** - `SESSION_SECRET` is unset or empty in
  `backend/.env.local`; `curl -s https://vedicpanchanga.com/api/auth/config`
  shows `"enabled": false`. Google button missing with accounts enabled means
  `GOOGLE_CLIENT_ID` is unset or the origin is not authorized in Google Cloud.
* **Users signed out after every deploy** - `SESSION_SECRET` changed. It must
  stay stable; the deploy script never rewrites `.env.local`, so check for a
  manual edit.
* **Stripe webhook returns 400** - signature mismatch: `STRIPE_WEBHOOK_SECRET`
  does not match the endpoint in the Stripe dashboard. `500` means the handler
  failed and Stripe will retry; see `journalctl -u panchanga-backend`.
* **Backup timer fails** - `journalctl -u panchanga-backup -e`. With no `R2_*`
  the snapshot is still written to `backend/data/backups/`.

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
