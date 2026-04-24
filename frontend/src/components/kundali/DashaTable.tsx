import { useI18n } from "@/i18n";
import { formatShortDate } from "@/lib/format";
import type { DashaPeriod } from "@/types/api";

export function DashaTable({ dasha }: { dasha: DashaPeriod[] }) {
  const { t } = useI18n();
  if (!dasha?.length) return null;
  return (
    <div
      data-testid="dasha-table"
      className="card p-5 lg:p-6"
    >
      <h3 className="font-serif text-xl text-ink mb-1">{t("dasha_title")}</h3>
      <p className="text-xs text-ink-soft mb-4">{t("dasha_subtitle")}</p>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="text-ink-soft uppercase text-[11px] tracking-wider border-b-2 border-parchment-200">
            <th className="py-2 pr-3">{t("dasha_lord")}</th>
            <th className="py-2 pr-3">{t("dasha_years")}</th>
            <th className="py-2 pr-3">{t("dasha_from")}</th>
            <th className="py-2">{t("dasha_to")}</th>
          </tr>
        </thead>
        <tbody>
          {dasha.map((d, i) => (
            <tr key={i} className="border-b border-parchment-200/60 last:border-0">
              <td className="py-2.5 pr-3 font-semibold text-crimson">{d.lord}</td>
              <td className="py-2.5 pr-3 tabular-nums">{d.years}</td>
              <td className="py-2.5 pr-3 tabular-nums">{formatShortDate(d.start)}</td>
              <td className="py-2.5 tabular-nums">{formatShortDate(d.end)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
