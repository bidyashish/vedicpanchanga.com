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
    } catch (e) {
      setError((e as Error).message || "Failed to compute chart");
      setData(null);
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
    onLocationChange({
      place_name: form.place_name,
      latitude: form.latitude,
      longitude: form.longitude,
      timezone: form.timezone,
    });
    calculate(form);
  };

  return (
    <section className="pt-4 sm:pt-5 pb-10" data-testid="kundali-page">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 xl:gap-8">
        {/* Left sidebar — form */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="card card-lift p-5 lg:p-6 lg:sticky lg:top-20">
            <h2 className="font-serif text-xl lg:text-2xl text-ink mb-1">
              {t("birth_details")}
            </h2>
            <p className="text-xs text-ink-soft mb-5">{t("enter_native_time_place")}</p>
            <BirthForm form={form} setForm={setForm} onSubmit={onSubmit} loading={loading} />
            {error && (
              <div
                data-testid="error-banner"
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

        {/* Middle — chart + data */}
        <div className="lg:col-span-8 xl:col-span-6 space-y-5 lg:space-y-6">
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <MandalaLoader size={64} />
              <p className="font-serif text-ink-soft italic text-sm">
                {t("consulting_heavens")}
              </p>
            </div>
          )}
          {data && (
            <>
              <BirthHeader data={data} placeName={form.place_name} />
              <ChartTabs data={data} chartStyle={form.chart_style} />
              <AdSlot slot="inline" minHeight={120} className="my-2" />
              <PlanetsTable planets={data.planets_data} ascendant={data.ascendant} />
              <DashaTable dasha={data.dasha} />
              <AshtakavargaTable ashtakavarga={data.ashtakavarga} />
            </>
          )}
        </div>

        {/* Right rail — large tower ad, only on xl+ */}
        <aside className="hidden xl:block xl:col-span-3">
          <div className="lg:sticky lg:top-20 space-y-4">
            <AdSlot slot="sidebar" minHeight={600} />
          </div>
        </aside>
      </div>
    </section>
  );
}
