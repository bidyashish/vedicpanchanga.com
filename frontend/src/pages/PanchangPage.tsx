import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { ShareLinkButton } from "@/components/common/ShareLinkButton";
import { DatePicker } from "@/components/ui/date-picker";
import { GowriPanchangam } from "@/components/panchang/GowriPanchangam";
import { HoraPanchangam } from "@/components/panchang/HoraPanchangam";
import { NallaNeram } from "@/components/panchang/NallaNeram";
import { Section } from "@/components/panchang/Section";
import { TimeBand } from "@/components/panchang/TimeBand";
import { VedicChart } from "@/components/kundali/VedicChart";
import type { PlanetStatus } from "@/components/kundali/VedicChart";
import { SouthIndianChart } from "@/components/kundali/SouthIndianChart";
import { WesternChart } from "@/components/kundali/WesternChart";
import { PlanetsTable } from "@/components/kundali/PlanetsTable";
import { PlanetDetailModal } from "@/components/kundali/PlanetDetailModal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { useAstro } from "@/i18n/astro";
import { calculateChart, fetchPanchang, reverseGeocode } from "@/lib/api";
import {
  formatTime,
  formatTimeWithDate,
  formatLongDate,
  hoursToHMS,
  nowTimeInTz,
  nowTimeWithSecondsInTz,
  todayISO,
  todayISOInTz,
} from "@/lib/format";
import {
  parseDate,
  parseEnum,
  parseFloat3,
  parseStr,
  parseTz,
  readSearch,
  round4,
  shareUrlFor,
} from "@/lib/urlState";
import type { ChartData, LocationChoice, PanchangData, TransitItem } from "@/types/api";

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
  const { t } = useI18n();
  if (!items?.length) return <div className="meta">-</div>;
  return (
    <ul className="divide-y divide-parchment-200">
      {items.map((it, i) => {
        const endIso = it.ends_at ?? it.end;
        const range = it.starts_at
          ? `${formatTimeWithDate(it.starts_at, tz, refDate)} → ${formatTimeWithDate(endIso, tz, refDate)}`
          : `${t("upto")} ${formatTimeWithDate(endIso, tz, refDate)}`;
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
  const { t, lang } = useI18n();
  const a = useAstro();
  // Tamil Calendar values in the API ship with both Tamil and English forms
  // (e.g. weekday `{ta:"செவ்வாய்", en:"Tuesday"}`). The bilingual annotation
  // helps non-Tamil users cross-reference; in Tamil mode itself it's noise.
  const showEn = lang === "en";

  // Initial query-string snapshot. Captured once on mount so later edits to
  // window.location don't re-seed state mid-session.
  const initialParams = useMemo(() => {
    const sp = readSearch();
    const lat = parseFloat3(sp.get("lat"), -90, 90);
    const lon = parseFloat3(sp.get("lon"), -180, 180);
    return {
      date: parseDate(sp.get("date")),
      lat,
      lon,
      tz: parseTz(sp.get("tz")),
      place: parseStr(sp.get("place"), 120),
      style: parseEnum(sp.get("style"), ["north", "south", "west"] as const),
      hasLocation: lat != null && lon != null,
    };
  }, []);

  const [date, setDate] = useState(() => initialParams.date ?? todayISO());
  const [loc, setLoc] = useState<LocationChoice>(() =>
    initialParams.hasLocation
      ? {
          place_name: initialParams.place ?? "Shared location",
          latitude: initialParams.lat as number,
          longitude: initialParams.lon as number,
          timezone: initialParams.tz,
        }
      : defaultLocation,
  );
  const [data, setData] = useState<PanchangData | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [detailPlanetAbbr, setDetailPlanetAbbr] = useState<string | null>(null);

  const detailPlanet = useMemo(() => {
    if (!detailPlanetAbbr || !chart) return null;
    if (chart.ascendant.abbr === detailPlanetAbbr) return chart.ascendant;
    return chart.planets_data.find((p) => p.abbr === detailPlanetAbbr) ?? null;
  }, [detailPlanetAbbr, chart]);

  const openPlanetDetail = useCallback((abbr: string | null) => {
    if (abbr) setDetailPlanetAbbr(abbr);
  }, []);

  // The HH:MM the lagna kundali is cast for. We use *current* wall-clock time
  // in the chart's location so the chart reflects the live sky — at sunrise
  // the lagna co-rises with the sun and the chart looked frozen on Aries when
  // the sun was in Aries.
  const [chartTime, setChartTime] = useState<string>("");
  const [chartStyle, setChartStyle] = useState<"north" | "south" | "west">(
    () => initialParams.style ?? "north",
  );
  const [showDegrees, setShowDegrees] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("jk_show_degree") === "1";
  });
  const onShowDegrees = (v: boolean) => {
    setShowDegrees(v);
    try {
      window.localStorage.setItem("jk_show_degree", v ? "1" : "0");
    } catch {
      /* ignore quota errors */
    }
  };
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("jk_panchang_live") === "1";
  });
  const [liveTime, setLiveTime] = useState<string>("");
  const onLiveMode = (v: boolean) => {
    setLiveMode(v);
    try {
      window.localStorage.setItem("jk_panchang_live", v ? "1" : "0");
    } catch {
      /* ignore quota errors */
    }
  };

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

  const chartPlanetStatus = useMemo(() => {
    if (!chart) return undefined;
    const map: Record<string, PlanetStatus> = {};
    for (const p of chart.planets_data) {
      if (p.retrograde || p.combust) {
        map[p.abbr] = { retrograde: p.retrograde, combust: !!p.combust };
      }
    }
    return Object.keys(map).length ? map : undefined;
  }, [chart]);

  // StrictMode in dev fires effects twice; guard so the initial fetch only
  // hits the backend once. Production builds run effects once and ignore this.
  const didAutoRunRef = useRef(false);
  useEffect(() => {
    if (didAutoRunRef.current) return;
    didAutoRunRef.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live mode: refresh the whole panchang (data + lagna chart) every 60s.
  // `run`, `loading`, and `setDate` are captured via refs so the interval
  // always sees the latest closure without forcing us to tear down and
  // re-create the timer on every render. On each tick the date is advanced
  // to "today" in the panchang location's timezone so the page rolls over
  // at midnight automatically.
  const runRef = useRef(run);
  const loadingRef = useRef(loading);
  const dateRef = useRef(date);
  const locRef = useRef(loc);
  const dataRef = useRef(data);
  useEffect(() => {
    runRef.current = run;
    loadingRef.current = loading;
    dateRef.current = date;
    locRef.current = loc;
    dataRef.current = data;
  });
  useEffect(() => {
    if (!liveMode) return;
    const id = window.setInterval(() => {
      if (loadingRef.current) return;
      const tz = dataRef.current?.location.timezone ?? locRef.current.timezone ?? undefined;
      const today = todayISOInTz(tz);
      if (today !== dateRef.current) {
        setDate(today);
        runRef.current({ date: today });
      } else {
        runRef.current();
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [liveMode]);

  // Wall-clock ticker for the live-mode time display. Runs every second so the
  // displayed HH:MM flips within ~1s of the real minute boundary, but React's
  // primitive-equality skip keeps re-renders to once a minute.
  useEffect(() => {
    if (!liveMode) {
      setLiveTime("");
      return;
    }
    const tz = data?.location.timezone;
    const tick = () => setLiveTime(nowTimeWithSecondsInTz(tz));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [liveMode, data?.location.timezone]);

  // URL params are only generated on-demand via the share-link button
  // (shareUrlFor). The address bar stays clean at all times.

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
          <div className="mt-3 pt-3 border-t border-parchment-200 flex flex-wrap items-center justify-between gap-3">
            <label
              data-testid="panchang-live-toggle"
              className="inline-flex items-center gap-2 cursor-pointer select-none"
            >
              <Switch
                checked={liveMode}
                onCheckedChange={onLiveMode}
                aria-label={t("live_mode")}
                data-testid="panchang-live-switch"
              />
              <span className="text-mini font-medium text-ink">{t("live_mode")}</span>
              <span className="text-mini text-ink-soft">({t("live_mode_hint")})</span>
            </label>
            {liveMode && (
              <span
                data-testid="panchang-live-indicator"
                className="inline-flex items-center gap-1.5 text-mini font-medium text-leaf"
              >
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-leaf opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
                </span>
                {t("live_badge")}
              </span>
            )}
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
            <div className="card p-3 sm:p-4 lg:p-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <p className="eyebrow-accent">{t("panchang_title")}</p>
                  <h2 className="heading-page mt-0.5" data-testid="panchang-title">
                    {formatLongDate(data.date)}
                    {liveMode && liveTime && (
                      <span data-testid="panchang-live-time" className="ml-3">
                        · {a.num(liveTime)}
                      </span>
                    )}
                  </h2>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap justify-end">
                  <p className="text-mini text-ink-soft text-right">
                    {loc.place_name}
                    <br className="sm:hidden" />
                    <span className="hidden sm:inline"> · </span>
                    {data.location.timezone}
                  </p>
                  <ShareLinkButton
                    testId="panchang-share-link"
                    url={shareUrlFor("/", {
                      date,
                      lat: round4(loc.latitude),
                      lon: round4(loc.longitude),
                      tz: data.location.timezone,
                      place: loc.place_name || undefined,
                      style: chartStyle === "north" ? undefined : chartStyle,
                    })}
                  />
                </div>
              </div>
            </div>

            <Section
              title={t("section_lagna_kundali")}
              subtitle={
                chartTime
                  ? `${formatLongDate(data.date)} · ${a.num(chartTime)} · ${data.location.timezone}`
                  : t("live_chart")
              }
              testId="section-lagna-kundali"
            >
              {chartLoading && !chart ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <MandalaLoader size={36} />
                  <p className="meta italic">{t("consulting_heavens")}</p>
                </div>
              ) : chart ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                    <div className="md:col-span-1 space-y-3 max-w-xs mx-auto md:mx-0 md:max-w-none">
                      <div className="flex flex-wrap items-center gap-3">
                        <SegmentedControl<"north" | "south" | "west">
                          testId="lagna-chart-style-toggle"
                          ariaLabel={t("chart_style")}
                          value={chartStyle}
                          onChange={setChartStyle}
                          options={[
                            {
                              id: "north",
                              label: t("north_indian"),
                              testId: "lagna-chart-style-north",
                            },
                            {
                              id: "south",
                              label: t("south_indian"),
                              testId: "lagna-chart-style-south",
                            },
                            {
                              id: "west",
                              label: t("western"),
                              testId: "lagna-chart-style-west",
                            },
                          ]}
                        />
                        {chartStyle !== "west" && (
                          <label
                            data-testid="lagna-show-degree-toggle"
                            className="inline-flex items-center gap-2 text-mini font-medium text-ink-soft cursor-pointer select-none"
                          >
                            <span>{t("show_degree")}</span>
                            <Switch
                              checked={showDegrees}
                              onCheckedChange={onShowDegrees}
                              aria-label={t("show_degree")}
                              data-testid="lagna-show-degree-switch"
                            />
                          </label>
                        )}
                      </div>
                      <div className="bg-parchment-50 p-2 rounded-sm">
                        {chartStyle === "west" ? (
                          <WesternChart
                            planets={chart.planets_data}
                            ascendant={chart.ascendant}
                            ascSign={chart.d1_asc_sign}
                            title={t("rashi_chart_title")}
                            testId="lagna-chart-west"
                            onSelectPlanet={openPlanetDetail}
                          />
                        ) : chartStyle === "south" ? (
                          <SouthIndianChart
                            houseMap={chart.d1_chart}
                            ascSign={chart.d1_asc_sign}
                            title={t("rashi_chart_title")}
                            testId="lagna-chart-south"
                            planetDegrees={chart.vargas?.d1?.planet_degrees}
                            planetStatus={chartPlanetStatus}
                            showDegrees={showDegrees}
                            onSelectPlanet={openPlanetDetail}
                          />
                        ) : (
                          <VedicChart
                            houseMap={chart.d1_chart}
                            ascSign={chart.d1_asc_sign}
                            title={t("rashi_chart_title")}
                            testId="lagna-chart-north"
                            planetDegrees={chart.vargas?.d1?.planet_degrees}
                            planetStatus={chartPlanetStatus}
                            showDegrees={showDegrees}
                            onSelectPlanet={openPlanetDetail}
                          />
                        )}
                      </div>
                      <p className="text-mini text-ink-soft text-center italic">
                        {t("lagna_caption_at")} {a.sign(chart.ascendant.sign)}{" "}
                        {a.num(chart.ascendant.dms)} · {t("lagna_caption_nakshatra")}{" "}
                        {a.nakshatra(chart.ascendant.nakshatra)} ({t("lagna_caption_pada")}{" "}
                        {a.num(chart.ascendant.nakshatra_pada)})
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <PlanetsTable
                        planets={chart.planets_data}
                        ascendant={chart.ascendant}
                        drishti={chart.drishti}
                        friendships={chart.friendships}
                        onSelectPlanet={openPlanetDetail}
                      />
                    </div>
                  </div>
                  <PlanetDetailModal
                    planet={detailPlanet}
                    data={chart}
                    onClose={() => setDetailPlanetAbbr(null)}
                  />
                </>
              ) : (
                <p className="meta italic">{t("chart_unavailable")}</p>
              )}
            </Section>

            <Section title={t("section_sun_moon")} testId="section-sun-moon">
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

            <Section
              title={t("section_panchang_limbs")}
              subtitle={t("section_panchang_limbs_sub")}
              testId="section-panchang-limbs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <LimbCol label={t("limb_tithi")} accent="var(--accent-sun)">
                  <TransitList
                    items={data.panchang.tithi_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => a.tithi(x.name ?? "")}
                    accent="var(--accent-sun)"
                  />
                </LimbCol>
                <LimbCol label={t("limb_nakshatra")} accent="var(--accent-amber)">
                  <TransitList
                    items={data.panchang.nakshatra_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => a.nakshatra(x.name ?? "")}
                    accent="var(--accent-amber)"
                  />
                </LimbCol>
                <LimbCol label={t("limb_yoga")} accent="var(--accent-moon)">
                  <TransitList
                    items={data.panchang.yoga_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => a.yoga(x.name ?? "")}
                    accent="var(--accent-moon)"
                  />
                </LimbCol>
                <LimbCol label={t("limb_karana")} accent="var(--accent-moon)">
                  <TransitList
                    items={data.panchang.karana_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(k) => {
                      const name = a.karana(k.name ?? "");
                      return k.is_bhadra ? `${name} (${t("bhadra")})` : name;
                    }}
                    accent="var(--accent-moon)"
                  />
                </LimbCol>
                <LimbCol label={t("limb_vara")} accent="var(--accent-sun)">
                  <p className="value-strong">
                    <span style={{ color: "var(--accent-sun)" }}>{a.vara(data.vara.sanskrit)}</span>
                    {showEn && (
                      <>
                        {" "}
                        <span className="text-ink-soft font-normal">({data.vara.english})</span>
                      </>
                    )}
                  </p>
                </LimbCol>
                <LimbCol label={t("limb_paksha")} accent="var(--accent-moon)">
                  <p className="value-strong">{a.paksha(data.panchang.paksha)}</p>
                </LimbCol>
              </div>
            </Section>

            <Section title={t("section_lunar_month")} testId="section-samvat">
              <KV2
                rows={[
                  {
                    label: t("lunar_vikram"),
                    value: `${a.num(data.lunar_month.vikram_samvat)} · ${a.samvatsara(data.lunar_month.samvatsara_vikram)}`,
                  },
                  {
                    label: t("lunar_shaka"),
                    value: `${a.num(data.lunar_month.shaka_samvat)} · ${a.samvatsara(data.lunar_month.samvatsara_shaka)}`,
                  },
                  { label: t("lunar_gujarati"), value: a.num(data.lunar_month.gujarati_samvat) },
                  {
                    label: t("lunar_chandramasa_purnimanta"),
                    value: a.lunarMonth(data.lunar_month.chandramasa_purnimanta),
                  },
                  {
                    label: t("lunar_chandramasa_amanta"),
                    value: a.lunarMonth(data.lunar_month.chandramasa_amanta),
                  },
                  {
                    label: t("lunar_nirayana_solar"),
                    value: a.lunarMonth(data.lunar_month.nirayana_solar_month),
                  },
                  { label: t("lunar_pravishte"), value: a.num(data.lunar_month.pravishte_day) },
                  { label: t("limb_paksha"), value: a.paksha(data.lunar_month.paksha) },
                ]}
              />
            </Section>

            <Section title={t("section_rashi_nakshatra")} testId="section-rashi-nak">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="eyebrow text-saffron mb-3">{t("rashi_moonsign")}</p>
                  <TransitList
                    items={data.rashi_nakshatra.moonsign_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(s) => a.sign(s.rashi ?? s.name ?? "")}
                    accent="var(--accent-sun)"
                  />
                  <p className="eyebrow text-indigo mt-6 mb-3">{t("rashi_nak_pada")}</p>
                  <TransitList
                    items={data.rashi_nakshatra.moon_nakshatra_padas}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(p) =>
                      `${a.nakshatra(p.nakshatra ?? "")} ${t("col_pada")} ${a.num(p.pada ?? "")}`
                    }
                    accent="var(--accent-moon)"
                  />
                </div>
                <div>
                  <p className="eyebrow text-saffron mb-3">{t("rashi_sunsign")}</p>
                  <p
                    className="font-serif text-2xl font-medium"
                    style={{ color: "var(--accent-sun)" }}
                  >
                    {a.sign(data.rashi_nakshatra.sunsign.rashi)}
                  </p>
                  <p className="eyebrow text-gold mt-6 mb-3">{t("rashi_surya_nak")}</p>
                  <p className="font-serif text-xl text-ink font-medium leading-snug">
                    {a.nakshatra(data.rashi_nakshatra.surya_nakshatra.name)}
                    <span className="text-ink-soft">
                      {" "}
                      · {t("col_pada")} {a.num(data.rashi_nakshatra.surya_nakshatra.pada)}
                    </span>
                  </p>
                  <p className="text-sm text-ink-soft num mt-1">
                    {t("upto")}{" "}
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

            {data.nalla_neram && data.nalla_neram.length > 0 && (
              <Section
                title={t("nalla_neram_title")}
                subtitle={t("nalla_neram_sub")}
                testId="section-nalla-neram"
              >
                <NallaNeram windows={data.nalla_neram} tz={tz} testId="nalla-neram" />
              </Section>
            )}

            <Section title={t("section_ritu_ayana")} testId="section-ritu-ayana">
              <KV2
                rows={[
                  { label: t("ritu_drik_ritu"), value: a.ritu(data.ritu_ayana.drik_ritu) },
                  { label: t("ritu_vedic_ritu"), value: a.ritu(data.ritu_ayana.vedic_ritu) },
                  { label: t("ritu_drik_ayana"), value: a.ayana(data.ritu_ayana.drik_ayana) },
                  { label: t("ritu_vedic_ayana"), value: a.ayana(data.ritu_ayana.vedic_ayana) },
                  { label: t("ritu_dinamana"), value: hoursToHMS(data.sun_moon.dinaman_hours) },
                  { label: t("ritu_ratrimana"), value: hoursToHMS(data.sun_moon.ratriman_hours) },
                  { label: t("ritu_madhyahna"), value: formatTime(data.sun_moon.madhyahna, tz) },
                ]}
              />
            </Section>

            <Section title={t("auspicious_title")} testId="section-auspicious">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <TimeBand
                  testId="band-brahma"
                  title={t("muhurta_brahma")}
                  window={data.auspicious_timings.brahma_muhurta}
                  color="var(--success)"
                  desc={t("muhurta_brahma_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-pratah"
                  title={t("muhurta_pratah_sandhya")}
                  window={data.auspicious_timings.pratah_sandhya}
                  color="var(--success)"
                  desc={t("muhurta_pratah_sandhya_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-abhijit"
                  title={t("muhurta_abhijit_full")}
                  window={data.auspicious_timings.abhijit}
                  color="var(--success)"
                  desc={t("muhurta_abhijit_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-vijay"
                  title={t("muhurta_vijay")}
                  window={data.auspicious_timings.vijay_muhurta}
                  color="var(--success)"
                  desc={t("muhurta_vijay_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-godhuli"
                  title={t("muhurta_godhuli")}
                  window={data.auspicious_timings.godhuli_muhurta}
                  color="var(--success)"
                  desc={t("muhurta_godhuli_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-sayahna"
                  title={t("muhurta_sayam_sandhya")}
                  window={data.auspicious_timings.sayahna_sandhya}
                  color="var(--success)"
                  desc={t("muhurta_sayam_sandhya_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-nishita"
                  title={t("muhurta_nishita")}
                  window={data.auspicious_timings.nishita_muhurta}
                  color="var(--success)"
                  desc={t("muhurta_nishita_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                {(data.auspicious_timings.amrit_kalam ?? []).map((amrit, i) => (
                  <TimeBand
                    key={`am-${i}`}
                    testId={`band-amrit-${i}`}
                    title={t("muhurta_amrit_kalam")}
                    window={amrit}
                    color="var(--success)"
                    desc={`${t("muhurta_amrit_kalam_desc")} · ${a.nakshatra(amrit.nakshatra ?? "")}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.auspicious_timings.sarvartha_siddhi_yoga ?? []).map((s, i) => (
                  <TimeBand
                    key={`ss-${i}`}
                    testId={`band-sarvartha-${i}`}
                    title={t("muhurta_sarvartha")}
                    window={s}
                    color="var(--success)"
                    desc={`${t("muhurta_sarvartha_desc")} · ${a.nakshatra(s.nakshatra ?? "")}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.auspicious_timings.amrita_siddhi_yoga ?? []).map((s, i) => (
                  <TimeBand
                    key={`asd-${i}`}
                    testId={`band-amrita-siddhi-${i}`}
                    title={t("muhurta_amrita_siddhi")}
                    window={s}
                    color="var(--success)"
                    desc={`${t("muhurta_amrita_siddhi_desc")} · ${a.nakshatra(s.nakshatra ?? "")}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {data.yogas_extra?.ravi_yoga && (
                  <TimeBand
                    testId="band-ravi-yoga"
                    title={t("muhurta_ravi_yoga")}
                    window={data.yogas_extra.ravi_yoga}
                    color="var(--success)"
                    desc={t("muhurta_ravi_yoga_desc")}
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
                  title={t("muhurta_rahu_kalam")}
                  window={data.inauspicious_timings.rahu_kalam}
                  color="var(--danger)"
                  desc={t("muhurta_rahu_kalam_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-yamaganda"
                  title={t("muhurta_yamaganda")}
                  window={data.inauspicious_timings.yamaganda}
                  color="var(--accent-sun)"
                  desc={t("muhurta_yamaganda_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-gulika"
                  title={t("muhurta_gulika")}
                  window={data.inauspicious_timings.gulika_kalam}
                  color="var(--ink-soft)"
                  desc={t("muhurta_gulika_desc")}
                  tz={tz}
                  refDate={refDate}
                />
                {data.inauspicious_timings.dur_muhurtam.map((dm, i) => (
                  <TimeBand
                    key={i}
                    testId={`band-dur-${i}`}
                    title={`${t("muhurta_dur")} #${a.num(dm.muhurta_number)}`}
                    window={dm}
                    color="var(--danger)"
                    desc={t("muhurta_dur_desc")}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {data.inauspicious_timings.bhadra.map((b, i) => (
                  <TimeBand
                    key={`b-${i}`}
                    testId={`band-bhadra-${i}`}
                    title={t("muhurta_bhadra")}
                    window={b}
                    color="var(--danger)"
                    desc={t("muhurta_bhadra_desc")}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.inauspicious_timings.varjyam ?? []).map((v, i) => (
                  <TimeBand
                    key={`v-${i}`}
                    testId={`band-varjyam-${i}`}
                    title={t("muhurta_varjyam")}
                    window={v}
                    color="var(--danger)"
                    desc={`${t("muhurta_varjyam_desc")} · ${a.nakshatra(v.nakshatra ?? "")}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {data.yogas_extra?.ganda_mula && (
                  <TimeBand
                    testId="band-ganda-mula"
                    title={t("muhurta_ganda_mula")}
                    window={{
                      start: data.sun_moon.sunrise,
                      end: data.yogas_extra.ganda_mula.ends_at,
                    }}
                    color="var(--danger)"
                    desc={`${t("muhurta_moon_in")} ${a.nakshatra(data.yogas_extra.ganda_mula.nakshatra)} · ${t("muhurta_ganda_mula_desc")}`}
                    tz={tz}
                    refDate={refDate}
                  />
                )}
              </div>
            </Section>

            {data.tyajyam && (
              <Section
                title={t("tyajyam_title")}
                subtitle={t("tyajyam_sub")}
                testId="section-tyajyam"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.tyajyam.nakshatra_tyajyam.map((nt, i) => (
                    <TimeBand
                      key={`nt-${i}`}
                      testId={`band-nak-tyajyam-${i}`}
                      title={t("tyajyam_nakshatra")}
                      window={nt}
                      color="var(--danger)"
                      desc={`${t("tyajyam_nakshatra_desc")} · ${a.nakshatra(nt.nakshatra)}`}
                      tz={tz}
                      refDate={refDate}
                    />
                  ))}
                  {data.tyajyam.tithi_tyajyam.map((tt, i) => (
                    <TimeBand
                      key={`tt-${i}`}
                      testId={`band-tithi-tyajyam-${i}`}
                      title={t("tyajyam_tithi")}
                      window={tt}
                      color="var(--danger)"
                      desc={`${t("tyajyam_tithi_desc")} · ${a.tithi(tt.tithi)}`}
                      tz={tz}
                      refDate={refDate}
                    />
                  ))}
                  {data.tyajyam.vara_tyajyam && (
                    <TimeBand
                      testId="band-vara-tyajyam"
                      title={t("tyajyam_vara")}
                      window={data.tyajyam.vara_tyajyam}
                      color="var(--accent-sun)"
                      desc={t("tyajyam_vara_desc")}
                      tz={tz}
                      refDate={refDate}
                    />
                  )}
                  {data.tyajyam.amritadi_yogam.map((ay, i) => (
                    <TimeBand
                      key={`ay-${i}`}
                      testId={`band-amritadi-${i}`}
                      title={`${t("amritadi_title")} · ${a.yogam(ay.yogam)}`}
                      window={ay}
                      color={
                        ay.yogam === "Amrita"
                          ? "var(--success)"
                          : ay.yogam === "Siddha"
                            ? "var(--success)"
                            : ay.yogam === "Marana"
                              ? "var(--danger)"
                              : ay.yogam === "Prabalarishta"
                                ? "var(--danger)"
                                : "var(--ink-soft)"
                      }
                      desc={`${a.nakshatra(ay.nakshatra)} · ${t(`amritadi_${ay.yogam.toLowerCase()}`)}`}
                      tz={tz}
                      refDate={refDate}
                    />
                  ))}
                </div>
              </Section>
            )}

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
                    <span className="font-serif text-lg text-ink font-medium">
                      {a.sign(l.rashi)}
                    </span>
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
                      {a.sign(r.rashi)}
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
                      {a.nakshatra(n.nakshatra)}
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
                  { label: t("disha_shool"), value: a.direction(data.shool_vasa.disha_shool) },
                  { label: t("rahu_vasa"), value: a.direction(data.shool_vasa.rahu_vasa) },
                  { label: t("chandra_vasa"), value: a.direction(data.shool_vasa.chandra_vasa) },
                ]}
              />
            </Section>

            <Section title={t("calendars_title")} testId="section-calendars">
              <KV2
                rows={[
                  { label: t("cal_kaliyuga"), value: a.num(data.calendars.kali_year) },
                  {
                    label: t("cal_kali_ahargana"),
                    value: `${a.num(data.calendars.kali_ahargana_days.toLocaleString())} ${t("cal_days")}`,
                  },
                  {
                    label: t("cal_julian_day"),
                    value: a.num(data.calendars.julian_day.toFixed(2)),
                  },
                  {
                    label: t("cal_modified_julian"),
                    value: a.num(data.calendars.modified_julian_day.toLocaleString()),
                  },
                  {
                    label: t("cal_rata_die"),
                    value: a.num(data.calendars.rata_die.toLocaleString()),
                  },
                  {
                    label: t("cal_lahiri_ayanamsa"),
                    value: a.num(`${data.calendars.ayanamsha_lahiri.toFixed(6)}°`),
                  },
                  {
                    label: t("cal_national_civil"),
                    value: `${a.lunarMonth(data.calendars.national_civil_date.month)} ${a.num(data.calendars.national_civil_date.day)}, ${a.num(data.calendars.national_civil_date.shaka_year)} ${t("cal_saka")}`,
                  },
                  {
                    label: t("cal_national_nirayana"),
                    value: `${a.lunarMonth(data.calendars.national_nirayana_date.month)} ${a.num(data.calendars.national_nirayana_date.day)}, ${a.num(data.calendars.national_nirayana_date.shaka_year)} ${t("cal_saka")}`,
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
                    {data.tamil_calendar.tamil_month.ta} {a.num(data.tamil_calendar.tamil_date)}
                  </span>
                  <span className="text-ink-soft">, </span>
                  <span className="font-medium">{data.tamil_calendar.tamil_year.name_ta} ஆண்டு</span>
                </p>
                <KV2
                  rows={[
                    {
                      label: t("tamil_weekday"),
                      value: showEn
                        ? `${data.tamil_calendar.week_day.ta} (${data.tamil_calendar.week_day.en})`
                        : data.tamil_calendar.week_day.ta,
                    },
                    {
                      label: t("tamil_month_label"),
                      value: showEn
                        ? `${data.tamil_calendar.tamil_month.ta} · ${data.tamil_calendar.tamil_month.en}`
                        : data.tamil_calendar.tamil_month.ta,
                    },
                    {
                      label: t("tamil_date_label"),
                      value: a.num(data.tamil_calendar.tamil_date),
                    },
                    {
                      label: t("tamil_year_label"),
                      value: showEn
                        ? `${data.tamil_calendar.tamil_year.name_ta} · ${data.tamil_calendar.tamil_year.name_en} (${a.num(data.tamil_calendar.tamil_year.id)}/${a.num(60)})`
                        : `${data.tamil_calendar.tamil_year.name_ta} (${a.num(data.tamil_calendar.tamil_year.id)}/${a.num(60)})`,
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
