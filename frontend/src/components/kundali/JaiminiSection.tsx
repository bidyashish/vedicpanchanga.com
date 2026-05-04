import { useI18n } from "@/i18n";
import { VedicChart } from "@/components/kundali/VedicChart";
import { useAstro } from "@/i18n/astro";
import { planetColor } from "@/lib/planets";
import type { JaiminiChart, Karaka } from "@/types/api";

interface Props {
  karakas?: Karaka[];
  karakamsa?: JaiminiChart;
  swamsa?: JaiminiChart;
}

export function JaiminiSection({ karakas, karakamsa, swamsa }: Props) {
  const { t } = useI18n();
  const a = useAstro();
  if (!karakas?.length && !karakamsa && !swamsa) return null;

  return (
    <div data-testid="jaimini-section" className="card p-4 sm:p-5 space-y-5">
      <div>
        <h3 className="heading-section">{t("jaimini_title")}</h3>
        <p className="meta">{t("jaimini_subtitle")}</p>
      </div>

      {karakas && karakas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="eyebrow-lg border-b border-parchment-200">
                <th className="py-2 pr-3 font-bold">{t("karaka_rank")}</th>
                <th className="py-2 pr-3 font-bold">{t("karaka_role")}</th>
                <th className="py-2 pr-3 font-bold">{t("karaka_planet")}</th>
                <th className="py-2 pr-3 font-bold">{t("karaka_sign")}</th>
                <th className="py-2 font-bold">{t("karaka_degree")}</th>
              </tr>
            </thead>
            <tbody className="text-meta">
              {karakas.map((k) => (
                <tr key={k.abbr} className="border-b border-parchment-200 last:border-0">
                  <td className="py-2 pr-3 num font-semibold text-saffron">{k.abbr}</td>
                  <td className="py-2 pr-3">{k.title}</td>
                  <td
                    className="py-2 pr-3 font-semibold"
                    style={{ color: planetColor(k.planet_abbr) }}
                  >
                    {a.planet(k.planet)}
                  </td>
                  <td className="py-2 pr-3">{a.sign(k.sign)}</td>
                  <td className="py-2 num">{a.num(k.dms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(karakamsa || swamsa) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {karakamsa && (
            <VedicChart
              houseMap={karakamsa.chart}
              ascSign={karakamsa.lagna_sign}
              title={t("karakamsa_title")}
              testId="karakamsa-chart"
            />
          )}
          {swamsa && (
            <VedicChart
              houseMap={swamsa.chart}
              ascSign={swamsa.lagna_sign}
              title={t("swamsa_title")}
              testId="swamsa-chart"
            />
          )}
        </div>
      )}
    </div>
  );
}
