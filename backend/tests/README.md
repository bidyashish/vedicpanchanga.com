# Backend tests

Two flavours, both in this directory:

| Kind | When it runs | Marker |
|------|--------------|--------|
| **Unit** — direct in-process calls | Always, no setup | (no marker) |
| **HTTP integration** — hits FastAPI | Auto-skips if no server is reachable | `@pytest.mark.http` |

## Running

```bash
# everything (HTTP tests skip if no server is up)
cd backend && source venv/bin/activate
pytest tests/ -v

# only the fast unit tests
pytest tests/ -v -m "not http"

# only HTTP tests (start the server first)
uvicorn server:app --host 127.0.0.1 --port 8001 &
pytest tests/ -v -m http

# point at a remote backend
BACKEND_URL=https://staging.example.com pytest tests/ -v -m http
```

The `api` fixture (in `conftest.py`) probes the server once per session
and calls `pytest.skip()` if it can't reach it — so collection no longer
crashes when nothing is listening.

## What's covered

| File | What it tests |
|------|---------------|
| `test_dasha_extras.py` | Vimshottari Antardaśā / Pratyantar — durations sum to mahadasha, first-MD straddles birth, Knk reference values |
| `test_jaimini.py` | Chara karakas (descending degree-in-sign), AK in Karakamsa house 1, Knk reference (AK=Moon, Karakamsa=Aquarius) |
| `test_relationships.py` | Friendship matrices: diagonal blank, natural table matches Parashara, F+F=GF and E+E=GE composite rules |
| `test_kalsarpa.py` | Detection: planets straddling axis → no yoga; planets confined → yoga with type by Rāhu's house; reverse direction |
| `test_panchang_extras.py` | Ganda Mūla detection per nakshatra, Ravi Yoga at each qualifying offset (4/6/9/10/13/20), wrap-around at nak 27 |
| `test_pdf_render.py` | `render_pdf` smoke: PDF magic, ≥18 pages, every section title present, page-N footer on every page, Index lists every section, Hindi pass renders |
| `test_muhurta.py` | Direct unit tests for `muhurta.find_muhurtas` (no HTTP) |
| `test_iteration3.py` | HTTP: 7 ayanamsa options, calculate per ayanamsa, advanced panchang yogas (Amrit/Varjyam/Siddhi) |
| `test_iteration4_vargas.py` | HTTP: shape of all 16 divisional charts, D9/D2 sign formulas vs API output, D30 Trimshāṁśa unit tests |
| `test_panchang_detailed.py` | HTTP: Kelowna BC 2026-04-20 regression baseline (drikpanchang values) |
| `test_vedic_api.py` | HTTP: `/api/calculate` contract + accuracy + Vimshottari + Aṣṭakavarga; `/api/get-panchang` shape |
| `test_muhurta_api.py` | HTTP: muhurta-purposes list, find-muhurta happy paths, error handling, regression on `dasha_antar`/`karakas`/`kalsarpa`/`yogas_extra` |

## Reference birth payloads

Defined once in `conftest.py`, exposed as fixtures:

| Fixture | Birth | Notes |
|---------|-------|-------|
| `delhi_birth` | 1990-01-01 12:00 IST · New Delhi | Default sample. JD ≈ 2447892.77, classical BAV totals (Su=48, Mo=49, …, SAV=337). |
| `knk_birth`   | 2026-04-25 11:36 IST · Ranchi    | Matches the AstroSage sample PDF. AK=Moon, Karakamsa lagna=Aquarius (11), Karkotak Kalsarpa Yoga. |
| `kelowna_birth` | 2026-04-20 06:00 PDT · Kelowna BC | Drikpanchang regression anchor used by `test_panchang_detailed`. |

`delhi_chart` and `knk_chart` are session-scoped fixtures that pre-build
the full `chart_data` once for unit tests — `compute_chart` is the slow
call in the suite, so reusing the result keeps `pytest -m "not http"`
under 3s.
