# Vedic Panchanga

> **English** · [हिन्दी](docs/i18n/README.hi.md) · [தமிழ்](docs/i18n/README.ta.md) ·
> [中文](docs/i18n/README.zh.md) · [日本語](docs/i18n/README.ja.md) ·
> [Español](docs/i18n/README.es.md) · [Deutsch](docs/i18n/README.de.md) ·
> [Português](docs/i18n/README.pt.md) · [Français](docs/i18n/README.fr.md)
>
> **Note:** Language translations are generated using an AI model. If you notice any discrepancies or errors, please open a PR to help improve them.

Drik Panchang calculator with a modern web interface. Computes traditional Hindu Panchanga elements, divisional charts (D1–D60), Vimshottari Dasha, Ashtakavarga and auspicious Muhurta windows for any date (5000 BCE – 5000 CE) and any location.

**Live**: <https://vedicpanchanga.com>

⭐ If this project is useful to you, please star the repo — it helps others find it.

---

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Backend  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` for the printable report · `uvicorn` on `127.0.0.1:8001` |
| Frontend | Vite · React 19 · TypeScript · Tailwind CSS v4 · clean-URL SPA on port 3121 |
| Infra    | Cloudflare → Nginx (TLS, static-file host) → FastAPI loopback · Prometheus + Grafana optional |

There is **no** database. Calculations are stateless; the backend persists nothing.

Per-folder docs:
[`backend/README.md`](backend/README.md) ·
[`frontend/README.md`](frontend/README.md) ·
[`infra/README.md`](infra/README.md) ·
[`backend/tests/README.md`](backend/tests/README.md).

---

## Run locally (developer setup)

Requires Python 3.10+ and Node.js 20+.

```bash
# 1. Clone
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com

# 2. Backend (terminal 1) — FastAPI on :8001
cd backend
python3 -m venv venv
source venv/bin/activate.fish        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# 3. Frontend (terminal 2) — Vite dev server on :3121
cd frontend
cp .env.example .env            # sets VITE_BACKEND_URL=http://localhost:8001
npm install
npm run dev
```

Open <http://localhost:3121>.

### Frontend commands

```bash
npm run dev          # Vite dev server with HMR
npm run build        # tsc --noEmit && vite build → dist/
npm run preview      # serve the built bundle
npm run lint         # oxlint (oxc-project)
npm run format       # oxfmt — write
npm run format:check # oxfmt --check (CI)
npx tsc --noEmit     # TypeScript type-check
```

### Backend lint & format

```bash
cd backend && source venv/bin/activate
ruff check .          # lint
ruff check . --fix    # lint + auto-fix
ruff format .         # format — write
ruff format --check . # format check (CI)
```

GitHub Actions (`.github/workflows/ci.yml`) runs all of the above on every
push to `main` and every PR. To run them automatically before each commit
locally, install [pre-commit](https://pre-commit.com) and enable the
hooks shipped in `.pre-commit-config.yaml`:

```bash
pip install pre-commit && pre-commit install
```

### Backend tests

```bash
cd backend && source venv/bin/activate
pytest tests/ -v                # all (HTTP tests skip if no backend running)
pytest tests/ -v -m "not http"  # fast unit tests only (~2.5s)
pytest tests/ -v -m http        # HTTP integration tests only
```

See [`backend/tests/README.md`](backend/tests/README.md) for what each
suite covers and the canonical birth payloads.

### Environment variables

| File               | Key                  | Purpose                                                                 |
| ------------------ | -------------------- | ----------------------------------------------------------------------- |
| `backend/.env`     | `CORS_ORIGINS`       | Comma-separated allowlist. Dev default: `http://localhost:3121`. Prod: `setup-vps.sh` writes `https://vedicpanchanga.com,https://www.vedicpanchanga.com`. |
| `frontend/.env`    | `VITE_BACKEND_URL`   | Backend origin. Leave empty in prod → same-origin `/api` via Nginx.     |

Vite bakes `VITE_*` vars in at **build time**, so edit `.env` and rebuild — restarting isn't enough.

---

## Features

- **Jyotisha Kundali** · birth chart with 16 divisional charts (D1–D60), North- or South-Indian style
- **Drik Panchang** · Tithi · Nakshatra · Yoga · Karana · Vara, Sun/Moon timings, Rahu Kala, Abhijit & more
- **Muhurta Finder** · scan up to 120 days for Marriage, Griha Pravesha, Business, Travel etc. with 0–100 scoring
- **Vimshottari Mahadasha** · full 120-year planetary cycle from birth
- **Ashtakavarga** · Bhinnashtakavarga per planet + Sarvashtakavarga totals
- **Multi-ayanamsa** · NC Lahiri (default), KP New/Old, BV Raman, KP Khullar, Sayana, Manoj
- **Bilingual UI** · English + हिन्दी, with Devanagari web fonts (Tiro Devanagari Hindi, Noto Serif Devanagari)

---

## Deploy to a VPS (Ubuntu 22.04 / 24.04)

The site sits behind Cloudflare. TLS uses a **Cloudflare Origin Certificate** (free, 15-year, no rate limits, no auto-renew). `setup-vps.sh` is idempotent — re-running it never breaks TLS as long as the cert files are in place.

```bash
# 1. Clone into the canonical path
sudo mkdir -p /apps && cd /apps
sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga
cd panchanga

# 2. First pass — installs nginx, Node 20, Python venv, systemd unit, firewall.
#    On first run it warns that no Origin Cert is present and writes an HTTP-only
#    Nginx config so the site is reachable on port 80.
sudo bash infra/setup-vps.sh

# 3. Generate a Cloudflare Origin Certificate (one-time, ~3 minutes):
#      Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate
#      (defaults: RSA 2048, vedicpanchanga.com + *.vedicpanchanga.com, 15 years)
#    Paste the two PEM blobs onto the VPS:
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.pem   # paste the certificate
sudo nano /etc/ssl/cloudflare/origin.key   # paste the private key
sudo chmod 600 /etc/ssl/cloudflare/origin.key

# 4. Re-run setup. It now detects the cert and emits a TLS Nginx config
#    (HTTP→HTTPS redirect, HSTS, Cloudflare real-IP, port 443 with TLS 1.2/1.3).
sudo bash infra/setup-vps.sh

# 5. Cloudflare → SSL/TLS → Overview → set mode to Full (strict).

# 6. (Optional) Auto-update from GitHub every 6 h
bash infra/setup-cron.sh
```

While step 3–4 are pending, set Cloudflare's SSL/TLS mode to **Flexible** — the site loads immediately over CF-edge HTTPS terminating to plain HTTP at the origin.

`setup-vps.sh` writes `panchanga-backend.service` (runs `uvicorn server:app` on `127.0.0.1:8001`) and an Nginx vhost that serves the static Vite build from `frontend/dist/` with 1-year cache on fingerprinted `/assets/`. It also writes `backend/.env` with a tight `CORS_ORIGINS` allowlist (production domain only).

### Manual redeploy

```bash
sudo bash /apps/panchanga/infra/update-deploy.sh
```

### Security posture baked in

| Layer        | What's configured |
| ------------ | ----------------- |
| UFW firewall | Only 22/80/443 open externally; 8001 actively denied |
| Backend      | Binds to `127.0.0.1` only; never reachable from the internet |
| Nginx        | HSTS + X-Frame-Options + nosniff + Referrer-Policy; direct-IP requests return `444`; HTTP→HTTPS redirect |
| TLS          | Cloudflare Origin Certificate (15-year, no auto-renew, no rate limits). TLS 1.2/1.3 only |
| CORS         | `CORS_ORIGINS` locked to production domains; same-origin via Nginx proxy in browser |
| Monitoring   | Ports 3002/9090/9100 open by default — **restrict to your admin IP before going live** |

---

## Project structure

```
vedicpanchanga.com/
├── backend/                 # Python FastAPI server (port 8001) — see backend/README.md
│   ├── server.py            # entry: uvicorn server:app
│   ├── calculator.py        # compute_chart (planets, vargas, dasha + dasha_antar,
│   │                        # ashtakavarga, karakas, karakamsa, friendships, kalsarpa)
│   ├── advanced_panchang.py # detailed Drik panchang
│   ├── panchang_extras.py   # Ganda Mula + Ravi Yoga detectors
│   ├── vargas.py            # 16 divisional charts (D1–D60)
│   ├── ayanamsa.py          # ayanamsa selection
│   ├── muhurta.py           # muhurta scoring engine
│   ├── dasha_extras.py      # Vimshottari Antardasha + Pratyantar
│   ├── jaimini.py           # Chara karakas + Karakamsa/Swamsa
│   ├── relationships.py     # natural / temporal / panchadha friendships
│   ├── kalsarpa.py          # Kalsarpa Yoga detection
│   ├── pdf/                 # multi-page PDF report (core/ + pages/)
│   ├── ephe/                # Swiss Ephemeris data files (REQUIRED)
│   └── tests/               # pytest suites — see backend/tests/README.md
├── frontend/                # Vite + React + TypeScript (port 3121) — see frontend/README.md
│   ├── index.html           # static SEO + JSON-LD (WebSite/WebApplication/Organization)
│   ├── public/              # favicon, og-image, sitemap.xml, robots.txt
│   ├── src/
│   │   ├── App.tsx          # shell (top bar + path-routed pages + footer)
│   │   ├── pages/           # KundaliPage, PanchangPage, MuhurtaPage, Privacy, Terms
│   │   ├── components/
│   │   │   ├── shell/       # TopBar, Footer
│   │   │   ├── common/      # CitySearch, LanguageSwitcher, MandalaLoader, ThemeToggle
│   │   │   ├── kundali/     # BirthForm, ChartTabs, VedicChart, SouthIndianChart, tables
│   │   │   └── panchang/    # Section, TimeBand
│   │   ├── lib/             # api.ts (typed fetch), format.ts, planets.ts, seo.ts
│   │   ├── types/api.ts     # TypeScript shapes for all backend responses
│   │   └── i18n.tsx         # English + Hindi dictionaries
│   └── vite.config.ts
├── infra/                   # provisioning + deploy scripts — see infra/README.md
│   ├── setup-vps.sh         # one-shot VPS provisioning (idempotent)
│   ├── setup-cron.sh        # install auto-update cron
│   ├── auto-update-cron.sh  # pulls, rebuilds, reloads — run by cron
│   ├── update-deploy.sh     # manual redeploy helper
│   └── setup-monitoring.sh  # Prometheus + Grafana installer
├── AGENTS.md                # canonical brief for AI coding agents
├── CLAUDE.md                # Claude-specific notes (architecture reality + gotchas)
└── README.md                # this file
```

---

## API

All endpoints are mounted under `/api` on the backend (not `/api/v1`). In production the browser hits them via the Nginx `/api/` proxy on the same origin.

| Method | Path                     | Purpose                                          |
| ------ | ------------------------ | ------------------------------------------------ |
| POST   | `/api/calculate`         | Full Kundali (planets, 16 vargas, dasha, ashtakavarga) |
| GET    | `/api/get-panchang`      | Drik Panchang for a date + location              |
| GET    | `/api/ayanamsa-options`  | List available ayanamsa systems                  |
| GET    | `/api/muhurta-purposes`  | List muhurta purpose categories                  |
| POST   | `/api/find-muhurta`      | Scan a date range for auspicious windows         |

Interactive Swagger UI in dev: <http://localhost:8001/docs>.

## Star History
[![Star History Chart](https://api.star-history.com/svg?repos=bidyashish/vedicpanchanga.com&type=Date)](https://star-history.com/#bidyashish/vedicpanchanga.com&Date)

## Contributors
Thanks to all the contributors who have helped make this project better!

[![Contributors](https://contrib.rocks/image?repo=bidyashish/vedicpanchanga.com)](https://github.com/bidyashish/vedicpanchanga.com/graphs/contributors)


## License

**Backend**: AGPL-3.0 · **Frontend**: MIT

## Credits

Based on [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) by Satish BD. Astronomical calculations via [Swiss Ephemeris](https://www.astro.com/swisseph/).
