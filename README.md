# Vedic Panchanga

Drik Panchang calculator with a modern web interface. Computes traditional Hindu Panchanga elements, divisional charts (D1–D60), Vimshottari Daśā, Aṣṭakavarga and auspicious Muhūrta windows for any date (5000 BCE – 5000 CE) and any location.

**Live**: <https://vedicpanchanga.com>

⭐ If this project is useful to you, please star the repo — it helps others find it.

---

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Backend  | Python 3 · FastAPI · PySwissEph (Swiss Ephemeris) · `uvicorn` on `127.0.0.1:8001` |
| Frontend | Vite · React 19 · TypeScript · Tailwind CSS v3 · hash-routed SPA on port 3121 |
| Infra    | Cloudflare → Nginx (TLS, static-file host) → FastAPI loopback · Prometheus + Grafana optional |

There is **no** database. Calculations are stateless; the backend persists nothing.

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
source venv/bin/activate        # Windows: venv\Scripts\activate
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
npm run dev       # Vite dev server with HMR
npm run build     # tsc --noEmit && vite build → dist/
npm run preview   # serve the built bundle
npm run lint      # type-check only (tsc --noEmit)
```

### Backend tests

```bash
cd backend && source venv/bin/activate
pytest tests/ -v                                 # run all
pytest tests/test_muhurta.py -v                  # single suite
pytest tests/test_iteration4_vargas.py::test_d30 # single test
```

### Environment variables

| File               | Key                  | Purpose                                                                 |
| ------------------ | -------------------- | ----------------------------------------------------------------------- |
| `backend/.env`     | `CORS_ORIGINS`       | Comma-separated allowlist. Dev default: `http://localhost:3121`. Prod: `setup-vps.sh` writes `https://vedicpanchanga.com,https://www.vedicpanchanga.com`. |
| `frontend/.env`    | `VITE_BACKEND_URL`   | Backend origin. Leave empty in prod → same-origin `/api` via Nginx.     |
| `frontend/.env`    | `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_*` | Optional. Unset → dashed placeholders in ad slots. |

Vite bakes `VITE_*` vars in at **build time**, so edit `.env` and rebuild — restarting isn't enough.

---

## Features

- **Jyotiṣa Kuṇḍalī** · birth chart with 16 divisional charts (D1–D60), North- or South-Indian style
- **Drik Pañcāṅga** · Tithi · Nakṣatra · Yoga · Karaṇa · Vāra, Sun/Moon timings, Rāhu Kāla, Abhijit & more
- **Muhūrta Finder** · scan up to 120 days for Marriage, Gṛha Praveś, Business, Travel etc. with 0–100 scoring
- **Vimshottari Mahādaśā** · full 120-year planetary cycle from birth
- **Aṣṭakavarga** · Bhinnāṣṭakavarga per planet + Sarvāṣṭakavarga totals
- **Multi-ayanāṁśa** · NC Lahiri (default), KP New/Old, BV Raman, KP Khullar, Sāyana, Manoj
- **Bilingual UI** · English + हिन्दी, with Devanagari web fonts (Tiro Devanagari Hindi, Noto Serif Devanagari)

---

## Deploy to a VPS (Ubuntu 22.04 / 24.04)

```bash
# 1. Clone into the canonical path
sudo mkdir -p /apps && cd /apps
sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga
cd panchanga

# 2. Provision — installs nginx, Node 20, Python venv, systemd unit, firewall
sudo bash infra/setup-vps.sh

# 3. SSL certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com

# 4. (Optional) Auto-update from GitHub every 6 h
bash infra/setup-cron.sh
```

The setup script is idempotent and re-runnable. It writes `panchanga-backend.service` (runs `uvicorn server:app` on `127.0.0.1:8001`) and an Nginx vhost that serves the static Vite build from `frontend/dist/` with 1-year cache on fingerprinted `/assets/`.

### Manual redeploy

```bash
sudo bash /apps/panchanga/infra/update-deploy.sh
```

### Security posture baked in

| Layer        | What's configured |
| ------------ | ----------------- |
| UFW firewall | Only 22/80/443 open externally; 8001 actively denied |
| Backend      | Binds to `127.0.0.1` only; never reachable from the internet |
| Nginx        | Security headers (X-Frame-Options, nosniff, Referrer-Policy); direct-IP requests return `444` |
| TLS          | Certbot auto-renews LE certs with strong ciphers |
| Monitoring   | Ports 3002/9090/9100 open by default — **restrict to your admin IP before going live** |

---

## Project structure

```
vedicpanchanga.com/
├── backend/                 # Python FastAPI server (port 8001)
│   ├── server.py            # entry: uvicorn server:app
│   ├── calculator.py        # compute_chart (planets, houses, dashas, ashtakavarga)
│   ├── panchang.py          # basic panchang
│   ├── advanced_panchang.py # detailed Drik panchang
│   ├── vargas.py            # 16 divisional charts
│   ├── ayanamsa.py          # ayanamsa options
│   ├── muhurta.py           # muhurta scoring engine
│   ├── ephe/                # Swiss Ephemeris data files (REQUIRED)
│   └── tests/               # pytest suites
├── frontend/                # Vite + React + TypeScript (port 3121)
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx          # shell (top bar + hash-routed pages + footer)
│   │   ├── pages/           # KundaliPage, PanchangPage, MuhurtaPage
│   │   ├── components/
│   │   │   ├── shell/       # TopBar, Footer, AdSlot
│   │   │   ├── common/      # CitySearch, MandalaLoader, LanguageSwitcher
│   │   │   ├── kundali/     # BirthForm, ChartTabs, VedicChart, SouthIndianChart, tables
│   │   │   └── panchang/    # Section, TimeBand
│   │   ├── lib/             # api.ts (typed fetch), format.ts, planets.ts
│   │   ├── types/api.ts     # TypeScript shapes for all backend responses
│   │   └── i18n.tsx         # English + Hindi dictionaries
│   └── vite.config.ts
├── infra/
│   ├── setup-vps.sh         # one-shot VPS provisioning
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

---

## License

**Backend**: AGPL-3.0 · **Frontend**: MIT

## Credits

Based on [Drik Panchanga](https://github.com/bdsatish/drik-panchanga) by Satish BD. Astronomical calculations via [Swiss Ephemeris](https://www.astro.com/swisseph/).
