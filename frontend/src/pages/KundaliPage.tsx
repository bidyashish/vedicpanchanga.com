import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { BirthForm, type BirthFormState } from "@/components/kundali/BirthForm";
import { BirthHeader } from "@/components/kundali/BirthHeader";
import { ChartTabs } from "@/components/kundali/ChartTabs";
import { PlanetsTable } from "@/components/kundali/PlanetsTable";
import { DashaTable } from "@/components/kundali/DashaTable";
import { AshtakavargaTable } from "@/components/kundali/AshtakavargaTable";
import { MandalaLoader } from "@/components/common/MandalaLoader";
import { AdSlot } from "@/components/shell/AdSlot";
import { calculateChart } from "@/lib/api";
import type { ChartData, LocationChoice } from "@/types/api";

const DEFAULT_FORM: BirthFormState = {
  birth_date: "1990-01-01",
  birth_time: "12:00",
  place_name: "New Delhi, India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
  ayanamsa: "lahiri",
  chart_style: "north",
};

interface Props {
  sharedLocation: LocationChoice;
  onLocationChange: (loc: LocationChoice) => void;
}

export function KundaliPage({ sharedLocation, onLocationChange }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState<BirthFormState>(() => ({
    ...DEFAULT_FORM,
    place_name: sharedLocation.place_name,
    latitude: sharedLocation.latitude,
    longitude: sharedLocation.longitude,
    timezone: sharedLocation.timezone,
  }));
  const [data, setData] = useState<ChartData | null>(null);
  const [submittedPlaceName, setSubmittedPlaceName] = useState<string>(
    sharedLocation.place_name,
  );
  const [submittedChartStyle, setSubmittedChartStyle] = useState<"north" | "south">(
    DEFAULT_FORM.chart_style,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didAutoRunRef = useRef(false);

  const calculate = async (body: BirthFormState) => {
    setLoading(true);
    setError(null);
    try {
      const result = await calculateChart({
        birth_date: body.birth_date,
        birth_time: body.birth_time,
        latitude: body.latitude,
        longitude: body.longitude,
        timezone: body.timezone,
        place_name: body.place_name,
        ayanamsa: body.ayanamsa as never,
      });
      setData(result);
      setSubmittedPlaceName(body.place_name);
      setSubmittedChartStyle(body.chart_style);
    } catch (e) {
      setError((e as Error).message || "Failed to compute chart");
      // Keep previous chart visible on error rather than wiping it.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didAutoRunRef.current) return;
    didAutoRunRef.current = true;
    calculate(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = () => {
    if (!Number.isFinite(form.latitude) || !Number.isFinite(form.longitude)) {
      setError("Please enter valid latitude and longitude, or pick a city.");
      return;
    }
    onLocationChange({
      place_name: form.place_name,
      latitude: form.latitude,
      longitude: form.longitude,
      timezone: form.timezone,
    });
    calculate(form);
  };

  return (
    <section className="pt-3 sm:pt-4 pb-8" data-testid="kundali-page">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Left sidebar — form */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="card p-4 sm:p-5 lg:sticky lg:top-16">
            <h2 className="heading-section">{t("birth_details")}</h2>
            <p className="meta mb-4">{t("enter_native_time_place")}</p>
            <BirthForm form={form} setForm={setForm} onSubmit={onSubmit} loading={loading} />
            {error && (
              <div
                data-testid="error-banner"
                className="mt-3 border border-rose/40 bg-rose/5 text-rose text-mini px-3 py-2 rounded-sm"
              >
                {error}
              </div>
            )}
            <div className="mt-4 hidden lg:block">
              <AdSlot slot="sidebar" minHeight={240} />
            </div>
          </div>
        </aside>

        {/* Middle — chart + data */}
        <div className="lg:col-span-8 xl:col-span-6 space-y-4">
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <MandalaLoader size={48} />
              <p className="meta italic">{t("consulting_heavens")}</p>
            </div>
          )}
          {data && (
            <>
              <BirthHeader data={data} placeName={submittedPlaceName} />
              <ChartTabs data={data} chartStyle={submittedChartStyle} />
              <AdSlot slot="inline" minHeight={120} className="my-2" />
              <PlanetsTable planets={data.planets_data} ascendant={data.ascendant} />
              <DashaTable dasha={data.dasha} />
              <AshtakavargaTable ashtakavarga={data.ashtakavarga} />
            </>
          )}
        </div>

        {/* Right rail — large tower ad, only on xl+ */}
        <aside className="hidden xl:block xl:col-span-3">
          <div className="lg:sticky lg:top-16 space-y-3">
            <AdSlot slot="sidebar" minHeight={600} />
          </div>
        </aside>
      </div>
    </section>
  );
}
