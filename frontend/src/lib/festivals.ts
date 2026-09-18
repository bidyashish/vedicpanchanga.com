/**
 * Hindu festival dates are content, not computation. Each year lives in
 * `src/content/festivals/<year>.md` as a plain 4-column table
 * (`| YYYY-MM-DD | Observance | Tithi / Nakshatra | Series |`) copied from the
 * DrikPanchang Hindu calendar for New Delhi. Preamble lines of the form
 * `Label: https://...` become source links. Add a new year by adding a file.
 */

export interface FestivalItem {
  date: string; // YYYY-MM-DD
  name: string;
  tithi: string;
  series: string; // e.g. "Pitru Paksha"; empty for stand-alone observances
}

export interface FestivalSource {
  label: string;
  url: string;
}

export interface FestivalYear {
  year: number;
  sources: FestivalSource[];
  items: FestivalItem[]; // sorted by date, file order within a date
}

const ROW = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|(.+)\|\s*$/;
const SOURCE = /^([^|#:]+):\s*(https?:\/\/\S+)\s*$/;

export function parseFestivalMarkdown(md: string): Omit<FestivalYear, "year"> {
  const sources: FestivalSource[] = [];
  const items: FestivalItem[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    const row = ROW.exec(line);
    if (row) {
      const [name = "", tithi = "", series = ""] = row[2].split("|").map((c) => c.trim());
      if (name) items.push({ date: row[1], name, tithi, series });
      continue;
    }
    const src = SOURCE.exec(line);
    if (src) sources.push({ label: src[1].trim(), url: src[2] });
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return { sources, items };
}

const files = import.meta.glob<string>("../content/festivals/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const FESTIVAL_YEARS: FestivalYear[] = Object.entries(files)
  .map(([path, md]) => ({
    year: Number(/(\d{4})\.md$/.exec(path)?.[1]),
    ...parseFestivalMarkdown(md),
  }))
  .filter((y) => Number.isFinite(y.year))
  .sort((a, b) => a.year - b.year);
