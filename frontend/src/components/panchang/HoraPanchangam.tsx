import { SegmentTable } from "@/components/panchang/SegmentTable";
import type { LabelledSegment } from "@/types/api";

interface Props {
  day: LabelledSegment[];
  night: LabelledSegment[];
  tz?: string;
  testId?: string;
}

export function HoraPanchangam({ day, night, tz, testId }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid={testId}>
      <div>
        <p className="eyebrow text-saffron mb-2">Day Hora (sunrise → sunset)</p>
        <SegmentTable segments={day} nameHeader="Planet" tz={tz} testId="hora-day" />
      </div>
      <div>
        <p className="eyebrow text-indigo mb-2">Night Hora (sunset → sunrise)</p>
        <SegmentTable segments={night} nameHeader="Planet" tz={tz} testId="hora-night" />
      </div>
    </div>
  );
}
