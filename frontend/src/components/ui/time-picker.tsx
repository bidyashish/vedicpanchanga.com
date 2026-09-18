import { useEffect, useRef } from "react";
import { Clock } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { formatHHMM, meridiemLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

const pad2 = (n: number) => String(n).padStart(2, "0");
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function parseHHMM(hhmm: string | undefined | null): { h24: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return { h24: 12, m: 0 };
  return {
    h24: Math.min(Math.max(+m[1], 0), 23),
    m: Math.min(Math.max(+m[2], 0), 59),
  };
}

interface Props {
  value: string; // HH:MM 24h - stays Latin so the backend can parse it
  onChange: (hhmm: string) => void;
  testIdPrefix?: string;
  placeholder?: string;
}

export function TimePicker({ value, onChange, testIdPrefix = "time", placeholder }: Props) {
  const { t } = useI18n();
  const a = useAstro();
  const meridiem = meridiemLabels();
  const parsed = parseHHMM(value);
  const hasValue = !!/^(\d{1,2}):(\d{2})/.exec(value ?? "");
  const period: "AM" | "PM" = parsed.h24 >= 12 ? "PM" : "AM";
  const hh12 = parsed.h24 % 12 === 0 ? 12 : parsed.h24 % 12;

  const emit24 = (h24: number, mm: number) => {
    onChange(`${pad2(((h24 % 24) + 24) % 24)}:${pad2(((mm % 60) + 60) % 60)}`);
  };
  const emit = (h12: number, mm: number, p: "AM" | "PM") => {
    const base = h12 % 12;
    emit24(p === "PM" ? base + 12 : base, mm);
  };

  const display = hasValue ? formatHHMM(value) : (placeholder ?? t("tp_pick_time"));
  const periodLabel = (p: "AM" | "PM") => (p === "AM" ? meridiem.am : meridiem.pm);

  // Progressive digit entry on the trigger: typing "0930" -> 09:30. Buffer
  // resets after a short pause or once 4 digits are entered. Mirrors how the
  // native <input type="time"> accepts typed digits, which users expect.
  const digitsRef = useRef("");
  const digitTimer = useRef<number | undefined>(undefined);

  const commitDigits = (buf: string) => {
    if (buf.length < 2) return;
    const h = Math.min(23, +buf.slice(0, 2));
    const mm = buf.length >= 4 ? Math.min(59, +buf.slice(2, 4)) : parsed.m;
    emit24(h, mm);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      window.clearTimeout(digitTimer.current);
      digitsRef.current = (digitsRef.current + e.key).slice(-4);
      commitDigits(digitsRef.current);
      digitTimer.current = window.setTimeout(() => {
        digitsRef.current = "";
      }, 1200);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      emit24(parsed.h24 + (e.key === "ArrowUp" ? 1 : -1), parsed.m);
    }
  };

  const triggerAria = hasValue
    ? `${t("time_of_birth") || "Time"}: ${formatHHMM(value)}`
    : (placeholder ?? t("tp_pick_time"));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="field flex items-center justify-between gap-2 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-1"
          data-testid={`${testIdPrefix}-trigger`}
          aria-label={triggerAria}
          aria-haspopup="dialog"
          title={t("tp_hint")}
          onKeyDown={onTriggerKeyDown}
        >
          <span className={hasValue ? "" : "text-ink-muted"}>{display}</span>
          <Clock className="h-4 w-4 text-ink-muted shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3" aria-label={t("tp_pick_time")}>
        <div className="flex items-stretch gap-2 text-meta">
          <ScrollColumn
            label={t("tp_hour")}
            values={range(1, 12)}
            current={hh12}
            format={(v) => a.num(String(v))}
            onPick={(v) => emit(v, parsed.m, period)}
            testId={`${testIdPrefix}-hour`}
          />
          <ScrollColumn
            label={t("tp_minute")}
            values={range(0, 59)}
            current={parsed.m}
            format={(v) => a.num(pad2(v))}
            onPick={(v) => emit(hh12, v, period)}
            testId={`${testIdPrefix}-minute`}
          />
          <div className="flex flex-col gap-1" role="radiogroup" aria-label={t("tp_period")}>
            <span className="text-tiny text-ink-muted text-center mb-0.5">{t("tp_period")}</span>
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => emit(hh12, parsed.m, p)}
                data-testid={`${testIdPrefix}-period-${p.toLowerCase()}`}
                className={cn(
                  "px-3 py-1.5 rounded text-meta font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-1",
                  period === p ? "bg-saffron text-white" : "text-ink hover:bg-saffron/10",
                )}
              >
                {periodLabel(p)}
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
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Keep the selected value scrolled into view when the popover opens or the
  // value changes (e.g. via keyboard), so the current choice is never hidden.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center" });
  }, [current]);

  // Roving listbox: Up/Down move and pick the adjacent value (wrapping), so the
  // whole column is operable from the keyboard, not just by clicking.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = values.indexOf(current);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onPick(values[(idx + 1) % values.length]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onPick(values[(idx - 1 + values.length) % values.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      onPick(values[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onPick(values[values.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-tiny text-ink-muted text-center mb-0.5" id={`${testId}-label`}>
        {label}
      </span>
      <div
        className="h-44 w-14 overflow-y-auto rounded border border-parchment-200 bg-parchment-50 num text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
        data-testid={testId}
        role="listbox"
        aria-labelledby={`${testId}-label`}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {values.map((v) => {
          const active = v === current;
          return (
            <button
              key={v}
              type="button"
              ref={active ? activeRef : undefined}
              role="option"
              aria-selected={active}
              tabIndex={-1}
              onClick={() => onPick(v)}
              className={cn(
                "w-full py-1.5 transition-colors",
                active ? "bg-saffron text-white font-semibold" : "text-ink hover:bg-saffron/10",
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
