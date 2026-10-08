import { formatTimeWithDate } from "@/lib/format";
import type { MuhurtaWindow } from "@/types/api";

export function TimeBand({
  title,
  window,
  color,
  desc,
  emptyText,
  tz,
  refDate,
  testId,
}: {
  title: string;
  window?: MuhurtaWindow | null;
  color: string;
  desc?: string;
  /** Shown instead of "-" when the window is absent for a known reason. */
  emptyText?: string;
  tz?: string;
  refDate?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-sm px-3 py-2.5 border-l-[3px] border bg-parchment-50 transition-colors hover:bg-parchment-100"
      style={{
        borderLeftColor: color,
        borderTopColor: "var(--border-soft)",
        borderRightColor: "var(--border-soft)",
        borderBottomColor: "var(--border-soft)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow-lg" style={{ color }}>
          {title}
        </p>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      </div>
      {window ? (
        <p className="value-strong num mt-0.5">
          {`${formatTimeWithDate(window.start, tz, refDate)} - ${formatTimeWithDate(window.end, tz, refDate)}`}
        </p>
      ) : emptyText ? (
        <p className="value mt-0.5">{emptyText}</p>
      ) : (
        <p className="value-strong num mt-0.5">-</p>
      )}
      {desc && <p className="meta mt-0.5">{desc}</p>}
    </div>
  );
}
