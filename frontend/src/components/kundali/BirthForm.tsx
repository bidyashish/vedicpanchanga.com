import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { CitySearch } from "@/components/common/CitySearch";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { fetchAyanamsaOptions } from "@/lib/api";
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
        <label className="field-label">{t("date_of_birth")}</label>
        <DatePicker
          value={form.birth_date}
          onChange={(iso) => update("birth_date", iso)}
          testIdPrefix="birth-date"
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
