import { useI18n } from "@/i18n";
import { formatBirthDate, localeFor } from "@/lib/format";
import type { ChartData } from "@/types/api";

interface Props {
  data: ChartData;
  placeName?: string;
}

export function BirthHeader({ data, placeName }: Props) {
  const { t, lang } = useI18n();
  const b = data.birth;
  const fmt = formatBirthDate(b.local_time, b.timezone, localeFor(lang));
  return (
    <div
      data-testid="birth-header"
      className="card card-lift p-5 lg:p-6"
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft font-semibold">
        {t("birth_details")}
      </p>
      <h2 className="font-serif text-2xl lg:text-3xl text-ink mt-1">
        {placeName || t("unnamed_native")}
      </h2>
      <div className="divider-ornate my-3">
        <span className="font-serif italic text-sm">॥ कुण्डली ॥</span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-ink">
        <Row label={t("local")} value={fmt} />
        <Row label={t("timezone")} value={b.timezone} />
        <Row label={t("latitude")} value={`${b.latitude.toFixed(4)}°`} />
        <Row label={t("longitude")} value={`${b.longitude.toFixed(4)}°`} />
        <Row
          label={t("ayanamsa")}
          value={
            <>
              {b.ayanamsa.toFixed(4)}°{" "}
              <span className="text-gold">({b.ayanamsa_label})</span>
            </>
          }
        />
        <Row label={t("julian_day")} value={b.julian_day.toFixed(3)} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <dt className="text-ink-soft shrink-0 min-w-[96px]">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
