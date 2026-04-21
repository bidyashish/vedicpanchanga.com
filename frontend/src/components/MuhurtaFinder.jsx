import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useI18n } from "../i18n";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

function MandalaLoader({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" className="mandala-loader" fill="none">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
            {Array.from({ length: 8 }).map((_, i) => {
                const a = (i * 45 * Math.PI) / 180;
                return (
                    <line key={i} x1={32} y1={32}
                        x2={32 + Math.cos(a) * 28} y2={32 + Math.sin(a) * 28}
                        stroke="currentColor" strokeWidth="1" opacity="0.6" />
                );
            })}
            <circle cx="32" cy="32" r="3" fill="currentColor" />
        </svg>
    );
}

function scoreColor(s) {
    if (s >= 85) return "#1b6b3a";   // deep green
    if (s >= 70) return "#3d8c42";
    if (s >= 60) return "#a06f1a";   // amber
    return "#8B1E0F";                // red
}

function formatTimeRange(startIso, endIso, tz) {
    if (!startIso || !endIso) return "—";
    const opts = { hour: "2-digit", minute: "2-digit", hour12: true };
    if (tz) opts.timeZone = tz;
    try {
        const s = new Date(startIso).toLocaleTimeString([], opts);
        const e = new Date(endIso).toLocaleTimeString([], opts);
        return `${s} — ${e}`;
    } catch {
        return "—";
    }
}

function ResultCard({ m, t, tz }) {
    const color = scoreColor(m.score);
    const dt = new Date(m.date + "T12:00:00");
    return (
        <div
            data-testid={`muhurta-result-${m.date}`}
            className="bg-white border border-[#E3D5C1] rounded-sm p-5 card-lift"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold">
                        {m.weekday}
                    </p>
                    <h4 className="font-serif text-2xl text-[#2C241B] mt-0.5">
                        {dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </h4>
                    <p className="text-sm text-[#635647] mt-1">
                        {m.tithi} · {m.paksha?.replace(" Paksha", "")} · {m.nakshatra} · {m.moon_rashi}
                    </p>
                </div>
                <div
                    className="flex flex-col items-center justify-center min-w-[72px] rounded-sm px-3 py-2 border-2"
                    style={{ borderColor: color, color }}
                    data-testid={`muhurta-score-${m.date}`}
                >
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                        {t("muhurta_score")}
                    </span>
                    <span className="font-serif text-3xl font-bold tabular-nums leading-none">{m.score}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div className="bg-[#F4F1E8] border border-[#E3D5C1] rounded-sm px-3 py-2">
                    <p className="text-[#635647] uppercase tracking-wider font-bold">{t("muhurta_abhijit")}</p>
                    <p className="text-[#2C241B] tabular-nums mt-0.5">{formatTimeRange(m.abhijit?.start, m.abhijit?.end, tz)}</p>
                </div>
                <div className="bg-[#F4F1E8] border border-[#E3D5C1] rounded-sm px-3 py-2">
                    <p className="text-[#635647] uppercase tracking-wider font-bold">{t("muhurta_rahu")}</p>
                    <p className="text-[#8B1E0F] tabular-nums mt-0.5">{formatTimeRange(m.rahu_kalam?.start, m.rahu_kalam?.end, tz)}</p>
                </div>
                <div className="bg-[#F4F1E8] border border-[#E3D5C1] rounded-sm px-3 py-2">
                    <p className="text-[#635647] uppercase tracking-wider font-bold">{t("muhurta_sunrise_sunset")}</p>
                    <p className="text-[#2C241B] tabular-nums mt-0.5">{formatTimeRange(m.sunrise, m.sunset, tz)}</p>
                </div>
            </div>

            {m.reasons && m.reasons.length > 0 && (
                <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-[#1b6b3a]">{t("muhurta_reasons")}</p>
                    <ul className="mt-1 space-y-0.5">
                        {m.reasons.map((r, i) => (
                            <li key={i} className="text-sm text-[#2C241B] flex gap-2">
                                <span className="text-[#1b6b3a] font-bold">·</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {m.cautions && m.cautions.length > 0 && (
                <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-[#8B1E0F]">{t("muhurta_cautions")}</p>
                    <ul className="mt-1 space-y-0.5">
                        {m.cautions.map((r, i) => (
                            <li key={i} className="text-sm text-[#2C241B] flex gap-2">
                                <span className="text-[#8B1E0F] font-bold">·</span>
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default function MuhurtaFinder({ defaultLocation }) {
    const { t } = useI18n();
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const thirtyDaysOut = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
    }, []);

    const [purposes, setPurposes] = useState([]);
    const [purpose, setPurpose] = useState("marriage");
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(thirtyDaysOut);
    const [latitude, setLatitude] = useState(defaultLocation?.latitude ?? 28.6139);
    const [longitude, setLongitude] = useState(defaultLocation?.longitude ?? 77.2090);
    const [placeName, setPlaceName] = useState(defaultLocation?.place_name ?? "New Delhi, India");
    const [timezone, setTimezone] = useState(defaultLocation?.timezone ?? "Asia/Kolkata");
    const [birthRashiId, setBirthRashiId] = useState("");
    const [birthNakId, setBirthNakId] = useState("");
    const [minScore, setMinScore] = useState(60);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    // Load purpose options
    useEffect(() => {
        (async () => {
            try {
                const resp = await axios.get(`${API}/muhurta-purposes`);
                setPurposes(resp.data || []);
            } catch {
                setPurposes([
                    { id: "marriage", label: "Marriage" },
                    { id: "griha_pravesh", label: "Griha Pravesha" },
                    { id: "business", label: "Business" },
                ]);
            }
        })();
    }, []);

    // Nominatim city search (reused pattern)
    const [query, setQuery] = useState(placeName);
    const [suggestions, setSuggestions] = useState([]);
    const [openSugg, setOpenSugg] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef();
    const suggBoxRef = useRef();

    useEffect(() => {
        const handler = (e) => {
            if (suggBoxRef.current && !suggBoxRef.current.contains(e.target)) setOpenSugg(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const onQueryChange = (e) => {
        const v = e.target.value;
        setQuery(v);
        setOpenSugg(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (v.length < 2) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const r = await axios.get("https://nominatim.openstreetmap.org/search", {
                    params: { q: v, format: "json", limit: 5, addressdetails: 1 },
                    headers: { "Accept-Language": "en" },
                });
                setSuggestions(r.data || []);
            } catch { setSuggestions([]); }
            finally { setSearching(false); }
        }, 400);
    };

    const chooseCity = (r) => {
        setQuery(r.display_name);
        setPlaceName(r.display_name);
        setLatitude(parseFloat(r.lat));
        setLongitude(parseFloat(r.lon));
        setTimezone(null); // backend will resolve
        setOpenSugg(false);
    };

    const submit = async () => {
        setError(null);
        setLoading(true);
        setResult(null);
        try {
            const resp = await axios.post(`${API}/find-muhurta`, {
                purpose,
                start_date: startDate,
                end_date: endDate,
                latitude,
                longitude,
                timezone: timezone || null,
                birth_rashi_id: birthRashiId ? parseInt(birthRashiId) : null,
                birth_nakshatra_id: birthNakId ? parseInt(birthNakId) : null,
                min_score: minScore,
                limit: 30,
            });
            setResult(resp.data);
        } catch (e) {
            setError(e?.response?.data?.detail || e.message || "Failed to search muhurtas");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pb-20">
            <aside className="lg:col-span-4 xl:col-span-3">
                <div
                    data-testid="muhurta-form"
                    className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-4 sm:p-5 lg:p-6 card-lift lg:sticky lg:top-20"
                >
                    <h2 className="font-serif text-2xl text-[#2C241B] mb-1">{t("muhurta_title")}</h2>
                    <p className="text-xs text-[#635647] mb-5">{t("muhurta_subtitle")}</p>

                    {/* Purpose */}
                    <div className="mb-4">
                        <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                            {t("muhurta_purpose")}
                        </label>
                        <select
                            data-testid="muhurta-purpose-select"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm text-[#2C241B] focus:outline-none focus:ring-1 focus:ring-[#D35400] focus:border-[#D35400]"
                        >
                            {purposes.map((p) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                                {t("muhurta_start_date")}
                            </label>
                            <input
                                data-testid="muhurta-start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                                {t("muhurta_end_date")}
                            </label>
                            <input
                                data-testid="muhurta-end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm"
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="mb-4 relative" ref={suggBoxRef}>
                        <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                            {t("muhurta_location")}
                        </label>
                        <div className="relative">
                            <input
                                data-testid="muhurta-city-input"
                                type="text"
                                value={query}
                                onChange={onQueryChange}
                                onFocus={() => query.length >= 2 && setOpenSugg(true)}
                                placeholder={t("search_city")}
                                className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm"
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B1E0F]">
                                    <MandalaLoader size={18} />
                                </div>
                            )}
                        </div>
                        {openSugg && suggestions.length > 0 && (
                            <ul
                                data-testid="muhurta-city-results"
                                className="absolute z-20 mt-1 w-full bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm shadow-lg max-h-64 overflow-auto"
                            >
                                {suggestions.map((r, i) => (
                                    <li
                                        key={r.place_id}
                                        data-testid={`muhurta-city-opt-${i}`}
                                        onClick={() => chooseCity(r)}
                                        className="px-3 py-2 text-sm hover:bg-[#F4F1E8] cursor-pointer border-b border-[#E3D5C1]/50 last:border-0"
                                    >
                                        {r.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Native filters */}
                    <div className="mb-4 pt-4 border-t border-[#E3D5C1]">
                        <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-0.5">
                            {t("muhurta_native_filter")}
                        </p>
                        <p className="text-[11px] text-[#635647] italic mb-3">
                            {t("muhurta_native_sub")}
                        </p>

                        <div className="mb-3">
                            <label className="block text-xs text-[#635647] mb-1">
                                {t("muhurta_birth_rashi")}
                            </label>
                            <select
                                data-testid="muhurta-rashi-select"
                                value={birthRashiId}
                                onChange={(e) => setBirthRashiId(e.target.value)}
                                className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2 font-sans text-sm"
                            >
                                <option value="">{t("muhurta_none")}</option>
                                {RASHI_OPTIONS.map((r, i) => (
                                    <option key={i} value={i + 1}>{i + 1}. {r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="block text-xs text-[#635647] mb-1">
                                {t("muhurta_birth_nak")}
                            </label>
                            <select
                                data-testid="muhurta-nak-select"
                                value={birthNakId}
                                onChange={(e) => setBirthNakId(e.target.value)}
                                className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2 font-sans text-sm"
                            >
                                <option value="">{t("muhurta_none")}</option>
                                {NAKSHATRA_OPTIONS.map((n, i) => (
                                    <option key={i} value={i + 1}>{i + 1}. {n}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Min score slider */}
                    <div className="mb-5">
                        <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                            {t("muhurta_min_score")}: <span className="text-[#8B1E0F] font-bold">{minScore}</span>
                        </label>
                        <input
                            data-testid="muhurta-min-score"
                            type="range"
                            min="40"
                            max="90"
                            step="5"
                            value={minScore}
                            onChange={(e) => setMinScore(parseInt(e.target.value))}
                            className="w-full accent-[#8B1E0F]"
                        />
                        <div className="flex justify-between text-[10px] text-[#635647] mt-0.5">
                            <span>40</span><span>60</span><span>90</span>
                        </div>
                    </div>

                    <button
                        data-testid="muhurta-find-btn"
                        type="button"
                        onClick={submit}
                        disabled={loading}
                        className="w-full bg-[#8B1E0F] hover:bg-[#6A160A] disabled:opacity-60 text-[#FCFAF5] font-sans font-semibold text-sm px-6 py-3 rounded-sm transition-colors shadow-sm tracking-wide flex items-center justify-center gap-2"
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
                            className="mt-4 border border-[#8B1E0F]/40 bg-[#8B1E0F]/5 text-[#8B1E0F] text-xs p-3 rounded-sm"
                        >
                            {error}
                        </div>
                    )}
                </div>
            </aside>

            <main className="lg:col-span-8 xl:col-span-9 space-y-6">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#8B1E0F]">
                        <MandalaLoader size={64} />
                        <p className="font-serif text-[#635647] italic">{t("muhurta_searching")}</p>
                    </div>
                )}

                {!loading && !result && !error && (
                    <div className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-10 text-center">
                        <div className="divider-ornate mb-3 max-w-sm mx-auto">
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059]">॥ मुहूर्त ॥</span>
                        </div>
                        <p className="font-serif text-xl text-[#2C241B]">{t("muhurta_title")}</p>
                        <p className="text-sm text-[#635647] italic mt-2 max-w-md mx-auto">
                            {t("muhurta_subtitle")}
                        </p>
                    </div>
                )}

                {result && (
                    <>
                        <div
                            data-testid="muhurta-summary"
                            className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6 card-lift"
                        >
                            <p className="text-xs uppercase tracking-[0.2em] text-[#635647] font-bold">
                                {result.purpose_label}
                            </p>
                            <h3 className="font-serif text-2xl lg:text-3xl text-[#2C241B] mt-1">
                                {t("muhurta_results")}
                            </h3>
                            <div className="divider-ornate my-3">
                                <span className="font-serif italic text-xs">॥ शुभ मुहूर्त ॥</span>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#2C241B]">
                                <div>
                                    <span className="text-[#635647]">{result.date_range.days_scanned}</span>{" "}
                                    {t("muhurta_days_scanned")}
                                </div>
                                <div>
                                    <span className="text-[#8B1E0F] font-bold">{result.total_matches}</span>{" "}
                                    {t("muhurta_matches_found")}
                                </div>
                                {result.filter.native_rashi && (
                                    <div>
                                        <span className="text-[#635647]">{t("muhurta_birth_rashi")}:</span>{" "}
                                        {result.filter.native_rashi}
                                    </div>
                                )}
                                {result.filter.native_nakshatra && (
                                    <div>
                                        <span className="text-[#635647]">{t("muhurta_birth_nak")}:</span>{" "}
                                        {result.filter.native_nakshatra}
                                    </div>
                                )}
                            </div>
                        </div>

                        {result.muhurtas.length === 0 && (
                            <div
                                data-testid="muhurta-empty"
                                className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-8 text-center text-sm text-[#635647] italic"
                            >
                                {t("muhurta_no_matches")}
                            </div>
                        )}

                        <div className="space-y-4" data-testid="muhurta-results-list">
                            {result.muhurtas.map((m) => (
                                <ResultCard key={m.date} m={m} t={t} tz={result.location?.timezone} />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
