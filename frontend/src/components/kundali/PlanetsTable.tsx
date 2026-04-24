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
      className="card p-5 lg:p-6 overflow-x-auto"
    >
      <h3 className="font-serif text-xl text-ink mb-4">{t("graha_positions")}</h3>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="text-ink-soft uppercase text-[11px] tracking-wider border-b-2 border-parchment-200">
            <th className="py-2 pr-3">Body</th>
            <th className="py-2 pr-3">Sign</th>
            <th className="py-2 pr-3 tabular-nums">Degree</th>
            <th className="py-2 pr-3">Lord</th>
            <th className="py-2 pr-3">Nakṣatra</th>
            <th className="py-2 pr-3">Pāda</th>
            <th className="py-2 pr-3">House</th>
            <th className="py-2">R</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.name} className="border-b border-parchment-200/60 last:border-0">
              <td className="py-2.5 pr-3 font-semibold" style={{ color: planetColor(p.abbr) }}>
                {p.name}
              </td>
              <td className="py-2.5 pr-3">{p.sign}</td>
              <td className="py-2.5 pr-3 tabular-nums">{p.dms}</td>
              <td className="py-2.5 pr-3">{p.sign_lord}</td>
              <td className="py-2.5 pr-3">{p.nakshatra}</td>
              <td className="py-2.5 pr-3 tabular-nums">{p.nakshatra_pada}</td>
              <td className="py-2.5 pr-3 tabular-nums">{p.house ?? "—"}</td>
              <td className="py-2.5 text-crimson font-bold">{p.retrograde ? "℞" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
