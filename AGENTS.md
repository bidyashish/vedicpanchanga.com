# AGENTS.md - AI Agent Instructions for Vedic Panchanga

> This file provides context and rules for AI coding agents (Gemini, Claude, Copilot, etc.)
> working on the Vedic Panchanga repository.

---

## 1. Project Summary

**Vedic Panchanga** is a Drik Panchang calculator with a modern web interface.
It computes traditional Hindu Panchanga elements, divisional charts (D1–D60),
Vimshottari Dasha, Ashtakavarga, Muhurta finding, and much more - for any date
(5000 BCE–5000 CE) and any location on Earth.

**Live site**: https://vedicpanchanga.com

---

## 2. Architecture

```
Internet → Cloudflare → Nginx (TLS, static files) → FastAPI (:8001, localhost-only)
                                                 ↕
                                       Prometheus + Grafana (optional)
```

- **Backend** - Python 3, FastAPI, PySwissEph (Swiss Ephemeris bindings).
  Runs on port **8001**, bound to `127.0.0.1`.
- **Frontend** - Vite + React 19 + TypeScript + Tailwind CSS v4. Static `dist/`
  build served by Nginx. Dev server on port **3121**.
- **Reverse proxy** - Nginx handles TLS termination, security headers, serves
  the static frontend build, and proxies `/api/` to the Python backend.
- **Monitoring** (optional) - Prometheus + Node Exporter + Blackbox + Grafana,
  all bound to 127.0.0.1; Grafana served via Nginx at `/grafana/`. See `infra/grafana/`.

---

## 3. Repository Layout

```
vedicpanchanga.com/
├── backend/                  # FastAPI application
│   ├── server.py             # Entry point (uvicorn server:app)
│   ├── calculator.py         # Core astronomical calculations
│   ├── advanced_panchang.py  # Extended panchang (muhurta windows, rahu kala, etc.)
│   ├── panchang_extras.py    # Ganda Mula + Ravi Yoga detectors
│   ├── gowri_panchang.py     # Gowri Panchangam (Nalla Neram)
│   ├── hora.py               # Planetary Hora hours
│   ├── tyajyam.py            # Tyajyam inauspicious periods
│   ├── vargas.py             # Divisional chart logic (D1-D60)
│   ├── ayanamsa.py           # Multi-ayanamsa support
│   ├── muhurta.py            # Muhurta finder engine
│   ├── dasha_extras.py       # Antardasha + Pratyantar sub-periods
│   ├── jaimini.py            # Chara karakas + Karakamsa/Swamsa
│   ├── relationships.py      # Natural/temporal/panchadha friendships
│   ├── placements.py         # Special placements (exaltation through Graha Yuddha)
│   ├── kalsarpa.py           # Kalsarpa Yoga detection
│   ├── transits.py           # Planetary transit timeline
│   ├── mangal.py             # Mangal Dosha analysis
│   ├── sade_sati.py          # Saturn transit table
│   ├── drishti.py            # Planetary aspects
│   ├── constants.py          # Astronomical constants
│   ├── panchang_constants.py # Panchang-specific constants
│   ├── pdf/                  # Multi-page PDF report (core/ + pages/)
│   ├── ephe/                 # Swiss Ephemeris data files (DO NOT DELETE)
│   ├── tests/                # pytest suites (315 tests)
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Vite + React 19 + TypeScript (port 3121)
│   ├── src/                  # Source code (pages, components, i18n)
│   └── package.json
├── infra/                    # Deployment & infrastructure
│   ├── setup-vps.sh          # One-command VPS provisioning (idempotent)
│   ├── auto-update-cron.sh   # Auto-update + manual deploy (--install for cron)
│   ├── grafana/              # Reproducible monitoring stack (Prometheus + Grafana + Blackbox)
│   └── README.md             # Topology diagram and troubleshooting
├── Makefile                  # Bundled workflow targets (make help)
├── CONTRIBUTING.md           # Human onboarding doc
├── AGENTS.md                 # This file
├── CLAUDE.md                 # Claude-specific notes
└── README.md                 # Project README
```

---

## 4. Backend API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/calculate` | Full Kundali calculation (charts, dasha, ashtakavarga) |
| `GET` | `/api/get-panchang` | Drik Panchang for a date + location |
| `GET` | `/api/ayanamsa-options` | List available ayanamsa systems |
| `GET` | `/api/muhurta-purposes` | List muhurta purpose categories |
| `POST` | `/api/find-muhurta` | Scan dates for auspicious muhurta windows |

The frontend calls these directly via same-origin `/api/` (Nginx proxy in prod, Vite proxy in dev).

---

## 5. Coding Standards

### Python (Backend)
- **Style**: PEP 8. Use type hints on all new functions.
- **Imports**: stdlib → third-party → local, separated by blank lines.
- **Errors**: Raise `HTTPException` with meaningful status codes and detail messages.
- **Calculations**: All astronomical math uses Swiss Ephemeris via `swisseph`.
  Never hardcode planetary positions - always compute from ephemeris.
- **Constants**: Put magic numbers in `constants.py` or `panchang_constants.py`.
- **Ayanamsa**: Default is Lahiri (NC). Support switching via `ayanamsa.py`.
- **Lint / format**: [ruff](https://docs.astral.sh/ruff/) (`ruff check .` and
  `ruff format .`, both run in CI). Auto-fix safe issues with
  `ruff check . --fix`.

### TypeScript / React (Frontend)
- **Framework**: Vite + React 19 (not Next.js - that was removed).
- **Styling**: Tailwind CSS v4 + Shadcn/ui components. No custom CSS unless necessary.
- **i18n**: 15 languages - en, hi, ta, bn, ne, zh, ja, es, de, pt, fr, ru, ar, fa, he.
  All user-facing strings go through `src/i18n/locales/{lang}.ts`. Astronomical
  names (planet/sign/nakshatra) and native-digit tables live in `src/i18n/astro.ts`;
  varga (divisional-chart) names + subtitles live in `src/lib/vargas.ts`.
  `src/i18n/index.tsx` registers `LANGUAGES` and exposes `useI18n()`. RTL languages
  (`ar`, `fa`, `he`) get `dir="rtl"` set on `<html>` automatically.
  **Every non-English locale must be native AND written for a native speaker** -
  this is stronger than "use the right script". Use each language's native script
  throughout (no transliteration of UI text into Latin), and translate astrology/
  technical terms (Rashi, Nakshatra, Mahadasha, Ashtakavarga, Hora, ...) into the
  target language rather than leaving them as bare English words inside a CJK/RTL/
  Indic string. Acceptable Latin is minimal: scientific catalog names in parens
  (Sirius/Vega), units (`Hz`), acronyms (`DNA`); numbers stay Latin digits. Never
  leave one script's letters inside another script's word. Before finishing an i18n
  change, scan the non-Latin locales for ASCII Latin runs in values and translate
  them (a known ~306-string backlog exists, worst in `zh`/`ja` - don't grow it).
- **State**: Keep state as local as possible; lift only when needed.
- **API calls**: Use same-origin `/api/` routes (Nginx proxy), never call `:8001` directly from the browser.
- **Lint / format**: [oxlint](https://github.com/oxc-project/oxc) and
  [oxfmt](https://github.com/oxc-project/oxc) - `npm run lint`,
  `npm run format`, `npm run format:check`. TypeScript type-checking runs
  via `npx tsc --noEmit` (also part of `npm run build`). All of the above
  are enforced by `.github/workflows/ci.yml`.

### General
- Preserve all existing comments and docstrings unrelated to your change.
- Every new feature **must** include tests.
- Commit messages: imperative tense, concise (e.g., `Add D45 varga calculation`).

---

## 6. Testing

### Running Tests

```bash
cd backend && source venv/bin/activate
pytest tests/ -v                             # all tests
pytest tests/ -v -m "not http"               # fast unit tests only (~2.5s)
pytest tests/ -v -m http                     # HTTP integration tests (needs server)
pytest tests/test_muhurta.py -v              # single suite
```

### Test Coverage Baseline
- **315 pytest tests** across 18 test files.
- Covers: vargas structure, D30 special rules, D9 navamsa, backward compat,
  panchang reference data (Kelowna), ayanamsa variants, varjyam/amrit/siddhi yogas,
  muhurta unit + HTTP, Gowri panchangam, Hora, Tyajyam, Tamil calendar,
  planetary transits, dasha sub-periods, Jaimini karakas, friendships,
  Kalsarpa yoga, PDF rendering.

### Test Rules
- Never reduce test count. If you refactor, migrate tests - don't delete them.
- Reference data tests (e.g., Kelowna panchang) are regression anchors - do not modify expected values without explicit approval.
- Add at least one test for every new endpoint or calculation function.

---

## 7. Deployment

### Local Development

```bash
make install                # first-time: venv + npm ci + pre-commit hooks
make dev                    # backend (:8001) + frontend (:3121) together
```

Or manually:

```bash
# Terminal 1 - Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:3121

### Production (VPS)

```bash
sudo bash infra/setup-vps.sh                  # Full provisioning (idempotent)
sudo bash infra/auto-update-cron.sh --install  # Auto-updates every 6h (optional)
```

Manual redeploy: `git pull && sudo bash infra/setup-vps.sh`

### Deployment Checklist
- [ ] All 315+ tests pass locally (`make test`)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Lint/format passes (`make check`)
- [ ] No secrets committed (check `.gitignore`)
- [ ] Backend binds to `127.0.0.1` only

---

## 8. Security Rules (CRITICAL)

1. **Never expose the Python backend to the internet.** It must bind to
   `127.0.0.1:8001`. Only Nginx talks to it.
2. **Never commit secrets**, API keys, or `.env` files. Use `.env.local`
   (gitignored) for local config.
3. **Monitoring stays localhost-only.** Prometheus (9090), Node Exporter (9100),
   Blackbox (9115) and Grafana (3002) all bind to `127.0.0.1`; `setup-vps.sh`
   keeps those ports off the public firewall. Grafana is reached only through the
   Nginx reverse proxy at `/grafana/`. See `infra/grafana/`.
4. **Always use HTTPS** in production. The Nginx config redirects HTTP→HTTPS.
5. **CSP headers** are set in `nginx-vedicpanchanga.conf`. If adding new
   third-party scripts/analytics, update the Content-Security-Policy header.
6. **Direct IP access** to the server returns `444` - only domain-name access works.
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
- NC Lahiri (default), KP New, KP Old, BV Raman, KP Khullar, Sayana Tropical, Manoj.
- swisseph's sidereal mode is process-global C state and endpoints run in a
  threadpool. Any code that calls `swe.calc_ut` / `swe.houses_ex` with
  `FLG_SIDEREAL` must run inside `ayanamsa.sidereal_context(ayanamsa_id)` -
  it locks swisseph access and pins the mode for the block. Never call
  `swe.set_sid_mode` directly. Panchang, muhurta and transits are pinned to
  Lahiri (Drik standard); kundali and Sade Sati follow the user's choice.

### Divisional Charts
16 vargas implemented: D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60.
- D30 (Trimshamsa) uses special uneven segment rules - test carefully.
- Chart styles: North Indian (diamond) + South Indian (4×4 grid).

### Muhurta Finder
- Scans up to 120 days forward.
- Purposes: Marriage, Griha Pravesh, Business, Travel, Education, Vehicle, Namakarana, Medical.
- Scoring: 0–100 per day with explainable reasons from Tithi, Nakshatra, Weekday, Chandrabalam, Tarabalam.

---

## 10. Backlog & Priorities

| Priority | Item |
|----------|------|
| P1 | Day Festivals & Events feed (Ekadashi/Purnima/Amavasya + regional) |
| P2 | Progress indicator for PDF export (~11s for 16 vargas) |
| P2 | Export Muhurta results as PDF / shareable link |

---

## 11. Common Pitfalls

- **Port mismatch**: Backend is 8001, frontend is 3121. The old port 8000 is blocked.
- **Venv not activated**: Always activate `backend/venv` before running backend or tests.
- **Node version**: Requires Node.js 20+. The setup script installs 20.x.
- **Ephemeris path**: If calculations return errors, verify `backend/ephe/` exists and contains `.se1` files.
- **i18n keys**: If adding new UI text, add the key to `src/i18n/locales/en.ts` first, then translate it in every other locale file under `src/i18n/locales/` (15 total). Backend PDF labels live in `backend/pdf/core/i18n/locales/{lang}.py` and follow the same pattern. Missing keys fall back to English at runtime, but please don't ship that as a permanent state.

---

*Last updated: 2026-05-20*
