import { formatTime } from "@/lib/format";
import type { LabelledSegment } from "@/types/api";

interface Props {
  segments: LabelledSegment[];
  nameHeader: string;
  tz?: string;
  testId?: string;
}

export function SegmentTable({ segments, nameHeader, tz, testId }: Props) {
  if (!segments.length) {
    return <p className="meta italic">-</p>;
  }
  return (
    <table className="w-full text-sm" data-testid={testId}>
      <thead>
        <tr className="text-left text-ink-soft border-b border-parchment-200">
          <th className="py-1.5 pr-3 font-medium eyebrow">{nameHeader}</th>
          <th className="py-1.5 pr-3 font-medium eyebrow num">Time</th>
          <th className="py-1.5 font-medium eyebrow text-right">Result</th>
        </tr>
      </thead>
      <tbody>
        {segments.map((s, i) => (
          <tr
            key={i}
            className="border-b border-parchment-200/60 last:border-0"
            data-testid={testId ? `${testId}-row-${i}` : undefined}
          >
            <td className="py-1.5 pr-3 font-serif text-ink">{s.name}</td>
            <td className="py-1.5 pr-3 num text-ink">
              {formatTime(s.start, tz)} – {formatTime(s.end, tz)}
            </td>
            <td className="py-1.5 text-right">
              <span
                className="inline-block rounded-2xs px-2 py-0.5 text-mini font-medium"
                style={{
                  color: s.auspicious ? "var(--success)" : "var(--danger)",
                  backgroundColor: s.auspicious
                    ? "color-mix(in oklab, var(--success) 12%, transparent)"
                    : "color-mix(in oklab, var(--danger) 12%, transparent)",
                }}
              >
                {s.auspicious ? "Auspicious" : "Inauspicious"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
