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

| Var                        | Required | Purpose                                                             |
| -------------------------- | -------- | ------------------------------------------------------------------- |
| `VITE_BACKEND_URL`         | dev      | Backend origin. Empty in prod → same-origin `/api` via Nginx proxy. |
| `VITE_ADSENSE_CLIENT`      | optional | AdSense publisher ID. Unset → dashed placeholders in ad slots.      |
| `VITE_ADSENSE_SLOT_HEADER` | optional | Per-slot IDs: `_HEADER`, `_SIDEBAR`, `_INLINE`, `_FOOTER`.          |

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
│   ├── KundaliPage.tsx     birth chart + Vimshottari + Aṣṭakavarga + Print PDF
│   ├── PanchangPage.tsx    daily Drik panchang + live lagna kundali (anchored
│   │                       to current wall-clock time in chart's timezone)
│   ├── MuhurtaPage.tsx     date-range scanner with native filters
│   ├── PrivacyPage.tsx
│   └── TermsPage.tsx
├── components/
│   ├── shell/              TopBar, Footer, AdSlot
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
├── i18n.tsx                English + Hindi dictionaries, useI18n,
│                           I18nProvider. Sets <html lang> so Devanagari
│                           web fonts kick in via index.css.
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

`<AdSlot slot="header|sidebar|inline|footer" minHeight={…} />`.
Without `VITE_ADSENSE_CLIENT` and the matching `VITE_ADSENSE_SLOT_*`
env var, it renders a dashed placeholder labelled "Advertisement" — useful
for layout work without ads.

## React-18 StrictMode dev quirk

In dev, `useEffect` runs twice on mount to surface side-effect bugs.
The pages that hit the API on first render (`KundaliPage`, `PanchangPage`,
`MuhurtaPage`, `BirthForm`) each guard their initial fetch with a
`useRef` flag so the network panel matches production.

## i18n

`src/i18n.tsx` defines `en` and `hi` dictionaries. `useI18n()` returns
`{ lang, t, setLang }`. The `LanguageSwitcher` exposes 8 languages in
the dropdown but only `en` and `hi` have full translations today; others
fall back to English. `setLang()` writes `<html lang>` synchronously so
that Devanagari-language CSS (`:is(html[lang="hi"], …)` rules in
`index.css`) and locale-aware date formatters see the new locale on the
very next render.
