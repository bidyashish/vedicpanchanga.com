import { useI18n } from "@/i18n";
import { planetColor } from "@/lib/planets";
import type { Planet } from "@/types/api";

interface Props {
  planets: Planet[];
  ascendant: Planet;
}

export function PlanetsTable({ planets, ascendant }: Props) {
  const { t } = useI18n();
  const rows = [ascendant, ...planets];
  return (
    <div
      data-testid="planets-table"
      className="card p-4 sm:p-5 overflow-x-auto"
    >
      <h3 className="heading-section mb-3">{t("graha_positions")}</h3>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="eyebrow-lg border-b border-parchment-200">
            <th className="py-2 pr-3 font-bold">Body</th>
            <th className="py-2 pr-3 font-bold">Sign</th>
            <th className="py-2 pr-3 font-bold num">Degree</th>
            <th className="py-2 pr-3 font-bold">Lord</th>
            <th className="py-2 pr-3 font-bold">Nakṣatra</th>
            <th className="py-2 pr-3 font-bold">Pāda</th>
            <th className="py-2 pr-3 font-bold">House</th>
            <th className="py-2 font-bold">R</th>
          </tr>
        </thead>
        <tbody className="text-meta">
          {rows.map((p) => (
            <tr key={p.name} className="border-b border-parchment-200 last:border-0">
              <td className="py-2 pr-3 font-semibold" style={{ color: planetColor(p.abbr) }}>
                {p.name}
              </td>
              <td className="py-2 pr-3">{p.sign}</td>
              <td className="py-2 pr-3 num">{p.dms}</td>
              <td className="py-2 pr-3">{p.sign_lord}</td>
              <td className="py-2 pr-3">{p.nakshatra}</td>
              <td className="py-2 pr-3 num">{p.nakshatra_pada}</td>
              <td className="py-2 pr-3 num">{p.house ?? "—"}</td>
              <td className="py-2 text-saffron font-bold">{p.retrograde ? "℞" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
