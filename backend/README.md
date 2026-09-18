# backend/

FastAPI service that wraps the [Swiss Ephemeris](https://www.astro.com/swisseph/)
to compute Vedic charts, Drik Panchanga, Muhurta windows, planetary transits
and a multi-page PDF report. Stateless - there is no database.

* **Runtime**: Python 3.10+
* **Entry point**: `server.py` (`uvicorn server:app`)
* **Bind address (prod)**: `127.0.0.1:8001` only (Nginx proxies `/api/`)
* **Ephemeris data**: `backend/ephe/*.se1` - required, never delete

## Run locally

From the repo root, `make install` creates the venv, installs
`requirements.txt` and seeds `backend/.env` from `.env.example`; `make backend`
starts the dev server with reload. The manual equivalent:

```bash
python3 -m venv venv
source venv/bin/activate            # fish: source venv/bin/activate.fish
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

Interactive Swagger UI: <http://localhost:8001/docs>.

### Configuration

| File | Key | Purpose |
|------|-----|---------|
| `.env` | `CORS_ORIGINS` | Comma-separated allowlist. Falls back to `https://vedicpanchanga.com,http://localhost:3121` when unset. `infra/setup-vps.sh` rewrites this file on every deploy. |
| `.env.local` | `API_KEYS` | Optional. Comma-separated keys; unset means the API is open. Clients send `Authorization: Bearer <key>` or `X-API-Key: <key>`. See `auth.py`. |
| `.env.local` | `AUTH_EXEMPT_ORIGINS` | Origins that stay keyless when `API_KEYS` is set. Defaults to the site itself plus localhost dev. |

Both files are gitignored. `.env.local` is loaded on top of `.env` and is
never touched by the deploy script, so server-side secrets live there.

## Tests

```bash
make test                       # from the repo root
pytest tests/ -v                # from backend/ with the venv active
pytest tests/ -v -m "not http"  # unit tests only
BACKEND_URL=http://127.0.0.1:8001 pytest tests/ -v -m http   # against a live server
```

API tests run in-process through FastAPI's `TestClient`, so the full suite
needs no running server. See [`tests/README.md`](tests/README.md) for what
each suite covers and the reference birth payloads.

## Lint & format

```bash
make check-backend     # ruff check + ruff format --check (what CI runs)
make format-backend    # ruff format
```

`.pre-commit-config.yaml` at the repo root wires the same ruff hooks into
`git commit`; `make install` sets them up.

## API

All endpoints are under `/api`. Field shapes live in
`frontend/src/types/api.ts` (TypeScript mirror of the responses). `/api/`
and `/api/health` are always open; everything else honours `API_KEYS`.

| Method | Path | What |
|--------|------|------|
| GET | `/api/` | Liveness ping |
| GET | `/api/health` | Readiness probe: 200 when the ephemeris files are present, 503 otherwise |
| POST | `/api/calculate` | Full chart: planets, 16 vargas (D1-D60), Vimshottari with nested Antardasha, Ashtakavarga, Chara karakas, Karakamsa / Swamsa, friendships, Kalsarpa, special placements, aspects |
| GET | `/api/get-panchang` | Detailed Drik Panchanga: sun / moon timings, all five limbs with `_sequence` lists, samvats, ritu / ayana, muhurta windows, Gowri, Hora, Tyajyam, udaya lagna, chandrabalam, tarabalam, calendars, Ganda Mula, Ravi Yoga |
| GET | `/api/ayanamsa-options` | The 7 supported ayanamsa systems |
| GET | `/api/muhurta-purposes` | The 13 purpose categories (marriage, engagement, griha pravesh, ...) |
| POST | `/api/find-muhurta` | Scan a date range (max 120 days) and score each day 0-100 with reasons |
| GET | `/api/transits` | Sign ingresses, nakshatra changes and retrograde stations for a date range |
| GET | `/api/suggest-lang` | UI locale suggestion from Cloudflare country header with Accept-Language fallback |
| GET | `/api/geo-ip` | Approximate visitor location from Cloudflare geo headers |
| POST | `/api/print-pdf` | Multi-page PDF report in any of the 15 locales |

CPU-bound endpoints (`/calculate`, `/get-panchang`, `/find-muhurta`,
`/transits`, `/print-pdf`) are plain `def` handlers so FastAPI runs them in
its thread pool and the event loop stays responsive. `/print-pdf` renders in
a spawned process pool. Prometheus metrics are exposed at `/metrics`.

## Module layout

```
backend/
├── server.py                  FastAPI app, request/response models, CORS, routes
├── auth.py                    optional API-key dependency (API_KEYS / AUTH_EXEMPT_ORIGINS)
├── calculator.py              compute_chart: planets, houses, dasha, ashtakavarga,
│                              dasha_antar, karakas, karakamsa, friendships, kalsarpa,
│                              placements, drishti
├── advanced_panchang.py       compute_detailed_panchang: full Drik panchang
├── panchang_extras.py         Ganda Mula + Ravi Yoga detectors
├── gowri_panchang.py          Gowri Panchangam / Nalla Neram (Tamil / Telugu tradition)
├── nalla_neram.py             Nalla Neram windows
├── hora.py                    Planetary Hora hours (12 day + 12 night)
├── tyajyam.py                 Ten Tyajyam calculations (nakshatra, tithi, vara, Amritadi, ...)
├── tamil_calendar.py          Tamil calendar (year, month, weekday)
├── vargas.py                  16 divisional charts (D1-D60); D30 has uneven segments
├── ayanamsa.py                AYANAMSA_OPTIONS + sidereal_context() lock; default lahiri
├── muhurta.py                 Muhurta scanner with purpose-based scoring and vetoes
├── transits.py                Planetary transit timeline
├── dasha_extras.py            Vimshottari Antardasha + Pratyantar (levels 2 and 3)
├── jaimini.py                 Chara karakas + Karakamsa / Swamsa charts
├── relationships.py           Natural / temporal / 5-fold friendship matrices
├── placements.py              Exaltation, debilitation, own sign, moolatrikona, vargottama,
│                              digbala, combust, Pushkara, Neecha Bhanga, Parivartana,
│                              Mrityu Bhaga, Gandanta, Graha Yuddha
├── drishti.py                 Planetary aspects (Graha Drishti)
├── kalsarpa.py                Kalsarpa Yoga detection (variant + direction)
├── mangal.py                  Mangal Dosha analysis (PDF only)
├── sade_sati.py               120-year Saturn-from-Moon transit table (PDF only)
├── constants.py               magic numbers used by calculator
├── panchang_constants.py      magic numbers used by the panchang modules
├── pdf/                       PDF report (see below)
├── ephe/                      Swiss Ephemeris data files (REQUIRED; do not delete)
└── tests/                     pytest suites - see tests/README.md
```

All sidereal swisseph math goes through `ayanamsa.sidereal_context()`. The
sidereal mode is process-global and endpoints run in a thread pool, so the
wrapper locks and pins it for the block. Never call `swe.set_sid_mode`
directly.

### `pdf/` sub-package

Multi-page A4 PDF report built with [`fpdf2`](https://py-pdf.github.io/fpdf2/).

```
pdf/
├── __init__.py                exports render_pdf
├── report.py                  orchestrator: page 1 (Traditional summary), then each
│                              detail page through _track() so the Index knows start
│                              pages. _ReportPDF overrides fpdf2's footer() so every
│                              page gets "vedicpanchanga.com" + "Page N".
├── core/                      rendering primitives, re-exported via core/__init__.py
│   ├── text.py                font registration (8 Noto faces: Latin/Cyrillic,
│   │                          Devanagari, Tamil, Bengali, Arabic, Hebrew, SC, JP)
│   │                          + script-aware draw_text
│   ├── layout.py              page header, footer, section title bar, palette
│   ├── formatters.py          dms / lat / lon / date / time formatters
│   ├── i18n/                  15 per-locale label dictionaries (en, hi, ta, bn, ne, zh,
│   │                          ja, es, de, pt, fr, ru, ar, fa, he). Numerals stay
│   │                          Latin 0-9 in every locale.
│   ├── chart.py               North-Indian square chart drawer
│   ├── dasha.py               dasha block helpers
│   └── sections.py            page-1 components (basic details, dasha block,
│                              planets table, ashtakavarga grid)
├── pages/                     one file per detail page
│   ├── detail_pages.py        planet long table, mahadasha table, planet x varga matrix
│   ├── dasha_detail_pages.py  Antardasha grid + paginated Pratyantar catalogue
│   ├── varga_pages.py         all 16 divisional charts, 3 per page
│   ├── jaimini_page.py        Karakamsa / Swamsa charts + Chara Karakas table
│   ├── relations_page.py      friendship matrices + Kalsarpa Yoga
│   ├── sade_sati_page.py      Sade Sati transits + Mangal Dosha
│   └── toc_page.py            Index of Sections (drawn last)
└── fonts/                     bundled Noto Sans faces
```

## Conventions

* All astronomical math goes through `swisseph` (PySwissEph). Never
  hardcode planetary positions.
* The `compute_*` functions are pure and stateless, so unit tests call them
  directly without FastAPI.
* When a panchang value (tithi / nakshatra / yoga / karana) changes during
  the day, the response includes a `*_sequence` array of every value with
  its `ends_at`. The top-level field reflects sunrise; consumers needing
  birth-moment values walk the sequence (see `pdf/report.py`).
