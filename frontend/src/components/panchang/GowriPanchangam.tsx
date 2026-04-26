import { SegmentTable } from "@/components/panchang/SegmentTable";
import type { LabelledSegment } from "@/types/api";

interface Props {
  day: LabelledSegment[];
  night: LabelledSegment[];
  tz?: string;
  testId?: string;
}

export function GowriPanchangam({ day, night, tz, testId }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid={testId}>
      <div>
        <p className="eyebrow text-saffron mb-2">Day (sunrise → sunset)</p>
        <SegmentTable segments={day} nameHeader="Gowri" tz={tz} testId="gowri-day" />
      </div>
      <div>
        <p className="eyebrow text-indigo mb-2">Night (sunset → sunrise)</p>
        <SegmentTable segments={night} nameHeader="Gowri" tz={tz} testId="gowri-night" />
      </div>
    </div>
  );
}
