import { useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { VedicChart } from "@/components/kundali/VedicChart";
import { SouthIndianChart } from "@/components/kundali/SouthIndianChart";
import { WesternChart } from "@/components/kundali/WesternChart";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { vargaName, vargaSubtitle } from "@/lib/vargas";
import type { ChartData } from "@/types/api";

interface Props {
  data: ChartData;
}

type ChartStyle = "north" | "south" | "west";

const STYLE_KEY = "jk_chart_style";
const SHOW_DEGREE_KEY = "jk_show_degree";

function loadStyle(): ChartStyle {
  if (typeof window === "undefined") return "north";
  const v = window.localStorage.getItem(STYLE_KEY);
  if (v === "south" || v === "west") return v;
  return "north";
}

function loadShowDegree(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHOW_DEGREE_KEY) === "1";
}

export function ChartTabs({ data }: Props) {
  const { t, lang } = useI18n();
  const a = useAstro();
  const vargaKeys = data.varga_order ?? [1, 2, 9];
  const [tab, setTab] = useState<string>(`d${vargaKeys[0] ?? 1}`);
  const [chartStyle, setChartStyleState] = useState<ChartStyle>(loadStyle);
  const [showDegrees, setShowDegreesState] = useState<boolean>(loadShowDegree);
  const vargas = data.vargas ?? {};

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

  const active = vargas[tab] ?? {
    chart: data.d1_chart,
    asc_sign: data.d1_asc_sign,
    name: "Rashi",
    division: 1,
    planet_degrees: {} as Record<string, number>,
  };

  const activeName = vargaName(active.division, active.name, lang);
  const activeSubtitle = vargaSubtitle(active.division, active.subtitle, lang);

  // Per-varga sub-degrees come straight from the backend — see
  // backend/vargas.py::varga_degree_in_sign. Keep the frontend free of
  // astronomical math so the two implementations can't drift.
  const planetDegrees = active.planet_degrees;

  const isWest = chartStyle === "west";

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
      </div>

      <div className="bg-parchment-50 p-2 rounded-sm">
        {isWest ? (
          <WesternChart
            planets={data.planets_data}
            ascendant={data.ascendant}
            ascSign={data.d1_asc_sign}
            title={`Rashi Chakra · D${a.num(1)}`}
            testId="chart-west"
          />
        ) : chartStyle === "south" ? (
          <SouthIndianChart
            houseMap={active.chart}
            ascSign={active.asc_sign}
            title={`${activeName} · D${a.num(active.division)}`}
            testId={`chart-${tab}`}
            planetDegrees={planetDegrees}
            showDegrees={showDegrees}
          />
        ) : (
          <VedicChart
            houseMap={active.chart}
            ascSign={active.asc_sign}
            title={`${activeName} · D${a.num(active.division)}`}
            testId={`chart-${tab}`}
            planetDegrees={planetDegrees}
            showDegrees={showDegrees}
          />
        )}
        {!isWest && activeSubtitle && (
          <p className="text-center text-xs text-ink-soft mt-3 italic">{activeSubtitle}</p>
        )}
      </div>

      <p className="text-center text-xs text-ink-soft mt-4 italic">{t("lagna_caption")}</p>
    </div>
  );
}
