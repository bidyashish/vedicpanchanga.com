import { formatTimeWithDate } from "@/lib/format";
import type { MuhurtaWindow } from "@/types/api";

export function TimeBand({
  title,
  window,
  color,
  desc,
  tz,
  refDate,
  testId,
}: {
  title: string;
  window?: MuhurtaWindow;
  color: string;
  desc?: string;
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
        <p className="eyebrow-lg" style={{ color }}>{title}</p>
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="value-strong num mt-0.5">
        {window
          ? `${formatTimeWithDate(window.start, tz, refDate)} — ${formatTimeWithDate(window.end, tz, refDate)}`
          : "—"}
      </p>
      {desc && <p className="meta mt-0.5">{desc}</p>}
    </div>
  );
}
