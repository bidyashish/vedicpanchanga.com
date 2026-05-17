import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { planetColor } from "@/lib/planets";
import { formatLongDate, formatTime } from "@/lib/format";
import type { TransitEvent } from "@/types/api";

interface Props {
  events: TransitEvent[];
  tz: string;
}

// Slow planets get the prominent "ringed" marker - their sign ingresses are
// rare (months to years apart) and astrologically weighty in Vedic tradition.
const SLOW_PLANETS = new Set(["Jupiter", "Saturn", "Rahu", "Ketu", "Uranus", "Neptune", "Pluto"]);

function eventColor(event: TransitEvent): string {
  if (event.event_type === "retrograde") return "var(--danger)";
  if (event.event_type === "direct") return "var(--success)";
  if (event.event_type === "sign_ingress" && SLOW_PLANETS.has(event.planet)) {
    return "var(--accent-amber)";
  }
  return "var(--success)";
}

function MarkerIcon({ event }: { event: TransitEvent }) {
  const color = eventColor(event);
  if (event.event_type === "retrograde" || event.event_type === "direct") {
    // Circular arrow glyph - rotates clockwise for direct, counter for retrograde
    const flip = event.event_type === "retrograde";
    return (
      <span
        className="relative inline-flex items-center justify-center w-7 h-7 rounded-full"
        style={{ backgroundColor: color, color: "white" }}
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
             style={{ transform: flip ? "scaleX(-1)" : undefined }}>
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </span>
    );
  }
  if (event.event_type === "sign_ingress" && SLOW_PLANETS.has(event.planet)) {
    // Bullseye - matches the reference image's Jupiter marker
    return (
      <span
        className="relative inline-flex items-center justify-center w-7 h-7 rounded-full"
        style={{ backgroundColor: "white", border: `2.5px solid ${color}` }}
        aria-hidden="true"
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
    );
  }
  // Plain colored dot
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full ring-4 ring-[var(--surface)]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export function TransitTimeline({ events, tz }: Props) {
  const { t } = useI18n();
  const a = useAstro();

  // Group consecutive events by date so we don't repeat "May 29, 2026" three
  // times when Mercury, Venus and Mars all change something on the same day.
  const grouped = useMemo(() => {
    const out: Array<{ dateKey: string; iso: string; items: TransitEvent[] }> = [];
    for (const ev of events) {
      const dateKey = ev.date_local.slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.dateKey === dateKey) {
        last.items.push(ev);
      } else {
        out.push({ dateKey, iso: ev.date_local, items: [ev] });
      }
    }
    return out;
  }, [events]);

  if (!events.length) {
    return <p className="meta italic text-center py-10">{t("transits_no_events")}</p>;
  }

  return (
    <div className="relative w-full mx-auto max-w-3xl py-2">
      {/* Today marker pinned to the top */}
      <div className="flex justify-center mb-3">
        <span
          className="inline-flex items-center px-4 py-1 rounded-md text-meta font-semibold text-white"
          style={{ backgroundColor: "var(--success)" }}
        >
          {t("transits_today")}
        </span>
      </div>

      {/* The central spine - absolute so event rows can hug it from both sides */}
      <div
        className="absolute left-1/2 top-9 bottom-0 -translate-x-1/2 w-0.5"
        style={{ backgroundColor: "var(--success)" }}
        aria-hidden="true"
      />

      <ol className="space-y-5 sm:space-y-7 relative">
        {grouped.map((group, gi) => {
          const isLeft = gi % 2 === 1;
          const firstEvent = group.items[0];
          return (
            <li
              key={`${group.dateKey}-${gi}`}
              className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-4"
              data-testid={`transit-row-${gi}`}
            >
              {/* Left half */}
              <div className={`text-end ${isLeft ? "" : "invisible md:visible md:opacity-0"}`}>
                {isLeft && (
                  <EventBlock
                    items={group.items}
                    iso={firstEvent.date_local}
                    tz={tz}
                    align="end"
                    eventColor={eventColor}
                    a={a}
                    t={t}
                  />
                )}
              </div>

              {/* Center marker - the dot/icon sits exactly on the spine */}
              <div className="relative flex flex-col items-center pt-1.5">
                <MarkerIcon event={firstEvent} />
              </div>

              {/* Right half */}
              <div className={`text-start ${!isLeft ? "" : "invisible md:visible md:opacity-0"}`}>
                {!isLeft && (
                  <EventBlock
                    items={group.items}
                    iso={firstEvent.date_local}
                    tz={tz}
                    align="start"
                    eventColor={eventColor}
                    a={a}
                    t={t}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EventBlock({
  items,
  iso,
  tz,
  align,
  eventColor,
  a,
  t,
}: {
  items: TransitEvent[];
  iso: string;
  tz: string;
  align: "start" | "end";
  eventColor: (e: TransitEvent) => string;
  a: ReturnType<typeof useAstro>;
  t: (k: string) => string;
}) {
  const dateLabel = formatLongDate(iso.slice(0, 10));
  return (
    <div className={`flex flex-col gap-1 ${align === "end" ? "items-end" : "items-start"}`}>
      <p className="text-mini uppercase tracking-widest text-ink-soft font-medium">
        {dateLabel}
      </p>
      <ul className={`space-y-1 ${align === "end" ? "text-end" : "text-start"}`}>
        {items.map((ev, i) => (
          <li key={i} className="text-meta sm:text-lead leading-snug">
            <span className="font-serif font-semibold" style={{ color: planetColor(ev.abbr) }}>
              {a.planet(ev.planet)}
            </span>{" "}
            <span className="text-ink">{describeEvent(ev, a, t)}</span>
            <span className="text-mini text-ink-soft num ms-1.5">
              {formatTime(ev.date_local, tz)}
            </span>
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-2xs text-mini font-medium"
          style={{
            color: eventColor(items[0]),
            backgroundColor: "color-mix(in oklab, var(--ink-soft) 8%, transparent)",
          }}
        >
          {items.length} {t("transits_events_short")}
        </span>
      )}
    </div>
  );
}

function describeEvent(
  ev: TransitEvent,
  a: ReturnType<typeof useAstro>,
  t: (k: string) => string,
): string {
  switch (ev.event_type) {
    case "sign_ingress":
      return `${t("transits_enters")} ${a.sign(ev.to_sign ?? "")}`;
    case "nakshatra_ingress":
      return `${t("transits_enters")} ${a.nakshatra(ev.to_nakshatra ?? "")} ${t("transits_nakshatra")}`;
    case "retrograde":
      return `${t("transits_retrogrades_in")} ${a.sign(ev.in_sign ?? "")}`;
    case "direct":
      return `${t("transits_direct_in")} ${a.sign(ev.in_sign ?? "")}`;
    default:
      return "";
  }
}
