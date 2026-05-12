import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { formatTime } from "@/lib/format";
import type { NallaNeramWindow } from "@/types/api";

interface Props {
  windows: NallaNeramWindow[];
  tz?: string;
  testId?: string;
}

export function NallaNeram({ windows, tz, testId }: Props) {
  const { t } = useI18n();
  const a = useAstro();

  if (!windows.length) {
    return <p className="meta italic">-</p>;
  }

  return (
    <table className="w-full text-sm" data-testid={testId}>
      <thead>
        <tr className="text-start text-ink-soft border-b border-parchment-200">
          <th className="py-1.5 pe-3 font-medium eyebrow">{t("col_planet")}</th>
          <th className="py-1.5 font-medium eyebrow num">{t("col_time")}</th>
        </tr>
      </thead>
      <tbody>
        {windows.map((w, i) => (
          <tr
            key={i}
            className="border-b border-parchment-200/60 last:border-0"
            data-testid={testId ? `${testId}-row-${i}` : undefined}
          >
            <td className="py-1.5 pe-3 font-serif text-ink">{a.planet(w.planet)}</td>
            <td className="py-1.5 num text-ink">
              {formatTime(w.start, tz)} – {formatTime(w.end, tz)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
