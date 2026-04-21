import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import VedicChart from "./components/VedicChart";
import SouthIndianChart from "./components/SouthIndianChart";
import PanchangView from "./components/PanchangView";
import MuhurtaFinder from "./components/MuhurtaFinder";
import { useI18n, LanguageSwitcher } from "./i18n";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const DEFAULT_FORM = {
    birth_date: "1990-01-01",
    birth_time: "12:00",
    place_name: "New Delhi, India",
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: "Asia/Kolkata",
    ayanamsa: "lahiri",
    chart_style: "north",
};

const AYANAMSA_OPTIONS = [
    { id: "lahiri",     label: "N.C. Lahiri (Chitrapaksha)" },
    { id: "kp_new",     label: "K.P. New" },
    { id: "kp_old",     label: "K.P. Old" },
    { id: "raman",      label: "B.V. Raman" },
    { id: "kp_khullar", label: "K.P. Khullar" },
    { id: "sayan",      label: "Sāyana (Tropical)" },
    { id: "manoj",      label: "Manoj (Lahiri ICRC)" },
];

function MandalaLoader({ size = 24 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            className="mandala-loader"
            fill="none"
        >
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
            {Array.from({ length: 8 }).map((_, i) => {
                const a = (i * 45 * Math.PI) / 180;
                return (
                    <line
                        key={i}
                        x1={32}
                        y1={32}
                        x2={32 + Math.cos(a) * 28}
                        y2={32 + Math.sin(a) * 28}
                        stroke="currentColor"
                        strokeWidth="1"
                        opacity="0.6"
                    />
                );
            })}
            <circle cx="32" cy="32" r="3" fill="currentColor" />
        </svg>
    );
}

function CitySearch({ value, onSelect, label, placeholder }) {
    const [query, setQuery] = useState(value || "");
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef();
    const boxRef = useRef();

    useEffect(() => {
        setQuery(value || "");
    }, [value]);

    useEffect(() => {
        const handler = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const onChange = (e) => {
        const v = e.target.value;
        setQuery(v);
        setOpen(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (v.length < 2) {
            setResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const resp = await axios.get(
                    "https://nominatim.openstreetmap.org/search",
                    {
                        params: { q: v, format: "json", limit: 6, addressdetails: 1 },
                        headers: { "Accept-Language": "en" },
                    }
                );
                setResults(resp.data || []);
            } catch (e) {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 400);
    };

    const choose = (r) => {
        const display = r.display_name;
        const lat = parseFloat(r.lat);
        const lon = parseFloat(r.lon);
        setQuery(display);
        setOpen(false);
        onSelect({ place_name: display, latitude: lat, longitude: lon });
    };

    return (
        <div className="relative" ref={boxRef}>
            <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                {label || "Place of Birth"}
            </label>
            <div className="relative">
                <input
                    data-testid="city-search-input"
                    type="text"
                    value={query}
                    onChange={onChange}
                    onFocus={() => query.length >= 2 && setOpen(true)}
                    placeholder={placeholder || "Search city..."}
                    className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm text-[#2C241B] focus:outline-none focus:ring-1 focus:ring-[#D35400] focus:border-[#D35400]"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <MandalaLoader size={18} />
                    </div>
                )}
            </div>
            {open && results.length > 0 && (
                <ul
                    data-testid="city-search-results"
                    className="absolute z-20 mt-1 w-full bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm shadow-lg max-h-64 overflow-auto"
                >
                    {results.map((r, i) => (
                        <li
                            key={r.place_id}
                            data-testid={`city-option-${i}`}
                            onClick={() => choose(r)}
                            className="px-3 py-2 text-sm hover:bg-[#F4F1E8] cursor-pointer border-b border-[#E3D5C1]/50 last:border-0"
                        >
                            {r.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function BirthForm({ form, setForm, onSubmit, loading }) {
    const { t } = useI18n();
    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    return (
        <form
            data-testid="birth-form"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="space-y-4"
        >
            <div>
                <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                    {t("date_of_birth")}
                </label>
                <input
                    data-testid="birth-date-input"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => update("birth_date", e.target.value)}
                    className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm text-[#2C241B] focus:outline-none focus:ring-1 focus:ring-[#D35400] focus:border-[#D35400]"
                    required
                />
            </div>
            <div>
                <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                    {t("time_of_birth")}
                </label>
                <input
                    data-testid="birth-time-input"
                    type="time"
                    value={form.birth_time}
                    onChange={(e) => update("birth_time", e.target.value)}
                    className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm text-[#2C241B] focus:outline-none focus:ring-1 focus:ring-[#D35400] focus:border-[#D35400]"
                    required
                />
            </div>
            <CitySearch
                value={form.place_name}
                onSelect={({ place_name, latitude, longitude }) => {
                    setForm((f) => ({
                        ...f,
                        place_name,
                        latitude,
                        longitude,
                        timezone: null,
                    }));
                }}
                label={t("place_of_birth")}
                placeholder={t("search_city")}
            />
            <div>
                <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                    {t("ayanamsa")}
                </label>
                <select
                    data-testid="ayanamsa-select"
                    value={form.ayanamsa || "lahiri"}
                    onChange={(e) => update("ayanamsa", e.target.value)}
                    className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm text-[#2C241B] focus:outline-none focus:ring-1 focus:ring-[#D35400] focus:border-[#D35400]"
                >
                    {AYANAMSA_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                    {t("chart_style")}
                </label>
                <div className="flex rounded-sm border border-[#E3D5C1] overflow-hidden" data-testid="chart-style-toggle">
                    {[
                        { id: "north", label: t("north_indian") },
                        { id: "south", label: t("south_indian") },
                    ].map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            data-testid={`chart-style-${o.id}`}
                            onClick={() => update("chart_style", o.id)}
                            className={`flex-1 px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
                                (form.chart_style || "north") === o.id
                                    ? "bg-[#8B1E0F] text-[#FCFAF5]"
                                    : "bg-white text-[#2C241B] hover:bg-[#F4F1E8]"
                            }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                        {t("latitude")}
                    </label>
                    <input
                        data-testid="latitude-input"
                        type="number"
                        step="0.000001"
                        value={form.latitude}
                        onChange={(e) => update("latitude", parseFloat(e.target.value))}
                        className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-[#635647] font-bold mb-1.5">
                        {t("longitude")}
                    </label>
                    <input
                        data-testid="longitude-input"
                        type="number"
                        step="0.000001"
                        value={form.longitude}
                        onChange={(e) => update("longitude", parseFloat(e.target.value))}
                        className="w-full bg-white border border-[#E3D5C1] rounded-sm px-3 py-2.5 font-sans text-sm"
                    />
                </div>
            </div>
            <button
                data-testid="calculate-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#8B1E0F] hover:bg-[#6A160A] disabled:opacity-60 text-[#FCFAF5] font-sans font-semibold text-sm px-6 py-3 rounded-sm transition-colors shadow-sm tracking-wide flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <MandalaLoader size={18} />
                        <span>{t("casting_chart")}</span>
                    </>
                ) : (
                    t("generate_kundali")
                )}
            </button>
        </form>
    );
}

function BirthHeader({ data, placeName }) {
    const { t } = useI18n();
    if (!data?.birth) return null;
    const b = data.birth;
    // IMPORTANT: render time using the BIRTH timezone, not the browser timezone,
    // otherwise the entered local time appears shifted.
    const fmt = new Date(b.local_time).toLocaleString("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: b.timezone,
    });
    return (
        <div data-testid="birth-header" className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6 card-lift">
            <p className="text-xs uppercase tracking-[0.2em] text-[#635647] font-bold">{t("birth_details")}</p>
            <h2 className="font-serif text-2xl lg:text-3xl text-[#2C241B] mt-1">
                {placeName || t("unnamed_native")}
            </h2>
            <div className="divider-ornate my-3">
                <span className="font-serif italic text-sm">॥ कुण्डली ॥</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-[#2C241B]">
                <div><span className="text-[#635647]">{t("local")}:</span> {fmt}</div>
                <div><span className="text-[#635647]">{t("timezone")}:</span> {b.timezone}</div>
                <div><span className="text-[#635647]">{t("latitude")}:</span> {b.latitude.toFixed(4)}°</div>
                <div><span className="text-[#635647]">{t("longitude")}:</span> {b.longitude.toFixed(4)}°</div>
                <div><span className="text-[#635647]">{t("ayanamsa")}:</span> {b.ayanamsa.toFixed(4)}° <span className="text-[#C5A059]">({b.ayanamsa_label || "Lahiri"})</span></div>
                <div><span className="text-[#635647]">{t("julian_day")}:</span> {b.julian_day.toFixed(3)}</div>
            </div>
        </div>
    );
}

function PlanetsTable({ planets, ascendant }) {
    if (!planets) return null;
    const rows = [ascendant, ...planets].filter(Boolean);
    return (
        <div data-testid="planets-table" className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6 overflow-x-auto">
            <h3 className="font-serif text-xl text-[#2C241B] mb-4">Graha Positions</h3>
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                    <tr className="text-[#635647] uppercase text-xs tracking-wider border-b-2 border-[#E3D5C1]">
                        <th className="py-2 pr-3">Body</th>
                        <th className="py-2 pr-3">Sign</th>
                        <th className="py-2 pr-3 tabular-nums">Degree</th>
                        <th className="py-2 pr-3">Sign Lord</th>
                        <th className="py-2 pr-3">Nakshatra</th>
                        <th className="py-2 pr-3">Pada</th>
                        <th className="py-2 pr-3">House</th>
                        <th className="py-2">R</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((p) => (
                        <tr key={p.name} className="border-b border-[#E3D5C1]/60 last:border-0">
                            <td className="py-2.5 pr-3 font-semibold text-[#2C241B]">{p.name}</td>
                            <td className="py-2.5 pr-3">{p.sign}</td>
                            <td className="py-2.5 pr-3 tabular-nums">{p.dms}</td>
                            <td className="py-2.5 pr-3">{p.sign_lord}</td>
                            <td className="py-2.5 pr-3">{p.nakshatra}</td>
                            <td className="py-2.5 pr-3 tabular-nums">{p.nakshatra_pada}</td>
                            <td className="py-2.5 pr-3 tabular-nums">{p.house}</td>
                            <td className="py-2.5 text-[#8B1E0F] font-bold">{p.retrograde ? "℞" : ""}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function DashaTable({ dasha }) {
    const { t } = useI18n();
    if (!dasha || !dasha.length) return null;
    const fmt = (iso) => new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    return (
        <div data-testid="dasha-table" className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6">
            <h3 className="font-serif text-xl text-[#2C241B] mb-4">{t("dasha_title")}</h3>
            <p className="text-xs text-[#635647] mb-3">{t("dasha_subtitle")}</p>
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                    <tr className="text-[#635647] uppercase text-xs tracking-wider border-b-2 border-[#E3D5C1]">
                        <th className="py-2 pr-3">{t("dasha_lord")}</th>
                        <th className="py-2 pr-3">{t("dasha_years")}</th>
                        <th className="py-2 pr-3">{t("dasha_from")}</th>
                        <th className="py-2">{t("dasha_to")}</th>
                    </tr>
                </thead>
                <tbody>
                    {dasha.map((d, i) => (
                        <tr key={i} className="border-b border-[#E3D5C1]/60 last:border-0">
                            <td className="py-2.5 pr-3 font-semibold text-[#8B1E0F]">{d.lord}</td>
                            <td className="py-2.5 pr-3 tabular-nums">{d.years}</td>
                            <td className="py-2.5 pr-3 tabular-nums">{fmt(d.start)}</td>
                            <td className="py-2.5 tabular-nums">{fmt(d.end)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AshtakavargaTable({ ashtakavarga }) {
    const { t } = useI18n();
    if (!ashtakavarga) return null;
    const { bav, sav } = ashtakavarga;
    const planetOrder = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    const signShort = ["Ar","Ta","Ge","Cn","Le","Vi","Li","Sc","Sg","Cp","Aq","Pi"];
    return (
        <div data-testid="ashtakavarga-table" className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-6 overflow-x-auto">
            <h3 className="font-serif text-xl text-[#2C241B] mb-1">{t("ashtakavarga_title")}</h3>
            <p className="text-xs text-[#635647] mb-4">
                {t("ashtakavarga_sub")}
            </p>
            <table className="w-full text-center border-collapse text-sm">
                <thead>
                    <tr className="text-[#635647] uppercase text-xs tracking-wider border-b-2 border-[#E3D5C1]">
                        <th className="py-2 px-2 text-left">{t("th_planet")}</th>
                        {signShort.map((s, i) => (
                            <th key={i} className="py-2 px-2">{s}</th>
                        ))}
                        <th className="py-2 px-2">{t("th_total")}</th>
                    </tr>
                </thead>
                <tbody>
                    {planetOrder.map((p) => {
                        const row = bav[p];
                        const tot = row.reduce((a, b) => a + b, 0);
                        return (
                            <tr key={p} className="border-b border-[#E3D5C1]/60">
                                <td className="py-2 px-2 text-left font-semibold text-[#2C241B]">{p}</td>
                                {row.map((v, i) => (
                                    <td key={i} className="py-2 px-2 tabular-nums">{v}</td>
                                ))}
                                <td className="py-2 px-2 tabular-nums font-bold text-[#8B1E0F]">{tot}</td>
                            </tr>
                        );
                    })}
                    <tr className="border-t-2 border-[#8B1E0F]/60 bg-[#F4F1E8]">
                        <td className="py-2.5 px-2 text-left font-bold text-[#8B1E0F]">{t("sav")}</td>
                        {sav.map((v, i) => (
                            <td key={i} className="py-2.5 px-2 tabular-nums font-bold text-[#2C241B]">{v}</td>
                        ))}
                        <td className="py-2.5 px-2 tabular-nums font-bold text-[#8B1E0F]">
                            {sav.reduce((a, b) => a + b, 0)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function ChartTabs({ data, chartStyle }) {
    const { t } = useI18n();
    const chartRef = useRef();
    const [tab, setTab] = useState("d1");
    const vargaKeys = data.varga_order || [1, 2, 9];
    const vargas = data.vargas || {};

    const downloadPNG = async () => {
        try {
            const html2canvas = (await import("html2canvas")).default;
            const el = chartRef.current;
            if (!el) return;
            const canvas = await html2canvas(el, {
                backgroundColor: "#FCFAF5",
                scale: 2,
            });
            const link = document.createElement("a");
            link.download = `kundali_${tab}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (e) {
            console.error("Download failed", e);
        }
    };

    const shareChart = async () => {
        try {
            const html2canvas = (await import("html2canvas")).default;
            const el = chartRef.current;
            if (!el) return;
            const canvas = await html2canvas(el, {
                backgroundColor: "#FCFAF5",
                scale: 2,
            });
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], `kundali_${tab}.png`, { type: "image/png" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `${tab.toUpperCase()} Kundali Chart`,
                        text: "My Vedic astrology chart",
                        files: [file],
                    });
                } else {
                    // Fallback: download the image
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `kundali_${tab}.png`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            });
        } catch (e) {
            console.error("Share failed", e);
        }
    };

    const downloadPDF = async () => {
        try {
            const html2canvas = (await import("html2canvas")).default;
            const { jsPDF } = await import("jspdf");
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = 210, pageH = 297;
            let first = true;
            for (const n of vargaKeys) {
                const key = `d${n}`;
                setTab(key);
                // Wait a tick for React to re-render
                await new Promise((r) => setTimeout(r, 350));
                const el = chartRef.current;
                if (!el) continue;
                const canvas = await html2canvas(el, { backgroundColor: "#FCFAF5", scale: 2 });
                const img = canvas.toDataURL("image/png");
                if (!first) doc.addPage();
                first = false;
                const w = pageW - 20;
                const h = (canvas.height / canvas.width) * w;
                doc.addImage(img, "PNG", 10, (pageH - h) / 2, w, h);
            }
            doc.save("kundali_all_vargas.pdf");
            setTab("d1");
        } catch (e) {
            console.error("PDF export failed", e);
        }
    };

    const active = vargas[tab] || { chart: data.d1_chart, asc_sign: data.d1_asc_sign, name: "Rāśi", division: 1 };
    const ChartComponent = chartStyle === "south" ? SouthIndianChart : VedicChart;

    return (
        <div className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-5 lg:p-8 card-lift">
            {/* Action toolbar */}
            <div className="flex justify-end gap-2 mb-3">
                <button
                    data-testid="chart-download-png"
                    onClick={downloadPNG}
                    className="text-xs font-semibold uppercase tracking-wider text-[#8B1E0F] hover:bg-[#8B1E0F]/10 border border-[#8B1E0F]/60 px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    PNG
                </button>
                <button
                    data-testid="chart-download-pdf"
                    onClick={downloadPDF}
                    className="text-xs font-semibold uppercase tracking-wider text-[#8B1E0F] hover:bg-[#8B1E0F]/10 border border-[#8B1E0F]/60 px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    PDF (All)
                </button>
                <button
                    data-testid="chart-share"
                    onClick={shareChart}
                    className="text-xs font-semibold uppercase tracking-wider text-[#8B1E0F] hover:bg-[#8B1E0F]/10 border border-[#8B1E0F]/60 px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    Share
                </button>
            </div>

            {/* Divisional chart tabs - scrollable */}
            <div role="tablist" className="flex gap-2 border-b border-[#E3D5C1] mb-6 overflow-x-auto pb-0" data-testid="varga-tabs">
                {vargaKeys.map((n) => {
                    const key = `d${n}`;
                    const v = vargas[key] || {};
                    return (
                        <button
                            key={key}
                            data-testid={`tab-${key}`}
                            role="tab"
                            aria-selected={tab === key}
                            onClick={() => setTab(key)}
                            className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex flex-col items-start ${
                                tab === key
                                    ? "text-[#8B1E0F] border-[#8B1E0F]"
                                    : "text-[#635647] border-transparent hover:text-[#8B1E0F]"
                            }`}
                        >
                            <span className="tracking-wide text-sm">D{n}</span>
                            <span className="text-[9px] uppercase tracking-[0.12em] text-[#C5A059] mt-0.5">
                                {v.name || ""}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div ref={chartRef} className="bg-[#FCFAF5] p-3 rounded-sm">
                <ChartComponent
                    houseMap={active.chart}
                    ascSign={active.asc_sign}
                    title={`${active.name} · D${active.division}`}
                    testId={`chart-${tab}`}
                />
                <p className="text-center text-xs text-[#635647] mt-3 italic">
                    {active.subtitle || ""}
                </p>
            </div>
            <p className="text-center text-xs text-[#635647] mt-4 italic">
                {t("lagna_caption")}
            </p>
        </div>
    );
}

function MandalaMark({ size = 26 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="28" stroke="#8B1E0F" strokeWidth="1.5" opacity="0.35" />
            <circle cx="32" cy="32" r="20" stroke="#C5A059" strokeWidth="1.5" opacity="0.7" />
            <circle cx="32" cy="32" r="12" stroke="#8B1E0F" strokeWidth="1.5" opacity="0.55" />
            {Array.from({ length: 8 }).map((_, i) => {
                const a = (i * 45 * Math.PI) / 180;
                return (
                    <line
                        key={i}
                        x1={32} y1={32}
                        x2={32 + Math.cos(a) * 28}
                        y2={32 + Math.sin(a) * 28}
                        stroke="#C5A059" strokeWidth="0.9" opacity="0.55"
                    />
                );
            })}
            <circle cx="32" cy="32" r="3" fill="#8B1E0F" />
        </svg>
    );
}

function TopBar({ view, setView }) {
    const { t } = useI18n();
    const tabs = [
        { id: "kundali",  label: t("nav_kundali") },
        { id: "panchang", label: t("nav_panchang") },
        { id: "muhurta",  label: t("nav_muhurta") },
    ];
    return (
        <header
            data-testid="top-bar"
            className="sticky top-0 z-30 bg-[#FCFAF5]/95 backdrop-blur-sm border-b border-[#E3D5C1]"
        >
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
                <a
                    href="https://vedicpanchanga.com/"
                    data-testid="brand-logo"
                    className="flex items-center gap-2 shrink-0 no-underline"
                    aria-label="VedicPanchanga home"
                >
                    <MandalaMark size={28} />
                    <div className="leading-tight hidden xs:block sm:block">
                        <div className="font-serif text-base sm:text-lg text-[#8B1E0F] font-semibold tracking-tight">
                            {t("brand_name")}
                        </div>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] hidden sm:block">
                            {t("brand_tagline")}
                        </div>
                    </div>
                </a>

                <nav
                    role="tablist"
                    data-testid="main-nav"
                    className="flex-1 flex justify-center gap-0.5 sm:gap-2 overflow-x-auto scrollbar-hide"
                >
                    {tabs.map((tb) => (
                        <button
                            key={tb.id}
                            data-testid={`nav-${tb.id}`}
                            role="tab"
                            aria-selected={view === tb.id}
                            onClick={() => setView(tb.id)}
                            className={`relative whitespace-nowrap px-2.5 sm:px-4 py-2 text-[13px] sm:text-sm font-serif tracking-wide transition-colors ${
                                view === tb.id
                                    ? "text-[#8B1E0F]"
                                    : "text-[#635647] hover:text-[#8B1E0F]"
                            }`}
                        >
                            {tb.label}
                            {view === tb.id && (
                                <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-[#8B1E0F] rounded-full" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="shrink-0">
                    <LanguageSwitcher />
                </div>
            </div>
        </header>
    );
}

export default function App() {
    const { t } = useI18n();
    const [view, setView] = useState("kundali"); // "kundali" | "panchang"
    const [form, setForm] = useState(DEFAULT_FORM);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const calculate = async (body) => {
        setLoading(true);
        setError(null);
        try {
            const resp = await axios.post(`${API}/calculate`, body);
            setData(resp.data);
        } catch (e) {
            setError(e?.response?.data?.detail || e.message || "Failed to compute chart");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    // Auto-compute the default chart on initial load
    useEffect(() => {
        calculate({ ...DEFAULT_FORM });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSubmit = () => {
        calculate({
            birth_date: form.birth_date,
            birth_time: form.birth_time,
            latitude: form.latitude,
            longitude: form.longitude,
            timezone: form.timezone || null,
            place_name: form.place_name,
            ayanamsa: form.ayanamsa || "lahiri",
        });
    };

    return (
        <div className="parchment-bg min-h-screen">
            <TopBar view={view} setView={setView} />

            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
                {/* Compact decorative intro — only on Kundali home */}
                {view === "kundali" && (
                    <div className="text-center mb-5 sm:mb-8">
                        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#8B1E0F] tracking-tight font-semibold">
                            {t("app_title")}
                        </h1>
                        <p className="font-serif italic text-sm sm:text-base text-[#635647] mt-1">
                            {t("app_subtitle")}
                        </p>
                    </div>
                )}

                {view === "kundali" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 pb-20">
                        <aside className="lg:col-span-4 xl:col-span-3">
                            <div className="bg-[#FCFAF5] border border-[#E3D5C1] rounded-sm p-4 sm:p-5 lg:p-6 card-lift lg:sticky lg:top-20">
                                <h2 className="font-serif text-xl sm:text-2xl text-[#2C241B] mb-1">{t("birth_details")}</h2>
                                <p className="text-xs text-[#635647] mb-4 sm:mb-5">
                                    {t("enter_native_time_place")}
                                </p>
                                <BirthForm
                                    form={form}
                                    setForm={setForm}
                                    onSubmit={onSubmit}
                                    loading={loading}
                                />
                                {error && (
                                    <div
                                        data-testid="error-banner"
                                        className="mt-4 border border-[#8B1E0F]/40 bg-[#8B1E0F]/5 text-[#8B1E0F] text-xs p-3 rounded-sm"
                                    >
                                        {error}
                                    </div>
                                )}
                            </div>
                        </aside>
                        <main className="lg:col-span-8 xl:col-span-9 space-y-5 sm:space-y-6 lg:space-y-8">
                            {loading && !data && (
                                <div className="flex flex-col items-center justify-center py-20 sm:py-24 gap-4">
                                    <MandalaLoader size={56} />
                                    <p className="font-serif text-[#635647] italic text-sm">Consulting the heavens...</p>
                                </div>
                            )}
                            {data && (
                                <>
                                    <BirthHeader data={data} placeName={form.place_name} />
                                    <ChartTabs data={data} chartStyle={form.chart_style || "north"} />
                                    <PlanetsTable
                                        planets={data.planets_data}
                                        ascendant={data.ascendant}
                                    />
                                    <DashaTable dasha={data.dasha} />
                                    <AshtakavargaTable ashtakavarga={data.ashtakavarga} />
                                </>
                            )}
                        </main>
                    </div>
                )}

                {view === "panchang" && (
                    <div className="pb-20">
                        <PanchangView
                            defaultLocation={{
                                place_name: form.place_name,
                                latitude: form.latitude,
                                longitude: form.longitude,
                                timezone: form.timezone,
                            }}
                        />
                    </div>
                )}

                {view === "muhurta" && (
                    <div className="pb-20">
                        <MuhurtaFinder
                            defaultLocation={{
                                place_name: form.place_name,
                                latitude: form.latitude,
                                longitude: form.longitude,
                                timezone: form.timezone,
                            }}
                        />
                    </div>
                )}

                <footer className="text-center text-xs text-[#635647] pb-10">
                    <div className="divider-ornate max-w-md mx-auto mb-3">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059]">{t("shubham")}</span>
                    </div>
                    {t("computed_with")} · <a href="https://vedicpanchanga.com/" className="text-[#8B1E0F] hover:underline">vedicpanchanga.com</a>
                </footer>
            </div>
        </div>
    );
}
