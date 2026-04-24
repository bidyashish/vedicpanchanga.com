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
      className="card p-5 lg:p-6 overflow-x-auto"
    >
      <h3 className="font-serif text-xl text-ink mb-1">{t("ashtakavarga_title")}</h3>
      <p className="text-xs text-ink-soft mb-4">{t("ashtakavarga_sub")}</p>
      <table className="w-full text-center border-collapse text-sm">
        <thead>
          <tr className="text-ink-soft uppercase text-[11px] tracking-wider border-b-2 border-parchment-200">
            <th className="py-2 px-2 text-left">{t("th_planet")}</th>
            {SIGN_SHORT.map((s) => (
              <th key={s} className="py-2 px-2">
                {s}
              </th>
            ))}
            <th className="py-2 px-2">{t("th_total")}</th>
          </tr>
        </thead>
        <tbody>
          {PLANET_ORDER.map((p) => {
            const row = bav[p] ?? [];
            const tot = row.reduce((a, b) => a + b, 0);
            return (
              <tr key={p} className="border-b border-parchment-200/60">
                <td className="py-2 px-2 text-left font-semibold text-ink">{p}</td>
                {row.map((v, i) => (
                  <td key={i} className="py-2 px-2 tabular-nums">
                    {v}
                  </td>
                ))}
                <td className="py-2 px-2 tabular-nums font-bold text-crimson">{tot}</td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-crimson/60 bg-parchment-100">
            <td className="py-2.5 px-2 text-left font-bold text-crimson">{t("sav")}</td>
            {sav.map((v, i) => (
              <td key={i} className="py-2.5 px-2 tabular-nums font-bold text-ink">
                {v}
              </td>
            ))}
            <td className="py-2.5 px-2 tabular-nums font-bold text-crimson">
              {sav.reduce((a, b) => a + b, 0)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
