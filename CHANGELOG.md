# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions track
`frontend/package.json` and the
[GitHub Releases](https://github.com/bidyashish/vedicpanchanga.com/releases) page.

## [Unreleased]

### Changed

- **Auspicious Time Heatmap rebuilt as a rule-based planner** (#92). Blocking
  periods now override favourable yogas instead of being averaged against
  them: a 15-minute slot inside Rahu Kalam, Yamagandam, Gulika, Durmuhurtam or
  Varjyam / Nakshatra Tyajyam is always *Highly Inauspicious* (dark red), a
  slot inside Bhadra or another Tyajyam portion is capped at *Inauspicious*
  (orange), and only clean slots are graded Neutral / Auspicious / Highly
  Auspicious from the positive windows and the running Hora. Each slot now
  carries the active Udaya Lagna. The card gained an hour axis, a five-tier
  legend with per-tier durations and percentages, a detailed Gantt timeline
  (Lagna row plus one row per window type including benefic and malefic
  Hora), a slot-by-slot table with favourable / unfavourable events, result
  and recommendation, and the best window of the day with its Lagna. The
  night strip now ends at the real next sunrise (`sun_moon.next_sunrise`).

### Added

- **Accounts, saved charts and Premium.** Optional sign-in with Google or
  email + password (`backend/accounts/`, SQLite via stdlib `sqlite3`, scrypt
  password hashes, HttpOnly `vp_session` cookie). Signed-in users save birth
  details from the Kundali page and reopen them from the new `/account` page
  (10 charts free, 200 on Premium). **Premium** is a Stripe subscription
  (monthly or yearly) that removes AdSense and raises the chart limit; the
  Stripe webhook is the only writer of Premium status and billing is managed
  through the Stripe customer portal. Password reset by email (Resend), account
  deletion that also cancels the subscription, per-IP rate limits. The local
  SQLite file stays the only database the API reads; `panchanga-backup.timer`
  mirrors it row by row into Cloudflare D1 every 15 minutes
  (`python -m accounts.backup sync | status | restore`) so a lost server
  costs at most 15 minutes of account data. The whole feature is a flag: with `SESSION_SECRET` unset the
  site behaves exactly as before. New endpoints `GET /api/auth/config`,
  `/api/auth/*`, `/api/charts`, `/api/billing/*`; 84 new UI strings in all
  15 locales; `backend/tests/test_accounts.py` (32 tests, Stripe / Google /
  Resend stubbed, D1 faked). `infra/setup-vps.sh` now seeds `backend/.env.local` once
  with a generated `SESSION_SECRET`, creates `backend/data/` and installs the
  backup timer. Design notes in `plan/accounts-subscriptions.md`.

- **Hindu festivals page** (`/festivals`) computed from the ephemeris for the
  visitor's own city, in all 15 languages. A new `backend/festivals.py` engine
  and `GET /api/festivals?year&latitude&longitude` return ~125 festivals, vrats,
  the 26 Ekadashis, 12 Sankrantis, solar / lunar eclipses and every Pitru Paksha
  Shraddha tithi for any year 1900-2100, each with its local sunrise / sunset,
  tithi or nakshatra span, puja window (pradosh, nishita, aparahna, moonrise,
  ...), parana and exact sankranti / eclipse instant. Special periods (Adhika
  Masa, Chaturmas, Pitru Paksha, both Navratris, Durga Puja) sit at the top
  with a day counter. Major festivals (Holi, Diwali, Durga Puja, Kali Puja,
  Chhath, Rama Navami, Janmashtami, ...) render as themed hero cards. Festival
  names are localized in every locale (`fest_<id>` keys). The page reuses the
  location chosen on the panchang page. Pinned against the DrikPanchang New
  Delhi calendar for 2026-2027 (304 entries, `backend/tests/test_festivals.py`).

### Changed

- **"No signup / no login required" wording removed** from `index.html`
  meta descriptions and JSON-LD, `public/index.md` and `public/llms.txt`;
  they now say the calculators are free and an optional account saves charts.
  `/account` is disallowed in `robots.txt` and marked noindex.
- **Privacy Policy and Terms of Use rewritten** (dated October 2026) to
  cover account data, the session cookie, Stripe payments, the D1 replica,
  refunds and cancellation, saved-chart limits and the age requirement.
- **AdSense loader is gated on auth state:** it waits for the session check
  and is never injected for Premium users or on `/account`.
- **Nginx request logging** (`infra/setup-vps.sh`): every request for the
  vhost, including static assets and the direct-IP `444` catch-all, is logged
  as JSON (`security` log format) to `/var/log/nginx/vedicpanchanga/access.log`
  with client and edge IP, `CF-Ray`, request ID (forwarded upstream as
  `X-Request-ID`), timings, upstream status, TLS details and an
  `api_key_present` flag. Retained 365 days via logrotate. Vhost errors move to
  `/var/log/nginx/vedicpanchanga/error.log`.

### Fixed

- **Tarabalam** no longer lists the native's own (Janma) nakshatra as good.
  Only Sampat, Kshema, Sadhaka, Mitra and Ati Mitra count, which yields the
  same 15 nakshatras DrikPanchang shows (users had reported the Chandrabalam /
  Tarabalam lists as wrong).
- **Chandrabalam / Tarabalam per segment**: `/api/get-panchang` now returns
  `segments` with one list per nakshatra and per Moon-sign span of the day and
  its end time ("upto 07:53 PM", then "until next sunrise"), matching
  DrikPanchang instead of a single sunrise-only list. The legacy `good_rashis`
  / `good_nakshatras` fields still mirror the sunrise segment. Pinned against
  DrikPanchang New Delhi 17-19 Sep 2026 in `backend/tests/test_balam.py`.
- **Muhurta scorer**: Chandrabalam is judged on the Moon sign during the chosen
  window rather than at sunrise, Janma tara scores as inauspicious instead of
  "mixed", the window picker weighs the native's Tarabalam / Chandrabalam, and
  the reasons name the tara ("Sampat tara") and the house ("Moon in house 8
  from native's rashi (Chandrashtama)").

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
