import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
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
  const a = useAstro();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid={testId}>
      <div>
        <p className="eyebrow text-saffron mb-2">{t("gowri_day")}</p>
        <SegmentTable
          segments={day}
          nameHeader={t("gowri_header")}
          tz={tz}
          testId="gowri-day"
          nameLookup={a.gowri}
        />
      </div>
      <div>
        <p className="eyebrow text-indigo mb-2">{t("gowri_night")}</p>
        <SegmentTable
          segments={night}
          nameHeader={t("gowri_header")}
          tz={tz}
          testId="gowri-night"
          nameLookup={a.gowri}
        />
      </div>
    </div>
  );
}
