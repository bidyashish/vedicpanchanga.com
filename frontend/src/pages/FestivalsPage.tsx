import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { Switch } from "@/components/ui/switch";
import { fetchFestivals } from "@/lib/api";
import { festivalTheme } from "@/lib/festivalThemes";
import { formatShortDate, formatTimeWithDate, localeFor, todayISOInTz } from "@/lib/format";
import type { FestivalEvent, FestivalPeriod, FestivalsResponse, LocationChoice } from "@/types/api";

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/**
 * Festival calendar computed for one place and year (`GET /api/festivals`).
 * Special periods (Adhika Masa, Chaturmas, Pitru Paksha, Navratri, Durga
 * Puja) sit on top, then the next major festivals, then a month-by-month list
 * where major festivals get a themed hero card and everything else a compact
 * row. Every time is local to the chosen place; names come from the
 * `fest_<id>` locale keys so the page reads natively in all 15 languages.
 */
export function FestivalsPage({ defaultLocation }: { defaultLocation: LocationChoice }) {
  const { t, lang } = useI18n();
  const astro = useAstro();

  const [loc, setLoc] = useState<LocationChoice>(defaultLocation);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [majorOnly, setMajorOnly] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const [data, setData] = useState<FestivalsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refetch whenever year or place changes; the key guard also swallows React
  // StrictMode's duplicate mount effect, and the counter drops stale replies.
  const lastKeyRef = useRef("");
  const reqRef = useRef(0);
  useEffect(() => {
    const key = `${year}|${loc.latitude}|${loc.longitude}|${loc.timezone ?? ""}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const id = ++reqRef.current;
    setLoading(true);
    setError(null);
    fetchFestivals({
      year,
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
    })
      .then((res) => {
        if (id !== reqRef.current) return;
        setData(res);
      })
      .catch((e: Error) => {
        if (id !== reqRef.current) return;
        setError(e.message || t("festivals_error"));
        setData(null);
      })
      .finally(() => {
        if (id === reqRef.current) setLoading(false);
      });
  }, [year, loc, t]);

  const tz = data?.location.timezone ?? loc.timezone ?? undefined;
  const today = todayISOInTz(tz);

  const fmt = useMemo(() => {
    const l = localeFor(lang);
    return {
      day: new Intl.DateTimeFormat(l, { day: "numeric", timeZone: "UTC" }),
      weekday: new Intl.DateTimeFormat(l, { weekday: "short", timeZone: "UTC" }),
      month: new Intl.DateTimeFormat(l, { month: "long", year: "numeric", timeZone: "UTC" }),
      long: new Intl.DateTimeFormat(l, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
    };
  }, [lang]);

  const name = (e: FestivalEvent): string => {
    const key = `fest_${e.id}`;
    const base = t(key) === key ? e.name : t(key);
    if (e.id === "purnima" || e.id === "amavasya") {
      const month = astro.lunarMonth(e.rule.month ?? "");
      const adhika = e.rule.adhika ? ` (${t("festivals_adhika")})` : "";
      return `${month} ${base}${adhika}`;
    }
    if (e.id === "sankranti") return `${astro.sign(e.rule.to_sign ?? "")} ${base}`;
    return base;
  };

  const periodName = (p: FestivalPeriod): string => {
    const base = t(`fest_${p.id}`);
    return p.month ? `${base} · ${astro.lunarMonth(p.month)}` : base;
  };

  const ruleLabel = (e: FestivalEvent): string => {
    const r = e.rule;
    switch (r.type) {
      case "tithi":
        return [
          astro.lunarMonth(r.month ?? ""),
          r.adhika ? t("festivals_adhika") : "",
          astro.paksha(r.paksha ?? ""),
          astro.tithi(r.tithi ?? ""),
        ]
          .filter(Boolean)
          .join(" ");
      case "nakshatra":
        return [r.month ? astro.lunarMonth(r.month) : "", astro.nakshatra(r.nakshatra ?? "")]
          .filter(Boolean)
          .join(" · ");
      case "sankranti":
        return t("festivals_sun_enters").replace("{0}", astro.sign(r.to_sign ?? ""));
      case "eclipse": {
        const key = `festivals_eclipse_${r.eclipse}`;
        return t(key) === key ? (r.eclipse ?? "") : t(key);
      }
      case "derived": {
        const after = t(`fest_${r.after}`);
        const tmpl =
          e.id === "varalakshmi_vrat" ? "festivals_friday_before" : "festivals_day_after";
        return t(tmpl).replace("{0}", after);
      }
      default:
        return "";
    }
  };

  const timeAt = (iso: string | undefined, refDate: string) => formatTimeWithDate(iso, tz, refDate);
  const rangeAt = (start: string | undefined, end: string | undefined, refDate: string) =>
    `${timeAt(start, refDate)} - ${timeAt(end, refDate)}`;

  const timingRows = (e: FestivalEvent): Array<[string, string]> => {
    const rows: Array<[string, string]> = [];
    if (e.starts && e.ends) {
      const label =
        e.kind === "eclipse"
          ? t("festivals_eclipse")
          : e.kind === "nakshatra"
            ? t("festivals_nakshatra_span")
            : t("festivals_tithi_span");
      rows.push([label, rangeAt(e.starts, e.ends, e.date)]);
    }
    if (e.muhurta) {
      const key = `festivals_kala_${e.muhurta.kala}`;
      rows.push([
        t(key) === key ? t("festivals_kala_muhurta") : t(key),
        rangeAt(e.muhurta.start, e.muhurta.end, e.date),
      ]);
    }
    if (e.parana) rows.push([t("festivals_parana"), rangeAt(e.parana.start, e.parana.end, e.date)]);
    if (e.instant) {
      rows.push([
        e.kind === "eclipse" ? t("festivals_eclipse_max") : t("festivals_moment"),
        timeAt(e.instant, e.date),
      ]);
    }
    return rows;
  };

  const daysUntil = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86400000);

  const statusLabel = (iso: string): string | null => {
    const d = daysUntil(iso);
    if (d === 0) return t("festivals_today");
    if (d === 1) return t("festivals_tomorrow");
    if (d > 1 && d <= 60) return t("festivals_in_days").replace("{0}", String(d));
    return null;
  };

  const periodStatus = (p: FestivalPeriod): { label: string; live: boolean } => {
    if (today >= p.start && today <= p.end) {
      const dayNo = daysUntil(p.start) * -1 + 1;
      return {
        label: t("festivals_day_of").replace("{0}", String(dayNo)).replace("{1}", String(p.days)),
        live: true,
      };
    }
    if (today < p.start) {
      const d = daysUntil(p.start);
      return { label: t("festivals_in_days").replace("{0}", String(d)), live: false };
    }
    return { label: t("festivals_ended"), live: false };
  };

  const all = data?.festivals ?? [];
  const filtered = useMemo(() => (majorOnly ? all.filter((e) => e.major) : all), [all, majorOnly]);
  const upcoming = useMemo(() => filtered.filter((e) => e.date >= today), [filtered, today]);
  const pastCount = filtered.length - upcoming.length;
  const visible = showPast || pastCount === 0 ? filtered : upcoming;
  const nextUp = useMemo(
    () => all.filter((e) => e.major && e.date >= today).slice(0, 3),
    [all, today],
  );

  const months = useMemo(() => {
    const out: Array<{ key: string; label: string; items: FestivalEvent[] }> = [];
    for (const e of visible) {
      const key = e.date.slice(0, 7);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(e);
      else out.push({ key, label: fmt.month.format(utcNoon(e.date)), items: [e] });
    }
    return out;
  }, [visible, fmt]);

  const periods = useMemo(() => {
    const list = data?.periods ?? [];
    return showPast ? list : list.filter((p) => p.end >= today);
  }, [data, showPast, today]);

  return (
    <section data-testid="festivals-view" className="pt-3 sm:pt-4 pb-8 space-y-3">
      <div className="card p-3 sm:p-4 lg:p-5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow-accent">{t("festivals_eyebrow")}</p>
            <h2 className="heading-page mt-0.5">{t("festivals_title")}</h2>
            <p className="text-meta text-ink-soft mt-1">{t("festivals_subtitle")}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-7">
            <label className="field-label">{t("place")}</label>
            <CitySearch
              value={loc.place_name}
              onSelect={(p) => setLoc({ ...p, timezone: null })}
              testIdPrefix="festivals-city"
            />
          </div>
          <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-2">
            <button
              type="button"
              className="btn-ghost px-3"
              onClick={() => setYear((y) => Math.max(MIN_YEAR, y - 1))}
              disabled={year <= MIN_YEAR}
              aria-label={t("festivals_year_prev")}
              data-testid="festivals-year-prev"
            >
              ‹
            </button>
            <span className="num font-serif text-title font-semibold text-ink min-w-[4ch] text-center">
              {year}
            </span>
            <button
              type="button"
              className="btn-ghost px-3"
              onClick={() => setYear((y) => Math.min(MAX_YEAR, y + 1))}
              disabled={year >= MAX_YEAR}
              aria-label={t("festivals_year_next")}
              data-testid="festivals-year-next"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-meta">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <Switch
              checked={majorOnly}
              onCheckedChange={setMajorOnly}
              aria-label={t("festivals_major_only")}
              data-testid="festivals-toggle-major"
            />
            <span className="font-medium text-ink">{t("festivals_major_only")}</span>
          </label>
          {pastCount > 0 && (
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <Switch
                checked={showPast}
                onCheckedChange={setShowPast}
                aria-label={t("festivals_show_past")}
                data-testid="festivals-toggle-past"
              />
              <span className="font-medium text-ink">
                {showPast ? t("festivals_hide_past") : t("festivals_show_past")}
              </span>
              <span className="text-mini text-ink-soft">
                · {pastCount} {t("festivals_dates_short")}
              </span>
            </label>
          )}
        </div>

        <p className="text-mini text-ink-soft mt-3">
          {t("festivals_location_note").replace("{0}", loc.place_name)}
        </p>

        {error && (
          <div
            data-testid="festivals-error"
            className="mt-4 text-sm text-rose font-medium bg-rose/5 border border-rose/30 rounded-md px-3 py-2"
          >
            {error}
          </div>
        )}
      </div>

      {loading && !data && (
        <div className="flex flex-col items-center py-16 gap-4">
          <MandalaLoader size={56} />
          <p className="font-serif text-ink-soft italic">{t("festivals_loading")}</p>
        </div>
      )}

      {data && (
        <div className={loading ? "opacity-60 transition-opacity space-y-3" : "space-y-3"}>
          {periods.length > 0 && (
            <div className="card p-3 sm:p-4" data-testid="festivals-periods">
              <p className="eyebrow-accent">{t("festivals_periods")}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {periods.map((p) => {
                  const theme = festivalTheme(p.id);
                  const st = periodStatus(p);
                  return (
                    <div
                      key={p.id}
                      className="rounded-lg border border-parchment-200 bg-parchment-50 px-3 py-2.5 flex items-start gap-3"
                      style={{ borderInlineStartWidth: 4, borderInlineStartColor: theme.from }}
                    >
                      <span aria-hidden className="text-2xl leading-none mt-0.5">
                        {theme.glyph}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink truncate">{periodName(p)}</span>
                          <span
                            className={
                              st.live
                                ? "tag bg-leaf/15 text-leaf shrink-0"
                                : "tag text-ink-soft shrink-0"
                            }
                          >
                            {st.label}
                          </span>
                        </div>
                        <div className="text-mini text-ink-soft num">
                          {formatShortDate(p.start)} - {formatShortDate(p.end)} ·{" "}
                          {t("festivals_period_days").replace("{0}", String(p.days))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nextUp.length > 0 && !showPast && (
            <div className="card p-3 sm:p-4" data-testid="festivals-next-up">
              <p className="eyebrow-accent">{t("festivals_next_up")}</p>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {nextUp.map((e) => (
                  <HeroCard
                    key={`next-${e.id}-${e.date}`}
                    event={e}
                    title={name(e)}
                    dateLabel={fmt.long.format(utcNoon(e.date))}
                    status={statusLabel(e.date)}
                    rule={ruleLabel(e)}
                    rows={timingRows(e)}
                    compact
                  />
                ))}
              </div>
              {nextUp.some((e) => e.kind === "eclipse") && (
                <p className="text-mini text-ink-soft mt-2">{t("festivals_eclipse_note")}</p>
              )}
            </div>
          )}

          {months.length === 0 && (
            <div className="card p-6 text-center text-ink-soft">{t("festivals_none")}</div>
          )}

          {months.map((m) => (
            <div key={m.key} className="card p-3 sm:p-4" data-testid={`festivals-month-${m.key}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="heading-section">{m.label}</h3>
                <span className="text-mini text-ink-soft num">
                  {m.items.length} {t("festivals_dates_short")}
                </span>
              </div>
              <ul className="mt-2 space-y-2">
                {m.items.map((e) => {
                  const key = `${e.id}-${e.date}`;
                  if (e.major) {
                    return (
                      <li key={key}>
                        <HeroCard
                          event={e}
                          title={name(e)}
                          dateLabel={fmt.long.format(utcNoon(e.date))}
                          status={statusLabel(e.date)}
                          rule={ruleLabel(e)}
                          rows={timingRows(e)}
                        />
                      </li>
                    );
                  }
                  const theme = festivalTheme(e.id);
                  const status = statusLabel(e.date);
                  const rows = timingRows(e);
                  return (
                    <li
                      key={key}
                      className="flex items-start gap-3 px-1 py-2 border-b border-parchment-200 last:border-0"
                    >
                      <div className="w-12 shrink-0 text-center">
                        <div className="num text-lg font-semibold leading-none text-ink">
                          {fmt.day.format(utcNoon(e.date))}
                        </div>
                        <div className="text-micro uppercase text-ink-soft mt-0.5">
                          {fmt.weekday.format(utcNoon(e.date))}
                        </div>
                      </div>
                      <span aria-hidden className="text-xl leading-none w-7 text-center mt-0.5">
                        {theme.glyph}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-medium text-ink">{name(e)}</span>
                          {status && (
                            <span className="tag bg-saffron/15 text-saffron">{status}</span>
                          )}
                        </div>
                        <div className="text-mini text-ink-soft">{ruleLabel(e)}</div>
                        {rows.length > 0 && (
                          <div className="text-mini text-ink-soft num flex flex-wrap gap-x-3 gap-y-0.5">
                            {rows.map(([label, value]) => (
                              <span key={label}>
                                <span className="text-ink-muted">{label}:</span> {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {all.some((e) => e.kind === "eclipse") && (
            <p className="text-mini text-ink-soft px-1">{t("festivals_eclipse_note")}</p>
          )}
        </div>
      )}
    </section>
  );
}

function HeroCard({
  event,
  title,
  dateLabel,
  status,
  rule,
  rows,
  compact = false,
}: {
  event: FestivalEvent;
  title: string;
  dateLabel: string;
  status: string | null;
  rule: string;
  rows: Array<[string, string]>;
  compact?: boolean;
}) {
  const theme = festivalTheme(event.id);
  return (
    <article
      data-testid={`festival-hero-${event.id}`}
      className="relative overflow-hidden rounded-xl text-white shadow-lift p-4"
      style={{ backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
    >
      <span
        aria-hidden
        className="absolute -end-3 -bottom-5 text-[96px] leading-none opacity-20 select-none pointer-events-none"
      >
        {theme.glyph}
      </span>
      <div className="relative flex items-start gap-3">
        <span aria-hidden className="text-3xl leading-none drop-shadow">
          {theme.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-micro uppercase tracking-wider opacity-90">
            <span className="num">{dateLabel}</span>
            {status && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 normal-case tracking-normal font-semibold">
                {status}
              </span>
            )}
          </div>
          <h4
            className={`font-serif font-semibold leading-tight mt-1 ${compact ? "text-lead" : "text-title"}`}
          >
            {title}
          </h4>
          <p className="text-mini opacity-90">{rule}</p>
          {rows.length > 0 && (
            <dl
              className={`mt-2 rounded-lg bg-black/20 px-3 py-2 text-mini grid gap-x-4 gap-y-1 ${
                compact ? "" : "sm:grid-cols-2"
              }`}
            >
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="opacity-85">{label}</dt>
                  <dd className="num font-semibold text-end">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </article>
  );
}

function utcNoon(iso: string): Date {
  return new Date(iso + "T12:00:00Z");
}
