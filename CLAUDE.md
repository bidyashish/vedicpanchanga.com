# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary reference

`AGENTS.md` at the repo root is the canonical agent brief (project summary, coding standards, security rules, deployment, backlog). Read it first. The notes below focus on commands, current architecture reality, and gotchas — they do **not** repeat what's in `AGENTS.md`.

**Known drift from `AGENTS.md`**: `AGENTS.md` still describes the frontend as "Next.js 15 with App Router" and the backend using MongoDB. Neither is current. The frontend is **Vite + React 19 + TypeScript** (not CRA, not Next.js, not craco — all removed). The backend no longer uses MongoDB at all (removed April 2026 — the MongoDB server-selection timeout was the source of a 30 s request-latency bug). Backend entry is `server:app` (`backend/server.py`). Trust the code, not `AGENTS.md`, on these points.

## Commands

### Backend (FastAPI, Python 3, port 8001)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001   # dev run
```
- Reads `CORS_ORIGINS` from `backend/.env` (optional, defaults to `*`). No MongoDB required.
- Swiss Ephemeris data files live in `backend/ephe/` (`*.se1`). Calculations silently fail without them; never delete or move this directory.
- Must bind to `127.0.0.1` only in production. Never expose 8001 publicly (see `AGENTS.md` §8).
- The CPU-bound endpoints (`/calculate`, `/get-panchang`, `/find-muhurta`) are plain `def` handlers so FastAPI runs them in its threadpool — keeps the event loop responsive under concurrent load.

### Frontend (Vite + React 19 + TypeScript, port 3121)
```bash
cd frontend
npm install          # no --legacy-peer-deps needed any more
npm run dev          # Vite dev server, port 3121 (see vite.config.ts)
npm run build        # tsc --noEmit && vite build → dist/
npm run preview      # preview the built bundle
npm run lint         # tsc --noEmit (type-check only)
```
- Backend URL comes from `VITE_BACKEND_URL` in `frontend/.env` (defaults empty → same-origin `/api` in prod). Vite requires the `VITE_` prefix — the old `REACT_APP_*` names are gone.
- AdSense is wired through `<AdSlot slot="header|sidebar|inline|footer" />`. Set `VITE_ADSENSE_CLIENT` + `VITE_ADSENSE_SLOT_*` to activate; otherwise dashed placeholders render in their slots (good for layout work without ads).
- Path alias `@/*` → `src/*` is set in both `vite.config.ts` and `tsconfig.json`. Keep them in sync.

### Tests
```bash
cd backend && source venv/bin/activate
pytest tests/ -v                                  # all backend tests
pytest tests/test_muhurta.py -v                   # single suite
pytest tests/test_iteration4_vargas.py::test_d30  # single test
```
- The pytest suites live in `backend/tests/`, not the top-level `tests/` directory.
- Kelowna panchang reference-data tests are regression anchors — do not change expected values without explicit approval.
- There is no frontend test runner configured right now (Jest was part of the removed CRA setup). Add Vitest when you need one.

## Architecture essentials

### Request flow
Browser → `http://localhost:3121` (Vite dev server / Nginx-served static build in prod) → `fetch` → `${VITE_BACKEND_URL}/api/*` (FastAPI). Routes are mounted under `/api` (not `/api/v1`). Endpoints: `POST /api/calculate`, `GET /api/get-panchang`, `GET /api/ayanamsa-options`, `GET /api/muhurta-purposes`, `POST /api/find-muhurta`. Source: `backend/server.py`. In production the nginx `location /api/ { proxy_pass http://127.0.0.1:8001/api/; }` block keeps everything same-origin.

### Backend module boundaries
- `server.py` — FastAPI app, request/response models, CORS. Thin layer that delegates math to the modules below.
- `calculator.py` — full kundali (`compute_chart`): planetary positions, houses, dashas, ashtakavarga.
- `panchang.py` / `advanced_panchang.py` — basic and detailed panchang (tithi, nakshatra, yoga, karana, muhūrta timings, rahu kala, etc.).
- `vargas.py` — 16 divisional charts (D1–D60). D30 uses special uneven-segment rules; touch with care.
- `ayanamsa.py` — ayanamsa selection (`AYANAMSA_OPTIONS`). Default `lahiri`.
- `muhurta.py` — auspicious-window scanner with purpose-based scoring (0–100 with explainable reasons).
- `constants.py`, `panchang_constants.py` — all magic numbers live here.

All astronomical math must go through `swisseph` (PySwissEph bindings). Never hardcode planetary positions.

### Frontend structure
- `src/main.tsx` — app bootstrap (Strict Mode + `I18nProvider`).
- `src/App.tsx` — shell: `TopBar`, view switcher (hash-routed: `#kundali` | `#panchang` | `#muhurta`), shared location state, `Footer`. Three-column layout on `xl:` (sidebar · main · ad rail).
- `src/pages/` — `KundaliPage.tsx`, `PanchangPage.tsx`, `MuhurtaPage.tsx`. Each page owns its own form state and API calls.
- `src/components/common/` — `CitySearch`, `LanguageSwitcher`, `MandalaLoader`, `MandalaMark`.
- `src/components/shell/` — `TopBar`, `Footer`, `AdSlot` (Google AdSense placeholder + loader).
- `src/components/kundali/` — `BirthForm`, `BirthHeader`, `ChartTabs`, `VedicChart` (North Indian), `SouthIndianChart`, `PlanetsTable`, `DashaTable`, `AshtakavargaTable`.
- `src/components/panchang/` — `Section`, `TimeBand` (reused by the Panchang page).
- `src/lib/api.ts` — typed `fetch` wrapper for every backend endpoint plus Nominatim geocode/reverse-geocode.
- `src/lib/format.ts`, `src/lib/planets.ts` — date/time formatters and planet→colour/long-name tables.
- `src/types/api.ts` — TypeScript shapes mirroring the backend response bodies.
- `src/i18n.tsx` — English + Hindi dictionaries, `useI18n`, `I18nProvider`. Sets `document.documentElement.lang` so Devanagari-language CSS (see `index.css`) kicks in automatically.

### Production topology
Cloudflare → Nginx (TLS, CSP, returns 444 for direct-IP) → static Vite build at `/apps/panchanga/frontend/dist/` (served by Nginx) + FastAPI on `127.0.0.1:8001`. Systemd unit `panchanga-backend` runs `uvicorn server:app` (see `infra/setup-vps.sh:72`). No `panchanga-frontend` service — Nginx serves the static build directly, with `/assets/` long-cached (`immutable`, 1y).

## Gotchas specific to this repo

- **Env var prefix is `VITE_`**, not `REACT_APP_`. Still baked in at build time — changing `VITE_BACKEND_URL` requires a rebuild, not just a restart.
- **Port 8000 is firewalled** (`infra/setup-vps.sh:157`) as a legacy block. If something tries to use it, switch to 8001.
- **AdSense env vars are optional**. If `VITE_ADSENSE_CLIENT` or the per-slot ID is missing, `AdSlot` renders a visible placeholder labelled "Advertisement". Useful for dev; don't ship to prod without setting the real slot IDs.
- **Hash routing**, not real routes. `#panchang` / `#muhurta` switch views; the server only ever serves `/index.html`. If you add real routes later, Nginx already `try_files $uri /index.html;` so SPA fallback works — but SSR does not (this is not Next.js).
- **Vite build output is `dist/`**, not `build/`. The Nginx root was updated; if you see stale content after `npm run build`, confirm Nginx is pointing at `frontend/dist` and not the old `frontend/build`.
