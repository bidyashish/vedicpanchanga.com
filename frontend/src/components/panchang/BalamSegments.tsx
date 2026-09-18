import { useI18n } from "@/i18n";
import { formatTimeWithDate } from "@/lib/format";

/**
 * One "good for ..." list per transit segment of the panchang day, labelled the
 * way DrikPanchang does: "<transit> · upto HH:MM" for every segment except the
 * last, which runs until the next sunrise.
 */
export function BalamSegments<T extends { ends_at: string }>({
  segments,
  heading,
  items,
  tz,
  refDate,
  serif = false,
}: {
  segments: T[];
  heading: (seg: T) => string;
  items: (seg: T) => string[];
  tz?: string;
  refDate?: string;
  serif?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        const until =
          i === segments.length - 1
            ? t("balam_next_sunrise")
            : `${t("upto")} ${formatTimeWithDate(seg.ends_at, tz, refDate)}`;
        return (
          <div key={i}>
            <p className="eyebrow num mb-1.5">
              {heading(seg)} · {until}
            </p>
            <div className="flex flex-wrap gap-2">
              {items(seg).map((name, j) => (
                <span key={j} className={serif ? "tag font-serif" : "tag"}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
