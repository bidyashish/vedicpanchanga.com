import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { planetColor } from "@/lib/planets";
import type { DrishtiData, Planet } from "@/types/api";

interface Props {
  planets: Planet[];
  ascendant: Planet;
  drishti?: DrishtiData;
  onSelectPlanet?: (abbr: string) => void;
}

export function PlanetsTable({ planets, ascendant, drishti, onSelectPlanet }: Props) {
  const { t } = useI18n();
  const a = useAstro();
  const rows = [ascendant, ...planets];
  return (
    <div data-testid="planets-table" className="card p-4 sm:p-5 overflow-x-auto">
      <h3 className="heading-section mb-3">{t("graha_positions")}</h3>
      <table className="w-full text-start border-collapse">
        <thead>
          <tr className="eyebrow-lg border-b border-parchment-200">
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_body")}</th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_sign")}</th>
            <th className="py-2 pe-3 font-bold num whitespace-nowrap text-start">
              {t("col_degree")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_lord")}</th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
              {t("col_nakshatra")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start w-16">
              {t("col_pada")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start w-16">
              {t("col_house")}
            </th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">{t("col_aspects")}</th>
            <th className="py-2 pe-3 font-bold whitespace-nowrap text-start">
              {t("col_retrograde")}
            </th>
            <th className="py-2 font-bold whitespace-nowrap text-start">{t("col_combust")}</th>
          </tr>
        </thead>
        <tbody className="text-meta">
          {rows.map((p) => (
            <tr
              key={p.name}
              className={`border-b border-parchment-200 last:border-0${onSelectPlanet ? " cursor-pointer hover:bg-parchment-50 transition-colors" : ""}`}
              onClick={onSelectPlanet ? () => onSelectPlanet(p.abbr) : undefined}
            >
              <td
                className="py-2 pe-3 font-semibold whitespace-nowrap text-start"
                style={{ color: planetColor(p.abbr) }}
              >
                {a.planet(p.name)}
              </td>
              <td className="py-2 pe-3 whitespace-nowrap text-start">{a.sign(p.sign)}</td>
              <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                {a.num(p.dms)}
              </td>
              <td className="py-2 pe-3 whitespace-nowrap text-start">{a.planet(p.sign_lord)}</td>
              <td className="py-2 pe-3 whitespace-nowrap text-start">{a.nakshatra(p.nakshatra)}</td>
              <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                {a.num(p.nakshatra_pada)}
              </td>
              <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                {a.num(p.house ?? "-")}
              </td>
              <td className="py-2 pe-3 num whitespace-nowrap tabular-nums text-start">
                {drishti?.by_planet[p.abbr]?.aspected_houses.map((h) => a.num(h)).join(", ") ?? "-"}
              </td>
              <td className="py-2 pe-3 whitespace-nowrap text-start">
                {p.retrograde && (
                  <span
                    className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold"
                    style={{
                      color: "var(--accent-amber)",
                      backgroundColor: "color-mix(in oklab, var(--accent-amber) 16%, transparent)",
                    }}
                  >
                    {t("pill_retrograde")}
                  </span>
                )}
              </td>
              <td className="py-2 whitespace-nowrap text-start">
                {p.combust && (
                  <span
                    className="inline-block rounded-2xs px-2 py-0.5 text-mini font-bold"
                    style={{
                      color: "var(--danger)",
                      backgroundColor: "color-mix(in oklab, var(--danger) 14%, transparent)",
                    }}
                  >
                    {t("pill_combust")}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
