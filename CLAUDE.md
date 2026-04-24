# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary reference

`AGENTS.md` at the repo root is the canonical agent brief (project summary, coding standards, security rules, deployment, backlog). Read it first. The notes below focus on commands, current architecture reality, and gotchas — they do **not** repeat what's in `AGENTS.md`.

**Known drift from `AGENTS.md`**: `AGENTS.md` describes the frontend as "Next.js 15 (App Router) with TypeScript, Tailwind v4" and the backend entry as `api.py`. The actual code is Create React App (`react-scripts 5` via `@craco/craco`) with `.jsx` sources and Tailwind v3, and the backend entry is `server:app` (`backend/server.py`). A TypeScript migration is in progress (commit `8fbae61`) but `src/` is still `.js`/`.jsx`. Trust the code, not `AGENTS.md`, on these points; if you touch these areas, consider whether `AGENTS.md` should be updated in the same PR.

## Commands

### Backend (FastAPI, Python 3, port 8001)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001   # dev run
```
- Requires env vars `MONGO_URL` and `DB_NAME` (loaded from `backend/.env`). The app will fail at import if `MONGO_URL` is unset — Motor/MongoDB is used for chart history persistence.
- Swiss Ephemeris data files live in `backend/ephe/` (`*.se1`). Calculations silently fail without them; never delete or move this directory.
- Must bind to `127.0.0.1` only. Never expose 8001 publicly (see `AGENTS.md` §8).

### Frontend (CRA + craco, React 19, port 3121)
```bash
cd frontend
npm install --legacy-peer-deps   # peer deps conflict with React 19; flag is required
npm start                         # craco start (dev server)
DISABLE_ESLINT_PLUGIN=true npm run build   # build script already sets this
npm test                          # craco test (Jest via CRA)
```
- Backend URL comes from `REACT_APP_BACKEND_URL` in `frontend/.env` (defaults to `http://localhost:8001`). The frontend constructs `${BACKEND_URL}/api` and calls the backend directly — there is currently **no Next.js proxy layer** despite what `AGENTS.md` shows.
- Path alias `@/*` → `src/*` is wired via `craco.config.js` (webpack alias) and `jsconfig.json` (editor). Keep both in sync.

### Tests
```bash
cd backend && source venv/bin/activate
pytest tests/ -v                                  # all backend tests
pytest tests/test_muhurta.py -v                   # single suite
pytest tests/test_iteration4_vargas.py::test_d30  # single test
./tests/test_production_api.sh                    # production smoke test (if present)
```
- The pytest suites live in `backend/tests/`, not the top-level `tests/` directory (which only contains `__init__.py`). `AGENTS.md` is out of date here too.
- Kelowna panchang reference-data tests are regression anchors — do not change expected values without explicit approval.

## Architecture essentials

### Request flow
Browser → `http://localhost:3121` (CRA dev server / Nginx-served static build in prod) → `axios` → `http://localhost:8001/api/*` (FastAPI). Routes are mounted under `/api` (not `/api/v1`). Endpoints: `POST /api/calculate`, `GET /api/get-panchang`, `GET /api/ayanamsa-options`, `GET /api/muhurta-purposes`, `POST /api/find-muhurta`. Source: `backend/server.py`.

### Backend module boundaries
- `server.py` — FastAPI app, request/response models, MongoDB persistence, CORS. Thin layer that delegates math to the modules below.
- `calculator.py` — full kundali (`compute_chart`): planetary positions, houses, dashas, ashtakavarga.
- `panchang.py` / `advanced_panchang.py` — basic and detailed panchang (tithi, nakshatra, yoga, karana, muhūrta timings, rahu kala, etc.).
- `vargas.py` — 16 divisional charts (D1–D60). D30 uses special uneven-segment rules; touch with care.
- `ayanamsa.py` — ayanamsa selection (`AYANAMSA_OPTIONS`). Default `lahiri`.
- `muhurta.py` — auspicious-window scanner with purpose-based scoring (0–100 with explainable reasons).
- `constants.py`, `panchang_constants.py` — all magic numbers live here.

All astronomical math must go through `swisseph` (PySwissEph bindings). Never hardcode planetary positions.

### Frontend structure
- `src/App.js` — root component; owns form state, composes charts + panchang + muhurta views.
- `src/components/` — `VedicChart.jsx` (North Indian), `SouthIndianChart.jsx`, `PanchangView.jsx`, `MuhurtaFinder.jsx`, plus `components/ui/` (Shadcn/ui primitives).
- `src/i18n.js` — English/Hindi strings and `useI18n` / `LanguageSwitcher`. Every new user-facing string must land in both locales.
- `src/lib/`, `src/hooks/` — shared utilities and hooks.
- Chart export uses `html2canvas` + `jspdf`; PDF generation for 16 vargas takes ~11s (see backlog P2 in `AGENTS.md`).

### Production topology
Cloudflare → Nginx (TLS, CSP, returns 444 for direct-IP) → static CRA build (served by Nginx) + FastAPI on `127.0.0.1:8001`. Systemd unit `panchanga-backend` runs `uvicorn server:app` (see `infra/setup-vps.sh:72`). The CRA build is served as static files directly by Nginx — there is no `panchanga-frontend` service in the current setup script despite references in older docs (see commit `f93e0e6`).

## Gotchas specific to this repo

- **`npm install` fails without `--legacy-peer-deps`** — React 19 is newer than several Radix/Shadcn peer ranges.
- **Port 8000 is firewalled** (`infra/setup-vps.sh:157`) as a legacy block. If something tries to use it, switch to 8001.
- **`REACT_APP_*` env vars are baked in at build time**; changing `REACT_APP_BACKEND_URL` requires a rebuild, not just a restart.
- **MongoDB is required to boot the backend** even for read-only endpoints, because `server.py` creates the client at import time. If you need to run without Mongo, set `MONGO_URL` to a reachable instance or guard that import.
- **Frontend sources are `.jsx`/`.js`** — if you add `.tsx`, confirm the in-progress TS migration has landed the compiler config (`tsconfig.json`) before assuming it builds.
