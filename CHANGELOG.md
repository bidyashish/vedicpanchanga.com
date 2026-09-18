# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions track
`frontend/package.json` and the
[GitHub Releases](https://github.com/bidyashish/vedicpanchanga.com/releases) page.

## [Unreleased]

## [1.2.0] - 2026-09-17

### Added

- **Optional API-key auth** (`backend/auth.py`): set `API_KEYS` to require
  `Authorization: Bearer <key>` or `X-API-Key` from third-party clients while
  the site's own origin stays keyless (`AUTH_EXEMPT_ORIGINS`). `/api/` and
  `/api/health` remain open for monitoring. Secrets live in `backend/.env.local`,
  which the deploy script never rewrites.
- **Special planetary placements** (`backend/placements.py`): exaltation,
  debilitation, own sign, moolatrikona, vargottama, digbala, combustion,
  Pushkara Bhaga / Navamsa, Neecha Bhanga, Parivartana, Mrityu Bhaga, Gandanta
  and Graha Yuddha, surfaced in the planets table and a tappable
  `PlanetDetailModal` with guide copy (`PlanetGuide`).
- **Muhurta vetoes**: Guru / Shukra asta, Chaturmas, Kharmas and Adhika masa
  blackouts, cross-checked against DrikPanchang 2026 dates. Dur Muhurtam
  windows per weekday, including the Wednesday Abhijit suppression.
- **Panchang page**: auspiciousness heat strip for the day
  (`AuspiciousHeatmap`), Tyajyam section, info tooltips.
- **Frequency Generator** page (`/frequency`): Solfeggio, chakra, Navagraha
  and noise presets.
- **Learn section**: seven long-form articles under `/learn/*` (Kundali,
  nine planets, Panchang, Dasha, Nakshatras, Rashi, divisional charts) with a
  shared `ArticleLayout`.
- **AI-crawler discovery**: `llms.txt`, `index.md` and
  `.well-known/api-catalog` in `frontend/public/`.
- **i18n guardrail**: `npm run i18n:check` enforces locale key parity and
  rejects bare Latin words in the ten non-Latin locales; wired into
  `make check` and CI.
- **Observability**: reproducible Prometheus + Node Exporter + Blackbox +
  Grafana stack under `infra/grafana/`, all bound to localhost and provisioned
  from version-controlled config.
- **Workflow**: `keep-issues-open.yml` reopens issues that a PR merge
  auto-closes, so reporters verify fixes before closure.
- `CHANGELOG.md` (this file).

### Changed

- **Tests run in-process.** API tests use FastAPI's `TestClient` by default,
  so the whole suite (306 tests) runs in about 5 seconds with nothing skipped.
  Set `BACKEND_URL` to point the same tests at a live server. Previously the
  80 HTTP tests skipped unless a server happened to be running.
- `test_iteration3.py` and `test_iteration4_vargas.py` renamed to
  `test_ayanamsa.py` and `test_vargas.py`; duplicated regression tests folded
  into `test_vedic_api.py`; per-test `timeout=` and `sys.path` hacks removed.
- **Panchang page split**: the auspicious / inauspicious timing sections and
  the `TransitList`, `KeyValueGrid`, `TimeCard` and `LimbCol` helpers moved
  into `frontend/src/components/panchang/`. The page shrinks from 1358 to
  about 1060 lines with no behaviour change.
- Em dashes in code comments and docstrings replaced with hyphens, matching
  the repo style rule.
- READMEs (root, backend, frontend, tests) rewritten to match the code:
  Makefile-first workflow, complete API table (`/api/health`, `/api/transits`,
  `/api/suggest-lang`, `/api/geo-ip`), correct CORS default, localhost-only
  monitoring posture, 13 muhurta purposes, 15 PDF locales, Vite 8.
- Deploy scripts consolidated: `setup-cron.sh`, `setup-monitoring.sh` and
  `update-deploy.sh` replaced by `auto-update-cron.sh` and
  `infra/grafana/install.sh`; the firewall step now removes any public allow
  on the monitoring ports.
- `AGENTS.md` retired; `CLAUDE.md` and the code comments that pointed at it
  now reference `CONTRIBUTING.md`, the READMEs and module docstrings.

### Fixed

- `test_muhurta_purposes_list` asserted 12 purposes while the API returns 13,
  a latent failure hidden by the skipped HTTP tests.
- `WesternChart`: `new Array(n).fill()` replaced with `Array.from`, clearing
  the last oxlint warning.

### Removed

- `backend/tests/compare_drik.py`, a manual DrikPanchang comparison script
  that pytest never collected and nothing referenced.

## [1.1.0] - 2026-05-17

### Added

- **Live mode on the Panchang page.** Panchang data and the lagna kundali
  re-fetch every 60 seconds and the chart re-anchors to the current time, so
  it progresses through the houses while the page is open.
- Inline live clock (HH:MM:SS) in the panchang location's timezone, a
  pulsing "Live" indicator using the `--success` token, and `localStorage`
  persistence of the toggle (`jk_panchang_live`).
- Concurrent-fetch guard so a slow network cannot stack overlapping refreshes.
- `live_mode`, `live_mode_hint` and `live_badge` strings in all 15 locales.
- `nowTimeWithSecondsInTz(tz)` helper in `frontend/src/lib/format.ts`.

[Unreleased]: https://github.com/bidyashish/vedicpanchanga.com/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/bidyashish/vedicpanchanga.com/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/bidyashish/vedicpanchanga.com/releases/tag/v1.1.0
