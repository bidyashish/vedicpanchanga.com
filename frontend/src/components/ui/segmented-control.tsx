import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: string;
  testId?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: SegmentedControlOption<T>[];
  ariaLabel?: string;
  className?: string;
  testId?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  testId,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(
        "inline-flex rounded-sm border border-parchment-200 overflow-hidden p-0.5 gap-0.5 bg-parchment-100 shrink-0",
        className,
      )}
    >
      {options.map((o) => {
        const isActive = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            data-testid={o.testId}
            onClick={() => onChange(o.id)}
            className={cn(
              "px-3 py-1.5 text-mini font-medium rounded-2xs transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-1",
              isActive
                ? "bg-parchment-50 text-saffron shadow-card"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
