# Backend tests

Two flavours, both in this directory:

| Kind | How it runs | Marker |
|------|-------------|--------|
| **Unit** - imports the calculation modules directly | Always, no setup | (no marker) |
| **API** - drives the FastAPI app over HTTP | In-process `TestClient` by default; a live server when `BACKEND_URL` is set | `@pytest.mark.http` |

The whole suite (unit + API) runs in about 5 seconds and needs nothing but
the venv and the Swiss Ephemeris files in `backend/ephe/`.

## Running

```bash
make test                          # from the repo root

# or, from backend/ with the venv active:
pytest tests/ -v                   # everything
pytest tests/ -v -m "not http"     # unit tests only
pytest tests/ -v -m http           # API tests only
pytest tests/test_vargas.py -v     # one suite

# same API tests against a running deployment
BACKEND_URL=http://127.0.0.1:8001 pytest tests/ -v -m http
```

The `api` fixture in `conftest.py` yields a `fastapi.testclient.TestClient`
(no server needed) or, when `BACKEND_URL` is set, a `requests.Session`
pointed at that origin. Tests build URLs as `f"{base_url}/api/..."` so they
do not care which one they got. If `BACKEND_URL` is set but unreachable the
API tests skip with a clear message instead of erroring.

## What's covered

| File | What it tests |
|------|---------------|
| `test_api_auth.py` | Optional API-key layer (`auth.py`): open by default, Bearer / `X-API-Key`, exempt origins, Referer fallback, CORS preflight contract |
| `test_balam.py` | Chandrabalam / Tarabalam: tara and house arithmetic, per-segment lists pinned to DrikPanchang New Delhi 17-19 Sep 2026, muhurta scoring tiers and window Moon sign |
| `test_ayanamsa.py` | API: the 7 ayanamsa options and their effect on the Delhi ascendant (Lahiri / Raman / Manoj / Sayana / KP variants) |
| `test_dasha_extras.py` | Vimshottari Antardasha / Pratyantar: durations sum to the mahadasha, first period straddles birth, Ranchi reference values |
| `test_dur_muhurtam.py` | Dur Muhurtam slots per weekday and the Wednesday Abhijit suppression |
| `test_festivals.py` | Festival calendar: every DrikPanchang New Delhi 2026-2027 calendar entry and Shraddha tithi (`fixtures/drikpanchang_festivals_delhi.json`) matches our computed date; marquee festivals, timing fields, periods, Ekadashi parana and a Southern-hemisphere / Toronto smoke |
| `test_gowri_panchang.py` | Gowri Panchangam segments, day/night split, weekday cycle |
| `test_hora.py` | Planetary Hora hours, day-lord cycle, auspicious tagging |
| `test_jaimini.py` | Chara karakas (descending degree order), AK in Karakamsa house 1, Ranchi reference (AK=Moon, Karakamsa=Aquarius) |
| `test_kalsarpa.py` | Kalsarpa detection: straddling axis = no yoga, confined = yoga typed by Rahu's house, reverse direction |
| `test_muhurta.py` | `muhurta.find_muhurtas` directly: purposes, scoring, native filters |
| `test_muhurta_api.py` | API: `/api/muhurta-purposes` (13 ids), `/api/find-muhurta` happy paths and 400s |
| `test_muhurta_vetoes.py` | Veto blackouts (Guru/Shukra asta, Chaturmas, Kharmas, Adhika masa) against 2026 DrikPanchang dates |
| `test_panchang_detailed.py` | API: Kelowna BC 2026-04-20 regression baseline captured from drikpanchang.com. Do not change expected values without approval |
| `test_panchang_extras.py` | Ganda Mula per nakshatra, Ravi Yoga at each qualifying offset, wrap-around at nakshatra 27 |
| `test_pdf_render.py` | `render_pdf` smoke: PDF magic, page count, every section title present, footer page numbers, index, Hindi / Tamil passes keep digits Latin |
| `test_relationships.py` | Friendship matrices: blank diagonal, natural table matches Parashara, composite codes |
| `test_tamil_calendar.py` | Tamil year / month / weekday conversion |
| `test_transits.py` | Transit timeline: sign ingresses, nakshatra changes, retrograde stations |
| `test_tyajyam.py` | Nakshatra / Tithi / Vara Tyajyam, Amritadi Yogam table pinned cell by cell |
| `test_vargas.py` | API: shape of all 16 divisional charts, legacy `d1/d2/d9_chart` parity, D9 formula. Unit: D30 Trimshamsha, D11 Rudramsha, `varga_degree_in_sign` |
| `test_vedic_api.py` | API: `/api/calculate` contract, accuracy, Vimshottari, Ashtakavarga, validation 400s; `/api/get-panchang` shape, Abhijit, Rahu kalam, extra yogas |

## Reference births

Defined once in `conftest.py` and exposed as fixtures:

| Fixture | Birth | Notes |
|---------|-------|-------|
| `delhi_birth` | 1990-01-01 12:00 IST, New Delhi | Default sample. JD ~ 2447892.77, classical BAV totals (Su=48, Mo=49, ..., SAV=337), Lahiri ascendant Pisces |
| `knk_birth` | 2026-04-25 11:36 IST, Ranchi | Matches the AstroSage sample PDF. AK=Moon, Karakamsa lagna Aquarius, Karkotak Kalsarpa Yoga |

`delhi_chart` and `knk_chart` are session-scoped fixtures that build the
full `chart_data` once for the unit suites, since `compute_chart` is the
slowest call in the suite.
