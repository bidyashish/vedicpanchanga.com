import { useState } from "react";
import { useI18n } from "@/i18n";
import { VedicChart } from "@/components/kundali/VedicChart";
import { SouthIndianChart } from "@/components/kundali/SouthIndianChart";
import { vargaName, vargaSubtitle } from "@/lib/vargas";
import type { ChartData } from "@/types/api";

interface Props {
  data: ChartData;
  chartStyle: "north" | "south";
}

export function ChartTabs({ data, chartStyle }: Props) {
  const { t, lang } = useI18n();
  const vargaKeys = data.varga_order ?? [1, 2, 9];
  const [tab, setTab] = useState<string>(`d${vargaKeys[0] ?? 1}`);
  const vargas = data.vargas ?? {};

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
    <div
      className="card card-lift p-5 lg:p-8"
      data-testid="chart-tabs"
    >
      <div
        role="tablist"
        className="flex gap-1 sm:gap-2 border-b border-parchment-200 mb-5 overflow-x-auto scrollbar-hide pb-0"
        data-testid="varga-tabs"
      >
        {vargaKeys.map((n) => {
          const key = `d${n}`;
          const v = vargas[key];
          const selected = tab === key;
          const label = v ? vargaName(n, v.name, lang) : "";
          return (
            <button
              key={key}
              data-testid={`tab-${key}`}
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(key)}
              className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex flex-col items-start min-w-[72px] ${
                selected
                  ? "text-crimson border-crimson"
                  : "text-ink-soft border-transparent hover:text-crimson"
              }`}
            >
              <span className="tracking-wide text-sm">D{n}</span>
              <span className="text-[10px] tracking-[0.06em] text-gold mt-0.5 normal-case">
                {label}
              </span>
            </button>
          );
        })}
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
