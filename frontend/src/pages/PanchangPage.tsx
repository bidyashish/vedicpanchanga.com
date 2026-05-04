import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { DatePicker } from "@/components/ui/date-picker";
import { GowriPanchangam } from "@/components/panchang/GowriPanchangam";
import { HoraPanchangam } from "@/components/panchang/HoraPanchangam";
import { Section } from "@/components/panchang/Section";
import { TimeBand } from "@/components/panchang/TimeBand";
import { VedicChart } from "@/components/kundali/VedicChart";
import { SouthIndianChart } from "@/components/kundali/SouthIndianChart";
import { PlanetsTable } from "@/components/kundali/PlanetsTable";
import { calculateChart, fetchPanchang, reverseGeocode } from "@/lib/api";
import { formatTime, formatTimeWithDate, formatLongDate, hoursToHMS, todayISO } from "@/lib/format";
import type { ChartData, LocationChoice, PanchangData, TransitItem } from "@/types/api";

// Current wall-clock HH:MM in the given IANA timezone. Used to anchor the
// Lagna Kundali to "now in that location" — anchoring to sunrise made the
// chart look frozen on the sun's sign because the lagna co-rises with the sun.
function nowTimeInTz(tz?: string): string {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
  } catch {
    return "12:00";
  }
}

function TransitList({
  items,
  tz,
  refDate,
  labelFn,
  accent = "var(--ink)",
}: {
  items?: TransitItem[];
  tz?: string;
  refDate?: string;
  labelFn: (it: TransitItem) => string;
  accent?: string;
}) {
  if (!items?.length) return <div className="meta">-</div>;
  return (
    <ul className="divide-y divide-parchment-200">
      {items.map((it, i) => {
        const endIso = it.ends_at ?? it.end;
        const range = it.starts_at
          ? `${formatTimeWithDate(it.starts_at, tz, refDate)} → ${formatTimeWithDate(endIso, tz, refDate)}`
          : `upto ${formatTimeWithDate(endIso, tz, refDate)}`;
        return (
          <li
            key={i}
            className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
          >
            <span className="text-meta font-medium" style={{ color: accent }}>
              {labelFn(it)}
            </span>
            <span className="text-mini text-ink-soft num sm:shrink-0">{range}</span>
          </li>
        );
      })}
    </ul>
  );
}

function KV2({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
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

export function PanchangPage({ defaultLocation }: { defaultLocation: LocationChoice }) {
  const { t } = useI18n();
  const [date, setDate] = useState(todayISO());
  const [loc, setLoc] = useState<LocationChoice>(defaultLocation);
  const [data, setData] = useState<PanchangData | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  // The HH:MM the lagna kundali is cast for. We use *current* wall-clock time
  // in the chart's location so the chart reflects the live sky — at sunrise
  // the lagna co-rises with the sun and the chart looked frozen on Aries when
  // the sun was in Aries.
  const [chartTime, setChartTime] = useState<string>("");
  const [chartStyle, setChartStyle] = useState<"north" | "south">("north");
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (overrides: Partial<LocationChoice> & { date?: string } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const lat = overrides.latitude ?? loc.latitude;
      const lon = overrides.longitude ?? loc.longitude;
      const tz = overrides.timezone === undefined ? loc.timezone : overrides.timezone;
      const reqDate = overrides.date ?? date;
      const placeName = overrides.place_name ?? loc.place_name;

      const d = await fetchPanchang({
        latitude: lat,
        longitude: lon,
        date: reqDate,
        timezone: tz,
      });
      setData(d);

      // Anchor the lagna chart to "now" in the chart's location.
      const time = nowTimeInTz(d.location.timezone);
      setChartTime(time);
      setChartLoading(true);
      try {
        const c = await calculateChart({
          birth_date: d.date,
          birth_time: time,
          latitude: lat,
          longitude: lon,
          timezone: d.location.timezone,
          place_name: placeName,
          ayanamsa: "lahiri",
        });
        setChart(c);
      } catch {
        /* keep previous chart silently */
      } finally {
        setChartLoading(false);
      }
    } catch (e) {
      setError((e as Error).message || "Failed to fetch Panchang");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // StrictMode in dev fires effects twice; guard so the initial fetch only
  // hits the backend once. Production builds run effects once and ignore this.
  const didAutoRunRef = useRef(false);
  useEffect(() => {
    if (didAutoRunRef.current) return;
    didAutoRunRef.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useGeo = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const name =
          (await reverseGeocode(lat, lon)) ?? `Lat ${lat.toFixed(3)}, Lon ${lon.toFixed(3)}`;
        const next: LocationChoice = {
          place_name: name,
          latitude: lat,
          longitude: lon,
          timezone: null,
        };
        setLoc(next);
        const today = todayISO();
        setDate(today);
        run({ ...next, date: today });
      },
      (err) => {
        setLoading(false);
        setError("Unable to get location: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const tz = data?.location?.timezone;
  const refDate = data?.date;

  return (
    <section
      data-testid="panchang-view"
      className="pt-3 sm:pt-4 pb-8 grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-5"
    >
      <div className="xl:col-span-12 space-y-3">
        {/* Controls */}
        <div className="card p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="md:col-span-3">
              <label className="field-label">{t("date")}</label>
              <DatePicker
                value={date}
                onChange={(iso) => setDate(iso)}
                testIdPrefix="panchang-date"
              />
            </div>
            <div className="md:col-span-5">
              <label className="field-label">{t("place")}</label>
              <CitySearch
                value={loc.place_name}
                onSelect={(p) => setLoc({ ...p, timezone: null })}
                testIdPrefix="panchang-city"
              />
            </div>
            <div className="md:col-span-2">
              <button
                data-testid="use-my-location-btn"
                onClick={useGeo}
                className="btn-ghost w-full"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 2a8 8 0 0 1 8 8c0 5.4-8 12-8 12S4 15.4 4 10a8 8 0 0 1 8-8z" />
                </svg>
                {t("use_my_location")}
              </button>
            </div>
            <div className="md:col-span-2">
              <button
                data-testid="panchang-fetch-btn"
                onClick={() => run()}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? t("loading") : t("show_panchang")}
              </button>
            </div>
          </div>
          {error && (
            <div
              data-testid="panchang-error"
              className="mt-4 text-sm text-rose font-medium bg-rose/5 border border-rose/30 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}
        </div>

        {loading && !data && (
          <div className="flex flex-col items-center py-16 gap-4">
            <MandalaLoader size={56} />
            <p className="font-serif text-ink-soft italic">{t("reading_heavens")}</p>
          </div>
        )}

        {data && (
          <>
            <div className="card p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <p className="eyebrow-accent">{t("panchang_title")}</p>
                  <h2 className="heading-page mt-0.5" data-testid="panchang-title">
                    {formatLongDate(data.date)}
                  </h2>
                </div>
                <p className="text-mini text-ink-soft text-right">
                  {loc.place_name}
                  <br className="sm:hidden" />
                  <span className="hidden sm:inline"> · </span>
                  {data.location.timezone}
                </p>
              </div>
            </div>

            <Section
              title="Lagna Kundali"
              subtitle={
                chartTime
                  ? `${formatLongDate(data.date)} at ${chartTime} · ${data.location.timezone}`
                  : "Live chart"
              }
              testId="section-lagna-kundali"
            >
              {chartLoading && !chart ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <MandalaLoader size={36} />
                  <p className="meta italic">{t("consulting_heavens")}</p>
                </div>
              ) : chart ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
                  <div className="lg:col-span-3 space-y-3">
                    <div
                      className="inline-flex rounded-sm border border-parchment-200 overflow-hidden p-0.5 gap-0.5 bg-parchment-100"
                      data-testid="lagna-chart-style-toggle"
                    >
                      {[
                        { id: "north" as const, label: t("north_indian") },
                        { id: "south" as const, label: t("south_indian") },
                      ].map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          data-testid={`lagna-chart-style-${o.id}`}
                          onClick={() => setChartStyle(o.id)}
                          className={`px-3 py-1 text-mini font-medium rounded-2xs transition-colors ${
                            chartStyle === o.id
                              ? "bg-white text-saffron shadow-card"
                              : "text-ink-soft hover:text-ink"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <div className="bg-parchment-50 p-2 rounded-sm">
                      {chartStyle === "south" ? (
                        <SouthIndianChart
                          houseMap={chart.d1_chart}
                          ascSign={chart.d1_asc_sign}
                          title="Rashi · D1"
                          testId="lagna-chart-south"
                        />
                      ) : (
                        <VedicChart
                          houseMap={chart.d1_chart}
                          ascSign={chart.d1_asc_sign}
                          title="Rashi · D1"
                          testId="lagna-chart-north"
                        />
                      )}
                    </div>
                    <p className="text-mini text-ink-soft text-center italic">
                      Lagna at {chart.ascendant.sign} {chart.ascendant.dms} · Nakshatra{" "}
                      {chart.ascendant.nakshatra} (Pada {chart.ascendant.nakshatra_pada})
                    </p>
                  </div>
                  <div className="lg:col-span-2">
                    <PlanetsTable planets={chart.planets_data} ascendant={chart.ascendant} />
                  </div>
                </div>
              ) : (
                <p className="meta italic">Chart unavailable for this location.</p>
              )}
            </Section>

            <Section title="Sun &amp; Moon" testId="section-sun-moon">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <TimeCard
                  label={t("sunrise")}
                  value={formatTime(data.sun_moon.sunrise, tz)}
                  color="var(--accent-sun)"
                  icon="☀"
                  testId="sunrise-block"
                />
                <TimeCard
                  label={t("sunset")}
                  value={formatTime(data.sun_moon.sunset, tz)}
                  color="var(--accent-sun)"
                  icon="◐"
                  testId="sunset-block"
                />
                <TimeCard
                  label={t("moonrise")}
                  value={formatTimeWithDate(data.sun_moon.moonrise, tz, refDate)}
                  color="var(--accent-moon)"
                  icon="☾"
                  testId="moonrise-block"
                />
                <TimeCard
                  label={t("moonset")}
                  value={formatTimeWithDate(data.sun_moon.moonset, tz, refDate)}
                  color="var(--accent-moon)"
                  icon="○"
                  testId="moonset-block"
                />
              </div>
            </Section>

            <Section title="Panchang" subtitle="Five Limbs" testId="section-panchang-limbs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <LimbCol label="Tithi" accent="var(--accent-sun)">
                  <TransitList
                    items={data.panchang.tithi_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => x.name ?? ""}
                    accent="var(--accent-sun)"
                  />
                </LimbCol>
                <LimbCol label="Nakshatra" accent="var(--accent-amber)">
                  <TransitList
                    items={data.panchang.nakshatra_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => x.name ?? ""}
                    accent="var(--accent-amber)"
                  />
                </LimbCol>
                <LimbCol label="Yoga" accent="var(--accent-moon)">
                  <TransitList
                    items={data.panchang.yoga_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => x.name ?? ""}
                    accent="var(--accent-moon)"
                  />
                </LimbCol>
                <LimbCol label="Karana" accent="var(--accent-moon)">
                  <TransitList
                    items={data.panchang.karana_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(k) => (k.is_bhadra ? `${k.name ?? ""} (Bhadra)` : (k.name ?? ""))}
                    accent="var(--accent-moon)"
                  />
                </LimbCol>
                <LimbCol label="Vara" accent="var(--accent-sun)">
                  <p className="value-strong">
                    <span style={{ color: "var(--accent-sun)" }}>{data.vara.sanskrit}</span>{" "}
                    <span className="text-ink-soft font-normal">({data.vara.english})</span>
                  </p>
                </LimbCol>
                <LimbCol label="Paksha" accent="var(--accent-moon)">
                  <p className="value-strong">{data.panchang.paksha}</p>
                </LimbCol>
              </div>
            </Section>

            <Section title="Lunar Month, Samvat &amp; Samvatsara" testId="section-samvat">
              <KV2
                rows={[
                  {
                    label: "Vikram Samvat",
                    value: `${data.lunar_month.vikram_samvat} · ${data.lunar_month.samvatsara_vikram}`,
                  },
                  {
                    label: "Shaka Samvat",
                    value: `${data.lunar_month.shaka_samvat} · ${data.lunar_month.samvatsara_shaka}`,
                  },
                  { label: "Gujarati Samvat", value: data.lunar_month.gujarati_samvat },
                  {
                    label: "Chandramasa (Purnimanta)",
                    value: data.lunar_month.chandramasa_purnimanta,
                  },
                  { label: "Chandramasa (Amanta)", value: data.lunar_month.chandramasa_amanta },
                  { label: "Nirayana Solar Month", value: data.lunar_month.nirayana_solar_month },
                  { label: "Pravishte / Gate", value: data.lunar_month.pravishte_day },
                  { label: "Paksha", value: data.lunar_month.paksha },
                ]}
              />
            </Section>

            <Section title="Rashi &amp; Nakshatra" testId="section-rashi-nak">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="eyebrow text-saffron mb-3">Moonsign (Chandra Rashi)</p>
                  <TransitList
                    items={data.rashi_nakshatra.moonsign_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(s) => s.rashi ?? s.name ?? ""}
                    accent="var(--accent-sun)"
                  />
                  <p className="eyebrow text-indigo mt-6 mb-3">Nakshatra Pada</p>
                  <TransitList
                    items={data.rashi_nakshatra.moon_nakshatra_padas}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(p) => `${p.nakshatra ?? ""} Pada ${p.pada ?? ""}`}
                    accent="var(--accent-moon)"
                  />
                </div>
                <div>
                  <p className="eyebrow text-saffron mb-3">Sunsign (Surya Rashi)</p>
                  <p
                    className="font-serif text-2xl font-medium"
                    style={{ color: "var(--accent-sun)" }}
                  >
                    {data.rashi_nakshatra.sunsign.rashi}
                  </p>
                  <p className="eyebrow text-gold mt-6 mb-3">Surya Nakshatra</p>
                  <p className="font-serif text-xl text-ink font-medium leading-snug">
                    {data.rashi_nakshatra.surya_nakshatra.name}
                    <span className="text-ink-soft">
                      {" "}
                      · Pada {data.rashi_nakshatra.surya_nakshatra.pada}
                    </span>
                  </p>
                  <p className="text-sm text-ink-soft num mt-1">
                    upto{" "}
                    {formatTimeWithDate(data.rashi_nakshatra.surya_nakshatra.ends_at, tz, refDate)}
                  </p>
                </div>
              </div>
            </Section>

            {data.hora && (
              <Section title={t("hora_title")} subtitle={t("hora_sub")} testId="section-hora">
                <HoraPanchangam day={data.hora.day} night={data.hora.night} tz={tz} />
              </Section>
            )}

            <Section title="Ritu &amp; Ayana" testId="section-ritu-ayana">
              <KV2
                rows={[
                  { label: "Drik Ṛtu", value: data.ritu_ayana.drik_ritu },
                  { label: "Vedic Ṛtu", value: data.ritu_ayana.vedic_ritu },
                  { label: "Drik Ayana", value: data.ritu_ayana.drik_ayana },
                  { label: "Vedic Ayana", value: data.ritu_ayana.vedic_ayana },
                  { label: "Dinamana", value: hoursToHMS(data.sun_moon.dinaman_hours) },
                  { label: "Ratrimana", value: hoursToHMS(data.sun_moon.ratriman_hours) },
                  { label: "Madhyahna", value: formatTime(data.sun_moon.madhyahna, tz) },
                ]}
              />
            </Section>

            <Section title={t("auspicious_title")} testId="section-auspicious">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <TimeBand
                  testId="band-brahma"
                  title="Brahma Muhurta"
                  window={data.auspicious_timings.brahma_muhurta}
                  color="var(--success)"
                  desc="Sacred hour before dawn"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-pratah"
                  title="Pratah Sandhya"
                  window={data.auspicious_timings.pratah_sandhya}
                  color="var(--success)"
                  desc="Morning twilight ritual"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-abhijit"
                  title="Abhijit Muhurta"
                  window={data.auspicious_timings.abhijit}
                  color="var(--success)"
                  desc="Auspicious midday"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-vijay"
                  title="Vijay Muhurta"
                  window={data.auspicious_timings.vijay_muhurta}
                  color="var(--success)"
                  desc="Victory hour"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-godhuli"
                  title="Godhuli Muhurta"
                  window={data.auspicious_timings.godhuli_muhurta}
                  color="var(--success)"
                  desc="Twilight bridging sunset"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-sayahna"
                  title="Sayam Sandhya"
                  window={data.auspicious_timings.sayahna_sandhya}
                  color="var(--success)"
                  desc="Evening twilight ritual"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-nishita"
                  title="Nishita Muhurta"
                  window={data.auspicious_timings.nishita_muhurta}
                  color="var(--success)"
                  desc="Mid-night meditation hour"
                  tz={tz}
                  refDate={refDate}
                />
                {(data.auspicious_timings.amrit_kalam ?? []).map((a, i) => (
                  <TimeBand
                    key={`am-${i}`}
                    testId={`band-amrit-${i}`}
                    title="Amrit Kalam"
                    window={a}
                    color="var(--success)"
                    desc={`Nectar window · ${a.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.auspicious_timings.sarvartha_siddhi_yoga ?? []).map((s, i) => (
                  <TimeBand
                    key={`ss-${i}`}
                    testId={`band-sarvartha-${i}`}
                    title="Sarvartha Siddhi Yoga"
                    window={s}
                    color="var(--success)"
                    desc={`All endeavors succeed · ${s.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.auspicious_timings.amrita_siddhi_yoga ?? []).map((s, i) => (
                  <TimeBand
                    key={`asd-${i}`}
                    testId={`band-amrita-siddhi-${i}`}
                    title="Amrita Siddhi Yoga"
                    window={s}
                    color="var(--success)"
                    desc={`Supremely auspicious · ${s.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {data.yogas_extra?.ravi_yoga && (
                  <TimeBand
                    testId="band-ravi-yoga"
                    title="Ravi Yoga"
                    window={data.yogas_extra.ravi_yoga}
                    color="var(--success)"
                    desc="Sun-Moon nakshatra alignment · cancels nakshatra dosha"
                    tz={tz}
                    refDate={refDate}
                  />
                )}
              </div>
            </Section>

            <Section title={t("inauspicious_title")} testId="section-inauspicious">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <TimeBand
                  testId="band-rahu"
                  title="Rahu Kalam"
                  window={data.inauspicious_timings.rahu_kalam}
                  color="var(--danger)"
                  desc="Avoid new undertakings"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-yamaganda"
                  title="Yamaganda"
                  window={data.inauspicious_timings.yamaganda}
                  color="var(--accent-sun)"
                  desc="Avoid travel & new ventures"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-gulika"
                  title="Gulika Kalam"
                  window={data.inauspicious_timings.gulika_kalam}
                  color="var(--ink-soft)"
                  desc="Son of Saturn · neutral-inauspicious"
                  tz={tz}
                  refDate={refDate}
                />
                {data.inauspicious_timings.dur_muhurtam.map((dm, i) => (
                  <TimeBand
                    key={i}
                    testId={`band-dur-${i}`}
                    title={`Dur Muhurtam #${dm.muhurta_number}`}
                    window={dm}
                    color="var(--danger)"
                    desc="Avoid auspicious work"
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {data.inauspicious_timings.bhadra.map((b, i) => (
                  <TimeBand
                    key={`b-${i}`}
                    testId={`band-bhadra-${i}`}
                    title="Bhadra (Vishti)"
                    window={b}
                    color="var(--danger)"
                    desc="Vishti karana · inauspicious"
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.inauspicious_timings.varjyam ?? []).map((v, i) => (
                  <TimeBand
                    key={`v-${i}`}
                    testId={`band-varjyam-${i}`}
                    title="Varjyam"
                    window={v}
                    color="var(--danger)"
                    desc={`Moon's nak poison point · ${v.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {data.yogas_extra?.ganda_mula && (
                  <TimeBand
                    testId="band-ganda-mula"
                    title="Ganda Mula"
                    window={{
                      start: data.sun_moon.sunrise,
                      end: data.yogas_extra.ganda_mula.ends_at,
                    }}
                    color="var(--danger)"
                    desc={`Moon in ${data.yogas_extra.ganda_mula.nakshatra} · avoid new starts`}
                    tz={tz}
                    refDate={refDate}
                  />
                )}
              </div>
            </Section>

            <Section
              title={t("udaya_lagna_title")}
              subtitle={t("udaya_lagna_sub")}
              testId="section-udaya"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                {data.udaya_lagna.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between border-b border-parchment-200/70 py-2.5 gap-3"
                    data-testid={`lagna-${i}`}
                  >
                    <span className="font-serif text-lg text-ink font-medium">{l.rashi}</span>
                    <span className="text-sm text-ink-soft num">
                      {formatTimeWithDate(l.start, tz, refDate)} -{" "}
                      {formatTimeWithDate(l.end, tz, refDate)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section
                title={t("chandrabalam_title")}
                subtitle={t("chandrabalam_sub")}
                testId="section-chandrabalam"
              >
                <div className="flex flex-wrap gap-2">
                  {data.chandrabalam.good_rashis.map((r, i) => (
                    <span key={i} className="tag font-serif">
                      {r.rashi}
                    </span>
                  ))}
                </div>
              </Section>
              <Section
                title={t("tarabalam_title")}
                subtitle={t("tarabalam_sub")}
                testId="section-tarabalam"
              >
                <div className="flex flex-wrap gap-2">
                  {data.tarabalam.good_nakshatras.map((n, i) => (
                    <span key={i} className="tag">
                      {n.nakshatra}
                    </span>
                  ))}
                </div>
              </Section>
            </div>

            <Section
              title={t("shool_vasa_title")}
              subtitle={t("shool_vasa_sub")}
              testId="section-shool-vasa"
            >
              <KV2
                rows={[
                  { label: t("disha_shool"), value: data.shool_vasa.disha_shool },
                  { label: t("rahu_vasa"), value: data.shool_vasa.rahu_vasa },
                  { label: t("chandra_vasa"), value: data.shool_vasa.chandra_vasa },
                ]}
              />
            </Section>

            <Section title={t("calendars_title")} testId="section-calendars">
              <KV2
                rows={[
                  { label: "Kaliyuga Year", value: `${data.calendars.kali_year}` },
                  {
                    label: "Kali Ahargana",
                    value: `${data.calendars.kali_ahargana_days.toLocaleString()} days`,
                  },
                  { label: "Julian Day", value: data.calendars.julian_day.toFixed(2) },
                  {
                    label: "Modified Julian Day",
                    value: data.calendars.modified_julian_day.toLocaleString(),
                  },
                  { label: "Rata Die", value: data.calendars.rata_die.toLocaleString() },
                  {
                    label: "Lahiri Ayanamsa",
                    value: `${data.calendars.ayanamsha_lahiri.toFixed(6)}°`,
                  },
                  {
                    label: "National Civil Date (Śaka)",
                    value: `${data.calendars.national_civil_date.month} ${data.calendars.national_civil_date.day}, ${data.calendars.national_civil_date.shaka_year} Śaka`,
                  },
                  {
                    label: "National Nirayana Date",
                    value: `${data.calendars.national_nirayana_date.month} ${data.calendars.national_nirayana_date.day}, ${data.calendars.national_nirayana_date.shaka_year} Śaka`,
                  },
                ]}
              />
            </Section>

            {data.tamil_calendar && (
              <Section
                title={t("tamil_calendar_title")}
                subtitle={t("tamil_calendar_sub")}
                testId="section-tamil-calendar"
              >
                <p className="text-meta mb-3" data-testid="tamil-summary">
                  <span className="num font-medium" style={{ color: "var(--accent-sun)" }}>
                    {data.tamil_calendar.tamil_month.ta} {data.tamil_calendar.tamil_date}
                  </span>
                  <span className="text-ink-soft">, </span>
                  <span className="font-medium">{data.tamil_calendar.tamil_year.name_ta} ஆண்டு</span>
                </p>
                <KV2
                  rows={[
                    {
                      label: t("tamil_weekday"),
                      value: `${data.tamil_calendar.week_day.ta} (${data.tamil_calendar.week_day.en})`,
                    },
                    {
                      label: t("tamil_month_label"),
                      value: `${data.tamil_calendar.tamil_month.ta} · ${data.tamil_calendar.tamil_month.en}`,
                    },
                    {
                      label: t("tamil_date_label"),
                      value: `${data.tamil_calendar.tamil_date}`,
                    },
                    {
                      label: t("tamil_year_label"),
                      value: `${data.tamil_calendar.tamil_year.name_ta} · ${data.tamil_calendar.tamil_year.name_en} (${data.tamil_calendar.tamil_year.id}/60)`,
                    },
                  ]}
                />
              </Section>
            )}

            {data.gowri_panchang && (
              <Section
                title={t("gowri_panchang_title")}
                subtitle={t("gowri_panchang_sub")}
                testId="section-gowri"
              >
                <GowriPanchangam
                  day={data.gowri_panchang.day}
                  night={data.gowri_panchang.night}
                  tz={tz}
                />
              </Section>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function TimeCard({
  label,
  value,
  color,
  icon,
  testId,
}: {
  label: string;
  value: string;
  color: string;
  icon?: string;
  testId?: string;
}) {
  return (
    <div
      className="px-3 py-2 bg-parchment-50 border border-parchment-200 rounded-sm"
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className="text-base leading-none opacity-80" style={{ color }} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="text-lead num mt-0.5 font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function LimbCol({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="eyebrow-lg mb-1.5 pb-1 border-b"
        style={{ color: accent, borderColor: "var(--border)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
