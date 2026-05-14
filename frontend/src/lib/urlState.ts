// Helpers for reading user input from the URL query string and writing it back
// after a successful submit. Each page owns its parameter schema; this module
// only provides typed parsers + a single writer that keeps URLs short.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const TZ_RE = /^[A-Za-z][A-Za-z_+\-/0-9]{1,63}$/;

export function readSearch(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export const parseDate = (v: string | null): string | null => (v && DATE_RE.test(v) ? v : null);

export const parseTime = (v: string | null): string | null => (v && TIME_RE.test(v) ? v : null);

export function parseFloat3(v: string | null, min: number, max: number): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function parseIntIn(v: string | null, min: number, max: number): number | null {
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export const parseTz = (v: string | null): string | null => (v && TZ_RE.test(v) ? v : null);

export const parseStr = (v: string | null, maxLen = 120): string | null =>
  v && v.length > 0 && v.length <= maxLen ? v : null;

export function parseEnum<T extends string>(v: string | null, allowed: readonly T[]): T | null {
  if (!v) return null;
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

// Round lat/lon to 4 decimals (~11 m precision). Keeps shared links short and
// avoids leaking high-precision GPS coords from a Nominatim geocode response.
export const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

export type QueryEntries = Record<string, string | number | null | undefined>;

function buildSearch(entries: QueryEntries): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) {
    if (v === null || v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// Replace the current URL's query string without pushing a new history entry.
// Used after a successful submit so the user can copy/share the URL, but the
// back button doesn't fill up with one entry per recompute.
export function replaceSearch(entries: QueryEntries): void {
  if (typeof window === "undefined") return;
  const next = window.location.pathname + buildSearch(entries) + window.location.hash;
  window.history.replaceState(null, "", next);
}

// Build the absolute URL for a given path and query - used by the share-link
// button so the copied URL stays canonical (the user's current origin) rather
// than a hardcoded production hostname.
export function shareUrlFor(path: string, entries: QueryEntries): string {
  if (typeof window === "undefined") return path + buildSearch(entries);
  return window.location.origin + path + buildSearch(entries);
}
