import { Calendar as CalendarIcon } from "lucide-react";

import { useI18n } from "@/i18n";
import { localeFor } from "@/lib/format";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const pad2 = (n: number) => String(n).padStart(2, "0");
const pad4 = (n: number) => String(n).padStart(4, "0");

function parseISO(iso: string | undefined | null): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return undefined;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

function toISO(d: Date): string {
  return `${pad4(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

interface Props {
  value: string;
  onChange: (iso: string) => void;
  testIdPrefix?: string;
  minYear?: number;
  maxYear?: number;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  testIdPrefix = "date",
  minYear = 1800,
  maxYear,
  placeholder = "Pick a date",
}: Props) {
  const { lang } = useI18n();
  const today = new Date();
  const ymax = maxYear ?? today.getFullYear() + 1;
  const selected = parseISO(value);
  const display = selected
    ? selected.toLocaleDateString(localeFor(lang), {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="field flex items-center justify-between gap-2 text-left"
          data-testid={`${testIdPrefix}-trigger`}
        >
          <span className={selected ? "" : "text-ink-muted"}>{display}</span>
          <CalendarIcon className="h-4 w-4 text-ink-muted shrink-0" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-auto">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => d && onChange(toISO(d))}
          startMonth={new Date(minYear, 0)}
          endMonth={new Date(ymax, 11)}
          defaultMonth={selected ?? new Date(today.getFullYear() - 30, today.getMonth())}
          today={today}
        />
      </PopoverContent>
    </Popover>
  );
}
