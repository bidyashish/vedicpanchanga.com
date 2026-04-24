import { useI18n } from "@/i18n";
import { formatShortDate } from "@/lib/format";
import type { DashaPeriod } from "@/types/api";

export function DashaTable({ dasha }: { dasha: DashaPeriod[] }) {
  const { t } = useI18n();
  if (!dasha?.length) return null;
  return (
    <div
      data-testid="dasha-table"
      className="card p-4 sm:p-5"
    >
      <h3 className="heading-section">{t("dasha_title")}</h3>
      <p className="meta mb-3">{t("dasha_subtitle")}</p>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="eyebrow-lg border-b border-parchment-200">
            <th className="py-2 pr-3 font-bold">{t("dasha_lord")}</th>
            <th className="py-2 pr-3 font-bold">{t("dasha_years")}</th>
            <th className="py-2 pr-3 font-bold">{t("dasha_from")}</th>
            <th className="py-2 font-bold">{t("dasha_to")}</th>
          </tr>
        </thead>
        <tbody className="text-meta">
          {dasha.map((d, i) => (
            <tr key={i} className="border-b border-parchment-200 last:border-0">
              <td className="py-2 pr-3 font-semibold text-saffron">{d.lord}</td>
              <td className="py-2 pr-3 num">{d.years}</td>
              <td className="py-2 pr-3 num">{formatShortDate(d.start)}</td>
              <td className="py-2 num">{formatShortDate(d.end)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
