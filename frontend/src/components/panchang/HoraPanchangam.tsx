import { useI18n } from "@/i18n";
import { SegmentTable } from "@/components/panchang/SegmentTable";
import type { LabelledSegment } from "@/types/api";

interface Props {
  day: LabelledSegment[];
  night: LabelledSegment[];
  tz?: string;
  testId?: string;
}

export function HoraPanchangam({ day, night, tz, testId }: Props) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid={testId}>
      <div>
        <p className="eyebrow text-saffron mb-2">{t("hora_day")}</p>
        <SegmentTable segments={day} nameHeader={t("col_planet")} tz={tz} testId="hora-day" />
      </div>
      <div>
        <p className="eyebrow text-indigo mb-2">{t("hora_night")}</p>
        <SegmentTable segments={night} nameHeader={t("col_planet")} tz={tz} testId="hora-night" />
      </div>
    </div>
  );
}
