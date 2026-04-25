import { useState } from "react";
import { useI18n } from "@/i18n";
import { VedicChart } from "@/components/kundali/VedicChart";
import { SouthIndianChart } from "@/components/kundali/SouthIndianChart";
import { vargaName, vargaSubtitle } from "@/lib/vargas";
import type { ChartData } from "@/types/api";

interface Props {
  data: ChartData;
}

const STYLE_KEY = "jk_chart_style";

function loadStyle(): "north" | "south" {
  if (typeof window === "undefined") return "north";
  const v = window.localStorage.getItem(STYLE_KEY);
  return v === "south" ? "south" : "north";
}

export function ChartTabs({ data }: Props) {
  const { t, lang } = useI18n();
  const vargaKeys = data.varga_order ?? [1, 2, 9];
  const [tab, setTab] = useState<string>(`d${vargaKeys[0] ?? 1}`);
  const [chartStyle, setChartStyleState] = useState<"north" | "south">(loadStyle);
  const vargas = data.vargas ?? {};

  const setChartStyle = (s: "north" | "south") => {
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
    name: "Rāśi",
    division: 1,
  };

  const activeName = vargaName(active.division, active.name, lang);
  const activeSubtitle = vargaSubtitle(active.division, active.subtitle, lang);

  const ChartComponent = chartStyle === "south" ? SouthIndianChart : VedicChart;

  return (
    <div className="card p-4 sm:p-5" data-testid="chart-tabs">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 pb-3 border-b border-parchment-200">
        {/* Chart style: North / South */}
        <div
          role="tablist"
          aria-label={t("chart_style")}
          data-testid="chart-style-toggle"
          className="inline-flex rounded-sm border border-parchment-200 overflow-hidden p-0.5 gap-0.5 bg-parchment-100 shrink-0"
        >
          {[
            { id: "north" as const, label: t("north_indian") },
            { id: "south" as const, label: t("south_indian") },
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

        {/* Varga dropdown */}
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
                D{n}{label ? ` — ${label}` : ""}
              </option>
            );
          })}
        </select>
      </div>

      <div className="bg-parchment-50 p-2 rounded-sm">
        <ChartComponent
          houseMap={active.chart}
          ascSign={active.asc_sign}
          title={`${activeName} · D${active.division}`}
          testId={`chart-${tab}`}
        />
        {activeSubtitle && (
          <p className="text-center text-xs text-ink-soft mt-3 italic">{activeSubtitle}</p>
        )}
      </div>

      <p className="text-center text-xs text-ink-soft mt-4 italic">{t("lagna_caption")}</p>
    </div>
  );
}
