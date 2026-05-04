# frontend/

Vite + React 19 + TypeScript single-page app served on port **3121** in
dev. In production it's a static `dist/` build that Nginx serves with
year-long cache on fingerprinted `/assets/`.

- **Stack**: Vite 5 · React 19 · TypeScript · Tailwind CSS v4
  (CSS-based theme tokens — no `tailwind.config.js`)
- **Routing**: clean paths (`/`, `/panchang`, `/muhurta`, `/privacy`,
  `/terms`) — no hash. Path → view mapping lives in `App.tsx`.
- **No global state library** — each page owns its own form state and
  fetch logic. `App.tsx` keeps a shared `LocationChoice` so switching
  tabs preserves the selected city.

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env       # sets VITE_BACKEND_URL=http://localhost:8001
npm run dev                # http://localhost:3121
```

| Command                | What                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server with HMR (port 3121)                                 |
| `npm run build`        | `tsc --noEmit` then `vite build` → `dist/`                           |
| `npm run preview`      | Serve the built bundle (sanity-check prod output)                    |
| `npm run lint`         | [oxlint](https://github.com/oxc-project/oxc) — Rust-based linter     |
| `npm run format`       | [oxfmt](https://github.com/oxc-project/oxc) — write formatted output |
| `npm run format:check` | `oxfmt --check` — exits non-zero on a diff (used by CI)              |
| `npx tsc --noEmit`     | TypeScript type-check (also runs as part of `npm run build`)         |

`npm run lint` and `npm run format:check` are enforced by
`.github/workflows/ci.yml` on every push to `main` and every PR. To run
them automatically before each commit, install
[pre-commit](https://pre-commit.com) at the repo root and run
`pre-commit install` once — see the root `.pre-commit-config.yaml`.

There's no test runner wired up yet (Jest was part of the removed CRA
setup). When you need one, add Vitest.

## Environment

Vite bakes `VITE_*` variables in **at build time**, so editing `.env`
needs a rebuild — restarting the dev server isn't enough.

| Var                | Required | Purpose                                                             |
| ------------------ | -------- | ------------------------------------------------------------------- |
| `VITE_BACKEND_URL` | dev      | Backend origin. Empty in prod → same-origin `/api` via Nginx proxy. |

## Routing

Real path-based SPA — refreshing on `/panchang` works (Vite dev server
falls back to `index.html` automatically; nginx prod has
`try_files $uri $uri/ /index.html;` for the same reason).

Old hash URLs (`/#panchang`, `/#muhurta`) are migrated to clean paths on
first load by `migrateHashOnce()` in `App.tsx`, so any existing inbound
links survive.

Nav tabs render as real `<a href="/path">` anchors with `aria-current`
— middle-click and right-click "Open in new tab" work, and crawlers see
real links.

## Layout

```
src/
├── main.tsx                bootstrap — StrictMode + I18nProvider
├── App.tsx                 shell: TopBar · path-routed view switcher · Footer.
│                           Per-route SEO (title/description/canonical/og:tags)
│                           applied via lib/seo.applySeo on view change.
├── pages/
│   ├── KundaliPage.tsx     birth chart + Vimshottari + Ashtakavarga + Print PDF
│   ├── PanchangPage.tsx    daily Drik panchang + live lagna kundali (anchored
│   │                       to current wall-clock time in chart's timezone)
│   ├── MuhurtaPage.tsx     date-range scanner with native filters
│   ├── PrivacyPage.tsx
│   └── TermsPage.tsx
├── components/
│   ├── shell/              TopBar, Footer
│   ├── common/             CitySearch, LanguageSwitcher, MandalaLoader,
│   │                       MandalaMark, ThemeToggle
│   ├── kundali/            BirthForm, BirthHeader, ChartTabs, VedicChart
│   │                       (North Indian), SouthIndianChart, PlanetsTable,
│   │                       DashaTable, AshtakavargaTable
│   └── panchang/           Section, TimeBand
├── lib/
│   ├── api.ts              typed fetch for every backend endpoint +
│   │                       Nominatim geocode/reverse-geocode
│   ├── format.ts           date/time/dms formatters
│   ├── planets.ts          planet → colour / long-name tables
│   ├── seo.ts              applySeo({ title, description, canonical }) — sets
│   │                       <title>, meta tags, og/twitter tags, canonical link
│   └── contact.ts          contact email constant
├── types/api.ts            TypeScript shapes mirroring every backend response
├── i18n/                   index.tsx (LANGUAGES list, I18nProvider, RTL
│                           dispatch), astro.ts (planet/sign/nakshatra +
│                           native-digit tables), locales/*.ts (15 langs:
│                           en, hi, ta, bn, ne, zh, ja, es, de, pt, fr,
│                           ru, ar, fa, he). Sets <html lang> + <html dir>
│                           so script-aware CSS and date formatters pick up
│                           the locale on the very next render.
├── index.css               Tailwind v4 + CSS variables (parchment palette,
│                           saffron accent, locale-aware Devanagari fonts)
└── App.css                 anything Tailwind can't express
```

Path alias `@/*` → `src/*` is set in both `vite.config.ts` and
`tsconfig.json`. Keep them in sync.

## SEO

- `index.html` ships with full meta (description, keywords, og/twitter,
  Apple touch icon, theme-color, format-detection) and three JSON-LD
  blocks (`WebSite`, `WebApplication`, `Organization`) — these stay
  static for every route.
- Per-route `<title>`, description and canonical are rewritten by
  `lib/seo.applySeo()` whenever the view changes.
- Sitemap at `/sitemap.xml` lists all 5 clean URLs.
- `robots.txt` allows everything.

## AdSense

Auto Ads only — the loader script
(`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-…`)
is hard-coded in `index.html` and Google places ads automatically. There
is no in-app `<AdSlot>` component and no per-slot env vars.

## React-18 StrictMode dev quirk

In dev, `useEffect` runs twice on mount to surface side-effect bugs.
The pages that hit the API on first render (`KundaliPage`, `PanchangPage`,
`MuhurtaPage`, `BirthForm`) each guard their initial fetch with a
`useRef` flag so the network panel matches production.

## i18n

`src/i18n/index.tsx` registers all 15 supported locales in `LANGUAGES`
and exposes `useI18n()` returning `{ lang, t, setLang }`. Per-locale UI
strings live in `src/i18n/locales/{en,hi,ta,bn,ne,zh,ja,es,de,pt,fr,ru,ar,fa,he}.ts`
(direct ports of `en.ts`'s key set). Astronomical names (planet, sign,
nakshatra) and native-digit tables live in `src/i18n/astro.ts` so the UI
strings dictionaries don't carry the 49 astro names per language.

`setLang()` writes `<html lang>` and `<html dir>` synchronously so
script-aware CSS (`html[lang="hi"], html[lang="ne"]` Devanagari rule),
RTL flow for `ar`/`fa`/`he`, and locale-aware date formatters see the
new locale on the very next render.
