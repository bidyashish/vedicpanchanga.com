import { useI18n } from "@/i18n";
import { formatBirthDate } from "@/lib/format";
import type { ChartData } from "@/types/api";

interface Props {
  data: ChartData;
  placeName?: string;
}

export function BirthHeader({ data, placeName }: Props) {
  const { t } = useI18n();
  const b = data.birth;
  const fmt = formatBirthDate(b.local_time, b.timezone);
  return (
    <div data-testid="birth-header" className="card p-4 sm:p-5">
      <p className="eyebrow">{t("birth_details")}</p>
      <h2 className="heading-page mt-0.5">
        {placeName || t("unnamed_native")}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-3">
        <Row label={t("local")} value={fmt} />
        <Row label={t("timezone")} value={b.timezone} />
        <Row label={t("latitude")} value={`${b.latitude.toFixed(4)}°`} />
        <Row label={t("longitude")} value={`${b.longitude.toFixed(4)}°`} />
        <Row
          label={t("ayanamsa")}
          value={
            <>
              {b.ayanamsa.toFixed(4)}°{" "}
              <span className="text-ink-muted">({b.ayanamsa_label})</span>
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
    <div className="flex items-baseline gap-3 py-0.5">
      <dt className="label shrink-0 min-w-[88px]">{label}</dt>
      <dd className="value num">{value}</dd>
    </div>
  );
}
