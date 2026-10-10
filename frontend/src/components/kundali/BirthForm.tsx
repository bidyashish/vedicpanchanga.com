import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { fetchAyanamsaOptions, reverseGeocode } from "@/lib/api";
import { nowTimeInTz, todayISO } from "@/lib/format";
import type { AyanamsaOption } from "@/types/api";

export interface BirthFormState {
  birth_date: string;
  birth_time: string;
  place_name: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  ayanamsa: string;
}

const FALLBACK_AYANAMSAS: AyanamsaOption[] = [
  { id: "lahiri", label: "N.C. Lahiri (Chitrapaksha)" },
  { id: "kp_new", label: "K.P. New" },
  { id: "kp_old", label: "K.P. Old" },
  { id: "raman", label: "B.V. Raman" },
  { id: "kp_khullar", label: "K.P. Khullar" },
  { id: "sayan", label: "Sayana (Tropical)" },
  { id: "manoj", label: "Manoj (Lahiri ICRC)" },
];

interface Props {
  form: BirthFormState;
  setForm: React.Dispatch<React.SetStateAction<BirthFormState>>;
  onSubmit: () => void;
  loading: boolean;
}

export function BirthForm({ form, setForm, onSubmit, loading }: Props) {
  const { t } = useI18n();
  const [ayanamsas, setAyanamsas] = useState<AyanamsaOption[]>(FALLBACK_AYANAMSAS);

  // Guard against React 18 StrictMode's double-mount in dev so the options
  // list isn't fetched twice on every page load.
  const ayanFetchedRef = useRef(false);
  useEffect(() => {
    if (ayanFetchedRef.current) return;
    ayanFetchedRef.current = true;
    fetchAyanamsaOptions()
      .then((opts) => {
        if (opts.length) setAyanamsas(opts);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const update = <K extends keyof BirthFormState>(k: K, v: BirthFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // "Now": fill in the current wall-clock date and time straight away, then
  // the visitor's own position once the browser grants it. The date and time
  // land first so the form stays usable if geolocation is denied or slow.
  // The button is never disabled: while a permission prompt is pending the
  // browser fires neither callback, so a disabled button could stick.
  const [locating, setLocating] = useState(false);
  const useNow = () => {
    setForm((f) => ({ ...f, birth_date: todayISO(), birth_time: nowTimeInTz(), timezone: null }));
    if (locating || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name =
          (await reverseGeocode(latitude, longitude)) ??
          `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
        setForm((f) => ({ ...f, place_name: name, latitude, longitude, timezone: null }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <form
      data-testid="birth-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      <div>
        <div className="flex items-center justify-between mb-[0.45rem]">
          <label className="field-label mb-0">{t("date_of_birth")}</label>
          <button
            type="button"
            data-testid="birth-now-btn"
            onClick={useNow}
            title={t("birth_now_hint")}
            aria-label={t("birth_now_hint")}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-saffron-dark transition-colors"
          >
            <LocateFixed className={`h-3.5 w-3.5 ${locating ? "animate-pulse" : ""}`} aria-hidden />
            {t("birth_now")}
          </button>
        </div>
        <DatePicker
          value={form.birth_date}
          onChange={(iso) => update("birth_date", iso)}
          testIdPrefix="birth-date"
          maxYear={new Date().getFullYear() + 1}
        />
      </div>
      <div>
        <label className="field-label">{t("time_of_birth")}</label>
        <TimePicker
          value={form.birth_time}
          onChange={(hhmm) => update("birth_time", hhmm)}
          testIdPrefix="birth-time"
        />
      </div>
      <CitySearch
        value={form.place_name}
        onSelect={(p) =>
          setForm((f) => ({
            ...f,
            place_name: p.place_name,
            latitude: p.latitude,
            longitude: p.longitude,
            timezone: null,
          }))
        }
        label={t("place_of_birth")}
        placeholder={t("search_city")}
        testIdPrefix="city-search"
      />
      <div>
        <label className="field-label">{t("ayanamsa")}</label>
        <select
          data-testid="ayanamsa-select"
          value={form.ayanamsa}
          onChange={(e) => update("ayanamsa", e.target.value)}
          className="field"
        >
          {ayanamsas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="field-label">{t("latitude")}</label>
          <input
            data-testid="latitude-input"
            type="number"
            step="0.000001"
            value={Number.isFinite(form.latitude) ? form.latitude : ""}
            onChange={(e) => {
              const v = e.target.value;
              update("latitude", v === "" ? Number.NaN : parseFloat(v));
            }}
            className="field num"
          />
        </div>
        <div>
          <label className="field-label">{t("longitude")}</label>
          <input
            data-testid="longitude-input"
            type="number"
            step="0.000001"
            value={Number.isFinite(form.longitude) ? form.longitude : ""}
            onChange={(e) => {
              const v = e.target.value;
              update("longitude", v === "" ? Number.NaN : parseFloat(v));
            }}
            className="field num"
          />
        </div>
      </div>
      <button
        data-testid="calculate-btn"
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
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
