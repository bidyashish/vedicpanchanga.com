# Contributing

A short guide to keep changes consistent and CI green. The repo is small, so
the only hard rule is the title: **green CI, clear file location, no surprise
abstractions.**

---

## Quick start

```bash
make install      # once: venv, npm deps, pre-commit hooks
make dev          # runs backend (:8001) and frontend (:3121) together
make check        # mirrors CI - run before pushing
make pre-commit   # format + check (the safe way to ship)
make help         # lists every target
```

The `Makefile` is the source of truth for commands. If a step is missing
from the Makefile, add it there before adding it to your shell history.

---

## File layout

### Backend (`backend/`, flat Python package)

```
backend/
├── server.py              FastAPI app, routes, request/response models.
├── calculator.py          compute_chart(): full birth-chart pipeline.
├── transits.py            Sign / nakshatra / retrograde event scanner.
├── muhurta.py             Auspicious-window finder.
├── advanced_panchang.py   Daily Drik Panchang (tithi, nakshatra, yoga ...).
├── panchang_extras.py     Layered yogas on top of advanced_panchang.
├── panchang_constants.py  Tables for the panchang modules.
├── ayanamsa.py            Ayanamsa option table + setter.
├── constants.py           Sign / nakshatra / tithi / vara names.
├── vargas.py              D1-D60 divisional chart math.
├── dasha_extras.py        Antardasha / Pratyantar sub-period computation.
├── drishti.py             Vedic aspect calculator.
├── relationships.py       Natural / temporal / 5-fold friendship matrices.
├── jaimini.py             Chara karakas + Karakamsa / Swamsa charts.
├── kalsarpa.py            Kalsarpa Yoga detection.
├── mangal.py              Mangal Dosha analysis.
├── sade_sati.py           Saturn-from-Moon 120-year transit table.
├── gowri_panchang.py      Tamil/Telugu Gowri Panchangam.
├── hora.py                Planetary Hora hours.
├── nalla_neram.py         Tamil Nalla Neram windows.
├── tamil_calendar.py      Tamil calendar (year, month, weekday).
├── tyajyam.py             Inauspicious time periods.
├── pdf/                   PDF report renderer (its own subpackage).
├── ephe/                  Swiss Ephemeris data files. NEVER move or delete.
└── tests/                 pytest suites + conftest.
```

**Where does new backend code go?**

- A new astronomical calculation (varga variant, dosha analysis): new
  top-level `backend/<name>.py`. Match the existing one-word naming.
- A new panchang section: add to `advanced_panchang.py` if it shares the
  daily sunrise/sunset machinery, otherwise its own module.
- A new API route: in `server.py`. Keep `server.py` thin - it should
  delegate calculation to a module.
- Constants and lookup tables: prefer `constants.py` (chart names) or
  `panchang_constants.py` (panchang tables).

**Style:** `make format-backend` (ruff format) handles every choice. No
manual style decisions.

### Frontend (`frontend/src/`, feature-folder layout)

```
src/
├── App.tsx                Shell: TopBar, route switcher, Footer.
├── main.tsx               Entry: I18nProvider + StrictMode.
├── index.css              Tailwind globals + token bridge.
│
├── pages/                 One file per top-level route.
│   ├── KundaliPage.tsx
│   ├── PanchangPage.tsx
│   ├── MuhurtaPage.tsx
│   ├── TransitsPage.tsx
│   └── ...
│
├── components/            UI grouped by the page that owns it.
│   ├── common/            Used by 2+ pages (CitySearch, MandalaLoader).
│   ├── shell/             TopBar, Footer, NotificationBanner.
│   ├── ui/                Generic primitives (DatePicker, Switch).
│   ├── kundali/           Kundali-page-specific (Charts, PlanetsTable).
│   ├── panchang/          Panchang-page-specific (Section, TimeBand).
│   └── transits/          Transit-page-specific (TransitTimeline).
│
├── lib/                   Pure utilities. No React, no JSX.
│   ├── api.ts             Typed fetch wrappers for every backend route.
│   ├── format.ts          Date / time / number formatters.
│   ├── planets.ts         Planet abbr -> colour / long-name tables.
│   ├── seo.ts             applySeo() for per-route title/canonical.
│   └── ...
│
├── i18n/                  Internationalisation.
│   ├── index.tsx          LANGUAGES, I18nProvider, useI18n.
│   ├── astro.ts           Planet/sign/nakshatra translation dictionaries.
│   └── locales/           UI-string dictionaries per locale.
│
└── types/api.ts           TypeScript shapes for backend responses.
```

**Where does new frontend code go?**

- New top-level route: page file in `pages/` + entry in `App.tsx`
  (`View` union, `VIEW_PATH`, `SEO_BY_VIEW`, `viewFromPath`) + tab in
  `components/shell/TopBar.tsx` + nav-label key in
  `i18n/locales/en.ts` (other locales fall back to English).
- New component used by one page: `components/<page>/<Name>.tsx`.
- New component used by two or more pages: promote to `components/common/`.
- New API call: typed wrapper in `lib/api.ts` + matching type in
  `types/api.ts`.
- New translatable string: English in `i18n/locales/en.ts` (mandatory);
  other locales optional - they fall back to English automatically. Astro
  names (planet / sign / nakshatra) go in `i18n/astro.ts` instead.

**Path alias:** `@/...` resolves to `src/...`. Always use it. Never
`../../components/...`.

**Style:** `make format-frontend` (oxfmt) handles every choice.

---

## Conventions

### Naming

- **Files:** snake_case for Python, kebab-case isn't used in this repo;
  TSX files are PascalCase for components (`TransitTimeline.tsx`) and
  camelCase for non-component modules (`urlState.ts`).
- **Tests:** mirror the module they cover: `transits.py` ->
  `tests/test_transits.py`.

### Imports

- Backend: prefer absolute imports (`from calculator import compute_chart`).
  `conftest.py` puts `backend/` on `sys.path` for tests.
- Frontend: always use `@/` alias.

### Types

- Backend uses Pydantic models in `server.py` for request bodies.
- Frontend mirrors every response shape in `types/api.ts`. Run
  `make check-frontend` to catch shape drift.

### Comments

CLAUDE.md is authoritative here. Short version:

- Default to no comments. Names should carry the meaning.
- Add a comment only for the non-obvious **why**: a hidden constraint, a
  workaround for a specific bug, behaviour that would surprise a reader.
- No em dashes (use `-`). UI/i18n strings stay plain ASCII in English.
  Hindi / Tamil / Bengali / etc. use their native script.

---

## Workflow

```bash
git checkout -b feat/whatever
# ... edit ...
make pre-commit         # format + verify; same gates as CI
git add ...
git commit -m "feat: short message"
git push -u origin feat/whatever
gh pr create
```

The `pre-commit-config.yaml` hooks fire automatically on `git commit` once
`make install-hooks` has been run. They run ruff + oxfmt + oxlint - the
same tools `make check` runs in `--check` mode.

### Before opening a PR

1. `make pre-commit` passes (mirrors CI gates).
2. `make test` passes (CI doesn't run tests today, but the suite is
   fast and catches a lot).
3. Manual UI test if you touched anything visual. Memory note:
   visual changes need to be confirmed in a browser before shipping.

---

## Industry-standard practices we've adopted

| Practice | Where | Why |
|---|---|---|
| **Pre-commit hooks** | `.pre-commit-config.yaml` | Catch format issues before CI does. |
| **Single dev entrypoint** | `Makefile` | New contributors run one command, not five. |
| **Editor consistency** | `.editorconfig` | Same indentation/EOLs across editors. |
| **Path aliases** | `@/` in `tsconfig.json`, `vite.config.ts` | Refactors stop breaking on file moves. |
| **Feature folders** | `components/{kundali,panchang,...}/` | Keep the change-blast-radius small. |
| **CI mirror locally** | `make check` | "Works on my machine" goes away. |
| **Typed API boundary** | `types/api.ts` + Pydantic in `server.py` | Schema drift caught at build time. |

---

## Known hot spots

These files are large enough that a future split would help, but the
mechanical risk is non-trivial. Listed so they get prioritised when
touched substantially:

| File | Lines | Suggested split |
|---|---|---|
| `frontend/src/i18n/astro.ts` | 2161 | Each locale dict (HI/TA/...) into its own file under `i18n/astro/`, keep `index.ts` for the lookup helpers. |
| `backend/advanced_panchang.py` | 1255 | Group by panchang section: tithi/nak/yoga/karana detectors separated from sunrise/sunset machinery. |
| `frontend/src/pages/PanchangPage.tsx` | 1161 | Extract each `<Section>` block into its own component under `components/panchang/`. |

A split is only worth it if it reduces "where do I edit?" friction. Don't
split for line-count alone.
