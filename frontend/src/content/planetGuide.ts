// Ordering, glyph and key-prefix for each graha in the "How to Read Your
// Kundali" guide. The translatable text (name, signifies, body) lives in the
// i18n locale dicts under pg_<key>_sig / pg_<key>_body, and the planet's
// display name comes from useAstro().planet(...). The `abbr` lines up with
// PLANET_COLORS in src/lib/planets.ts so the guide reuses the chart colours.

export interface PlanetGuideEntry {
  /** Two-letter abbreviation matching the chart (Su, Mo, Ma, ...). */
  abbr: string;
  /** Classical astrological glyph rendered as the step icon. */
  glyph: string;
  /** Lowercase key fragment used for i18n lookups: pg_<key>_sig / pg_<key>_body. */
  key: string;
  /** astro.ts planet name key fragment for useAstro().planet(name). */
  name: string;
}

export const PLANET_GUIDE: PlanetGuideEntry[] = [
  { abbr: "Su", glyph: "☉", key: "su", name: "Sun" },
  { abbr: "Mo", glyph: "☽", key: "mo", name: "Moon" },
  { abbr: "Ma", glyph: "♂", key: "ma", name: "Mars" },
  { abbr: "Me", glyph: "☿", key: "me", name: "Mercury" },
  { abbr: "Ju", glyph: "♃", key: "ju", name: "Jupiter" },
  { abbr: "Ve", glyph: "♀", key: "ve", name: "Venus" },
  { abbr: "Sa", glyph: "♄", key: "sa", name: "Saturn" },
  { abbr: "Ra", glyph: "☊", key: "ra", name: "Rahu" },
  { abbr: "Ke", glyph: "☋", key: "ke", name: "Ketu" },
];
