import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { ageBetween, formatShortDate } from "@/lib/format";
import { planetColor } from "@/lib/planets";
import type { AntardashaPeriod, DashaPeriod, Mahadasha, Planet } from "@/types/api";

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

const SIGN_OWNERS: Record<string, string[]> = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mars: ["Aries", "Scorpio"],
  Mercury: ["Gemini", "Virgo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Venus: ["Taurus", "Libra"],
  Saturn: ["Capricorn", "Aquarius"],
};

const NAK_LORD_CYCLE = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];

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
  sookshma: "Suksh",
  prana: "Prana",
};

const LEVEL_FULL: Record<Level, string> = {
  antar: "Antardasha",
  pratyantar: "Pratyantar",
  sookshma: "Sukshma",
  prana: "Prana",
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
  const seqStart = DASHA_SEQUENCE.indexOf(parent.lord as (typeof DASHA_SEQUENCE)[number]);
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

function fmtDuration(y: number): string {
  if (!Number.isFinite(y) || y < 0) return "-";
  const totalMonths = Math.round(y * 12 * 30) / 30;
  const years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths - years * 12;
  const months = Math.floor(remMonths);
  const days = Math.round((remMonths - months) * 30);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);
  return parts.join(" ");
}

function isActive(period: { start: string; end: string }, now: number): boolean {
  return new Date(period.start).getTime() <= now && now < new Date(period.end).getTime();
}

function getNakshatraLord(planetName: string, planets: Planet[]): string | null {
  const p = planets.find((pl) => pl.name === planetName || pl.abbr === planetName.slice(0, 2));
  if (!p) return null;
  return p.nakshatra_lord;
}

function computeBenefitBhavas(
  lord: string,
  planets: Planet[],
  ascendant: Planet | undefined,
): string {
  if (!planets.length || !ascendant) return "-";

  const allPlanets = [...planets, ascendant];
  const nakLord = getNakshatraLord(lord, allPlanets);

  const SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
  ];
  const ascSign = ascendant.sign_id;

  const bhavasFor = (name: string): number[] => {
    const p = allPlanets.find((pl) => pl.name === name);
    if (!p) return [];
    const result: number[] = [];
    if (p.house != null) result.push(p.house);
    const ownedSigns = SIGN_OWNERS[name];
    if (ownedSigns) {
      for (const sign of ownedSigns) {
        const signIdx = SIGNS.indexOf(sign);
        if (signIdx < 0) continue;
        const house = ((signIdx + 1 - ascSign + 12) % 12) + 1;
        if (!result.includes(house)) result.push(house);
      }
    }
    return result;
  };

  const seen = new Set<number>();
  const parts: string[] = [];
  if (nakLord) {
    for (const b of bhavasFor(nakLord)) {
      if (!seen.has(b)) {
        seen.add(b);
        parts.push(String(b));
      }
    }
  }
  for (const b of bhavasFor(lord)) {
    if (!seen.has(b)) {
      seen.add(b);
      parts.push(String(b));
    }
  }

  return parts.length > 0 ? parts.join(" | ") : "-";
}

interface PathItem {
  level: Level;
  parent: Mahadasha | SubPeriod;
  rows: (AntardashaPeriod | SubPeriod)[];
}

interface Props {
  dasha: DashaPeriod[];
  dashaAntar?: Mahadasha[];
  planets?: Planet[];
  ascendant?: Planet;
  birthIso?: string;
}

export function DashaTable({ dasha, dashaAntar, planets, ascendant, birthIso }: Props) {
  const { t } = useI18n();
  const a = useAstro();
  const [path, setPath] = useState<PathItem[]>([]);
  const now = useMemo(() => Date.now(), []);

  const mahadashas: Mahadasha[] = useMemo(() => {
    if (dashaAntar?.length) return dashaAntar;
    return dasha.map((d) => ({ ...d, antardashas: [] }));
  }, [dasha, dashaAntar]);

  const nakLordMap = useMemo(() => {
    if (!planets?.length) return new Map<string, string>();
    const allP = ascendant ? [...planets, ascendant] : planets;
    const m = new Map<string, string>();
    for (const lord of NAK_LORD_CYCLE) {
      const nl = getNakshatraLord(lord, allP);
      if (nl) m.set(lord, nl);
    }
    return m;
  }, [planets, ascendant]);

  if (!mahadashas.length) return null;

  const hasDrillData = !!dashaAntar?.length;
  const current = path[path.length - 1];
  const currentLevel: Level | null = current ? current.level : null;
  const rows: (DashaPeriod | AntardashaPeriod | SubPeriod)[] = current ? current.rows : mahadashas;

  const breadcrumb = path.map((p, idx) => {
    const parentLevelLabel = idx === 0 ? "Maha" : LEVEL_SHORT[path[idx - 1].level];
    return `${p.parent.lord} (${parentLevelLabel})`;
  });

  const subtitle = current
    ? `${breadcrumb.join(" › ")} - ${LEVEL_FULL[current.level]}`
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

  const showBenefitBhavas = !!planets?.length && !!ascendant;
  const showAge = !!birthIso;

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
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="eyebrow-lg border-b border-parchment-200">
              <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{lordHeader}</th>
              <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                {t("dasha_duration")}
              </th>
              <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                {t("dasha_from")}
              </th>
              <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("dasha_to")}</th>
              {showAge && (
                <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
                  {t("dasha_age")}
                </th>
              )}
              {showBenefitBhavas && (
                <th className="py-2 font-bold whitespace-nowrap text-start">
                  {t("dasha_benefit_bhavas")}
                </th>
              )}
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
              const nakLord = nakLordMap.get(d.lord);
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
                    className="py-2 pe-3 font-semibold whitespace-nowrap text-start"
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
                    {a.planet(d.lord)}
                    {nakLord && (
                      <span className="text-ink-muted font-normal"> ({a.planet(nakLord)})</span>
                    )}
                    {active && <span className="sr-only"> (current)</span>}
                  </td>
                  <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                    {a.num(fmtDuration(d.years))}
                  </td>
                  <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                    {a.num(formatShortDate(d.start))}
                  </td>
                  <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                    {a.num(formatShortDate(d.end))}
                  </td>
                  {showAge && (
                    <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                      {a.num(ageBetween(birthIso, d.start))}
                    </td>
                  )}
                  {showBenefitBhavas && (
                    <td className="py-2 num whitespace-nowrap tabular-nums text-start">
                      {computeBenefitBhavas(d.lord, planets!, ascendant)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
