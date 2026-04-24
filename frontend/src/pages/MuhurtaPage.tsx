import { Fragment, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { AdSlot } from "@/components/shell/AdSlot";
import { fetchMuhurtaPurposes, findMuhurtas } from "@/lib/api";
import { formatDayMonthYear, formatTimeRange, todayISO, daysFromNow } from "@/lib/format";
import type {
  LocationChoice,
  MuhurtaPurpose,
  MuhurtaResponse,
  MuhurtaResult,
} from "@/types/api";

const RASHI_OPTIONS = [
  "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
  "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrischika (Scorpio)",
  "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)",
];

const NAKSHATRA_OPTIONS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];

function scoreColor(s: number): string {
  if (s >= 85) return "#1b6b3a";
  if (s >= 70) return "#3d8c42";
  if (s >= 60) return "#a06f1a";
  return "#993D2E";
}

function ResultCard({ m, tz }: { m: MuhurtaResult; tz?: string }) {
  const { t } = useI18n();
  const color = scoreColor(m.score);
  return (
    <div
      data-testid={`muhurta-result-${m.date}`}
      className="card card-lift p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold">
            {m.weekday}
          </p>
          <h4 className="font-serif text-2xl text-ink mt-0.5">
            {formatDayMonthYear(m.date)}
          </h4>
          <p className="text-sm text-ink-soft mt-1">
            {m.tithi} · {m.paksha?.replace(" Paksha", "")} · {m.nakshatra} · {m.moon_rashi}
          </p>
        </div>
        <div
          className="flex flex-col items-center justify-center min-w-[80px] rounded-sm px-3 py-2 border-2"
          style={{ borderColor: color, color }}
          data-testid={`muhurta-score-${m.date}`}
        >
          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
            {t("muhurta_score")}
          </span>
          <span className="font-serif text-3xl font-bold tabular-nums leading-none">
            {m.score}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
        <InfoTile
          label={t("muhurta_abhijit")}
          value={formatTimeRange(m.abhijit?.start, m.abhijit?.end, tz)}
        />
        <InfoTile
          label={t("muhurta_rahu")}
          value={formatTimeRange(m.rahu_kalam?.start, m.rahu_kalam?.end, tz)}
          valueColor="var(--crimson)"
        />
        <InfoTile
          label={t("muhurta_sunrise_sunset")}
          value={formatTimeRange(m.sunrise, m.sunset, tz)}
        />
      </div>

      {m.reasons?.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-leaf">
            {t("muhurta_reasons")}
          </p>
          <ul className="mt-1 space-y-0.5">
            {m.reasons.map((r, i) => (
              <li key={i} className="text-sm text-ink flex gap-2">
                <span className="text-leaf font-bold">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {m.cautions?.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-crimson">
            {t("muhurta_cautions")}
          </p>
          <ul className="mt-1 space-y-0.5">
            {m.cautions.map((c, i) => (
              <li key={i} className="text-sm text-ink flex gap-2">
                <span className="text-crimson font-bold">·</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoTile({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-parchment-100 border border-parchment-200 rounded-sm px-3 py-2">
      <p className="text-ink-soft uppercase tracking-wider font-semibold">{label}</p>
      <p className="tabular-nums mt-0.5" style={{ color: valueColor ?? "var(--ink)" }}>
        {value}
      </p>
    </div>
  );
}

export function MuhurtaPage({ defaultLocation }: { defaultLocation: LocationChoice }) {
  const { t } = useI18n();
  const [purposes, setPurposes] = useState<MuhurtaPurpose[]>([]);
  const [purpose, setPurpose] = useState("marriage");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(daysFromNow(30));
  const [loc, setLoc] = useState<LocationChoice>(defaultLocation);
  const [birthRashiId, setBirthRashiId] = useState<string>("");
  const [birthNakId, setBirthNakId] = useState<string>("");
  const [minScore, setMinScore] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MuhurtaResponse | null>(null);

  useEffect(() => {
    fetchMuhurtaPurposes()
      .then(setPurposes)
      .catch(() =>
        setPurposes([
          { id: "marriage", label: "Marriage" },
          { id: "griha_pravesh", label: "Griha Pravesha" },
          { id: "business", label: "Business" },
        ]),
      );
  }, []);

  const submit = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const r = await findMuhurtas({
        purpose,
        start_date: startDate,
        end_date: endDate,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezone: loc.timezone,
        birth_rashi_id: birthRashiId ? parseInt(birthRashiId, 10) : null,
        birth_nakshatra_id: birthNakId ? parseInt(birthNakId, 10) : null,
        min_score: minScore,
        limit: 30,
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message || "Failed to search muhurtas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      data-testid="muhurta-view"
      className="pt-4 pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
    >
      <aside className="lg:col-span-4 xl:col-span-3">
        <div
          data-testid="muhurta-form"
          className="card card-lift p-5 lg:p-6 lg:sticky lg:top-20"
        >
          <h2 className="font-serif text-2xl text-ink mb-1">{t("muhurta_title")}</h2>
          <p className="text-xs text-ink-soft mb-5">{t("muhurta_subtitle")}</p>

          <div className="mb-4">
            <label className="field-label">{t("muhurta_purpose")}</label>
            <select
              data-testid="muhurta-purpose-select"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="field"
            >
              {purposes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="field-label">{t("muhurta_start_date")}</label>
              <input
                data-testid="muhurta-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="field-label">{t("muhurta_end_date")}</label>
              <input
                data-testid="muhurta-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="field"
              />
            </div>
          </div>

          <div className="mb-4">
            <CitySearch
              value={loc.place_name}
              onSelect={(p) => setLoc({ ...p, timezone: null })}
              label={t("muhurta_location")}
              placeholder={t("search_city")}
              testIdPrefix="muhurta-city"
            />
          </div>

          <div className="mb-4 pt-4 border-t border-parchment-200">
            <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft font-semibold mb-0.5">
              {t("muhurta_native_filter")}
            </p>
            <p className="text-[11px] text-ink-soft italic mb-3">{t("muhurta_native_sub")}</p>

            <div className="mb-3">
              <label className="block text-xs text-ink-soft mb-1">
                {t("muhurta_birth_rashi")}
              </label>
              <select
                data-testid="muhurta-rashi-select"
                value={birthRashiId}
                onChange={(e) => setBirthRashiId(e.target.value)}
                className="field"
              >
                <option value="">{t("muhurta_none")}</option>
                {RASHI_OPTIONS.map((r, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}. {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-ink-soft mb-1">
                {t("muhurta_birth_nak")}
              </label>
              <select
                data-testid="muhurta-nak-select"
                value={birthNakId}
                onChange={(e) => setBirthNakId(e.target.value)}
                className="field"
              >
                <option value="">{t("muhurta_none")}</option>
                {NAKSHATRA_OPTIONS.map((n, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}. {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="field-label">
              {t("muhurta_min_score")}:{" "}
              <span className="text-crimson font-bold">{minScore}</span>
            </label>
            <input
              data-testid="muhurta-min-score"
              type="range"
              min="40"
              max="90"
              step="5"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
              className="w-full accent-[#993D2E]"
            />
            <div className="flex justify-between text-[10px] text-ink-soft mt-0.5">
              <span>40</span>
              <span>60</span>
              <span>90</span>
            </div>
          </div>

          <button
            data-testid="muhurta-find-btn"
            type="button"
            onClick={submit}
            disabled={loading}
            className="btn-primary w-full px-6 py-3"
          >
            {loading ? (
              <>
                <MandalaLoader size={18} />
                <span>{t("muhurta_searching")}</span>
              </>
            ) : (
              t("muhurta_find")
            )}
          </button>

          {error && (
            <div
              data-testid="muhurta-error"
              className="mt-4 border border-crimson/40 bg-crimson/5 text-crimson text-xs p-3 rounded-sm"
            >
              {error}
            </div>
          )}

          <div className="mt-5 hidden lg:block">
            <AdSlot slot="sidebar" minHeight={240} />
          </div>
        </div>
      </aside>

      <main className="lg:col-span-8 xl:col-span-6 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-crimson">
            <MandalaLoader size={64} />
            <p className="font-serif text-ink-soft italic">{t("muhurta_searching")}</p>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="card p-10 text-center">
            <div className="divider-ornate mb-3 max-w-sm mx-auto">
              <span className="text-[10px] uppercase tracking-[0.3em] text-gold">
                ॥ मुहूर्त ॥
              </span>
            </div>
            <p className="font-serif text-xl text-ink">{t("muhurta_title")}</p>
            <p className="text-sm text-ink-soft italic mt-2 max-w-md mx-auto">
              {t("muhurta_subtitle")}
            </p>
          </div>
        )}

        {result && (
          <>
            <div data-testid="muhurta-summary" className="card card-lift p-5 lg:p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft font-semibold">
                {result.purpose_label}
              </p>
              <h3 className="font-serif text-2xl lg:text-3xl text-ink mt-1">
                {t("muhurta_results")}
              </h3>
              <div className="divider-ornate my-3">
                <span className="font-serif italic text-xs">॥ शुभ मुहूर्त ॥</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
                <div>
                  <span className="text-ink-soft">{result.date_range.days_scanned}</span>{" "}
                  {t("muhurta_days_scanned")}
                </div>
                <div>
                  <span className="text-crimson font-bold">{result.total_matches}</span>{" "}
                  {t("muhurta_matches_found")}
                </div>
                {result.filter.native_rashi && (
                  <div>
                    <span className="text-ink-soft">{t("muhurta_birth_rashi")}:</span>{" "}
                    {result.filter.native_rashi}
                  </div>
                )}
                {result.filter.native_nakshatra && (
                  <div>
                    <span className="text-ink-soft">{t("muhurta_birth_nak")}:</span>{" "}
                    {result.filter.native_nakshatra}
                  </div>
                )}
              </div>
            </div>

            {result.muhurtas.length === 0 && (
              <div
                data-testid="muhurta-empty"
                className="card p-8 text-center text-sm text-ink-soft italic"
              >
                {t("muhurta_no_matches")}
              </div>
            )}

            <div className="space-y-4" data-testid="muhurta-results-list">
              {result.muhurtas.map((m, i) => (
                <Fragment key={m.date}>
                  <ResultCard m={m} tz={result.location?.timezone} />
                  {i === 4 && result.muhurtas.length > 6 && (
                    <AdSlot slot="inline" minHeight={120} />
                  )}
                </Fragment>
              ))}
            </div>
          </>
        )}
      </main>

      <aside className="hidden xl:block xl:col-span-3">
        <div className="xl:sticky xl:top-20 space-y-4">
          <AdSlot slot="sidebar" minHeight={600} />
        </div>
      </aside>
    </section>
  );
}
