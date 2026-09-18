# frontend/

Vite + React 19 + TypeScript single-page app served on port **3121** in
dev. In production it is a static `dist/` build that Nginx serves with a
year-long cache on fingerprinted `/assets/`.

- **Stack**: Vite 8, React 19, TypeScript 6, Tailwind CSS v4 (CSS-based
  theme tokens, no `tailwind.config.js`)
- **Routing**: clean paths, no hash. Path to view mapping lives in `App.tsx`.
- **No global state library**: each page owns its own form state and fetch
  logic. `App.tsx` keeps a shared `LocationChoice` so switching tabs
  preserves the selected city.

## Run locally

Requires Node.js 20+. From the repo root `make install` runs `npm ci` and
`make frontend` starts the dev server; the manual equivalent:

```bash
npm install
cp .env.example .env       # sets VITE_BACKEND_URL=http://localhost:8001
npm run dev                # http://localhost:3121
```

| Command                | What                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server with HMR (port 3121)                                   |
| `npm run build`        | `tsc --noEmit` then `vite build` into `dist/`                          |
| `npm run preview`      | Serve the built bundle                                                 |
| `npm run lint`         | [oxlint](https://github.com/oxc-project/oxc)                           |
| `npm run format`       | oxfmt, write                                                           |
| `npm run format:check` | oxfmt `--check`, exits non-zero on a diff (CI)                         |
| `npm run i18n:check`   | Locale key parity + native-script guard (`scripts/check-i18n.mjs`, CI) |
| `npx tsc --noEmit`     | Type-check only (also part of `npm run build`)                         |

`make check-frontend` at the repo root runs tsc, lint, format:check and
i18n:check exactly as CI does. There is no test runner wired up yet; add
Vitest when you need one.

## Environment

Vite bakes `VITE_*` variables in **at build time**, so editing `.env`
needs a rebuild. Restarting the dev server is not enough.

| Var                                        | Required | Purpose                                                                    |
| ------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| `VITE_BACKEND_URL`                         | dev      | Backend origin. Empty in prod: same-origin `/api` via the Nginx proxy.     |
| `VITE_SUPPORT_EMAIL`, `VITE_CONTACT_EMAIL` | no       | Footer / legal-page contacts. Default to the vedicpanchanga.com addresses. |

## Routing

| Path                                                              | View                                           |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| `/`                                                               | Daily panchang + live lagna chart              |
| `/kundali`                                                        | Birth chart, vargas, dashas, ashtakavarga, PDF |
| `/muhurta`                                                        | Muhurta finder                                 |
| `/transits`                                                       | Planetary transit timeline                     |
| `/festivals`                                                      | Hindu festival calendar (static markdown)      |
| `/frequency`                                                      | Healing frequency / tone generator             |
| `/learn/{kundali,planets,panchang,dasha,nakshatras,rashi,vargas}` | Long-form articles (`pages/articles/`)         |
| `/privacy`, `/terms`                                              | Legal pages (no ads)                           |

Refreshing on any path works: the Vite dev server falls back to
`index.html` and nginx has `try_files $uri $uri/ /index.html;`. Old hash
URLs (`/#panchang`) are migrated to clean paths on first load by
`migrateHashOnce()` in `App.tsx`. Nav tabs are real `<a href>` anchors with
`aria-current`, so middle-click and crawlers work. Add new routes to
`public/sitemap.xml` and `lib/seo.ts` as well.

## Layout

```
src/
├── main.tsx                bootstrap: StrictMode + I18nProvider
├── App.tsx                 shell: TopBar, path-routed view switcher, Footer;
│                           per-route SEO via lib/seo.applySeo
├── pages/
│   ├── PanchangPage.tsx    daily Drik panchang + lagna kundali anchored to "now"
│   ├── KundaliPage.tsx     birth chart, vargas, dashas, ashtakavarga, Print PDF
│   ├── MuhurtaPage.tsx     date-range scanner with native filters
│   ├── TransitsPage.tsx    transit timeline
│   ├── FestivalsPage.tsx   festival / vrat / Shraddha dates from content/festivals/*.md
│   ├── FrequencyPage.tsx   tone generator (Solfeggio, chakra, Navagraha presets)
│   ├── PrivacyPage.tsx / TermsPage.tsx
│   └── articles/           ArticleLayout + the seven /learn/* pages
├── components/
│   ├── shell/              TopBar, Footer, NotificationBanner
│   ├── common/             CitySearch, InfoTooltip, LanguageSwitcher, MandalaLoader,
│   │                       MandalaMark, ShareLinkButton, ThemeToggle
│   ├── kundali/            BirthForm, BirthHeader, ChartTabs, VedicChart (North Indian),
│   │                       SouthIndianChart, WesternChart, PlanetsTable, PlanetDetailModal,
│   │                       PlanetGuide, DashaTable, AshtakavargaTable, DrishtiPanel,
│   │                       JaiminiSection, OmGlyph
│   ├── panchang/           Section, TimeBand, TimeCard, LimbCol, KeyValueGrid, TransitList,
│   │                       AuspiciousTimings, InauspiciousTimings, AuspiciousHeatmap,
│   │                       TyajyamSection, GowriPanchangam, HoraPanchangam, NallaNeram,
│   │                       SegmentTable
│   ├── transits/           TransitTimeline
│   └── ui/                 calendar, date-picker, time-picker, modal, popover,
│                           segmented-control, switch
├── content/
│   ├── planetGuide.ts      planet guide copy shown in PlanetDetailModal
│   └── festivals/<year>.md DrikPanchang (New Delhi) festival tables, one file per year
├── lib/
│   ├── api.ts              typed fetch for every backend endpoint + Nominatim geocoding
│   ├── adsense.ts          Auto Ads loader (lazy, route-aware)
│   ├── auspiciousHeatmap.ts day-strip scoring behind AuspiciousHeatmap
│   ├── festivals.ts        parses content/festivals/*.md into FESTIVAL_YEARS
│   ├── format.ts           date / time / dms formatters, nowTimeInTz
│   ├── gtag.ts             Google Analytics helper
│   ├── planets.ts          planet -> colour / long-name tables
│   ├── richText.tsx        inline markup renderer for i18n strings
│   ├── seo.ts              applySeo({ title, description, canonical })
│   ├── theme.ts            dark / light toggle
│   ├── urlState.ts         query-string state sync (shareable links)
│   ├── vargas.ts           per-locale varga names and subtitles
│   ├── contact.ts, utils.ts
├── types/api.ts            TypeScript shapes mirroring every backend response
├── i18n/                   index.tsx (LANGUAGES, I18nProvider, RTL dispatch),
│                           astro.ts (planet / sign / nakshatra names + native digits),
│                           locales/*.ts (15 languages)
├── index.css               Tailwind v4 + CSS variables (parchment palette, saffron
│                           accent, Devanagari font rules)
└── App.css                 anything Tailwind cannot express
```

Path alias `@/*` maps to `src/*` in both `vite.config.ts` and
`tsconfig.json`. Keep them in sync.

## SEO

- `index.html` ships full meta (description, og / twitter, Apple touch icon,
  theme-color) and JSON-LD blocks (`WebSite`, `WebApplication`,
  `Organization`) that stay static for every route.
- Per-route `<title>`, description, canonical and og tags are rewritten by
  `lib/seo.applySeo()` whenever the view changes. There is no SSR.
- `public/sitemap.xml` lists all 15 clean URLs; `robots.txt` allows
  everything; `llms.txt`, `index.md` and `.well-known/api-catalog` describe
  the site and API for AI crawlers.

## AdSense

Auto Ads only. The loader in `src/lib/adsense.ts` is lazy-injected after
mount on monetised routes (not `/privacy` or `/terms`). `index.html` only
carries the `<meta name="google-adsense-account">` tag. Do not add manual
`<ins>` slots or per-slot env vars.

## React StrictMode dev quirk

In dev, React 19 runs `useEffect` twice on mount to surface side-effect
bugs. Pages that hit the API on first render (`KundaliPage`, `PanchangPage`,
`MuhurtaPage`, `BirthForm`) guard the initial fetch with a `useRef` flag so
the network panel matches production.

## i18n

`src/i18n/index.tsx` registers the 15 locales in `LANGUAGES` and exposes
`useI18n()` returning `{ lang, t, setLang }`. UI strings live in
`src/i18n/locales/{en,hi,ta,bn,ne,zh,ja,es,de,pt,fr,ru,ar,fa,he}.ts` with
exactly the key set of `en.ts`. Astronomical names and native-digit tables
live in `src/i18n/astro.ts`; varga names in `src/lib/vargas.ts`.

Every non-English locale must read naturally to a native speaker in its
own script (see the style rules in `CLAUDE.md`). `npm run i18n:check`
enforces key parity and rejects bare Latin words in the ten non-Latin
locales. `setLang()` writes `<html lang>` and `<html dir>` synchronously so
Devanagari CSS, RTL flow for `ar` / `fa` / `he` and locale-aware date
formatters pick up the new locale on the next render.
