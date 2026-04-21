import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useI18n } from "../i18n";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
                          x2={32 + Math.cos(a) * 28}
                          y2={32 + Math.sin(a) * 28}
                          stroke="currentColor" strokeWidth="1" opacity="0.6" />
                );
            })}
            <circle cx="32" cy="32" r="3" fill="currentColor" />
        </svg>
    );
}

function fmtTime(iso, tz) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz,
    });
}

function fmtTimeDM(iso, tz, refDate) {
    if (!iso) return "—";
    const d = new Date(iso);
    const timePart = d.toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz,
    });
    if (!refDate) return timePart;
    // If iso date differs from refDate (local), append short date
    const refDay = new Date(refDate + "T00:00:00").toLocaleDateString("en-CA", { timeZone: tz });
    const isoDay = d.toLocaleDateString("en-CA", { timeZone: tz });
    if (refDay !== isoDay) {
        const shortDate = d.toLocaleDateString("en-IN", {
            day: "numeric", month: "short", timeZone: tz,
        });
        return `${timePart}, ${shortDate}`;
    }
    return timePart;
}

function CitySearch({ value, onSelect }) {
    const [query, setQuery] = useState(value || "");
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef();
    const boxRef = useRef();

    useEffect(() => { setQuery(value || ""); }, [value]);
    useEffect(() => {
        const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const onChange = (e) => {
        const v = e.target.value;
        setQuery(v); setOpen(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (v.length < 2) { setResults([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const r = await axios.get("https://nominatim.openstreetmap.org/search", {
                    params: { q: v, format: "json", limit: 6, addressdetails: 1 },
                    headers: { "Accept-Language": "en" },
                });
                setResults(r.data || []);
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 400);
    };

    return (
        <div className="relative" ref={boxRef}>
            <div className="relative">
                <input
                    data-testid="panchang-city-input"
                    type="text" value={query} onChange={onChange}
                    onFocus={() => query.length >= 2 && setOpen(true)}
                    placeholder="Search location..."
                    className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm text-[#2C241B] focus:outline-none focus:ring-1 focus:ring-[#D35400]"
                />
                {loading && (<div className="absolute right-3 top-1/2 -translate-y-1/2"><MandalaLoader size={18} /></div>)}
            </div>
            {open && results.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm shadow-lg max-h-64 overflow-auto">
                    {results.map((r, i) => (
                        <li key={r.place_id}
                            data-testid={`panchang-city-option-${i}`}
                            onClick={() => {
                                setQuery(r.display_name); setOpen(false);
                                onSelect({
                                    place_name: r.display_name,
                                    latitude: parseFloat(r.lat),
                                    longitude: parseFloat(r.lon),
                                });
                            }}
                            className="px-3 py-2 text-sm hover:bg-[#F4F1E8] cursor-pointer border-b border-[#E3D5C1]/50 last:border-0">
                            {r.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ---- Reusable section card ----
function Section({ title, subtitle, children, testId }) {
    return (
        <section data-testid={testId} className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6 card-lift">
            <div className="flex items-baseline justify-between mb-3 border-b border-[#E3D5C1]/70 pb-2">
                <h3 className="font-serif text-xl text-[#8B1E0F] tracking-wide">{title}</h3>
                {subtitle && <span className="text-[11px] uppercase tracking-[0.2em] text-[#635647]">{subtitle}</span>}
            </div>
            {children}
        </section>
    );
}

// 2-col key/value table
function KV2({ rows }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
            {rows.map((r, i) => (
                <div key={i} className="flex items-baseline justify-between border-b border-[#E3D5C1]/50 py-2 gap-3">
                    <span className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold">{r.label}</span>
                    <span className="font-serif text-base text-[#2C241B] text-right">{r.value}</span>
                </div>
            ))}
        </div>
    );
}

function TransitList({ items, tz, refDate, labelFn, accent = "#2C241B" }) {
    if (!items || items.length === 0) return <div className="text-sm text-[#635647]">—</div>;
    return (
        <ul className="space-y-1.5">
            {items.map((it, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-serif text-base" style={{ color: accent }}>{labelFn(it)}</span>
                    <span className="font-sans text-xs text-[#635647] tabular-nums">
                        upto {fmtTimeDM(it.ends_at || it.end, tz, refDate)}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function TimeBand({ title, window, color, testId, desc, tz, refDate }) {
    return (
        <div data-testid={testId} className="rounded-sm p-3 border" style={{ borderColor: color, backgroundColor: `${color}0D` }}>
            <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.15em] font-bold" style={{ color }}>{title}</p>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <p className="font-serif text-base text-[#2C241B] tabular-nums mt-1">
                {window ? `${fmtTimeDM(window.start, tz, refDate)} — ${fmtTimeDM(window.end, tz, refDate)}` : "—"}
            </p>
            {desc && <p className="text-[10px] text-[#635647] mt-0.5 italic">{desc}</p>}
        </div>
    );
}

// ---- Main Panchang View ----
export default function PanchangView({ defaultLocation }) {
    const { t } = useI18n();
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [loc, setLoc] = useState(defaultLocation || {
        place_name: "New Delhi, India",
        latitude: 28.6139, longitude: 77.2090, timezone: "Asia/Kolkata",
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPanchang = async (overrides = {}) => {
        const body = { ...loc, ...overrides };
        setLoading(true); setError(null);
        try {
            const r = await axios.get(`${API}/get-panchang`, {
                params: {
                    latitude: body.latitude, longitude: body.longitude,
                    date: overrides.date || date,
                    timezone: body.timezone || undefined,
                    detailed: true,
                },
            });
            setData(r.data);
        } catch (e) {
            setError(e?.response?.data?.detail || e.message || "Failed to fetch Panchang");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPanchang(); /* eslint-disable-next-line */ }, []);

    const useGeo = () => {
        if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude, lon = pos.coords.longitude;
                let name = `Lat ${lat.toFixed(3)}, Lon ${lon.toFixed(3)}`;
                try {
                    const r = await axios.get("https://nominatim.openstreetmap.org/reverse", {
                        params: { lat, lon, format: "json" },
                        headers: { "Accept-Language": "en" },
                    });
                    name = r.data?.display_name || name;
                } catch (_) {}
                const newLoc = { place_name: name, latitude: lat, longitude: lon, timezone: null };
                setLoc(newLoc);
                const today = new Date().toISOString().slice(0, 10);
                setDate(today);
                fetchPanchang({ ...newLoc, date: today });
            },
            (err) => { setLoading(false); setError("Unable to get location: " + err.message); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const tz = data?.location?.timezone;
    const refDate = data?.date;

    return (
        <section data-testid="panchang-view" className="space-y-6">
            {/* Controls */}
            <div className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6 card-lift">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                        <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">{t("date")}</label>
                        <input data-testid="panchang-date-input" type="date" value={date}
                               onChange={(e) => setDate(e.target.value)}
                               className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-[#D35400]" />
                    </div>
                    <div className="md:col-span-5">
                        <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">{t("place")}</label>
                        <CitySearch value={loc.place_name}
                                    onSelect={(p) => setLoc((v) => ({ ...v, ...p, timezone: null }))} />
                    </div>
                    <div className="md:col-span-2">
                        <button data-testid="use-my-location-btn" onClick={useGeo}
                                className="w-full bg-transparent border border-[#8B1E0F] text-[#8B1E0F] hover:bg-[#8B1E0F]/5 font-semibold text-sm px-4 py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M12 2a8 8 0 0 1 8 8c0 5.4-8 12-8 12S4 15.4 4 10a8 8 0 0 1 8-8z"/>
                            </svg>
                            {t("use_my_location")}
                        </button>
                    </div>
                    <div className="md:col-span-2">
                        <button data-testid="panchang-fetch-btn" onClick={() => fetchPanchang()} disabled={loading}
                                className="w-full bg-[#8B1E0F] hover:bg-[#6A160A] disabled:opacity-60 text-[#FCFAF5] font-semibold text-sm px-4 py-2.5 rounded-sm transition-colors">
                            {loading ? t("loading") : t("show_panchang")}
                        </button>
                    </div>
                </div>
                {error && <div data-testid="panchang-error" className="mt-3 text-xs text-[#8B1E0F]">{error}</div>}
            </div>

            {loading && !data && (
                <div className="flex flex-col items-center py-16 gap-4">
                    <MandalaLoader size={56} />
                    <p className="font-serif text-[#635647] italic">Reading the celestial clock...</p>
                </div>
            )}

            {data && (
                <>
                    {/* Date Header */}
                    <div className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#635647] font-bold">{t("panchang_title")}</p>
                        <h2 className="font-serif text-3xl lg:text-4xl text-[#8B1E0F] mt-1" data-testid="panchang-title">
                            {new Date(data.date + "T12:00:00").toLocaleDateString("en-IN", {
                                weekday: "long", day: "numeric", month: "long", year: "numeric",
                            })}
                        </h2>
                        <p className="text-sm text-[#635647] mt-1">{loc.place_name} · {data.location.timezone}</p>
                        <div className="divider-ornate my-3">
                            <span className="font-serif italic text-sm">{t("panchang_stamp")}</span>
                        </div>
                    </div>

                    {/* Sunrise & Sunset / Moonrise & Moonset */}
                    <Section title={t("sun_moon")} testId="section-sun-moon">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-[#F4F1E8] border border-[#E3D5C1] rounded-sm" data-testid="sunrise-block">
                                <p className="text-[11px] uppercase tracking-[0.15em] text-[#635647] font-bold">{t("sunrise")}</p>
                                <p className="font-serif text-2xl text-[#D35400] tabular-nums mt-1">{fmtTime(data.sun_moon.sunrise, tz)}</p>
                            </div>
                            <div className="p-4 bg-[#F4F1E8] border border-[#E3D5C1] rounded-sm" data-testid="sunset-block">
                                <p className="text-[11px] uppercase tracking-[0.15em] text-[#635647] font-bold">{t("sunset")}</p>
                                <p className="font-serif text-2xl text-[#8B1E0F] tabular-nums mt-1">{fmtTime(data.sun_moon.sunset, tz)}</p>
                            </div>
                            <div className="p-4 bg-[#F4F1E8] border border-[#E3D5C1] rounded-sm" data-testid="moonrise-block">
                                <p className="text-[11px] uppercase tracking-[0.15em] text-[#635647] font-bold">{t("moonrise")}</p>
                                <p className="font-serif text-2xl text-[#2C241B] tabular-nums mt-1">{fmtTimeDM(data.sun_moon.moonrise, tz, refDate)}</p>
                            </div>
                            <div className="p-4 bg-[#F4F1E8] border border-[#E3D5C1] rounded-sm" data-testid="moonset-block">
                                <p className="text-[11px] uppercase tracking-[0.15em] text-[#635647] font-bold">{t("moonset")}</p>
                                <p className="font-serif text-2xl text-[#2C241B] tabular-nums mt-1">{fmtTimeDM(data.sun_moon.moonset, tz, refDate)}</p>
                            </div>
                        </div>
                    </Section>

                    {/* Panchang - 5 limbs with transitions */}
                    <Section title="Panchānga" subtitle="Five Limbs" testId="section-panchang-limbs">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Tithi</p>
                                <TransitList items={data.panchang.tithi_sequence} tz={tz} refDate={refDate}
                                             labelFn={(t) => t.name} accent="#8B1E0F" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Nakṣatra</p>
                                <TransitList items={data.panchang.nakshatra_sequence} tz={tz} refDate={refDate}
                                             labelFn={(n) => n.name} accent="#D35400" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Yoga</p>
                                <TransitList items={data.panchang.yoga_sequence} tz={tz} refDate={refDate}
                                             labelFn={(y) => y.name} accent="#2C241B" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Karaṇa</p>
                                <TransitList items={data.panchang.karana_sequence} tz={tz} refDate={refDate}
                                             labelFn={(k) => k.is_bhadra ? `${k.name} (Bhadra)` : k.name} accent="#2C241B" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Vāra</p>
                                <p className="font-serif text-base text-[#8B1E0F]">{data.vara.sanskrit} <span className="text-[#635647] text-xs">({data.vara.english})</span></p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Pakṣa</p>
                                <p className="font-serif text-base text-[#2C241B]">{data.panchang.paksha}</p>
                            </div>
                        </div>
                    </Section>

                    {/* Lunar Month, Samvat and Samvatsara */}
                    <Section title="Lunar Month, Saṁvat and Saṁvatsara" testId="section-samvat">
                        <KV2 rows={[
                            { label: "Vikram Samvat", value: `${data.lunar_month.vikram_samvat} · ${data.lunar_month.samvatsara_vikram}` },
                            { label: "Shaka Samvat", value: `${data.lunar_month.shaka_samvat} · ${data.lunar_month.samvatsara_shaka}` },
                            { label: "Gujarati Samvat", value: data.lunar_month.gujarati_samvat },
                            { label: "Chandramāsa (Pūrṇimānta)", value: data.lunar_month.chandramasa_purnimanta },
                            { label: "Chandramāsa (Amānta)", value: data.lunar_month.chandramasa_amanta },
                            { label: "Nirayaṇa Solar Month", value: data.lunar_month.nirayana_solar_month },
                            { label: "Pravishte / Gate", value: data.lunar_month.pravishte_day },
                            { label: "Pakṣa", value: data.lunar_month.paksha },
                        ]} />
                    </Section>

                    {/* Rashi and Nakshatra */}
                    <Section title="Rāśi & Nakṣatra" testId="section-rashi-nak">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Moonsign (Chandra Rāśi)</p>
                                <TransitList items={data.rashi_nakshatra.moonsign_sequence} tz={tz} refDate={refDate}
                                             labelFn={(s) => s.rashi} accent="#8B1E0F" />
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mt-4 mb-2">Nakṣatra Pada</p>
                                <TransitList items={data.rashi_nakshatra.moon_nakshatra_padas} tz={tz} refDate={refDate}
                                             labelFn={(p) => `${p.nakshatra} Pāda ${p.pada}`} accent="#635647" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-2">Sunsign (Sūrya Rāśi)</p>
                                <p className="font-serif text-base text-[#8B1E0F]">{data.rashi_nakshatra.sunsign.rashi}</p>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mt-4 mb-2">Sūrya Nakṣatra</p>
                                <p className="font-serif text-base text-[#D35400]">
                                    {data.rashi_nakshatra.surya_nakshatra.name} · Pāda {data.rashi_nakshatra.surya_nakshatra.pada}
                                    <span className="text-[#635647] text-xs ml-2">upto {fmtTimeDM(data.rashi_nakshatra.surya_nakshatra.ends_at, tz, refDate)}</span>
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* Ritu and Ayana */}
                    <Section title="Ritu & Ayana" testId="section-ritu-ayana">
                        <KV2 rows={[
                            { label: "Drik Ṛtu", value: data.ritu_ayana.drik_ritu },
                            { label: "Vedic Ṛtu", value: data.ritu_ayana.vedic_ritu },
                            { label: "Drik Ayana", value: data.ritu_ayana.drik_ayana },
                            { label: "Vedic Ayana", value: data.ritu_ayana.vedic_ayana },
                            { label: "Dinamāna", value: data.sun_moon.dinaman_hours ? `${hoursToHMS(data.sun_moon.dinaman_hours)}` : "—" },
                            { label: "Rātrimāna", value: data.sun_moon.ratriman_hours ? `${hoursToHMS(data.sun_moon.ratriman_hours)}` : "—" },
                            { label: "Madhyāhna", value: fmtTime(data.sun_moon.madhyahna, tz) },
                        ]} />
                    </Section>

                    {/* Auspicious Timings */}
                    <Section title={t("auspicious_title")} testId="section-auspicious">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <TimeBand testId="band-brahma" title="Brahma Muhūrta"
                                      window={data.auspicious_timings.brahma_muhurta}
                                      color="#2F7D32" desc="Sacred hour before dawn" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-pratah" title="Pratāḥ Sandhyā"
                                      window={data.auspicious_timings.pratah_sandhya}
                                      color="#2F7D32" desc="Morning twilight ritual" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-abhijit" title="Abhijit Muhūrta"
                                      window={data.auspicious_timings.abhijit}
                                      color="#2F7D32" desc="Auspicious midday" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-vijay" title="Vijay Muhūrta"
                                      window={data.auspicious_timings.vijay_muhurta}
                                      color="#2F7D32" desc="Victory hour" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-godhuli" title="Godhūli Muhūrta"
                                      window={data.auspicious_timings.godhuli_muhurta}
                                      color="#2F7D32" desc="Twilight bridging sunset" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-sayahna" title="Sāyaṁ Sandhyā"
                                      window={data.auspicious_timings.sayahna_sandhya}
                                      color="#2F7D32" desc="Evening twilight ritual" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-nishita" title="Niśīta Muhūrta"
                                      window={data.auspicious_timings.nishita_muhurta}
                                      color="#2F7D32" desc="Mid-night meditation hour" tz={tz} refDate={refDate} />
                            {(data.auspicious_timings.amrit_kalam || []).map((a, i) => (
                                <TimeBand key={`am-${i}`} testId={`band-amrit-${i}`}
                                          title="Amṛit Kāḷam"
                                          window={a} color="#1B5E20"
                                          desc={`Nectar window · ${a.nakshatra}`}
                                          tz={tz} refDate={refDate} />
                            ))}
                            {(data.auspicious_timings.sarvartha_siddhi_yoga || []).map((s, i) => (
                                <TimeBand key={`ss-${i}`} testId={`band-sarvartha-${i}`}
                                          title="Sarvārtha Siddhi Yoga"
                                          window={s} color="#2F7D32"
                                          desc={`All endeavors succeed · ${s.nakshatra}`}
                                          tz={tz} refDate={refDate} />
                            ))}
                            {(data.auspicious_timings.amrita_siddhi_yoga || []).map((s, i) => (
                                <TimeBand key={`asd-${i}`} testId={`band-amrita-siddhi-${i}`}
                                          title="Amṛita Siddhi Yoga"
                                          window={s} color="#1B5E20"
                                          desc={`Supremely auspicious · ${s.nakshatra}`}
                                          tz={tz} refDate={refDate} />
                            ))}
                        </div>
                    </Section>

                    {/* Inauspicious Timings */}
                    <Section title={t("inauspicious_title")} testId="section-inauspicious">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <TimeBand testId="band-rahu" title="Rāhu Kālam"
                                      window={data.inauspicious_timings.rahu_kalam}
                                      color="#8B1E0F" desc="Avoid new undertakings" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-yamaganda" title="Yamagaṇḍa"
                                      window={data.inauspicious_timings.yamaganda}
                                      color="#D35400" desc="Avoid travel & new ventures" tz={tz} refDate={refDate} />
                            <TimeBand testId="band-gulika" title="Gulika Kālam"
                                      window={data.inauspicious_timings.gulika_kalam}
                                      color="#635647" desc="Son of Saturn · neutral-inauspicious" tz={tz} refDate={refDate} />
                            {data.inauspicious_timings.dur_muhurtam.map((dm, i) => (
                                <TimeBand key={i} testId={`band-dur-${i}`}
                                          title={`Dur Muhūrtam #${dm.muhurta_number}`}
                                          window={dm} color="#6A160A" desc="Avoid auspicious work" tz={tz} refDate={refDate} />
                            ))}
                            {data.inauspicious_timings.bhadra.map((b, i) => (
                                <TimeBand key={`b-${i}`} testId={`band-bhadra-${i}`}
                                          title="Bhadra (Viṣṭi)"
                                          window={b} color="#8B1E0F" desc="Vishti karana · inauspicious" tz={tz} refDate={refDate} />
                            ))}
                            {(data.inauspicious_timings.varjyam || []).map((v, i) => (
                                <TimeBand key={`v-${i}`} testId={`band-varjyam-${i}`}
                                          title="Varjyam"
                                          window={v} color="#8B1E0F"
                                          desc={`Moon's nak poison point · ${v.nakshatra}`}
                                          tz={tz} refDate={refDate} />
                            ))}
                        </div>
                    </Section>

                    {/* Udaya Lagna */}
                    <Section title={t("udaya_lagna_title")} subtitle={t("udaya_lagna_sub")} testId="section-udaya">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {data.udaya_lagna.map((l, i) => (
                                <div key={i} className="flex items-baseline justify-between border-b border-[#E3D5C1]/50 py-1.5 gap-3 text-sm" data-testid={`lagna-${i}`}>
                                    <span className="font-serif text-base text-[#2C241B]">{l.rashi}</span>
                                    <span className="font-sans text-xs text-[#635647] tabular-nums">
                                        {fmtTimeDM(l.start, tz, refDate)} — {fmtTimeDM(l.end, tz, refDate)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Chandrabalam & Tarabalam */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Section title={t("chandrabalam_title")} subtitle={t("chandrabalam_sub")} testId="section-chandrabalam">
                            <div className="flex flex-wrap gap-2">
                                {data.chandrabalam.good_rashis.map((r, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-[#F4F1E8] border border-[#C5A059] rounded-sm text-sm font-serif text-[#2C241B]">
                                        {r.rashi}
                                    </span>
                                ))}
                            </div>
                        </Section>
                        <Section title={t("tarabalam_title")} subtitle={t("tarabalam_sub")} testId="section-tarabalam">
                            <div className="flex flex-wrap gap-2">
                                {data.tarabalam.good_nakshatras.map((n, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-[#F4F1E8] border border-[#C5A059] rounded-sm text-xs font-sans text-[#2C241B]">
                                        {n.nakshatra}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    </div>

                    <Section title={t("shool_vasa_title")} subtitle={t("shool_vasa_sub")} testId="section-shool-vasa">
                        <KV2 rows={[
                            { label: t("disha_shool"), value: data.shool_vasa.disha_shool },
                            { label: t("rahu_vasa"), value: data.shool_vasa.rahu_vasa },
                            { label: t("chandra_vasa"), value: data.shool_vasa.chandra_vasa },
                        ]} />
                    </Section>

                    <Section title={t("calendars_title")} testId="section-calendars">
                        <KV2 rows={[
                            { label: "Kaliyuga Year", value: `${data.calendars.kali_year}` },
                            { label: "Kali Ahargaṇa", value: `${data.calendars.kali_ahargana_days.toLocaleString()} days` },
                            { label: "Julian Day", value: data.calendars.julian_day.toFixed(2) },
                            { label: "Modified Julian Day", value: data.calendars.modified_julian_day.toLocaleString() },
                            { label: "Rata Die", value: data.calendars.rata_die.toLocaleString() },
                            { label: "Lahiri Ayanāṁśa", value: `${data.calendars.ayanamsha_lahiri.toFixed(6)}°` },
                            { label: "National Civil Date (Śaka)", value: `${data.calendars.national_civil_date.month} ${data.calendars.national_civil_date.day}, ${data.calendars.national_civil_date.shaka_year} Śaka` },
                            { label: "National Nirayana Date", value: `${data.calendars.national_nirayana_date.month} ${data.calendars.national_nirayana_date.day}, ${data.calendars.national_nirayana_date.shaka_year} Śaka` },
                        ]} />
                    </Section>
                </>
            )}
        </section>
    );
}

function hoursToHMS(h) {
    const total_sec = Math.round(h * 3600);
    const hh = Math.floor(total_sec / 3600);
    const mm = Math.floor((total_sec % 3600) / 60);
    const ss = total_sec % 60;
    return `${hh}h ${String(mm).padStart(2, "0")}m ${String(ss).padStart(2, "0")}s`;
}
