import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { FESTIVAL_YEARS, type FestivalItem } from "@/lib/festivals";
import { formatLongDate, localeFor, todayISO } from "@/lib/format";

/**
 * Static, content-driven festival calendar (see lib/festivals.ts). One year
 * at a time, grouped by month; dates before today are collapsed behind a
 * toggle so the page opens on what is coming up.
 */
export function FestivalsPage() {
  const { t, lang } = useI18n();
  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));

  const [year, setYear] = useState<number>(
    () =>
      FESTIVAL_YEARS.find((y) => y.year === currentYear)?.year ??
      FESTIVAL_YEARS.find((y) => y.year > currentYear)?.year ??
      FESTIVAL_YEARS[FESTIVAL_YEARS.length - 1]?.year ??
      currentYear,
  );
  const [showPast, setShowPast] = useState(false);

  const data = FESTIVAL_YEARS.find((y) => y.year === year);
  const items = data?.items ?? [];

  const fmt = useMemo(() => {
    const loc = localeFor(lang);
    return {
      day: new Intl.DateTimeFormat(loc, { day: "numeric" }),
      weekday: new Intl.DateTimeFormat(loc, { weekday: "short" }),
      month: new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }),
    };
  }, [lang]);

  const upcoming = useMemo(() => items.filter((i) => i.date >= today), [items, today]);
  const pastCount = items.length - upcoming.length;
  const visible = showPast || pastCount === 0 ? items : upcoming;
  const nextUp = upcoming.slice(0, 3);

  const months = useMemo(() => {
    const out: Array<{ key: string; label: string; items: FestivalItem[] }> = [];
    for (const it of visible) {
      const key = it.date.slice(0, 7);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(it);
      else out.push({ key, label: fmt.month.format(noon(it.date)), items: [it] });
    }
    return out;
  }, [visible, fmt]);

  return (
    <section data-testid="festivals-view" className="pt-3 sm:pt-4 pb-8 space-y-3">
      <div className="card p-3 sm:p-4 lg:p-5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow-accent">{t("festivals_eyebrow")}</p>
            <h2 className="heading-page mt-0.5">{t("festivals_title")}</h2>
            <p className="text-meta text-ink-soft mt-1">{t("festivals_subtitle")}</p>
          </div>
          {FESTIVAL_YEARS.length > 1 && (
            <div className="flex gap-1.5" role="tablist" aria-label={t("festivals_eyebrow")}>
              {FESTIVAL_YEARS.map((y) => (
                <button
                  key={y.year}
                  role="tab"
                  aria-selected={y.year === year}
                  data-testid={`festivals-year-${y.year}`}
                  className={`num ${y.year === year ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => {
                    setYear(y.year);
                    setShowPast(false);
                  }}
                >
                  {y.year}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-mini text-ink-soft mt-3">
          {t("festivals_location_note")}
          {data && data.sources.length > 0 && (
            <>
              {" "}
              {t("festivals_source")}:{" "}
              {data.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && " · "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                    {s.label}
                  </a>
                </span>
              ))}
            </>
          )}
        </p>
      </div>

      {nextUp.length > 0 && (
        <div className="card p-3 sm:p-4 lg:p-5" data-testid="festivals-next-up">
          <p className="eyebrow mb-2">{t("festivals_next_up")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nextUp.map((it) => (
              <div key={`${it.date}-${it.name}`} className="card-body">
                <p className="text-mini text-ink-soft num">{formatLongDate(it.date)}</p>
                <p className="font-serif text-lg leading-snug mt-0.5">{it.name}</p>
                <p className="text-meta text-ink-soft mt-0.5">{it.tithi}</p>
                {it.series && <span className="tag mt-1.5">{it.series}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-3 sm:p-4 lg:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
          <div className="text-meta text-ink-soft">
            <span className="font-semibold text-ink num">{visible.length}</span>{" "}
            {t("festivals_dates_short")}
          </div>
          {pastCount > 0 && (
            <button
              type="button"
              className="btn-ghost text-meta"
              data-testid="festivals-toggle-past"
              onClick={() => setShowPast((v) => !v)}
            >
              {showPast ? t("festivals_hide_past") : t("festivals_show_past")}
            </button>
          )}
        </div>

        {items.length === 0 && (
          <p className="meta italic text-center py-10">{t("festivals_none")}</p>
        )}

        {months.map((m) => (
          <div key={m.key} className="mt-4 first:mt-0">
            <h3 className="heading-section num">{m.label}</h3>
            <ol className="mt-2 divide-y divide-ink/10">
              {m.items.map((it) => {
                const isToday = it.date === today;
                const isPast = it.date < today;
                return (
                  <li
                    key={`${it.date}-${it.name}`}
                    className={`grid grid-cols-[3.5rem_1fr] gap-3 py-2 ${isPast ? "opacity-60" : ""}`}
                  >
                    <div className="text-center leading-tight">
                      <div className="font-serif text-xl num">{fmt.day.format(noon(it.date))}</div>
                      <div className="text-mini text-ink-soft">
                        {fmt.weekday.format(noon(it.date))}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-serif text-base">{it.name}</span>
                        {it.series && <span className="tag">{it.series}</span>}
                        {isToday && (
                          <span
                            className="tag text-white"
                            style={{ backgroundColor: "var(--success)" }}
                          >
                            {t("transits_today")}
                          </span>
                        )}
                      </div>
                      {it.tithi && <div className="text-meta text-ink-soft">{it.tithi}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

// Anchor at local noon so the calendar day never shifts across DST or UTC offsets.
function noon(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}
