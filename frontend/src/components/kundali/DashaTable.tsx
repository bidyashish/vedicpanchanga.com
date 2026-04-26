import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { formatShortDate } from "@/lib/format";
import { planetColor } from "@/lib/planets";
import type { AntardashaPeriod, DashaPeriod, Mahadasha } from "@/types/api";

const DASHA_SEQUENCE = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
] as const;

const DASHA_YEARS: Record<string, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

type Level = "antar" | "pratyantar" | "sookshma" | "prana";

const NEXT_LEVEL: Record<Level, Level | null> = {
  antar: "pratyantar",
  pratyantar: "sookshma",
  sookshma: "prana",
  prana: null,
};

const LEVEL_SHORT: Record<Level, string> = {
  antar: "Antar",
  pratyantar: "Praty",
  sookshma: "Sūkṣ",
  prana: "Prāṇa",
};

const LEVEL_FULL: Record<Level, string> = {
  antar: "Antardaśā",
  pratyantar: "Pratyantar",
  sookshma: "Sūkṣma",
  prana: "Prāṇa",
};

interface SubPeriod {
  lord: string;
  start: string;
  end: string;
  years: number;
}

function addYears(iso: string, years: number): string {
  const t = new Date(iso).getTime() + years * 365.25 * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString();
}

function computeSubPeriods(parent: SubPeriod): SubPeriod[] {
  const seqStart = DASHA_SEQUENCE.indexOf(
    parent.lord as (typeof DASHA_SEQUENCE)[number],
  );
  if (seqStart < 0) return [];
  const out: SubPeriod[] = [];
  let cur = parent.start;
  for (let j = 0; j < 9; j++) {
    const lord = DASHA_SEQUENCE[(seqStart + j) % 9];
    const yrs = (parent.years * DASHA_YEARS[lord]) / 120;
    const end = addYears(cur, yrs);
    out.push({ lord, start: cur, end, years: yrs });
    cur = end;
  }
  return out;
}

function fmtYears(y: number): string {
  if (!Number.isFinite(y)) return "—";
  if (y >= 1) return y.toFixed(3).replace(/\.?0+$/, "");
  if (y >= 0.01) return y.toFixed(3).replace(/\.?0+$/, "");
  if (y >= 0.0001) return y.toFixed(4);
  return y.toExponential(2);
}

function isActive(period: { start: string; end: string }, now: number): boolean {
  return new Date(period.start).getTime() <= now && now < new Date(period.end).getTime();
}

interface PathItem {
  level: Level;
  parent: Mahadasha | SubPeriod;
  rows: (AntardashaPeriod | SubPeriod)[];
}

interface Props {
  dasha: DashaPeriod[];
  dashaAntar?: Mahadasha[];
}

export function DashaTable({ dasha, dashaAntar }: Props) {
  const { t } = useI18n();
  const [path, setPath] = useState<PathItem[]>([]);
  const now = useMemo(() => Date.now(), []);

  const mahadashas: Mahadasha[] = useMemo(() => {
    if (dashaAntar?.length) return dashaAntar;
    return dasha.map((d) => ({ ...d, antardashas: [] }));
  }, [dasha, dashaAntar]);

  if (!mahadashas.length) return null;

  const hasDrillData = !!dashaAntar?.length;
  const current = path[path.length - 1];
  const currentLevel: Level | null = current ? current.level : null;
  const rows: (DashaPeriod | AntardashaPeriod | SubPeriod)[] = current
    ? current.rows
    : mahadashas;

  // Breadcrumb: each path entry's `parent` lord plus the parent's *own* level
  // (the level that sits one step shallower than the rows being shown).
  const breadcrumb = path.map((p, idx) => {
    const parentLevelLabel = idx === 0 ? "Maha" : LEVEL_SHORT[path[idx - 1].level];
    return `${p.parent.lord} (${parentLevelLabel})`;
  });

  const subtitle = current
    ? `${breadcrumb.join(" › ")} — ${LEVEL_FULL[current.level]}`
    : t("dasha_subtitle");

  const lordHeader = currentLevel
    ? `${LEVEL_FULL[currentLevel]} ${t("dasha_lord_suffix")}`
    : t("dasha_lord");

  const onRowClick = (row: DashaPeriod | AntardashaPeriod | SubPeriod) => {
    if (!hasDrillData) return;
    if (!current) {
      const md = row as Mahadasha;
      if (!md.antardashas?.length) return;
      setPath([{ level: "antar", parent: md, rows: md.antardashas }]);
      return;
    }
    const next = NEXT_LEVEL[current.level];
    if (!next) return;
    const sub = row as SubPeriod;
    setPath([...path, { level: next, parent: sub, rows: computeSubPeriods(sub) }]);
  };

  const back = () => setPath(path.slice(0, -1));
  const clear = () => setPath([]);

  return (
    <div data-testid="dasha-table" className="card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="heading-section">{t("dasha_title")}</h3>
        {current && (
          <div className="flex items-center gap-3 text-mini">
            <button
              type="button"
              onClick={back}
              className="text-saffron hover:text-saffron-dark hover:underline font-semibold"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={clear}
              className="text-saffron hover:text-saffron-dark hover:underline font-semibold"
            >
              {t("clear")}
            </button>
          </div>
        )}
      </div>
      <p className="meta mb-3">{subtitle}</p>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="eyebrow-lg border-b border-parchment-200">
            <th className="py-2 pr-3 font-bold">{lordHeader}</th>
            <th className="py-2 pr-3 font-bold">{t("dasha_years")}</th>
            <th className="py-2 pr-3 font-bold">{t("dasha_from")}</th>
            <th className="py-2 font-bold">{t("dasha_to")}</th>
          </tr>
        </thead>
        <tbody className="text-meta">
          {rows.map((d, i) => {
            const active = isActive(d, now);
            const canDrill =
              hasDrillData &&
              (!current
                ? !!(d as Mahadasha).antardashas?.length
                : NEXT_LEVEL[current.level] !== null);
            return (
              <tr
                key={`${d.lord}-${i}-${d.start}`}
                onClick={() => canDrill && onRowClick(d)}
                className={[
                  "border-b border-parchment-200 last:border-0",
                  canDrill ? "cursor-pointer hover:bg-parchment-100/60" : "",
                  active ? "bg-saffron/10" : "",
                ].join(" ")}
              >
                <td
                  className="py-2 pr-3 font-semibold whitespace-nowrap"
                  style={{ color: planetColor(d.lord.slice(0, 2)) }}
                >
                  <span
                    className={[
                      "inline-block w-4 mr-1 text-saffron font-bold",
                      active ? "" : "invisible",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                  {d.lord}
                  {active && <span className="sr-only"> (current)</span>}
                </td>
                <td className="py-2 pr-3 num">{fmtYears(d.years)}</td>
                <td className="py-2 pr-3 num">{formatShortDate(d.start)}</td>
                <td className="py-2 num">{formatShortDate(d.end)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
