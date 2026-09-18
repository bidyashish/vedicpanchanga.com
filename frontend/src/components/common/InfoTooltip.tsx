import { useRef, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Reusable "?" info trigger with an accessible tooltip/popover.
//
// Why a Popover and not a CSS-hover title: this opens on hover *and* on
// click/tap/focus, so it works on touch devices and for keyboard users (a
// pure :hover tooltip is unreachable on mobile and by keyboard). Drop it next
// to any heading or label:
//
//   <InfoTooltip label="What is this?">Explanatory text...</InfoTooltip>
//
// `label` is the accessible name announced to screen readers and used as the
// button's aria-label. `children` is the tooltip body (string or rich nodes).
export function InfoTooltip({
  label,
  children,
  side = "top",
  align = "center",
  className,
  iconClassName,
  testId,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  iconClassName?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  // Small grace delay so moving the pointer from the icon into the panel does
  // not flicker it shut.
  const closeTimer = useRef<number | undefined>(undefined);

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-testid={testId}
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={cn(
            "inline-grid place-items-center w-4 h-4 rounded-full align-middle shrink-0",
            "border border-parchment-300 text-ink-soft text-mini leading-none font-semibold",
            "hover:border-saffron hover:text-saffron focus:outline-hidden focus:ring-2 focus:ring-saffron/30 transition-colors cursor-help",
            iconClassName,
          )}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9.1 9a2.9 2.9 0 1 1 4 2.7c-.9.5-1.6 1.2-1.6 2.3v.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        role="tooltip"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        // Keep focus on the trigger so hover-open does not steal it.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn("max-w-[16rem] text-meta leading-relaxed text-ink-soft", className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
