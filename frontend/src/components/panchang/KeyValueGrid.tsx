import type { ReactNode } from "react";

/** Two-column label / value grid used by the calendar and lagna sections. */
export function KeyValueGrid({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between border-b border-parchment-200 py-1.5 gap-3 last:border-0 sm:[&:nth-last-child(2)]:border-0"
        >
          <span className="text-mini text-ink-soft">{r.label}</span>
          <span className="text-meta text-ink text-right font-medium num">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
