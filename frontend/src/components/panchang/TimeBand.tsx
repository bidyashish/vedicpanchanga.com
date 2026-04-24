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
      className="rounded-sm p-3 border"
      style={{ borderColor: color, backgroundColor: `${color}0D` }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] uppercase tracking-[0.15em] font-bold"
          style={{ color }}
        >
          {title}
        </p>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <p className="font-serif text-base text-ink tabular-nums mt-1">
        {window
          ? `${formatTimeWithDate(window.start, tz, refDate)} — ${formatTimeWithDate(window.end, tz, refDate)}`
          : "—"}
      </p>
      {desc && <p className="text-[10px] text-ink-soft mt-0.5 italic">{desc}</p>}
    </div>
  );
}
