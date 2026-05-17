import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { TransitTimeline } from "@/components/transits/TransitTimeline";
import { fetchTransits } from "@/lib/api";
import { daysFromNow, todayISO } from "@/lib/format";
import type { LocationChoice, TransitEvent, TransitsResponse } from "@/types/api";

export function TransitsPage({ defaultLocation }: { defaultLocation: LocationChoice }) {
  const { t } = useI18n();

  const [loc, setLoc] = useState<LocationChoice>(defaultLocation);
  const [startDate, setStartDate] = useState<string>(() => todayISO());
  const [endDate, setEndDate] = useState<string>(() => daysFromNow(365));
  const [includeNakshatras, setIncludeNakshatras] = useState(true);
  const [includeRetrograde, setIncludeRetrograde] = useState(true);

  // Per-planet visibility filter. Moon is omitted from the default set so its
  // ~520-events-per-year footprint stays hidden until the user opts in by
  // clicking the chip - the data is already loaded, the chip only governs
  // which events render.
  const [visiblePlanets, setVisiblePlanets] = useState<Set<string>>(
    () =>
      new Set([
        "Sun",
        "Mercury",
        "Mars",
        "Venus",
        "Jupiter",
        "Saturn",
        "Rahu",
        "Ketu",
        "Uranus",
        "Neptune",
        "Pluto",
      ]),
  );

  const [data, setData] = useState<TransitsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTransits({
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezone: loc.timezone,
        start_date: startDate,
        end_date: endDate,
        include_nakshatras: includeNakshatras,
        include_retrograde: includeRetrograde,
        // Always compute Moon events (including its daily nakshatra crossings)
        // so the Moon chip can toggle visibility instantly without a re-fetch.
        // The visiblePlanets filter keeps Moon hidden until the user opts in.
        include_moon: true,
        moon_nakshatras: true,
      });
      setData(res);
    } catch (e) {
      setError((e as Error).message || "Failed to fetch transits");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const didAutoRunRef = useRef(false);
  useEffect(() => {
    if (didAutoRunRef.current) return;
    didAutoRunRef.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply per-planet filter client-side so the user can toggle without re-fetching
  const filteredEvents: TransitEvent[] = useMemo(() => {
    if (!data) return [];
    return data.events.filter((e) => visiblePlanets.has(e.planet));
  }, [data, visiblePlanets]);

  const tz = data?.timezone ?? loc.timezone ?? "UTC";

  const togglePlanet = (name: string) => {
    setVisiblePlanets((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Stats line - which event types are in the visible set
  const stats = useMemo(() => {
    if (!data) return { sign: 0, nak: 0, retro: 0 };
    return {
      sign: filteredEvents.filter((e) => e.event_type === "sign_ingress").length,
      nak: filteredEvents.filter((e) => e.event_type === "nakshatra_ingress").length,
      retro: filteredEvents.filter(
        (e) => e.event_type === "retrograde" || e.event_type === "direct",
      ).length,
    };
  }, [data, filteredEvents]);

  const PLANET_FILTER_ORDER = [
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
    "Rahu",
    "Ketu",
    "Uranus",
    "Neptune",
    "Pluto",
  ];

  return (
    <section
      data-testid="transits-view"
      className="pt-3 sm:pt-4 pb-8 grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-5"
    >
      <div className="xl:col-span-12 space-y-3">
        <div className="card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="eyebrow-accent">{t("transits_eyebrow")}</p>
              <h2 className="heading-page mt-0.5">{t("transits_title")}</h2>
              <p className="text-meta text-ink-soft mt-1">{t("transits_subtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="md:col-span-3">
              <label className="field-label">{t("transits_start")}</label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                testIdPrefix="transits-start"
              />
            </div>
            <div className="md:col-span-3">
              <label className="field-label">{t("transits_end")}</label>
              <DatePicker value={endDate} onChange={setEndDate} testIdPrefix="transits-end" />
            </div>
            <div className="md:col-span-4">
              <label className="field-label">{t("place")}</label>
              <CitySearch
                value={loc.place_name}
                onSelect={(p) => setLoc({ ...p, timezone: null })}
                testIdPrefix="transits-city"
              />
            </div>
            <div className="md:col-span-2">
              <button
                data-testid="transits-fetch-btn"
                onClick={() => run()}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? t("loading") : t("transits_compute")}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-meta">
            <ToggleRow
              label={t("transits_nakshatras")}
              checked={includeNakshatras}
              onChange={setIncludeNakshatras}
              testId="transits-toggle-nakshatras"
            />
            <ToggleRow
              label={t("transits_retrograde")}
              checked={includeRetrograde}
              onChange={setIncludeRetrograde}
              testId="transits-toggle-retro"
            />
          </div>

          {error && (
            <div
              data-testid="transits-error"
              className="mt-4 text-sm text-rose font-medium bg-rose/5 border border-rose/30 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}
        </div>

        {loading && !data && (
          <div className="flex flex-col items-center py-16 gap-4">
            <MandalaLoader size={56} />
            <p className="font-serif text-ink-soft italic">{t("transits_loading")}</p>
          </div>
        )}

        {data && (
          <>
            <div className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="text-meta text-ink-soft">
                  <span className="font-semibold text-ink">{filteredEvents.length}</span>{" "}
                  {t("transits_events_short")}
                  <span className="text-ink-soft">
                    {" "}
                    · {stats.sign} {t("transits_sign_short")}, {stats.nak}{" "}
                    {t("transits_nak_short")}, {stats.retro} {t("transits_retro_short")}
                  </span>
                </div>
                <div className="text-mini text-ink-soft">{tz}</div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {PLANET_FILTER_ORDER.map((p) => {
                  const active = visiblePlanets.has(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlanet(p)}
                      data-testid={`transits-planet-${p.toLowerCase()}`}
                      className={`px-2.5 py-0.5 rounded-2xs text-mini font-medium border transition-colors ${
                        active
                          ? "bg-saffron/10 text-saffron border-saffron/40"
                          : "bg-parchment-50 text-ink-soft border-parchment-200 hover:border-saffron/30"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card p-4 sm:p-6">
              <TransitTimeline events={filteredEvents} tz={tz} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  testId,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
  hint?: string;
}) {
  return (
    <label
      data-testid={testId}
      className="inline-flex items-center gap-2 cursor-pointer select-none"
      title={hint}
    >
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      <span className="font-medium text-ink">{label}</span>
      {hint && <span className="text-mini text-ink-soft hidden sm:inline">· {hint}</span>}
    </label>
  );
}
