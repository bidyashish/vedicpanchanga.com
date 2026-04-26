import { Clock } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const pad2 = (n: number) => String(n).padStart(2, "0");
const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);

function parseHHMM(hhmm: string | undefined | null): { h24: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return { h24: 12, m: 0 };
  return {
    h24: Math.min(Math.max(+m[1], 0), 23),
    m: Math.min(Math.max(+m[2], 0), 59),
  };
}

interface Props {
  value: string; // HH:MM 24h
  onChange: (hhmm: string) => void;
  testIdPrefix?: string;
  placeholder?: string;
}

export function TimePicker({
  value,
  onChange,
  testIdPrefix = "time",
  placeholder = "Pick a time",
}: Props) {
  const parsed = parseHHMM(value);
  const hasValue = !!/^(\d{1,2}):(\d{2})/.exec(value ?? "");
  const period: "AM" | "PM" = parsed.h24 >= 12 ? "PM" : "AM";
  const hh12 = parsed.h24 % 12 === 0 ? 12 : parsed.h24 % 12;

  const emit = (h12: number, mm: number, p: "AM" | "PM") => {
    const base = h12 % 12;
    const out24 = p === "PM" ? base + 12 : base;
    onChange(`${pad2(out24)}:${pad2(mm)}`);
  };

  const display = hasValue
    ? `${hh12}:${pad2(parsed.m)} ${period}`
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="field flex items-center justify-between gap-2 text-left"
          data-testid={`${testIdPrefix}-trigger`}
        >
          <span className={hasValue ? "" : "text-ink-muted"}>{display}</span>
          <Clock className="h-4 w-4 text-ink-muted shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex items-stretch gap-2 text-meta">
          <ScrollColumn
            label="Hour"
            values={range(1, 12)}
            current={hh12}
            format={(v) => String(v)}
            onPick={(v) => emit(v, parsed.m, period)}
            testId={`${testIdPrefix}-hour`}
          />
          <ScrollColumn
            label="Min"
            values={range(0, 59)}
            current={parsed.m}
            format={(v) => pad2(v)}
            onPick={(v) => emit(hh12, v, period)}
            testId={`${testIdPrefix}-minute`}
          />
          <div className="flex flex-col gap-1">
            <span className="text-tiny text-ink-muted text-center mb-0.5">AM/PM</span>
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => emit(hh12, parsed.m, p)}
                data-testid={`${testIdPrefix}-period-${p.toLowerCase()}`}
                className={cn(
                  "px-3 py-1.5 rounded text-meta font-semibold transition-colors",
                  period === p
                    ? "bg-saffron text-white"
                    : "text-ink hover:bg-saffron/10",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ScrollColumn({
  label,
  values,
  current,
  format,
  onPick,
  testId,
}: {
  label: string;
  values: number[];
  current: number;
  format: (v: number) => string;
  onPick: (v: number) => void;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-tiny text-ink-muted text-center mb-0.5">{label}</span>
      <div
        className="h-44 w-14 overflow-y-auto rounded border border-parchment-200 bg-parchment-50 num text-center"
        data-testid={testId}
      >
        {values.map((v) => {
          const active = v === current;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onPick(v)}
              className={cn(
                "w-full py-1.5 transition-colors",
                active
                  ? "bg-saffron text-white font-semibold"
                  : "text-ink hover:bg-saffron/10",
              )}
            >
              {format(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
