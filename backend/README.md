# backend/

FastAPI service that wraps the [Swiss Ephemeris](https://www.astro.com/swisseph/)
to compute Vedic charts, Drik Pañcāṅga, Muhūrta windows and a
multi-page PDF report. Stateless - there is no database.

* **Runtime**: Python 3.10+
* **Entry point**: `server.py` (`uvicorn server:app`)
* **Bind address (prod)**: `127.0.0.1:8001` only (Nginx proxies `/api/`)
* **Ephemeris data**: `backend/ephe/*.se1` - required, never delete

## Run locally

```bash
python3 -m venv venv
source venv/bin/activate         # bash/zsh
# source venv/bin/activate.fish  # fish
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001 --reload
```

Interactive Swagger UI: <http://localhost:8001/docs>.

`backend/.env` (optional in dev) sets `CORS_ORIGINS=…`. Default is `*`.
Production override is written by `infra/setup-vps.sh` to lock CORS to the
public domains only.

## Tests

```bash
pytest tests/ -v               # full suite (HTTP tests skip if no server)
pytest tests/ -v -m "not http" # fast unit tests only (~2.5s, 55 tests)
pytest tests/ -v -m http       # HTTP integration tests only
BACKEND_URL=https://staging.example.com pytest tests/ -v -m http
```

See [`tests/README.md`](tests/README.md) for the canonical birth payloads
and what each suite covers.

## Lint & format

Backend Python is linted and formatted by [ruff](https://docs.astral.sh/ruff/)
(installed from `requirements.txt`):

```bash
source venv/bin/activate
ruff check .          # lint
ruff check . --fix    # lint and auto-fix what's safe
ruff format .         # format - write
ruff format --check . # format check (used by CI)
```

`ruff check` and `ruff format --check` run in `.github/workflows/ci.yml`
on every push to `main` and every PR. To enforce them locally before each
commit, install [pre-commit](https://pre-commit.com) at the repo root and
run `pre-commit install` once - the `.pre-commit-config.yaml` ships with
ruff hooks already wired up.

## API

All endpoints are under `/api`. Field shapes live in
`frontend/src/types/api.ts` (TypeScript mirror of the responses).

| Method | Path                    | What                                                                  |
|--------|-------------------------|-----------------------------------------------------------------------|
| POST   | `/api/calculate`        | Full chart: planets, 16 vargas (D1–D60), Vimshottari (with Antardaśā nested), Aṣṭakavarga, Karakas, Karakamsa/Swamsa, Friendships, Kalsarpa |
| GET    | `/api/get-panchang`     | Detailed Drik Pañcāṅga (sun/moon timings, all 5 limbs with `_sequence`, samvats, ritu/ayana, all muhūrta windows, udaya lagna, chandrabalam, tarabalam, calendars, Ganda Mūla + Ravi Yoga) |
| GET    | `/api/ayanamsa-options` | List the 7 supported ayanāṁśa systems                                 |
| GET    | `/api/muhurta-purposes` | 14 purpose categories (marriage, engagement, griha-pravesh, property purchase, business, ...) |
| POST   | `/api/find-muhurta`     | Scan a date range, score 0–100 with explainable reasons               |
| POST   | `/api/print-pdf`        | Render the full multi-page PDF report (en/hi)                         |

CPU-bound endpoints (`/calculate`, `/get-panchang`, `/find-muhurta`,
`/print-pdf`) are plain `def` handlers so FastAPI runs them in its
thread-pool - keeps the event loop responsive under concurrent load.

## Module layout

```
backend/
├── server.py                  FastAPI app + request/response models + CORS
├── calculator.py              compute_chart - planets, houses, dasha, ashtakavarga,
│                              dasha_antar, karakas, karakamsa, friendships, kalsarpa,
│                              placements, drishti
├── advanced_panchang.py       compute_detailed_panchang - full Drik panchang
├── panchang_extras.py         Ganda Mula + Ravi Yoga detectors (verified vs drikpanchang)
├── gowri_panchang.py          Gowri Panchangam / Nalla Neram (Tamil/Telugu tradition)
├── hora.py                    Planetary Hora hours (12 day + 12 night)
├── tyajyam.py                 Tyajyam inauspicious periods (nakshatra/tithi/vara + Amritadi)
├── tamil_calendar.py          Tamil calendar date conversion
├── nalla_neram.py             Nalla Neram (auspicious time) calculation
├── vargas.py                  16 divisional charts (D1-D60). D30 has special uneven rules
├── ayanamsa.py                AYANAMSA_OPTIONS lookup; default = lahiri
├── muhurta.py                 Muhurta scanner with purpose-based scoring
├── dasha_extras.py            Vimshottari Antardasha + Pratyantar (level 2 & 3)
├── jaimini.py                 Chara karakas + Karakamsa/Swamsa charts
├── relationships.py           Natural / temporal / panchadha friendship matrices
├── placements.py              Special placements: exaltation, debilitation, own sign,
│                              moolatrikona, vargottama, digbala, combust, Pushkara,
│                              Neecha Bhanga, Parivartana, Mrityu Bhaga, Gandanta,
│                              Graha Yuddha
├── drishti.py                 Planetary aspects (Graha Drishti)
├── kalsarpa.py                Kalsarpa Yoga detection (12 named variants + direction)
├── transits.py                Planetary transit timeline (sign ingresses, retrogrades)
├── mangal.py                  Mangal Dosha analysis (PDF only)
├── sade_sati.py               120-year Saturn-from-Moon transit table (PDF only)
├── constants.py               magic numbers used by calculator
├── panchang_constants.py      magic numbers used by panchang
├── pdf/                       PDF report (see below)
├── ephe/                      Swiss Ephemeris data files (REQUIRED; do not delete)
└── tests/                     pytest suites (315 tests) - see tests/README.md
```

### `pdf/` sub-package

Multi-page A4 PDF report (~19 pages). Built with [`fpdf2`](https://py-pdf.github.io/fpdf2/).

```
pdf/
├── __init__.py                exports render_pdf
├── report.py                  orchestrator - composes page 1 (Traditional summary)
│                              and dispatches detail pages, tracking each section's
│                              start page for the Index. _ReportPDF subclass overrides
│                              fpdf2's footer() hook so every page gets stamped with
│                              "vedicpanchanga.com" + "Page N" while its font subset
│                              is still mutable.
├── core/                      rendering primitives, re-exported via core/__init__.py
│   ├── text.py                font registration (8 Noto faces: Latin/Cyrillic,
│   │                          Devanagari, Tamil, Bengali, Arabic, Hebrew, SC, JP)
│   │                          + per-glyph script-aware draw_text helper
│   ├── layout.py              page header strip, footer, saffron section title bar,
│   │                          shared MARGIN / palette constants
│   ├── formatters.py          dms/lat/lon/date/time formatters
│   ├── i18n/                  __init__.py glues 15 per-locale label dictionaries
│   │                          (en, hi, ta, bn, ne, zh, ja, es, de, pt, fr, ru,
│   │                          ar, fa, he) + native-digit substitution per locale
│   ├── chart.py               North-Indian square chart drawer
│   └── sections.py            page-1 components (basic details, dasha block,
│                              planets table, ashtakavarga grid)
├── pages/                     one file per detail page
│   ├── detail_pages.py        planet long table, Vimshottari mahadasha table,
│   │                          planet × varga matrix
│   ├── dasha_detail_pages.py  Antardaśā grid + paginated Pratyantar catalogue
│   ├── varga_pages.py         All 16 divisional charts (D1–D60), 3 charts/page
│   ├── jaimini_page.py        Karakamsa & Swamsa charts + Chara Karakas table
│   ├── relations_page.py      Friendship matrices (3) + Kalsarpa Yoga page
│   ├── sade_sati_page.py      Sade Sati transit listing + Mangal Dosha analysis
│   └── toc_page.py            Index of Sections (drawn last so page numbers are known)
└── fonts/                     bundled Noto Sans (Latin + Cyrillic), Devanagari,
                               Tamil, Bengali, Arabic, Hebrew, SC, JP TTF/OTF files
```

## Conventions

* All astronomical math goes through `swisseph` (PySwissEph). Never
  hardcode planetary positions.
* The `compute_*` functions are pure and stateless - easy to unit-test
  without spinning up FastAPI.
* When a panchang value (Tithi / Nakṣatra / Yoga / Karaṇa) changes during
  the day, the response includes a `*_sequence` array of every value with
  its `ends_at`. The top-level field reflects sunrise; consumers needing
  birth-moment values should walk the sequence (see `pdf/report.py`).
