# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary reference

`AGENTS.md` at the repo root is the canonical agent brief (project summary, coding standards, security rules, deployment, backlog). Read it first. The notes below focus on commands, current architecture reality, and gotchas - they do **not** repeat what's in `AGENTS.md`.

`CONTRIBUTING.md` (root) is the human-oriented onboarding doc - file-location conventions, where new code goes, hot-spot list. Cross-reference it when adding any non-trivial module so the layout stays consistent.

## Tooling (use this, not the individual commands below)

A root `Makefile` bundles every workflow. Prefer these targets over remembering tool flags - they mirror CI exactly:

```bash
make help          # list every target
make install       # first-time: venv + npm ci + pre-commit install
make dev           # backend (:8001) + frontend (:3121) together
make check         # ruff + ruff format --check + tsc + oxlint + oxfmt --check (CI mirror)
make format        # ruff format + oxfmt (auto-fix)
make pre-commit    # format then check - run before every commit
make test          # pytest (CI doesn't run tests, but the suite is fast)
make ci            # check + test
make clean         # caches and dist/
```

`make pre-commit` is the safe path. CI runs only the `--check` modes; if format-check fails on CI it means you skipped `make format` (or `make pre-commit`) locally. Pre-commit hooks (see `.pre-commit-config.yaml`) catch the same thing on `git commit` once `make install-hooks` has been run.

**Note**: The backend has no database - all calculations are stateless. The frontend is **Vite + React 19 + TypeScript** (not CRA, not Next.js). Backend entry is `server:app` (`backend/server.py`).

## Commands

### Backend (FastAPI, Python 3, port 8001)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001   # dev run
ruff check .                                      # lint
ruff check . --fix                                # lint + auto-fix
ruff format .                                     # format - write
ruff format --check .                             # format check (CI)
```
- Reads `CORS_ORIGINS` from `backend/.env` (optional, defaults to `*`). No MongoDB required.
- Swiss Ephemeris data files live in `backend/ephe/` (`*.se1`). Calculations silently fail without them; never delete or move this directory.
- Must bind to `127.0.0.1` only in production. Never expose 8001 publicly (see `AGENTS.md` §8).
- The CPU-bound endpoints (`/calculate`, `/get-panchang`, `/find-muhurta`) are plain `def` handlers so FastAPI runs them in its threadpool - keeps the event loop responsive under concurrent load.

### Frontend (Vite + React 19 + TypeScript, port 3121)
```bash
cd frontend
npm install          # no --legacy-peer-deps needed any more
npm run dev          # Vite dev server, port 3121 (see vite.config.ts)
npm run build        # tsc --noEmit && vite build → dist/
npm run preview      # preview the built bundle
npm run lint         # oxlint (Rust-based linter from oxc-project)
npm run format       # oxfmt - write
npm run format:check # oxfmt --check (CI-friendly, exits non-zero on diff)
npx tsc --noEmit     # type-check only (was previously aliased as `npm run lint`)
```
- Backend URL comes from `VITE_BACKEND_URL` in `frontend/.env` (defaults empty → same-origin `/api` in prod). Vite requires the `VITE_` prefix - the old `REACT_APP_*` names are gone.
- AdSense uses **Auto Ads only** - the loader lives in `src/lib/adsense.ts` (lazy-injected post-mount on monetized routes, not `/privacy` or `/terms`). `index.html` only has the `<meta name="google-adsense-account">` tag. The old `<AdSlot>` component and `VITE_ADSENSE_*` env vars have been removed; do not reintroduce manual `<ins>` slots.
- Path alias `@/*` → `src/*` is set in both `vite.config.ts` and `tsconfig.json`. Keep them in sync.

### Tests
```bash
cd backend && source venv/bin/activate
pytest tests/ -v                                  # all backend tests
pytest tests/test_muhurta.py -v                   # single suite
pytest tests/test_iteration4_vargas.py::test_d30  # single test
```
- The pytest suites live in `backend/tests/`, not the top-level `tests/` directory.
- Kelowna panchang reference-data tests are regression anchors - do not change expected values without explicit approval.
- There is no frontend test runner configured right now (Jest was part of the removed CRA setup). Add Vitest when you need one.

## Architecture essentials

### Request flow
Browser → `http://localhost:3121` (Vite dev server / Nginx-served static build in prod) → `fetch` → `${VITE_BACKEND_URL}/api/*` (FastAPI). Routes are mounted under `/api` (not `/api/v1`). Endpoints: `POST /api/calculate`, `GET /api/get-panchang`, `GET /api/ayanamsa-options`, `GET /api/muhurta-purposes`, `POST /api/find-muhurta`. Source: `backend/server.py`. In production the nginx `location /api/ { proxy_pass http://127.0.0.1:8001/api/; }` block keeps everything same-origin.

### Backend module boundaries
- `server.py` - FastAPI app, request/response models, CORS. Thin layer that delegates math to the modules below.
- `calculator.py` - full kundali (`compute_chart`): planetary positions, houses, dashas, ashtakavarga, plus the new sub-period / Jaimini / friendship / Kalsarpa fields described below.
- `advanced_panchang.py` - detailed panchang (tithi, nakshatra, yoga, karana with full daily *_sequence lists, sunrise/sunset, samvats, ritu, ayana, muhūrta windows, udaya lagna, chandrabalam, tarabalam, calendars).
- `panchang_extras.py` - verified extra-yoga detectors layered on top of `advanced_panchang`: Ganda Mūla window + Ravi Yoga window. (Other classical sections like Mantri Mandala / Agnivāsa / Śivavāsa are intentionally omitted - see file docstring.)
- `gowri_panchang.py` - Tamil/Telugu Gowri Panchangam (Nalla Neram). Splits sunrise→sunset and sunset→next-sunrise into 8 segments each, labels them via the 8-name cycle (Soram, Uthi, Visham, Amridha, Rogam, Labam, Dhanam, Sugam) plus an auspicious tag. Per-weekday starting Gowri lives in `GOWRI_DAY_START` / `GOWRI_NIGHT_START` - change those tables if your regional source disagrees. Exposed via `panchang["gowri_panchang"] = {day, night}` and rendered behind the **Telugu** tab on `/panchang`.
- `hora.py` - Planetary Hora hours. 12 day-horas (sunrise→sunset / 12) + 12 night-horas (sunset→next-sunrise / 12). Cycles forward through `HORA_CYCLE = [Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars]` starting from the day-lord; the night seamlessly continues the same cycle (12 mod 7 = 5 positions later). Auspicious = {Jupiter, Venus, Mercury, Moon}. Exposed via `panchang["hora"] = {day, night}` and rendered on `/panchang` for **both** style tabs (Hora is universal across traditions).
- `tyajyam.py` - Tyajyam (inauspicious time periods). Four calculation types: Nakshatra Tyajyam (ratio-based offset within nakshatra span, 96 min fixed), Tithi Tyajyam (ratio-based offset within tithi span, 96 min fixed), Vara Tyajyam (nazhigai offset from sunrise, 90 min fixed), and Amritadi Yogam (weekday + nakshatra lookup yielding Siddha/Amrita/Marana/Prabalarishta). Exposed via `panchang["tyajyam"]`. Lagna Tyajyam is defined but not wired in yet (needs lagna start/end JDs from udaya_lagna).
- `vargas.py` - 16 divisional charts (D1–D60). D30 uses special uneven-segment rules; touch with care.
- `ayanamsa.py` - ayanamsa selection (`AYANAMSA_OPTIONS`, default `lahiri`) plus `sidereal_context()`, the required wrapper for ALL sidereal swisseph math: it locks swisseph (sid mode is process-global, endpoints run in a threadpool) and pins the mode for the block. Never call `swe.set_sid_mode` directly.
- `muhurta.py` - auspicious-window scanner with purpose-based scoring (0–100 with explainable reasons).
- `dasha_extras.py` - Vimshottari Antardaśā (level 2) and Pratyantar (level 3) sub-period computations. `chart_data["dasha_antar"]` is each Mahadasha with its 9 nested antardashas.
- `jaimini.py` - Chara karakas (Atma..Dara) and Karakamsa / Swamsa chart construction. Returns `chart_data["karakas"]`, `["karakamsa"]`, `["swamsa"]`.
- `relationships.py` - natural / temporal / 5-fold composite friendship matrices for the 7 visible planets. Returns `chart_data["friendships"]`.
- `placements.py` - special planetary placements (exaltation, debilitation, own sign, moolatrikona, vargottama, digbala, combust) plus Pushkara Bhaga/Navamsa, Neecha Bhanga, Parivartana Yoga, Mrityu Bhaga, Gandanta, and Graha Yuddha. `compute_special_placements()` annotates the planets list in-place; single-planet checks run per planet, cross-planet checks (neecha bhanga, parivartana, graha yuddha) run as separate passes over the full list.
- `kalsarpa.py` - Kalsarpa Yoga detection (verdict + variant + direction). Returns `chart_data["kalsarpa"]`.
- `mangal.py`, `sade_sati.py` - Mangal Dosha analysis and 120-year Saturn-from-Moon transit table; consumed by the PDF report only.
- `constants.py`, `panchang_constants.py` - all magic numbers live here.

All astronomical math must go through `swisseph` (PySwissEph bindings). Never hardcode planetary positions.

### PDF report module (`backend/pdf/`)
- `pdf/report.py` - orchestrator. Builds page 1 (Traditional summary), then dispatches each detail page through a `_track()` helper that records the section's start page; finally appends the Index of Sections page (page numbers known by then). `_ReportPDF` subclass overrides fpdf2's `footer()` hook so every page gets `vedicpanchanga.com` + `Page N` while its font subset is still mutable.
- `pdf/core/` - rendering primitives: `text.py` (font registration for 8 Noto faces - Latin+Cyrillic, Devanagari, Tamil, Bengali, Arabic, Hebrew, SC, JP - plus script-aware draw_text), `layout.py` (page header / footer / section title bar + palette), `formatters.py` (date/dms/lat/lon helpers), `i18n/` (15-locale label dictionaries: en, hi, ta, bn, ne, zh, ja, es, de, pt, fr, ru, ar, fa, he, plus per-locale native-digit tables), `chart.py` (North-Indian square chart), `sections.py` (page-1 components: basic-details box, dasha block, planets table, ashtakavarga). Re-exported from `pdf/core/__init__.py` so pages can use a single `from ..core import …` line.
- `pdf/pages/` - one module per detail page: `detail_pages.py` (planet long table, mahadasha long table, planet × varga matrix), `dasha_detail_pages.py` (Antardaśā grid + paginated Pratyantar), `varga_pages.py` (D1–D60 charts), `jaimini_page.py` (Karakamsa/Swamsa + Karakas table), `relations_page.py` (friendship matrices + Kalsarpa), `sade_sati_page.py` (Sade Sati transits + Mangal Dosha), `toc_page.py` (Index of Sections).
- `pdf/fonts/` - bundled Noto Sans + Noto Sans Devanagari TTFs.

### Frontend structure
- `src/main.tsx` - app bootstrap (Strict Mode + `I18nProvider`).
- `src/App.tsx` - shell: `TopBar`, **path-routed view switcher** (`/`, `/panchang`, `/muhurta`, `/transits`, `/frequency`, `/privacy`, `/terms`), shared location state, `Footer`. Old hash URLs (`/#panchang`) are migrated to clean paths on first load. Per-route SEO (title / description / canonical / og:tags) is applied by `lib/seo.applySeo` whenever the view changes. Three-column layout on `xl:` (sidebar / main / ad rail).
- `src/pages/` - `KundaliPage.tsx`, `PanchangPage.tsx`, `MuhurtaPage.tsx`, `TransitsPage.tsx`, `FrequencyPage.tsx`. Each page owns its own form state and API calls.
- `src/components/common/` - `CitySearch`, `LanguageSwitcher`, `MandalaLoader`, `MandalaMark`, `ShareLinkButton`, `ThemeToggle`.
- `src/components/shell/` - `TopBar`, `Footer`, `NotificationBanner`.
- `src/components/kundali/` - `BirthForm`, `BirthHeader`, `ChartTabs`, `VedicChart` (North Indian), `SouthIndianChart`, `WesternChart`, `PlanetsTable` (columns: Body, Sign, Degree, Sign Lord, Nakshatra, Nak Lord, Pada, House, Dignity, Aspects, Status), `PlanetDetailModal` (tappable planet detail with placement badges), `DashaTable`, `AshtakavargaTable`, `DrishtiPanel`, `JaiminiSection`, `OmGlyph`.
- `src/components/panchang/` - `Section`, `TimeBand`, `GowriPanchangam`, `HoraPanchangam`, `NallaNeram`, `SegmentTable`.
- `src/lib/api.ts` - typed `fetch` wrapper for every backend endpoint plus Nominatim geocode/reverse-geocode.
- `src/lib/format.ts`, `src/lib/planets.ts` - date/time formatters and planet→colour/long-name tables.
- `src/types/api.ts` - TypeScript shapes mirroring the backend response bodies.
- `src/i18n/` - `index.tsx` (LANGUAGES list, `I18nProvider`, `useI18n`, RTL `dir` dispatch for ar/fa/he), `astro.ts` (planet/sign/nakshatra dictionaries + native-digit tables), `locales/{en,hi,ta,bn,ne,zh,ja,es,de,pt,fr,ru,ar,fa,he}.ts`. Sets `document.documentElement.lang` and `dir` so script-aware CSS (Devanagari for hi/ne, see `index.css`) and RTL flow kick in automatically.

### Production topology
Cloudflare → Nginx (TLS, CSP, returns 444 for direct-IP) → static Vite build at `/apps/panchanga/frontend/dist/` (served by Nginx) + FastAPI on `127.0.0.1:8001`. Systemd unit `panchanga-backend` runs `uvicorn server:app` (see `infra/setup-vps.sh:72`). No `panchanga-frontend` service - Nginx serves the static build directly, with `/assets/` long-cached (`immutable`, 1y).

## Style rules

- **No em dashes (`—`)** anywhere in the codebase - not in UI text, i18n strings, SEO titles, meta descriptions, or new code. Use a plain hyphen (`-`) instead. Existing code comments are exempt but new ones should also use hyphens.
- **Hindi text must use native Devanagari script** in the `hi` i18n dictionary. No transliteration.
- **Tamil text must use native Tamil script** in the `ta` i18n dictionary. No transliteration.
- **All non-English locales use their native script.** Bengali → Bangla, Nepali → Devanagari, Arabic → Arabic, Persian (`fa`) → Perso-Arabic, Hebrew → Hebrew, Russian → Cyrillic, etc. No transliteration in any locale dictionary.

## Gotchas specific to this repo

- **Env var prefix is `VITE_`**, not `REACT_APP_`. Still baked in at build time - changing `VITE_BACKEND_URL` requires a rebuild, not just a restart.
- **Port 8000 is firewalled** (`infra/setup-vps.sh:157`) as a legacy block. If something tries to use it, switch to 8001.
- **Clean path routing** (no `#`). Routes: `/`, `/panchang`, `/muhurta`, `/transits`, `/frequency`, `/privacy`, `/terms`. SPA fallback is in nginx (`try_files $uri $uri/ /index.html;`) and Vite dev server does it by default. SSR is not implemented - initial HTML is the same for every URL until React hydrates and `applySeo()` rewrites `<title>` / `<meta>` / canonical link. Sitemap at `/sitemap.xml` lists all five clean URLs.
- **Panchang Lagna chart anchors to "now"**, not sunrise. Anchoring to sunrise made the chart appear stuck on the sun's sign (lagna co-rises with the sun); the page calls `nowTimeInTz(data.location.timezone)` and re-fetches `calculateChart` for that wall-clock minute.
- **Vite build output is `dist/`**, not `build/`. The Nginx root was updated; if you see stale content after `npm run build`, confirm Nginx is pointing at `frontend/dist` and not the old `frontend/build`.
