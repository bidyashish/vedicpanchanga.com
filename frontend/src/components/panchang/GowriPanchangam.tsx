import { useI18n } from "@/i18n";
import { SegmentTable } from "@/components/panchang/SegmentTable";
import type { LabelledSegment } from "@/types/api";

interface Props {
  day: LabelledSegment[];
  night: LabelledSegment[];
  tz?: string;
  testId?: string;
}

export function GowriPanchangam({ day, night, tz, testId }: Props) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid={testId}>
      <div>
        <p className="eyebrow text-saffron mb-2">{t("gowri_day")}</p>
        <SegmentTable segments={day} nameHeader="Gowri" tz={tz} testId="gowri-day" />
      </div>
      <div>
        <p className="eyebrow text-indigo mb-2">{t("gowri_night")}</p>
        <SegmentTable segments={night} nameHeader="Gowri" tz={tz} testId="gowri-night" />
      </div>
    </div>
  );
}
