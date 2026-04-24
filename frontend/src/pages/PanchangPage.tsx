import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { Section } from "@/components/panchang/Section";
import { TimeBand } from "@/components/panchang/TimeBand";
import { AdSlot } from "@/components/shell/AdSlot";
import { fetchPanchang, reverseGeocode } from "@/lib/api";
import {
  formatTime,
  formatTimeWithDate,
  formatLongDate,
  hoursToHMS,
  todayISO,
} from "@/lib/format";
import type { LocationChoice, PanchangData, TransitItem } from "@/types/api";

function TransitList({
  items,
  tz,
  refDate,
  labelFn,
  accent = "#2C241B",
}: {
  items?: TransitItem[];
  tz?: string;
  refDate?: string;
  labelFn: (it: TransitItem) => string;
  accent?: string;
}) {
  if (!items?.length) return <div className="text-sm text-ink-soft">—</div>;
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-serif text-base" style={{ color: accent }}>
            {labelFn(it)}
          </span>
          <span className="text-xs text-ink-soft tabular-nums">
            upto {formatTimeWithDate(it.ends_at ?? it.end, tz, refDate)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function KV2({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between border-b border-parchment-200/50 py-2 gap-3"
        >
          <span className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">
            {r.label}
          </span>
          <span className="font-serif text-base text-ink text-right">{r.value}</span>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (overrides: Partial<LocationChoice> & { date?: string } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPanchang({
        latitude: overrides.latitude ?? loc.latitude,
        longitude: overrides.longitude ?? loc.longitude,
        date: overrides.date ?? date,
        timezone: overrides.timezone === undefined ? loc.timezone : overrides.timezone,
      });
      setData(d);
    } catch (e) {
      setError((e as Error).message || "Failed to fetch Panchang");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      className="pt-4 pb-10 grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8"
    >
      <div className="xl:col-span-9 space-y-6">
        {/* Controls */}
        <div className="card card-lift p-5 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="field-label">{t("date")}</label>
              <input
                data-testid="panchang-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="field"
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
                className="btn-ghost w-full px-3 py-2.5"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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
                className="btn-primary w-full px-4 py-2.5"
              >
                {loading ? t("loading") : t("show_panchang")}
              </button>
            </div>
          </div>
          {error && (
            <div data-testid="panchang-error" className="mt-3 text-xs text-crimson">
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
            <div className="card p-5 lg:p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft font-semibold">
                {t("panchang_title")}
              </p>
              <h2
                className="font-serif text-3xl lg:text-4xl text-crimson mt-1"
                data-testid="panchang-title"
              >
                {formatLongDate(data.date)}
              </h2>
              <p className="text-sm text-ink-soft mt-1">
                {loc.place_name} · {data.location.timezone}
              </p>
              <div className="divider-ornate my-3">
                <span className="font-serif italic text-sm">{t("panchang_stamp")}</span>
              </div>
            </div>

            <Section title="Sun &amp; Moon" testId="section-sun-moon">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <TimeCard
                  label={t("sunrise")}
                  value={formatTime(data.sun_moon.sunrise, tz)}
                  color="var(--saffron)"
                  testId="sunrise-block"
                />
                <TimeCard
                  label={t("sunset")}
                  value={formatTime(data.sun_moon.sunset, tz)}
                  color="var(--crimson)"
                  testId="sunset-block"
                />
                <TimeCard
                  label={t("moonrise")}
                  value={formatTimeWithDate(data.sun_moon.moonrise, tz, refDate)}
                  color="var(--ink)"
                  testId="moonrise-block"
                />
                <TimeCard
                  label={t("moonset")}
                  value={formatTimeWithDate(data.sun_moon.moonset, tz, refDate)}
                  color="var(--ink)"
                  testId="moonset-block"
                />
              </div>
            </Section>

            <AdSlot slot="inline" minHeight={120} />

            <Section title="Panchānga" subtitle="Five Limbs" testId="section-panchang-limbs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <LimbCol label="Tithi" accent="#993D2E">
                  <TransitList
                    items={data.panchang.tithi_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => x.name ?? ""}
                    accent="#993D2E"
                  />
                </LimbCol>
                <LimbCol label="Nakṣatra" accent="#B26329">
                  <TransitList
                    items={data.panchang.nakshatra_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => x.name ?? ""}
                    accent="#B26329"
                  />
                </LimbCol>
                <LimbCol label="Yoga" accent="#2C241B">
                  <TransitList
                    items={data.panchang.yoga_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(x) => x.name ?? ""}
                  />
                </LimbCol>
                <LimbCol label="Karaṇa" accent="#2C241B">
                  <TransitList
                    items={data.panchang.karana_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(k) => (k.is_bhadra ? `${k.name ?? ""} (Bhadra)` : (k.name ?? ""))}
                  />
                </LimbCol>
                <LimbCol label="Vāra" accent="#993D2E">
                  <p className="font-serif text-base text-crimson">
                    {data.vara.sanskrit}{" "}
                    <span className="text-ink-soft text-xs">({data.vara.english})</span>
                  </p>
                </LimbCol>
                <LimbCol label="Pakṣa" accent="#2C241B">
                  <p className="font-serif text-base text-ink">{data.panchang.paksha}</p>
                </LimbCol>
              </div>
            </Section>

            <Section title="Lunar Month, Saṁvat &amp; Saṁvatsara" testId="section-samvat">
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
                  { label: "Chandramāsa (Pūrṇimānta)", value: data.lunar_month.chandramasa_purnimanta },
                  { label: "Chandramāsa (Amānta)", value: data.lunar_month.chandramasa_amanta },
                  { label: "Nirayaṇa Solar Month", value: data.lunar_month.nirayana_solar_month },
                  { label: "Pravishte / Gate", value: data.lunar_month.pravishte_day },
                  { label: "Pakṣa", value: data.lunar_month.paksha },
                ]}
              />
            </Section>

            <Section title="Rāśi &amp; Nakṣatra" testId="section-rashi-nak">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold mb-2">
                    Moonsign (Chandra Rāśi)
                  </p>
                  <TransitList
                    items={data.rashi_nakshatra.moonsign_sequence}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(s) => s.rashi ?? s.name ?? ""}
                    accent="#993D2E"
                  />
                  <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold mt-4 mb-2">
                    Nakṣatra Pāda
                  </p>
                  <TransitList
                    items={data.rashi_nakshatra.moon_nakshatra_padas}
                    tz={tz}
                    refDate={refDate}
                    labelFn={(p) => `${p.nakshatra ?? ""} Pāda ${p.pada ?? ""}`}
                    accent="#635647"
                  />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold mb-2">
                    Sunsign (Sūrya Rāśi)
                  </p>
                  <p className="font-serif text-base text-crimson">
                    {data.rashi_nakshatra.sunsign.rashi}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold mt-4 mb-2">
                    Sūrya Nakṣatra
                  </p>
                  <p className="font-serif text-base text-saffron">
                    {data.rashi_nakshatra.surya_nakshatra.name} · Pāda{" "}
                    {data.rashi_nakshatra.surya_nakshatra.pada}
                    <span className="text-ink-soft text-xs ml-2">
                      upto {formatTimeWithDate(data.rashi_nakshatra.surya_nakshatra.ends_at, tz, refDate)}
                    </span>
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Ritu &amp; Ayana" testId="section-ritu-ayana">
              <KV2
                rows={[
                  { label: "Drik Ṛtu", value: data.ritu_ayana.drik_ritu },
                  { label: "Vedic Ṛtu", value: data.ritu_ayana.vedic_ritu },
                  { label: "Drik Ayana", value: data.ritu_ayana.drik_ayana },
                  { label: "Vedic Ayana", value: data.ritu_ayana.vedic_ayana },
                  { label: "Dinamāna", value: hoursToHMS(data.sun_moon.dinaman_hours) },
                  { label: "Rātrimāna", value: hoursToHMS(data.sun_moon.ratriman_hours) },
                  { label: "Madhyāhna", value: formatTime(data.sun_moon.madhyahna, tz) },
                ]}
              />
            </Section>

            <Section title={t("auspicious_title")} testId="section-auspicious">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <TimeBand
                  testId="band-brahma"
                  title="Brahma Muhūrta"
                  window={data.auspicious_timings.brahma_muhurta}
                  color="#2F7D32"
                  desc="Sacred hour before dawn"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-pratah"
                  title="Pratāḥ Sandhyā"
                  window={data.auspicious_timings.pratah_sandhya}
                  color="#2F7D32"
                  desc="Morning twilight ritual"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-abhijit"
                  title="Abhijit Muhūrta"
                  window={data.auspicious_timings.abhijit}
                  color="#2F7D32"
                  desc="Auspicious midday"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-vijay"
                  title="Vijay Muhūrta"
                  window={data.auspicious_timings.vijay_muhurta}
                  color="#2F7D32"
                  desc="Victory hour"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-godhuli"
                  title="Godhūli Muhūrta"
                  window={data.auspicious_timings.godhuli_muhurta}
                  color="#2F7D32"
                  desc="Twilight bridging sunset"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-sayahna"
                  title="Sāyaṁ Sandhyā"
                  window={data.auspicious_timings.sayahna_sandhya}
                  color="#2F7D32"
                  desc="Evening twilight ritual"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-nishita"
                  title="Niśīta Muhūrta"
                  window={data.auspicious_timings.nishita_muhurta}
                  color="#2F7D32"
                  desc="Mid-night meditation hour"
                  tz={tz}
                  refDate={refDate}
                />
                {(data.auspicious_timings.amrit_kalam ?? []).map((a, i) => (
                  <TimeBand
                    key={`am-${i}`}
                    testId={`band-amrit-${i}`}
                    title="Amṛit Kāḷam"
                    window={a}
                    color="#1B5E20"
                    desc={`Nectar window · ${a.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.auspicious_timings.sarvartha_siddhi_yoga ?? []).map((s, i) => (
                  <TimeBand
                    key={`ss-${i}`}
                    testId={`band-sarvartha-${i}`}
                    title="Sarvārtha Siddhi Yoga"
                    window={s}
                    color="#2F7D32"
                    desc={`All endeavors succeed · ${s.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {(data.auspicious_timings.amrita_siddhi_yoga ?? []).map((s, i) => (
                  <TimeBand
                    key={`asd-${i}`}
                    testId={`band-amrita-siddhi-${i}`}
                    title="Amṛita Siddhi Yoga"
                    window={s}
                    color="#1B5E20"
                    desc={`Supremely auspicious · ${s.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
              </div>
            </Section>

            <Section title={t("inauspicious_title")} testId="section-inauspicious">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <TimeBand
                  testId="band-rahu"
                  title="Rāhu Kālam"
                  window={data.inauspicious_timings.rahu_kalam}
                  color="#993D2E"
                  desc="Avoid new undertakings"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-yamaganda"
                  title="Yamagaṇḍa"
                  window={data.inauspicious_timings.yamaganda}
                  color="#B26329"
                  desc="Avoid travel & new ventures"
                  tz={tz}
                  refDate={refDate}
                />
                <TimeBand
                  testId="band-gulika"
                  title="Gulika Kālam"
                  window={data.inauspicious_timings.gulika_kalam}
                  color="#635647"
                  desc="Son of Saturn · neutral-inauspicious"
                  tz={tz}
                  refDate={refDate}
                />
                {data.inauspicious_timings.dur_muhurtam.map((dm, i) => (
                  <TimeBand
                    key={i}
                    testId={`band-dur-${i}`}
                    title={`Dur Muhūrtam #${dm.muhurta_number}`}
                    window={dm}
                    color="#7A2E22"
                    desc="Avoid auspicious work"
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
                {data.inauspicious_timings.bhadra.map((b, i) => (
                  <TimeBand
                    key={`b-${i}`}
                    testId={`band-bhadra-${i}`}
                    title="Bhadra (Viṣṭi)"
                    window={b}
                    color="#993D2E"
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
                    color="#993D2E"
                    desc={`Moon's nak poison point · ${v.nakshatra ?? ""}`}
                    tz={tz}
                    refDate={refDate}
                  />
                ))}
              </div>
            </Section>

            <Section
              title={t("udaya_lagna_title")}
              subtitle={t("udaya_lagna_sub")}
              testId="section-udaya"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.udaya_lagna.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between border-b border-parchment-200/50 py-1.5 gap-3 text-sm"
                    data-testid={`lagna-${i}`}
                  >
                    <span className="font-serif text-base text-ink">{l.rashi}</span>
                    <span className="text-xs text-ink-soft tabular-nums">
                      {formatTimeWithDate(l.start, tz, refDate)} —{" "}
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
                    label: "Kali Ahargaṇa",
                    value: `${data.calendars.kali_ahargana_days.toLocaleString()} days`,
                  },
                  { label: "Julian Day", value: data.calendars.julian_day.toFixed(2) },
                  { label: "Modified Julian Day", value: data.calendars.modified_julian_day.toLocaleString() },
                  { label: "Rata Die", value: data.calendars.rata_die.toLocaleString() },
                  { label: "Lahiri Ayanāṁśa", value: `${data.calendars.ayanamsha_lahiri.toFixed(6)}°` },
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
          </>
        )}
      </div>

      <aside className="hidden xl:block xl:col-span-3">
        <div className="xl:sticky xl:top-20 space-y-4">
          <AdSlot slot="sidebar" minHeight={600} />
        </div>
      </aside>
    </section>
  );
}

function TimeCard({
  label,
  value,
  color,
  testId,
}: {
  label: string;
  value: string;
  color: string;
  testId?: string;
}) {
  return (
    <div className="p-4 bg-parchment-100 border border-parchment-200 rounded-sm" data-testid={testId}>
      <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">{label}</p>
      <p className="font-serif text-2xl tabular-nums mt-1" style={{ color }}>
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
        className="text-[11px] uppercase tracking-[0.15em] font-semibold mb-2"
        style={{ color: accent }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
