import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { MandalaMark } from "@/components/common/MandalaMark";
import { ShareLinkButton } from "@/components/common/ShareLinkButton";
import { DatePicker } from "@/components/ui/date-picker";
import { fetchMuhurtaPurposes, findMuhurtas } from "@/lib/api";
import { formatDayMonthYear, formatTimeRange, todayISO, daysFromNow } from "@/lib/format";
import {
  parseDate,
  parseFloat3,
  parseIntIn,
  parseStr,
  parseTz,
  readSearch,
  round4,
  shareUrlFor,
} from "@/lib/urlState";
import type {
  AuspiciousWindow,
  LocationChoice,
  MuhurtaPurpose,
  MuhurtaResponse,
  MuhurtaResult,
  MuhurtaWindow,
} from "@/types/api";

const RASHI_OPTIONS = [
  "Mesha (Aries)",
  "Vrishabha (Taurus)",
  "Mithuna (Gemini)",
  "Karka (Cancer)",
  "Simha (Leo)",
  "Kanya (Virgo)",
  "Tula (Libra)",
  "Vrischika (Scorpio)",
  "Dhanu (Sagittarius)",
  "Makara (Capricorn)",
  "Kumbha (Aquarius)",
  "Meena (Pisces)",
];

const NAKSHATRA_OPTIONS = [
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

function ResultCard({ m, tz }: { m: MuhurtaResult; tz?: string }) {
  const { t } = useI18n();
  return (
    <div data-testid={`muhurta-result-${m.date}`} className="card card-lift p-6">
      <div className="min-w-0">
        <p className="eyebrow-accent">{m.weekday}</p>
        <h4 className="heading-section mt-0.5">{formatDayMonthYear(m.date)}</h4>
        <p className="meta mt-1.5">
          {m.tithi} · {m.paksha?.replace(" Paksha", "")} · {m.nakshatra} · {m.moon_rashi}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        <InfoTile
          label={t("muhurta_abhijit")}
          value={formatTimeRange(m.abhijit?.start, m.abhijit?.end, tz)}
        />
        <InfoTile
          label={t("muhurta_rahu")}
          value={formatTimeRange(m.rahu_kalam?.start, m.rahu_kalam?.end, tz)}
          valueColor="var(--danger)"
        />
        <InfoTile
          label={t("muhurta_sunrise_sunset")}
          value={formatTimeRange(m.sunrise, m.sunset, tz)}
        />
      </div>

      <ShubhMuhuratGrid m={m} tz={tz} />

      {m.reasons?.length > 0 && (
        <div className="mt-5 pt-4 border-t border-parchment-200">
          <p className="eyebrow-lg text-leaf">{t("muhurta_reasons")}</p>
          <ul className="mt-2 space-y-1.5">
            {m.reasons.map((r, i) => (
              <li key={i} className="text-meta text-ink">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {m.cautions?.length > 0 && (
        <div className="mt-4">
          <p className="eyebrow-lg text-rose">{t("muhurta_cautions")}</p>
          <ul className="mt-2 space-y-1.5">
            {m.cautions.map((c, i) => (
              <li key={i} className="text-meta text-ink">
                {c}
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
  hint,
}: {
  label: string;
  value: string;
  valueColor?: string;
  hint?: string;
}) {
  return (
    <div className="border border-parchment-200 rounded-md px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="num mt-1 text-meta font-medium" style={{ color: valueColor ?? "var(--ink)" }}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-ink-soft mt-0.5">{hint}</p>}
    </div>
  );
}

function ShubhMuhuratGrid({ m, tz }: { m: MuhurtaResult; tz?: string }) {
  const { t } = useI18n();
  const fixed: { key: string; label: string; win?: MuhurtaWindow }[] = [
    { key: "brahma", label: t("muhurta_brahma"), win: m.brahma_muhurta },
    { key: "pratah", label: t("muhurta_pratah_sandhya"), win: m.pratah_sandhya },
    { key: "vijay", label: t("muhurta_vijay"), win: m.vijay_muhurta },
    { key: "godhuli", label: t("muhurta_godhuli"), win: m.godhuli_muhurta },
    { key: "sayahna", label: t("muhurta_sayam_sandhya"), win: m.sayahna_sandhya },
    { key: "nishita", label: t("muhurta_nishita"), win: m.nishita_muhurta },
  ];
  const variable: { key: string; label: string; win: AuspiciousWindow }[] = [
    ...(m.amrit_kalam ?? []).map((w, i) => ({
      key: `amrit-${i}`,
      label: t("muhurta_amrit_kalam"),
      win: w,
    })),
    ...(m.sarvartha_siddhi_yoga ?? []).map((w, i) => ({
      key: `ss-${i}`,
      label: t("muhurta_sarvartha"),
      win: w,
    })),
    ...(m.amrita_siddhi_yoga ?? []).map((w, i) => ({
      key: `as-${i}`,
      label: t("muhurta_amrita_siddhi"),
      win: w,
    })),
  ];
  const hasAny = fixed.some((f) => f.win) || variable.length > 0;
  if (!hasAny) return null;
  return (
    <div className="mt-5 pt-4 border-t border-parchment-200">
      <p className="eyebrow-accent mb-2">{t("muhurta_shubh_section")}</p>
      <div data-testid="muhurta-shubh-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fixed.map(
          (f) =>
            f.win && (
              <InfoTile
                key={f.key}
                label={f.label}
                value={formatTimeRange(f.win.start, f.win.end, tz)}
                valueColor="var(--success)"
              />
            ),
        )}
        {variable.map((v) => (
          <InfoTile
            key={v.key}
            label={v.label}
            value={formatTimeRange(v.win.start, v.win.end, tz)}
            valueColor="var(--success)"
            hint={v.win.nakshatra}
          />
        ))}
      </div>
    </div>
  );
}

export function MuhurtaPage({ defaultLocation }: { defaultLocation: LocationChoice }) {
  const { t } = useI18n();

  // Snapshot URL params once on mount. We seed the form from them and, if a
  // location is present, kick off an initial submit so a shared link renders
  // results without a manual click.
  const initialParams = useMemo(() => {
    const sp = readSearch();
    const lat = parseFloat3(sp.get("lat"), -90, 90);
    const lon = parseFloat3(sp.get("lon"), -180, 180);
    return {
      purpose: parseStr(sp.get("purpose"), 40),
      start: parseDate(sp.get("start")),
      end: parseDate(sp.get("end")),
      lat,
      lon,
      tz: parseTz(sp.get("tz")),
      place: parseStr(sp.get("place"), 120),
      rashi: parseIntIn(sp.get("rashi"), 1, 12),
      nakshatra: parseIntIn(sp.get("nakshatra"), 1, 27),
      hasLocation: lat != null && lon != null,
    };
  }, []);

  const [purposes, setPurposes] = useState<MuhurtaPurpose[]>([]);
  const [purpose, setPurpose] = useState(initialParams.purpose ?? "marriage");
  const [startDate, setStartDate] = useState(initialParams.start ?? todayISO());
  const [endDate, setEndDate] = useState(initialParams.end ?? daysFromNow(30));
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
  const [birthRashiId, setBirthRashiId] = useState<string>(
    initialParams.rashi != null ? String(initialParams.rashi) : "",
  );
  const [birthNakId, setBirthNakId] = useState<string>(
    initialParams.nakshatra != null ? String(initialParams.nakshatra) : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MuhurtaResponse | null>(null);

  // Guard against React 18 StrictMode's double-mount in dev so the purposes
  // list is fetched once.
  const purposesFetchedRef = useRef(false);
  useEffect(() => {
    if (purposesFetchedRef.current) return;
    purposesFetchedRef.current = true;
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
        // Backend still ranks days by an internal heuristic, but we no longer
        // expose that score in the UI — only Tithi/Nakshatra/Vara-derived
        // favourable-vs-cautions reasons drive what users see. The threshold
        // here just keeps obviously bad days off the list.
        min_score: 60,
        limit: 30,
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message || "Failed to search muhurtas");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit once on mount when the URL carries a complete-enough request.
  // We need at least a location (lat/lon) for the search to make sense; the
  // other fields fall back to today / 30-day window / no birth filter.
  const didAutoRunRef = useRef(false);
  useEffect(() => {
    if (didAutoRunRef.current) return;
    if (!initialParams.hasLocation) return;
    didAutoRunRef.current = true;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL params are only generated on-demand via the share-link button
  // (shareUrlFor). The address bar stays clean at all times.

  return (
    <section
      data-testid="muhurta-view"
      className="pt-4 pb-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
    >
      <aside className="lg:col-span-4 xl:col-span-3">
        <div data-testid="muhurta-form" className="card p-5 lg:p-6 lg:sticky lg:top-20">
          <h2 className="heading-page">{t("muhurta_title")}</h2>
          <p className="meta mb-5">{t("muhurta_subtitle")}</p>

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
              <DatePicker
                value={startDate}
                onChange={(iso) => setStartDate(iso)}
                testIdPrefix="muhurta-start-date"
              />
            </div>
            <div>
              <label className="field-label">{t("muhurta_end_date")}</label>
              <DatePicker
                value={endDate}
                onChange={(iso) => setEndDate(iso)}
                testIdPrefix="muhurta-end-date"
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

          <div className="mb-5 pt-4 border-t border-parchment-200">
            <p className="eyebrow-accent mb-1">{t("muhurta_native_filter")}</p>
            <p className="meta mb-3">{t("muhurta_native_sub")}</p>

            <div className="mb-3">
              <label className="label-strong block mb-1">{t("muhurta_birth_rashi")}</label>
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
              <label className="label-strong block mb-1">{t("muhurta_birth_nak")}</label>
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

          <button
            data-testid="muhurta-find-btn"
            type="button"
            onClick={submit}
            disabled={loading}
            className="btn-primary w-full"
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
        </div>
      </aside>

      <main className="lg:col-span-8 xl:col-span-9 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-crimson">
            <MandalaLoader size={64} />
            <p className="font-serif text-ink-soft italic">{t("muhurta_searching")}</p>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="card p-8 text-center">
            <div className="flex justify-center mb-4 text-ink-soft">
              <MandalaMark size={56} />
            </div>
            <p className="eyebrow">Muhurta</p>
            <h3 className="heading-section mt-1">{t("muhurta_title")}</h3>
            <p className="meta mt-1.5 max-w-md mx-auto">{t("muhurta_subtitle")}</p>
          </div>
        )}

        {result && (
          <>
            <div data-testid="muhurta-summary" className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="eyebrow-accent">{result.purpose_label}</p>
                  <h3 className="heading-section">{t("muhurta_results")}</h3>
                </div>
                <ShareLinkButton
                  testId="muhurta-share-link"
                  url={shareUrlFor("/muhurta", {
                    purpose,
                    start: startDate,
                    end: endDate,
                    lat: round4(loc.latitude),
                    lon: round4(loc.longitude),
                    tz: result.location?.timezone ?? loc.timezone ?? undefined,
                    place: loc.place_name || undefined,
                    rashi: birthRashiId || undefined,
                    nakshatra: birthNakId || undefined,
                  })}
                />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-meta text-ink mt-2">
                <div>
                  <span className="text-ink-soft">{result.date_range.days_scanned}</span>{" "}
                  {t("muhurta_days_scanned")}
                </div>
                <div>
                  <span className="text-saffron font-semibold">{result.total_matches}</span>{" "}
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
              {result.muhurtas.map((m) => (
                <Fragment key={m.date}>
                  <ResultCard m={m} tz={result.location?.timezone} />
                </Fragment>
              ))}
            </div>
          </>
        )}
      </main>
    </section>
  );
}
