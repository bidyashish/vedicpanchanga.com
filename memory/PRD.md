# Jyotiṣa Kuṇḍalī — Vedic Astrology & Drik Panchang

## Original Problem Statement
Build a Vedic astrology web app with Swiss Ephemeris. Compute D1..D60 divisional charts, comprehensive Drik Panchang with all classical elements, multi-ayanamsa support, North/South chart styles, bilingual UI (English/Hindi), and chart export (PNG/PDF/Share).

## Implemented Features
- **Charts**: 16 divisional charts — D1 Rāśi, D2 Horā, D3 Drekkāṇa, D4 Chaturthāṁśa, D7 Saptāṁśa, D9 Navāṁśa, D10 Daśāṁśa, D12 Dvādaśāṁśa, D16 Ṣoḍaśāṁśa, D20 Viṁśāṁśa, D24 Chaturviṁśāṁśa, D27 Bhāṁśa, D30 Triṁśāṁśa (special uneven segments), D40 Khavedāṁśa, D45 Akṣavedāṁśa, D60 Ṣaṣṭyāṁśa.
- **Chart Styles**: North Indian diamond (rashi numbers prominent) + South Indian 4×4 grid (fixed rashis, ascendant marker).
- **Ayanamsa options**: NC Lahiri (default), KP New, KP Old, BV Raman, KP Khullar, Sāyana Tropical, Manoj.
- **Planet details**: positions, nakshatra + pada, retrograde, sign lord, house.
- **Vimshottari Dasha** (9 mahadashas, 120y), **Ashtakavarga** (BAV per planet + SAV=337 canonical).
- **Drik Panchang** (15+ sections): 5 limbs with intra-day transitions; Samvatsara (Vikram + Shaka); Chandramasa (Amanta/Purnimanta); Pravishte; Ritu (Drik+Vedic); Ayana; Dinamana/Ratrimana/Madhyahna; 7 auspicious muhurtas (Brahma, Pratah Sandhya, Abhijit, Vijay, Godhuli, Sayahna Sandhya, Nishita); Inauspicious (Rahu Kalam, Yamaganda, Gulika, Dur Muhurtam, Bhadra, Varjyam); Amrit Kalam; Sarvartha & Amrita Siddhi Yogas; Udaya Lagna transits (12–13 rashi transits); Chandrabalam + Tarabalam lists; Disha Shool, Rahu Vasa, Chandra Vasa; Calendars (Kaliyuga year, Kali Ahargana, Julian Day, MJD, Rata Die, Lahiri Ayanamsha, National Civil & Nirayana dates).
- **Muhūrta Finder (P1 — 2026-Feb)**: scan up to 120 days for auspicious windows by purpose (Marriage, Griha Pravesh, Business, Travel, Education, Vehicle, Namakarana, Medical). Each day scored 0-100 with explainable reasons & cautions from Tithi / Nakshatra / Weekday / Chandrabalam / Tārabalam. Optional native filter by birth Rāśi + Nakṣatra. Returns Abhijit, Rāhu Kāla, Sunrise–Sunset + Paksha + Moon rashi. Endpoints `GET /api/muhurta-purposes`, `POST /api/find-muhurta`.
- **Export**: Download chart as PNG · Generate multi-page PDF of all 16 vargas · Share via Web Share API with PNG download fallback.
- **i18n**: English / Hindi toggle (EN / हिं, no flags) with localStorage persistence.
- **City search**: Nominatim autocomplete, "Use My Location" button with reverse-geocoding.

## Architecture
- Backend (FastAPI + pyswisseph): `calculator.py`, `vargas.py`, `ayanamsa.py`, `panchang.py`, `advanced_panchang.py`, `constants.py`, `panchang_constants.py`, `muhurta.py`, `server.py`.
- Frontend (React + TailwindCSS): `App.js`, `components/VedicChart.jsx`, `components/SouthIndianChart.jsx`, `components/PanchangView.jsx`, `components/MuhurtaFinder.jsx`, `i18n.js`.
- Backend endpoints: `POST /api/calculate`, `GET /api/get-panchang`, `GET /api/ayanamsa-options`, `GET /api/muhurta-purposes`, `POST /api/find-muhurta`.
- Swiss Ephemeris files in `backend/ephe/` (sepl_18, semo_18, seas_18).

## Test Status (Iteration 5 · 2026-Feb)
- Backend: **87/87 pytest passing** (6 new muhurta unit + 9 new muhurta HTTP API + 72 pre-existing regression: vargas structure, D30 special rules, D9 navamsa, backward-compat, panchang Drik reference for Kelowna, ayanamsa variants, varjyam/amrit/siddhi yogas)
- Frontend: **100%** — 3 top tabs (Kundali · Panchang · Muhurta) all functional; all 16 chart tabs, both chart styles, export buttons, i18n EN/हिं toggle across Muhurta labels, Nominatim city search, Chandrabalam/Tarabalam filters.

## Test Files
- `tests/test_vedic_api.py`
- `tests/test_panchang_detailed.py`
- `tests/test_iteration3.py`
- `tests/test_iteration4_vargas.py`
- `tests/test_muhurta.py` (6 new — unit)
- `tests/test_muhurta_api.py` (9 new — HTTP)

## Future Backlog
- P1: Antardasha sub-periods inside current Mahadasha
- P1: Day Festivals & Events feed (Ekadashi/Purnima/Amavasya + regional)
- P2: Saved charts / profile feature (MongoDB)
- P2: Progress indicator for PDF export (~11s for all 16 vargas)
- P2: Export Muhurta results as PDF / shareable link
