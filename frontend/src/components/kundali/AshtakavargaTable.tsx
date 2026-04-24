import { useI18n } from "@/i18n";
import { SIGN_SHORT } from "@/lib/planets";
import type { Ashtakavarga } from "@/types/api";

const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export function AshtakavargaTable({ ashtakavarga }: { ashtakavarga: Ashtakavarga }) {
  const { t } = useI18n();
  if (!ashtakavarga) return null;
  const { bav, sav } = ashtakavarga;
  return (
    <div
      data-testid="ashtakavarga-table"
      className="card p-4 sm:p-5 overflow-x-auto"
    >
      <h3 className="heading-section">{t("ashtakavarga_title")}</h3>
      <p className="meta mb-3">{t("ashtakavarga_sub")}</p>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="eyebrow-lg border-b border-parchment-200">
            <th className="py-2 px-2 text-left font-bold">{t("th_planet")}</th>
            {SIGN_SHORT.map((s) => (
              <th key={s} className="py-2 px-2 font-bold">{s}</th>
            ))}
            <th className="py-2 px-2 font-bold">{t("th_total")}</th>
          </tr>
        </thead>
        <tbody className="text-meta">
          {PLANET_ORDER.map((p) => {
            const row = bav[p] ?? [];
            const tot = row.reduce((a, b) => a + b, 0);
            return (
              <tr key={p} className="border-b border-parchment-200">
                <td className="py-2 px-2 text-left font-semibold text-ink">{p}</td>
                {row.map((v, i) => (
                  <td key={i} className="py-2 px-2 num">{v}</td>
                ))}
                <td className="py-2 px-2 num font-bold text-saffron">{tot}</td>
              </tr>
            );
          })}
          <tr className="border-t border-parchment-300 bg-parchment-100">
            <td className="py-2.5 px-2 text-left font-bold text-saffron">{t("sav")}</td>
            {sav.map((v, i) => (
              <td key={i} className="py-2.5 px-2 num font-bold text-ink">{v}</td>
            ))}
            <td className="py-2.5 px-2 num font-bold text-saffron">
              {sav.reduce((a, b) => a + b, 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
