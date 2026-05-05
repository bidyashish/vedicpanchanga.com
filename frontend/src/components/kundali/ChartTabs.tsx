import { useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { VedicChart } from "@/components/kundali/VedicChart";
import { SouthIndianChart } from "@/components/kundali/SouthIndianChart";
import { WesternChart } from "@/components/kundali/WesternChart";
import { vargaName, vargaSubtitle } from "@/lib/vargas";
import type { ChartData } from "@/types/api";

interface Props {
  data: ChartData;
}

type ChartStyle = "north" | "south" | "west";

const STYLE_KEY = "jk_chart_style";

function loadStyle(): ChartStyle {
  if (typeof window === "undefined") return "north";
  const v = window.localStorage.getItem(STYLE_KEY);
  if (v === "south" || v === "west") return v;
  return "north";
}

export function ChartTabs({ data }: Props) {
  const { t, lang } = useI18n();
  const a = useAstro();
  const vargaKeys = data.varga_order ?? [1, 2, 9];
  const [tab, setTab] = useState<string>(`d${vargaKeys[0] ?? 1}`);
  const [chartStyle, setChartStyleState] = useState<ChartStyle>(loadStyle);
  const vargas = data.vargas ?? {};

  const setChartStyle = (s: ChartStyle) => {
    setChartStyleState(s);
    try {
      window.localStorage.setItem(STYLE_KEY, s);
    } catch {
      /* ignore quota errors */
    }
  };

  const active = vargas[tab] ?? {
    chart: data.d1_chart,
    asc_sign: data.d1_asc_sign,
    name: "Rashi",
    division: 1,
  };

  const activeName = vargaName(active.division, active.name, lang);
  const activeSubtitle = vargaSubtitle(active.division, active.subtitle, lang);

  const isWest = chartStyle === "west";

  return (
    <div className="card p-4 sm:p-5" data-testid="chart-tabs">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 pb-3 border-b border-parchment-200">
        <div
          role="tablist"
          aria-label={t("chart_style")}
          data-testid="chart-style-toggle"
          className="inline-flex rounded-sm border border-parchment-200 overflow-hidden p-0.5 gap-0.5 bg-parchment-100 shrink-0"
        >
          {[
            { id: "north" as const, label: t("north_indian") },
            { id: "south" as const, label: t("south_indian") },
            { id: "west" as const, label: t("western") },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={chartStyle === o.id}
              data-testid={`chart-style-${o.id}`}
              onClick={() => setChartStyle(o.id)}
              className={`px-3 py-1.5 text-mini font-medium rounded-2xs transition-colors whitespace-nowrap ${
                chartStyle === o.id
                  ? "bg-white text-saffron shadow-card"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

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
          />
        ) : (
          <VedicChart
            houseMap={active.chart}
            ascSign={active.asc_sign}
            title={`${activeName} · D${a.num(active.division)}`}
            testId={`chart-${tab}`}
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
