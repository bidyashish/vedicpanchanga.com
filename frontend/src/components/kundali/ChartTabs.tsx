import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { VedicChart } from "@/components/kundali/VedicChart";
import type { PlanetStatus } from "@/components/kundali/VedicChart";
import { SouthIndianChart } from "@/components/kundali/SouthIndianChart";
import { WesternChart } from "@/components/kundali/WesternChart";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { vargaName, vargaSubtitle } from "@/lib/vargas";
import type { ChartData, Planet } from "@/types/api";

export const OUTER_ABBRS = new Set(["Ur", "Ne", "Pl"]);

export const HIDE_OUTER_KEY = "jk_hide_outer";

export function loadHideOuter(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(HIDE_OUTER_KEY);
  if (v === null) return true;
  return v === "1";
}

interface Props {
  data: ChartData;
  selectedPlanet: string | null;
  onSelectPlanet: (abbr: string | null) => void;
  onPlanetDetail?: (abbr: string, division: number) => void;
  hideOuter: boolean;
  onHideOuterChange: (v: boolean) => void;
  filteredPlanets: Planet[];
}

type ChartStyle = "north" | "south" | "west";

const STYLE_KEY = "jk_chart_style";
const SHOW_DEGREE_KEY = "jk_show_degree";
const SHOW_ASPECTS_KEY = "jk_show_aspects";

function defaultStyleFor(lang: string): "north" | "south" {
  // Tamil tradition reads the South Indian fixed-sign layout.
  return lang === "ta" ? "south" : "north";
}

function loadStyle(lang: string): ChartStyle {
  // Tamil always starts on the South Indian layout regardless of any stored
  // preference; an explicit toggle still works for the session.
  if (lang === "ta") return "south";
  if (typeof window === "undefined") return defaultStyleFor(lang);
  const v = window.localStorage.getItem(STYLE_KEY);
  if (v === "north" || v === "south" || v === "west") return v;
  return defaultStyleFor(lang);
}

export function chartStyleForPdf(lang: string): "north" | "south" {
  // Tamil always exports the South Indian layout - a stored UI preference
  // (possibly stale, from before the style existed) must not override the
  // language rule (issue #86). The API's chart_style field remains the
  // escape hatch for callers who explicitly want otherwise.
  if (lang === "ta") return "south";
  const s = loadStyle(lang);
  // The PDF has no Western wheel; fall back to the language default.
  return s === "west" ? defaultStyleFor(lang) : s;
}

function loadShowDegree(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHOW_DEGREE_KEY) === "1";
}

function loadShowAspects(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHOW_ASPECTS_KEY) === "1";
}

export function ChartTabs({
  data,
  selectedPlanet,
  onSelectPlanet,
  onPlanetDetail,
  hideOuter,
  onHideOuterChange,
  filteredPlanets,
}: Props) {
  const { t, lang } = useI18n();
  const a = useAstro();
  const vargaKeys = data.varga_order ?? [1, 2, 9];
  const [tab, setTab] = useState<string>(`d${vargaKeys[0] ?? 1}`);
  const [chartStyle, setChartStyleState] = useState<ChartStyle>(() => loadStyle(lang));
  const [showDegrees, setShowDegreesState] = useState<boolean>(loadShowDegree);
  const [showAspects, setShowAspectsState] = useState<boolean>(loadShowAspects);
  const didInitAspects = useRef(false);
  const vargas = data.vargas ?? {};

  useEffect(() => {
    if (didInitAspects.current) return;
    didInitAspects.current = true;
    if (showAspects && !selectedPlanet && data.drishti) {
      onSelectPlanet("Ma");
    }
  }, [showAspects, selectedPlanet, data.drishti, onSelectPlanet]);

  // Selecting Tamil always switches the displayed chart to the South Indian
  // layout (issue #86) - even over a stored preference, which may predate
  // the style and be stale. The user can still toggle away for the session.
  // Other languages follow their default only until a style is stored.
  useEffect(() => {
    if (lang === "ta") {
      setChartStyleState("south");
      return;
    }
    try {
      if (window.localStorage.getItem(STYLE_KEY)) return;
    } catch {
      /* ignore storage access errors */
    }
    setChartStyleState(defaultStyleFor(lang));
  }, [lang]);

  const setChartStyle = (s: ChartStyle) => {
    setChartStyleState(s);
    try {
      window.localStorage.setItem(STYLE_KEY, s);
    } catch {
      /* ignore quota errors */
    }
  };

  const setShowDegrees = (v: boolean) => {
    setShowDegreesState(v);
    try {
      window.localStorage.setItem(SHOW_DEGREE_KEY, v ? "1" : "0");
    } catch {
      /* ignore quota errors */
    }
  };

  const setShowAspects = (v: boolean) => {
    setShowAspectsState(v);
    if (v) {
      onSelectPlanet("Ma");
    } else {
      onSelectPlanet(null);
    }
    try {
      window.localStorage.setItem(SHOW_ASPECTS_KEY, v ? "1" : "0");
    } catch {
      /* ignore quota errors */
    }
  };

  const active = vargas[tab] ?? {
    chart: data.d1_chart,
    asc_sign: data.d1_asc_sign,
    name: "Rashi",
    division: 1,
    planet_degrees: {} as Record<string, number>,
  };

  const activeName = vargaName(active.division, active.name, lang);
  const activeSubtitle = vargaSubtitle(active.division, active.subtitle, lang);
  const planetDegrees = active.planet_degrees;
  const isWest = chartStyle === "west";
  const isD1 = tab === "d1";

  const filteredChart = useMemo(() => {
    if (!hideOuter) return active.chart;
    const out: Record<number, string[]> = {};
    for (const [h, abbrs] of Object.entries(active.chart)) {
      out[Number(h)] = abbrs.filter((a) => !OUTER_ABBRS.has(a));
    }
    return out;
  }, [active.chart, hideOuter]);

  const filteredDegrees = useMemo(() => {
    if (!hideOuter) return planetDegrees;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(planetDegrees)) {
      if (!OUTER_ABBRS.has(k)) out[k] = v;
    }
    return out;
  }, [planetDegrees, hideOuter]);

  const planetStatus = useMemo(() => {
    const map: Record<string, PlanetStatus> = {};
    for (const p of data.planets_data) {
      if (p.retrograde || p.combust) {
        map[p.abbr] = { retrograde: p.retrograde, combust: !!p.combust };
      }
    }
    return map;
  }, [data.planets_data]);

  const handleChartPlanetClick = useCallback(
    (abbr: string | null) => {
      if (showAspects) {
        onSelectPlanet(abbr);
      } else if (abbr && onPlanetDetail) {
        onPlanetDetail(abbr, active.division);
      }
    },
    [showAspects, onSelectPlanet, onPlanetDetail, active.division],
  );

  return (
    <div className="card p-4 sm:p-5" data-testid="chart-tabs">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 pb-3 border-b border-parchment-200">
        <SegmentedControl<ChartStyle>
          ariaLabel={t("chart_style")}
          testId="chart-style-toggle"
          value={chartStyle}
          onChange={setChartStyle}
          options={[
            { id: "north", label: t("north_indian"), testId: "chart-style-north" },
            { id: "south", label: t("south_indian"), testId: "chart-style-south" },
            { id: "west", label: t("western"), testId: "chart-style-west" },
          ]}
        />

        {!isWest && (
          <>
            <label className="sr-only" htmlFor="varga-select">
              Divisional chart
            </label>
            <select
              id="varga-select"
              data-testid="varga-select"
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              className="field num flex-1 min-w-[180px] sm:max-w-xs"
            >
              {vargaKeys.map((n) => {
                const key = `d${n}`;
                const v = vargas[key];
                const label = v ? vargaName(n, v.name, lang) : "";
                return (
                  <option key={key} value={key}>
                    D{a.num(n)}
                    {label ? ` - ${label}` : ""}
                  </option>
                );
              })}
            </select>
          </>
        )}

        {!isWest && (
          <label
            data-testid="show-degree-toggle"
            className="inline-flex items-center gap-2 text-mini font-medium text-ink-soft cursor-pointer select-none shrink-0"
          >
            <span>{t("show_degree")}</span>
            <Switch
              checked={showDegrees}
              onCheckedChange={setShowDegrees}
              aria-label={t("show_degree")}
              data-testid="show-degree-switch"
            />
          </label>
        )}

        {!isWest && isD1 && data.drishti && (
          <label
            data-testid="show-aspects-toggle"
            className="inline-flex items-center gap-2 text-mini font-medium text-ink-soft cursor-pointer select-none shrink-0"
          >
            <span>{t("drishti_show")}</span>
            <Switch
              checked={showAspects}
              onCheckedChange={setShowAspects}
              aria-label={t("drishti_show")}
              data-testid="show-aspects-switch"
            />
          </label>
        )}

        <label
          data-testid="hide-outer-toggle"
          className="inline-flex items-center gap-2 text-mini font-medium text-ink-soft cursor-pointer select-none shrink-0"
        >
          <span>{t("hide_outer")}</span>
          <Switch
            checked={hideOuter}
            onCheckedChange={onHideOuterChange}
            aria-label={t("hide_outer")}
            data-testid="hide-outer-switch"
          />
        </label>
      </div>

      <div className="bg-parchment-50 p-2 rounded-sm">
        {isWest ? (
          <WesternChart
            planets={filteredPlanets}
            ascendant={data.ascendant}
            ascSign={data.d1_asc_sign}
            title={`Rashi Chakra · D${a.num(1)}`}
            testId="chart-west"
            onSelectPlanet={onPlanetDetail ? (abbr: string) => onPlanetDetail(abbr, 1) : undefined}
          />
        ) : chartStyle === "south" ? (
          <SouthIndianChart
            houseMap={filteredChart}
            ascSign={active.asc_sign}
            title={`${activeName} · D${a.num(active.division)}`}
            testId={`chart-${tab}`}
            planetDegrees={filteredDegrees}
            planetStatus={isD1 ? planetStatus : undefined}
            showDegrees={showDegrees}
            selectedPlanet={isD1 && showAspects ? selectedPlanet : null}
            onSelectPlanet={handleChartPlanetClick}
            drishti={isD1 ? data.drishti : undefined}
            showAspects={isD1 && showAspects}
          />
        ) : (
          <VedicChart
            houseMap={filteredChart}
            ascSign={active.asc_sign}
            title={`${activeName} · D${a.num(active.division)}`}
            testId={`chart-${tab}`}
            planetDegrees={filteredDegrees}
            planetStatus={isD1 ? planetStatus : undefined}
            showDegrees={showDegrees}
            selectedPlanet={isD1 && showAspects ? selectedPlanet : null}
            onSelectPlanet={handleChartPlanetClick}
            drishti={isD1 ? data.drishti : undefined}
            showAspects={isD1 && showAspects}
          />
        )}
        {!isWest && activeSubtitle && (
          <p className="text-center text-xs text-ink-soft mt-3 italic">{activeSubtitle}</p>
        )}
        {!isWest && onPlanetDetail && (
          <p className="text-center text-xs mt-3 italic" style={{ color: "var(--accent-amber)" }}>
            {t("drishti_hint")}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-ink-soft mt-4 italic">{t("lagna_caption")}</p>
    </div>
  );
}
