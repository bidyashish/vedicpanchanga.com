# AGENTS.md — AI Agent Instructions for Vedic Panchanga

> This file provides context and rules for AI coding agents (Gemini, Claude, Copilot, etc.)
> working on the Vedic Panchanga repository.

---

## 1. Project Summary

**Vedic Panchanga** is a Drik Panchang calculator with a modern web interface.
It computes traditional Hindu Panchanga elements, divisional charts (D1–D60),
Vimshottari Dasha, Ashtakavarga, Muhūrta finding, and much more — for any date
(5000 BCE–5000 CE) and any location on Earth.

**Live site**: https://vedicpanchanga.com

---

## 2. Architecture

```
Internet → Cloudflare → Nginx (TLS) → Next.js (:3121) → FastAPI (:8001, localhost-only)
                                                    ↕
                                          Prometheus + Grafana
```

- **Backend** — Python 3, FastAPI, PySwissEph (Swiss Ephemeris bindings).
  Runs on port **8001**, bound to `127.0.0.1`.
- **Frontend** — Next.js 15, React 19, TypeScript, Tailwind CSS v4, Shadcn/ui.
  Runs on port **3121**.
- **Reverse proxy** — Nginx handles TLS termination, security headers, and
  routes `/api/v1/*` through Next.js (which proxies to the Python backend).
- **Monitoring** — Prometheus (9090), Grafana (3002), Node Exporter (9100).

---

## 3. Repository Layout

```
vedicpanchanga.com/
├── backend/                # FastAPI application
│   ├── api.py              # Main server entry point
│   ├── calculator.py       # Core astronomical calculations
│   ├── vargas.py           # Divisional chart logic (D1–D60)
│   ├── ayanamsa.py         # Multi-ayanamsa support
│   ├── panchang.py         # Basic panchang calculation
│   ├── advanced_panchang.py # Extended panchang (muhurta, rahu kala, etc.)
│   ├── muhurta.py          # Muhūrta finder engine
│   ├── constants.py        # Astronomical constants
│   ├── panchang_constants.py # Panchang-specific constants
│   ├── server.py           # Server configuration
│   ├── requirements.txt    # Python dependencies
│   └── ephe/               # Swiss Ephemeris data files (DO NOT DELETE)
├── frontend/               # Next.js 15 application
│   ├── src/                # Source code (pages, components, i18n)
│   └── package.json
├── infra/                  # Deployment & infrastructure
│   ├── setup-vps.sh        # One-command VPS provisioning
│   ├── setup-firewall.sh   # UFW firewall rules
│   ├── setup-monitoring.sh # Prometheus + Grafana installer
│   ├── setup-cron.sh       # Auto-update cron installer
│   ├── auto-update-cron.sh # Auto-update script
│   ├── update-deploy.sh    # Manual redeploy script
│   ├── nginx-vedicpanchanga.conf
│   ├── panchanga-backend.service
│   ├── panchanga-frontend.service
│   └── *.service / *.yml   # Monitoring configs
├── tests/                  # All test suites
│   ├── test_vedic_api.py
│   ├── test_panchang_detailed.py
│   ├── test_iteration3.py
│   ├── test_iteration4_vargas.py
│   ├── test_muhurta.py
│   └── test_muhurta_api.py
├── memory/                 # PRD and project context
│   └── PRD.md
├── API.md                  # API endpoint documentation
└── AGENTS.md               # This file
```

---

## 4. Backend API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/calculate` | Full Kundali calculation (charts, dasha, ashtakavarga) |
| `GET` | `/api/get-panchang` | Drik Panchang for a date + location |
| `GET` | `/api/ayanamsa-options` | List available ayanamsa systems |
| `GET` | `/api/muhurta-purposes` | List muhūrta purpose categories |
| `POST` | `/api/find-muhurta` | Scan dates for auspicious muhūrta windows |

The frontend proxies these through Next.js API routes at `/api/v1/*`.

---

## 5. Coding Standards

### Python (Backend)
- **Style**: PEP 8. Use type hints on all new functions.
- **Imports**: stdlib → third-party → local, separated by blank lines.
- **Errors**: Raise `HTTPException` with meaningful status codes and detail messages.
- **Calculations**: All astronomical math uses Swiss Ephemeris via `swisseph`.
  Never hardcode planetary positions — always compute from ephemeris.
- **Constants**: Put magic numbers in `constants.py` or `panchang_constants.py`.
- **Ayanamsa**: Default is Lahiri (NC). Support switching via `ayanamsa.py`.

### TypeScript / React (Frontend)
- **Framework**: Next.js 15 with App Router.
- **Styling**: Tailwind CSS v4 + Shadcn/ui components. No custom CSS unless necessary.
- **i18n**: English and Hindi. All user-facing strings go through `i18n.js`.
  Use the toggle pattern (EN / हिं, no flags).
- **State**: Keep state as local as possible; lift only when needed.
- **API calls**: Use the `/api/v1/*` routes (Next.js proxy), never call `:8001` directly from the browser.

### General
- Preserve all existing comments and docstrings unrelated to your change.
- Every new feature **must** include tests.
- Commit messages: imperative tense, concise (e.g., `Add D45 varga calculation`).

---

## 6. Testing

### Running Tests

```bash
# Backend unit tests (from project root)
cd backend && 
source venv/bin/activate
source venv/bin/activate.fish
pytest ../tests/ -v

# Specific suites
pytest ../tests/test_muhurta.py -v          # Muhūrta unit tests
pytest ../tests/test_muhurta_api.py -v      # Muhūrta HTTP tests
pytest ../tests/test_iteration4_vargas.py   # Varga structure tests

# Production smoke test
./tests/test_production_api.sh
```

### Test Coverage Baseline
- **87/87 pytest tests passing** (as of iteration 5).
- Covers: vargas structure, D30 special rules, D9 navamsa, backward compat,
  panchang reference data (Kelowna), ayanamsa variants, varjyam/amrit/siddhi yogas,
  muhurta unit + HTTP.

### Test Rules
- Never reduce test count. If you refactor, migrate tests — don't delete them.
- Reference data tests (e.g., Kelowna panchang) are regression anchors — do not modify expected values without explicit approval.
- Add at least one test for every new endpoint or calculation function.

---

## 7. Deployment

### Local Development

```bash
# Terminal 1 — Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python api.py

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:3121

### Production (VPS)

```bash
sudo bash infra/setup-vps.sh      # Full setup (one time)
sudo certbot --nginx -d vedicpanchanga.com  # SSL (one time)
bash infra/setup-cron.sh           # Auto-updates (optional)
bash infra/update-deploy.sh        # Manual redeploy
```

### Deployment Checklist
- [ ] All 87+ tests pass locally
- [ ] Frontend builds without errors (`npm run build`)
- [ ] No secrets committed (check `.gitignore`)
- [ ] Backend binds to `127.0.0.1` only
- [ ] SSL certificate valid and auto-renewing

---

## 8. Security Rules (CRITICAL)

1. **Never expose the Python backend to the internet.** It must bind to
   `127.0.0.1:8001`. Only Nginx and the Next.js server talk to it.
2. **Never commit secrets**, API keys, or `.env` files. Use `.env.local`
   (gitignored) for local config.
3. **Monitoring ports** (Prometheus 9090, Grafana 3002) should be IP-restricted
   in production via UFW — they are open by default for ease of setup.
4. **Always use HTTPS** in production. The Nginx config redirects HTTP→HTTPS.
5. **CSP headers** are set in `nginx-vedicpanchanga.conf`. If adding new
   third-party scripts/analytics, update the Content-Security-Policy header.
6. **Direct IP access** to the server returns `444` — only domain-name access works.
7. **Swiss Ephemeris files** (`backend/ephe/`) are required for calculations.
   Never delete or modify them.

---

## 9. Key Implementation Details

### Swiss Ephemeris
- Ephemeris files live in `backend/ephe/` (sepl_18, semo_18, seas_18).
- These cover planetary data for the full date range (5000 BCE–5000 CE).
- The library is accessed via `swisseph` Python bindings (PySwissEph).

### Ayanamsa
Supported systems (configured in `ayanamsa.py`):
- NC Lahiri (default), KP New, KP Old, BV Raman, KP Khullar, Sāyana Tropical, Manoj.

### Divisional Charts
16 vargas implemented: D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60.
- D30 (Triṁśāṁśa) uses special uneven segment rules — test carefully.
- Chart styles: North Indian (diamond) + South Indian (4×4 grid).

### Muhūrta Finder
- Scans up to 120 days forward.
- Purposes: Marriage, Griha Pravesh, Business, Travel, Education, Vehicle, Namakarana, Medical.
- Scoring: 0–100 per day with explainable reasons from Tithi, Nakshatra, Weekday, Chandrabalam, Tarabalam.

---

## 10. Backlog & Priorities

| Priority | Item |
|----------|------|
| P1 | Antardasha sub-periods inside current Mahadasha |
| P1 | Day Festivals & Events feed (Ekadashi/Purnima/Amavasya + regional) |
| P2 | Saved charts / profile feature (MongoDB) |
| P2 | Progress indicator for PDF export (~11s for 16 vargas) |
| P2 | Export Muhurta results as PDF / shareable link |

---

## 11. Common Pitfalls

- **Port mismatch**: Backend is 8001, frontend is 3121. The old port 8000 is blocked.
- **Venv not activated**: Always activate `backend/venv` before running backend or tests.
- **Node version**: Requires Node.js 20+. The setup script installs 20.x.
- **Ephemeris path**: If calculations return errors, verify `backend/ephe/` exists and contains `.se1` files.
- **i18n keys**: If adding new UI text, add both English and Hindi translations in `i18n.js`.

---

*Last updated: 2026-04-20*
