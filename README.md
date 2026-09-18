# Vedic Panchanga

> **English** · [हिन्दी](docs/i18n/README.hi.md) · [தமிழ்](docs/i18n/README.ta.md) ·
> [বাংলা](docs/i18n/README.bn.md) · [नेपाली](docs/i18n/README.ne.md) ·
> [中文](docs/i18n/README.zh.md) · [日本語](docs/i18n/README.ja.md) ·
> [Español](docs/i18n/README.es.md) · [Deutsch](docs/i18n/README.de.md) ·
> [Português](docs/i18n/README.pt.md) · [Français](docs/i18n/README.fr.md) ·
> [Русский](docs/i18n/README.ru.md) · [العربية](docs/i18n/README.ar.md) ·
> [فارسی](docs/i18n/README.fa.md) · [עברית](docs/i18n/README.he.md)
>
> **Note:** The translated READMEs are generated with an AI model and may lag behind this file. If you notice discrepancies, please open a PR.

Drik Panchang calculator with a modern web interface. Computes traditional Hindu Panchanga elements, divisional charts (D1-D60), Vimshottari Dasha, Ashtakavarga, planetary transits and auspicious Muhurta windows for any date (5000 BCE to 5000 CE) and any location.

**Live**: <https://vedicpanchanga.com>

⭐ If this project is useful to you, please star the repo - it helps others find it.

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Backend | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `fpdf2` for the printable report · `uvicorn` on `127.0.0.1:8001` |
| Frontend | Vite 8 · React 19 · TypeScript · Tailwind CSS v4 · clean-URL SPA on port 3121 |
| Infra | Cloudflare, then Nginx (TLS, static-file host), then FastAPI on loopback · optional Prometheus + Grafana stack |

There is **no** database. Calculations are stateless; the backend persists nothing.

Per-folder docs:
[`backend/README.md`](backend/README.md) ·
[`frontend/README.md`](frontend/README.md) ·
[`infra/README.md`](infra/README.md) ·
[`backend/tests/README.md`](backend/tests/README.md) ·
[`CONTRIBUTING.md`](CONTRIBUTING.md) ·
[`CHANGELOG.md`](CHANGELOG.md)

---

## Run locally

Requires Python 3.10+ and Node.js 20+. The root `Makefile` bundles every workflow and mirrors CI:

```bash
git clone https://github.com/bidyashish/vedicpanchanga.com
cd vedicpanchanga.com
make install     # venv + pip install, npm ci, pre-commit hooks, seeds backend/.env
make dev         # backend on :8001 and frontend on :3121 together
```

Open <http://localhost:3121>. Swagger UI for the API is at <http://localhost:8001/docs>.

| Target | What |
|--------|------|
| `make help` | List every target |
| `make backend` / `make frontend` | Run one side only |
| `make check` | ruff, ruff format --check, tsc, oxlint, oxfmt --check, i18n check (exactly what CI runs) |
| `make format` | ruff format + oxfmt, auto-fix |
| `make pre-commit` | format then check; run before every commit |
| `make test` | pytest (306 tests, about 5 seconds, no server needed) |
| `make ci` | check + test |
| `make clean` | remove caches and `dist/` |

Without `make`, the equivalent commands are documented in the backend and frontend READMEs.

### Environment variables

| File | Key | Purpose |
|------|-----|---------|
| `backend/.env` | `CORS_ORIGINS` | Comma-separated allowlist. Dev: `http://localhost:3121`. Prod: written by `setup-vps.sh` with the public domain only. |
| `backend/.env.local` | `API_KEYS`, `AUTH_EXEMPT_ORIGINS` | Optional API-key auth for third-party clients. Unset means the API is open. Never rewritten by the deploy script. |
| `frontend/.env` | `VITE_BACKEND_URL` | Backend origin. Leave empty in prod: same-origin `/api` via Nginx. |

Vite bakes `VITE_*` vars in at **build time**, so edit `.env` and rebuild. Restarting is not enough.

---

## Features

- **Jyotisha Kundali** - birth chart with 16 divisional charts (D1-D60) in North Indian, South Indian or Western style, planet table with dignity, five-fold friendship and special placements (exaltation, combustion, Neecha Bhanga, Pushkara, Gandanta, Graha Yuddha, ...), aspects, Jaimini karakas and Kalsarpa analysis
- **Drik Panchang** - Tithi, Nakshatra, Yoga, Karana, Vara with full daily sequences, Sun / Moon timings, Rahu Kala, Abhijit, Dur Muhurtam, Bhadra, Varjyam, Gowri Panchangam, Hora, Tyajyam, udaya lagna, Chandrabalam / Tarabalam and an auspiciousness heat strip for the day, with optional live mode
- **Muhurta Finder** - scan up to 120 days for marriage, griha pravesh, business, travel and ten other purposes with 0-100 scoring, explainable reasons and classical vetoes (Guru / Shukra asta, Chaturmas, Kharmas, Adhika masa)
- **Planetary Transits** - year-long timeline with sign ingresses, nakshatra changes and retrograde stations
- **Frequency Generator** - healing tone generator with Solfeggio, chakra, Navagraha and noise presets
- **Vimshottari Dasha** - full 120-year cycle with Antardasha and Pratyantar sub-periods
- **Ashtakavarga** - Bhinnashtakavarga per planet plus Sarvashtakavarga totals
- **PDF report** - multi-page printable Kundali in all 15 UI languages
- **Multi-ayanamsa** - NC Lahiri (default), KP New / Old, BV Raman, KP Khullar, Sayana, Manoj
- **Multilingual UI** - English, Hindi, Tamil, Bengali, Nepali, Chinese, Japanese, Spanish, German, Portuguese, French, Russian, Arabic, Persian, Hebrew. RTL flips automatically for Arabic / Persian / Hebrew.
- **Learn section** - articles on Kundali, the nine planets, Panchang, Dasha, Nakshatras, Rashi and divisional charts

---

## Deploy to a VPS (Ubuntu 22.04 / 24.04)

The site sits behind Cloudflare. TLS uses a **Cloudflare Origin Certificate** (free, 15-year, no rate limits, no auto-renew). `setup-vps.sh` is idempotent: re-running it never breaks TLS as long as the cert files are in place.

```bash
# 1. Clone into the canonical path
sudo mkdir -p /apps && cd /apps
sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga
cd panchanga

# 2. First pass: installs nginx, Node 20, Python venv, systemd unit, firewall.
#    Without an Origin Cert it writes an HTTP-only Nginx config on port 80.
sudo bash infra/setup-vps.sh

# 3. Generate a Cloudflare Origin Certificate (Cloudflare dashboard,
#    SSL/TLS, Origin Server, Create Certificate) and paste it onto the VPS:
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/origin.pem   # certificate
sudo nano /etc/ssl/cloudflare/origin.key   # private key
sudo chmod 600 /etc/ssl/cloudflare/origin.key

# 4. Re-run setup. It detects the cert and emits the TLS vhost
#    (HTTP to HTTPS redirect, HSTS, Cloudflare real-IP, TLS 1.2/1.3).
sudo bash infra/setup-vps.sh

# 5. In Cloudflare set SSL/TLS mode to Full (strict).

# 6. (Optional) auto-update from GitHub every 6 h
sudo bash infra/auto-update-cron.sh --install

# 7. (Optional) Prometheus + Grafana + Blackbox, all bound to localhost
sudo bash infra/grafana/install.sh
```

While steps 3 and 4 are pending, set Cloudflare's SSL/TLS mode to **Flexible** so the site loads over Cloudflare-edge HTTPS with plain HTTP at the origin.

`setup-vps.sh` writes `panchanga-backend.service` (runs `uvicorn server:app` on `127.0.0.1:8001`) and an Nginx vhost that serves the static Vite build from `frontend/dist/` with a one-year cache on fingerprinted `/assets/`. It also rewrites `backend/.env` with a tight `CORS_ORIGINS` allowlist; secrets go in `backend/.env.local`, which it never touches.

### Manual redeploy

```bash
bash /apps/panchanga/infra/auto-update-cron.sh
```

### Security posture baked in

| Layer | What's configured |
|-------|-------------------|
| UFW firewall | Only 22/80/443 open; 8000/8001 denied; any public allow on 3002/9090/9100/9115 is removed |
| Backend | Binds to `127.0.0.1` only; never reachable from the internet |
| Nginx | HSTS, X-Frame-Options, nosniff, Referrer-Policy; direct-IP requests get `444`; HTTP redirects to HTTPS |
| TLS | Cloudflare Origin Certificate, TLS 1.2/1.3 only |
| CORS | `CORS_ORIGINS` locked to the production domain; browser traffic is same-origin through the Nginx proxy |
| API auth | Optional `API_KEYS` for third-party clients; the site's own origin stays keyless |
| Monitoring | Prometheus, exporters and Grafana bind to localhost; Grafana is reachable only through the `/grafana/` proxy |

---

## Project structure

```
vedicpanchanga.com/
├── backend/                 # FastAPI service (port 8001) - see backend/README.md
│   ├── server.py            # entry: uvicorn server:app
│   ├── auth.py              # optional API-key dependency
│   ├── calculator.py        # compute_chart (planets, vargas, dasha, ashtakavarga, ...)
│   ├── advanced_panchang.py # detailed Drik panchang
│   ├── muhurta.py           # muhurta scoring engine + vetoes
│   ├── transits.py          # planetary transit timeline
│   ├── vargas.py, dasha_extras.py, jaimini.py, relationships.py, placements.py,
│   │   kalsarpa.py, drishti.py, tyajyam.py, hora.py, gowri_panchang.py, ...
│   ├── pdf/                 # multi-page PDF report (core/ + pages/ + fonts/)
│   ├── ephe/                # Swiss Ephemeris data files (REQUIRED)
│   └── tests/               # pytest suites - see backend/tests/README.md
├── frontend/                # Vite + React + TypeScript (port 3121) - see frontend/README.md
│   ├── index.html           # static SEO + JSON-LD
│   ├── public/              # favicon, og-image, sitemap.xml, robots.txt, llms.txt, ads.txt
│   ├── scripts/             # check-i18n.mjs (locale parity + native-script guard)
│   └── src/
│       ├── App.tsx          # shell: top bar, path-routed pages, footer
│       ├── pages/           # Panchang, Kundali, Muhurta, Transits, Frequency, Privacy,
│       │                    # Terms, articles/ (the /learn/* pages)
│       ├── components/      # shell/, common/, kundali/, panchang/, transits/, ui/
│       ├── lib/             # api.ts, format.ts, seo.ts, urlState.ts, adsense.ts, ...
│       ├── types/api.ts     # TypeScript shapes for all backend responses
│       └── i18n/            # provider, astro name tables, locales/*.ts (15 languages)
├── infra/                   # provisioning + deploy scripts - see infra/README.md
│   ├── setup-vps.sh         # one-shot VPS provisioning (idempotent)
│   ├── auto-update-cron.sh  # pull, rebuild, restart (cron + manual)
│   └── grafana/             # monitoring stack (Prometheus + Grafana + Blackbox)
├── docs/i18n/               # translated copies of this README
├── Makefile                 # bundled workflow targets (make help)
├── CHANGELOG.md             # release history
├── CONTRIBUTING.md          # file-location conventions and hot spots
├── CLAUDE.md                # notes for AI coding agents (architecture reality + gotchas)
└── README.md                # this file
```

---

## API

All endpoints are mounted under `/api` (not `/api/v1`). In production the browser reaches them through the Nginx `/api/` proxy on the same origin. `/api/` and `/api/health` are always open; the rest honour the optional `API_KEYS` setting (`Authorization: Bearer <key>` or `X-API-Key`).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Readiness probe (200 when ephemeris data is present) |
| POST | `/api/calculate` | Full Kundali: planets, 16 vargas, dashas, ashtakavarga, karakas, placements |
| GET | `/api/get-panchang` | Detailed Drik Panchang for a date and location |
| GET | `/api/ayanamsa-options` | The 7 supported ayanamsa systems |
| GET | `/api/muhurta-purposes` | The 13 muhurta purpose categories |
| POST | `/api/find-muhurta` | Scan a date range (max 120 days) for auspicious windows |
| GET | `/api/transits` | Sign / nakshatra ingresses and retrograde stations |
| GET | `/api/suggest-lang` | UI locale suggestion from country / Accept-Language |
| GET | `/api/geo-ip` | Approximate visitor location from Cloudflare headers |
| POST | `/api/print-pdf` | Multi-page PDF report in any of the 15 locales |

Field shapes live in `frontend/src/types/api.ts`. Interactive Swagger UI in dev: <http://localhost:8001/docs>.

## Star History
[![Star History Chart](https://api.star-history.com/svg?repos=bidyashish/vedicpanchanga.com&type=Date)](https://star-history.com/#bidyashish/vedicpanchanga.com&Date)

## Contributors
Thanks to all the contributors who have helped make this project better!

[![Contributors](https://contrib.rocks/image?repo=bidyashish/vedicpanchanga.com)](https://github.com/bidyashish/vedicpanchanga.com/graphs/contributors)

## License

**Backend**: AGPL-3.0 · **Frontend**: MIT

## Credits

Based on [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) by Satish BD. Astronomical calculations via [Swiss Ephemeris](https://www.astro.com/swisseph/).
