import { useState } from "react";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { MandalaMark } from "@/components/common/MandalaMark";
import { DatePicker } from "@/components/ui/date-picker";
import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { calculateBala } from "@/lib/api";
import {
  daysFromNow,
  formatDayMonthYear,
  formatTimeRange,
  localeFor,
  todayISO,
} from "@/lib/format";
import type { BalaResponse, LocationChoice } from "@/types/api";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

function Status({ favorable }: { favorable: boolean }) {
  const { t } = useI18n();
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        favorable ? "bg-leaf/10 text-leaf" : "bg-rose/10 text-rose"
      }`}
    >
      {t(favorable ? "bala_favorable" : "bala_unfavorable")}
    </span>
  );
}

function Guidance({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 border-t border-parchment-200 pt-2 text-xs leading-relaxed">
      <p className="text-ink-soft">
        <strong className="text-ink">{t("col_result")}:</strong> {t(`bala_${id}_result`)}
      </p>
      <p className="mt-1 text-leaf">
        <strong>{t("bala_do")}:</strong> {t(`bala_${id}_do`)}
      </p>
      <p className="mt-1 text-rose">
        <strong>{t("bala_dont")}:</strong> {t(`bala_${id}_dont`)}
      </p>
    </div>
  );
}

function CalendarView({ days }: { days: BalaResponse["days"] }) {
  const { lang, t } = useI18n();
  const locale = localeFor(lang);
  const byDate = new Map(days.map((day) => [day.date, day]));
  const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, index + 1)),
    ),
  );

  return (
    <section className="card p-4 sm:p-5" data-testid="bala-calendar">
      <p className="eyebrow-accent mb-3">{t("bala_calendar_view")}</p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {months.map((month) => {
          const [year, monthNumber] = month.split("-").map(Number);
          const first = new Date(Date.UTC(year, monthNumber - 1, 1, 12));
          const leadingDays = (first.getUTCDay() + 6) % 7;
          const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
          const monthLabel = new Intl.DateTimeFormat(locale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(first);

          return (
            <div key={month}>
              <h3 className="mb-2 text-center font-serif font-semibold text-ink">{monthLabel}</h3>
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdays.map((weekday, index) => (
                  <span key={`${weekday}-${index}`} className="eyebrow py-1">
                    {weekday}
                  </span>
                ))}
                {Array.from({ length: leadingDays }, (_, index) => (
                  <span key={`blank-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const dayNumber = index + 1;
                  const date = `${month}-${String(dayNumber).padStart(2, "0")}`;
                  const day = byDate.get(date);
                  if (!day) {
                    return (
                      <span key={date} className="aspect-square p-1 text-xs text-ink-muted/40">
                        {dayNumber}
                      </span>
                    );
                  }
                  const favorable = day.favorable_windows.length > 0;
                  return (
                    <a
                      key={date}
                      href={`#bala-day-${date}`}
                      aria-label={`${formatDayMonthYear(date)}: ${t(
                        favorable ? "bala_favorable" : "bala_unfavorable",
                      )}`}
                      className={`flex aspect-square items-center justify-center rounded-sm border text-xs font-semibold no-underline transition-colors ${
                        favorable
                          ? "border-leaf/30 bg-leaf/10 text-leaf hover:bg-leaf/20"
                          : "border-rose/20 bg-rose/5 text-rose hover:bg-rose/10"
                      }`}
                    >
                      {dayNumber}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 border-t border-parchment-200 pt-3 text-xs">
        <span className="text-leaf">● {t("bala_common_windows")}</span>
        <span className="text-rose">● {t("bala_no_common_window")}</span>
      </div>
    </section>
  );
}

function DayResult({ day, timezone }: { day: BalaResponse["days"][number]; timezone: string }) {
  const { t } = useI18n();
  const astro = useAstro();
  return (
    <article
      id={`bala-day-${day.date}`}
      className="card scroll-mt-20 p-4 sm:p-5"
      data-testid={`bala-day-${day.date}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-parchment-200 pb-3">
        <h3 className="heading-section">{formatDayMonthYear(day.date)}</h3>
        <div className="text-end">
          <p className="eyebrow-accent">{t("bala_common_windows")}</p>
          {day.favorable_windows.length ? (
            day.favorable_windows.map((window) => (
              <p key={window.start} className="num mt-1 text-meta font-medium text-leaf">
                {formatTimeRange(window.start, window.end, timezone)}
              </p>
            ))
          ) : (
            <p className="meta mt-1 text-rose">{t("bala_no_common_window")}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <section>
          <p className="eyebrow-accent mb-2">{t("bala_tarabala")}</p>
          <div className="space-y-2">
            {day.tarabala.map((segment) => (
              <div key={segment.start} className="rounded-md border border-parchment-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {astro.nakshatra(segment.nakshatra)} · {t(`bala_tara_${segment.tara}`)}
                  </p>
                  <Status favorable={segment.favorable} />
                </div>
                <p className="num meta mt-1">
                  {formatTimeRange(segment.start, segment.end, timezone)} · {t("bala_cycle")}{" "}
                  {segment.cycle}
                </p>
                <Guidance id={segment.tara} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow-accent mb-2">{t("bala_chandrabala")}</p>
          <div className="space-y-2">
            {day.chandrabala.map((segment) => (
              <div key={segment.start} className="rounded-md border border-parchment-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {astro.sign(segment.sign)} · {t("bala_house")} {segment.house}
                  </p>
                  <Status favorable={segment.favorable} />
                </div>
                <p className="num meta mt-1">
                  {formatTimeRange(segment.start, segment.end, timezone)}
                </p>
                <Guidance id={`chandra_${segment.favorable ? "favorable" : "unfavorable"}`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}

export function BalaPage({ defaultLocation }: { defaultLocation: LocationChoice }) {
  const { t } = useI18n();
  const astro = useAstro();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(daysFromNow(30));
  const [birthRashiId, setBirthRashiId] = useState("");
  const [birthNakshatraId, setBirthNakshatraId] = useState("");
  const [loc, setLoc] = useState(defaultLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BalaResponse | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await calculateBala({
          start_date: startDate,
          end_date: endDate,
          birth_rashi_id: Number(birthRashiId),
          birth_nakshatra_id: Number(birthNakshatraId),
          latitude: loc.latitude,
          longitude: loc.longitude,
          timezone: loc.timezone,
        }),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="grid grid-cols-1 gap-6 pt-4 pb-10 lg:grid-cols-12 lg:gap-8"
      data-testid="bala-view"
    >
      <aside className="lg:col-span-4 xl:col-span-3">
        <form className="card p-4 lg:sticky lg:top-20 lg:p-5" onSubmit={submit}>
          <h1 className="heading-page">{t("bala_title")}</h1>
          <p className="meta mb-5">{t("bala_subtitle")}</p>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">{t("muhurta_start_date")}</label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                testIdPrefix="bala-start-date"
              />
            </div>
            <div>
              <label className="field-label">{t("muhurta_end_date")}</label>
              <DatePicker value={endDate} onChange={setEndDate} testIdPrefix="bala-end-date" />
            </div>
          </div>

          <label className="field-label" htmlFor="bala-rashi">
            {t("muhurta_birth_rashi")}
          </label>
          <select
            id="bala-rashi"
            data-testid="bala-rashi"
            className="field mb-4"
            value={birthRashiId}
            onChange={(event) => setBirthRashiId(event.target.value)}
            required
          >
            <option value="">{t("muhurta_none")}</option>
            {SIGNS.map((sign, index) => (
              <option key={sign} value={index + 1}>
                {index + 1}. {astro.sign(sign)}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="bala-nakshatra">
            {t("muhurta_birth_nak")}
          </label>
          <select
            id="bala-nakshatra"
            data-testid="bala-nakshatra"
            className="field mb-4"
            value={birthNakshatraId}
            onChange={(event) => setBirthNakshatraId(event.target.value)}
            required
          >
            <option value="">{t("muhurta_none")}</option>
            {NAKSHATRAS.map((nakshatra, index) => (
              <option key={nakshatra} value={index + 1}>
                {index + 1}. {astro.nakshatra(nakshatra)}
              </option>
            ))}
          </select>

          <div className="mb-5">
            <CitySearch
              value={loc.place_name}
              onSelect={setLoc}
              label={t("muhurta_location")}
              placeholder={t("search_city")}
              testIdPrefix="bala-city"
            />
          </div>

          <button className="btn-primary w-full" data-testid="bala-calculate" disabled={loading}>
            {loading ? (
              <>
                <MandalaLoader size={18} />
                <span>{t("muhurta_searching")}</span>
              </>
            ) : (
              t("bala_calculate")
            )}
          </button>

          {error && (
            <p className="mt-4 rounded-sm border border-crimson/40 bg-crimson/5 p-3 text-xs text-crimson">
              {error}
            </p>
          )}
        </form>
      </aside>

      <main className="space-y-4 lg:col-span-8 xl:col-span-9">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-crimson">
            <MandalaLoader size={64} />
            <p className="font-serif text-ink-soft italic">{t("muhurta_searching")}</p>
          </div>
        )}

        {!loading && !result && (
          <div className="card p-8 text-center">
            <div className="mb-4 flex justify-center text-ink-soft">
              <MandalaMark size={56} />
            </div>
            <h2 className="heading-section">{t("bala_title")}</h2>
            <p className="meta mx-auto mt-1.5 max-w-lg">{t("bala_subtitle")}</p>
          </div>
        )}

        {result && (
          <>
            <div className="card p-4 sm:p-5" data-testid="bala-summary">
              <p className="eyebrow-accent">{t("bala_results")}</p>
              <h2 className="heading-section">
                {astro.sign(result.birth.sign)} · {astro.nakshatra(result.birth.nakshatra)}
              </h2>
              <p className="meta mt-1">
                <span className="font-semibold text-leaf">{result.favorable_days}</span> /{" "}
                {result.days.length} {t("bala_favorable_days")}
              </p>
              <p className="meta mt-3 border-t border-parchment-200 pt-3">{t("bala_rule_note")}</p>
            </div>
            <CalendarView days={result.days} />
            {result.days.map((day) => (
              <DayResult key={day.date} day={day} timezone={result.location.timezone} />
            ))}
          </>
        )}
      </main>
    </section>
  );
}
