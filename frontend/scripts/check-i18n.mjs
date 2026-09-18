// i18n guardrail - run with `node scripts/check-i18n.mjs` (or `npm run i18n:check`).
//
// Enforces two invariants so locale dictionaries stay healthy as the app grows:
//
//   1. Key parity  - every locale in src/i18n/locales/*.ts declares exactly the
//      same set of t() keys as the English source (en.ts). Missing keys fall
//      back to English at runtime; extra keys are dead weight. Both are flagged.
//
//   2. Native script - non-Latin locales (hi, ne, ta, bn, zh, ja, ru, ar, fa,
//      he) must not leave bare Latin words inside their string values. This is
//      the "written for a native speaker" rule from CLAUDE.md / AGENTS.md. A
//      small allow-list covers brand names, units, acronyms and scientific
//      catalog names that legitimately stay Latin.
//
// Exits non-zero on any violation so it can gate CI (wired into `make check`).
//
// The locale files are parsed statically (regex) rather than imported, so this
// needs no TypeScript runtime or extra dependency - just Node.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "i18n", "locales");

// Locales whose values must be in a non-Latin native script.
const NON_LATIN = new Set(["hi", "ne", "ta", "bn", "zh", "ja", "ru", "ar", "fa", "he"]);

// Latin substrings that are allowed to appear even in a non-Latin value:
// brand/domain, third-party names, units, acronyms, interpolation tokens, and
// scientific star/catalog names. Keep this list minimal and in sync with the
// i18n rule documented in CLAUDE.md.
const ALLOW = [
  "vedicpanchanga.com",
  "AdSense",
  "PDF",
  "Swiss Ephemeris",
  "Lahiri",
  "BV Raman",
  "Manoj",
  "Drik",
  "Nominatim",
  "Khullar",
  "Sirius",
  "Vega",
  "Perseus",
  "Hz",
  "DNA",
  "SAV",
  "OM",
  "http",
  "https",
  "www",
  "{0}",
  "{1}",
  "{2}",
];

// Pull `key: "value"` pairs (handles oxfmt's wrapped `key:\n    "value"` form).
// Only the first string literal after each key is taken, which is exactly the
// translation value in these flat dictionaries.
function parseDict(source) {
  const re = /(^|\n)\s*([A-Za-z0-9_]+):\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  const out = new Map();
  let m;
  while ((m = re.exec(source)) !== null) {
    out.set(m[2], m[3]);
  }
  return out;
}

function strippedOfAllowed(value) {
  let t = value;
  for (const a of ALLOW) t = t.split(a).join(" ");
  return t;
}

// A "Latin run" is 2+ consecutive ASCII letters that survive the allow-list.
function latinRuns(value) {
  return strippedOfAllowed(value).match(/[A-Za-z]{2,}/g) ?? [];
}

const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".ts"));
const dicts = new Map();
for (const f of files) {
  const lang = f.replace(/\.ts$/, "");
  dicts.set(lang, parseDict(readFileSync(join(LOCALES_DIR, f), "utf8")));
}

const en = dicts.get("en");
if (!en) {
  console.error("check-i18n: en.ts not found - cannot check parity");
  process.exit(2);
}
const enKeys = new Set(en.keys());

const problems = [];

// 1) Key parity against en.
for (const [lang, dict] of dicts) {
  if (lang === "en") continue;
  const keys = new Set(dict.keys());
  const missing = [...enKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !enKeys.has(k));
  if (missing.length)
    problems.push(
      `[${lang}] missing ${missing.length} key(s): ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? " ..." : ""}`,
    );
  if (extra.length)
    problems.push(
      `[${lang}] ${extra.length} extra key(s) not in en: ${extra.slice(0, 12).join(", ")}${extra.length > 12 ? " ..." : ""}`,
    );
}

// 2) Native-script audit for non-Latin locales.
for (const [lang, dict] of dicts) {
  if (!NON_LATIN.has(lang)) continue;
  const offenders = [];
  for (const [key, value] of dict) {
    const runs = latinRuns(value);
    if (runs.length) offenders.push(`${key} (${[...new Set(runs)].slice(0, 4).join(", ")})`);
  }
  if (offenders.length) {
    problems.push(
      `[${lang}] ${offenders.length} value(s) with bare Latin: ${offenders.slice(0, 15).join("; ")}${offenders.length > 15 ? " ..." : ""}`,
    );
  }
}

if (problems.length) {
  console.error("i18n check FAILED:\n");
  for (const p of problems) console.error("  - " + p);
  console.error(`\n${problems.length} issue group(s). See CLAUDE.md i18n rules.`);
  process.exit(1);
}

console.log(
  `i18n check passed: ${dicts.size} locales, ${enKeys.size} keys each, native script clean.`,
);
