import { useI18n } from "@/i18n";
import { formatTimeWithDate } from "@/lib/format";
import type { TransitItem } from "@/types/api";

/** Ordered list of tithi / nakshatra / yoga / karana transits for one day. */
export function TransitList({
  items,
  tz,
  refDate,
  labelFn,
  accent = "var(--ink)",
}: {
  items?: TransitItem[];
  tz?: string;
  refDate?: string;
  labelFn: (it: TransitItem) => string;
  accent?: string;
}) {
  const { t } = useI18n();
  if (!items?.length) return <div className="meta">-</div>;
  return (
    <ul className="divide-y divide-parchment-200">
      {items.map((it, i) => {
        const endIso = it.ends_at ?? it.end;
        const range = it.starts_at
          ? `${formatTimeWithDate(it.starts_at, tz, refDate)} → ${formatTimeWithDate(endIso, tz, refDate)}`
          : `${t("upto")} ${formatTimeWithDate(endIso, tz, refDate)}`;
        return (
          <li
            key={i}
            className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
          >
            <span className="text-meta font-medium" style={{ color: accent }}>
              {labelFn(it)}
            </span>
            <span className="text-mini text-ink-soft num sm:shrink-0">{range}</span>
          </li>
        );
      })}
    </ul>
  );
}
