import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { formatTime } from "@/lib/format";
import {
  buildHeatmap,
  type HeatCategory,
  type HeatSlot,
  type HeatStrip,
} from "@/lib/auspiciousHeatmap";
import type { PanchangData } from "@/types/api";

// Fixed legend colors, following the scale in github issue #92:
// blue (best) -> green -> yellow -> orange/red -> dark red (worst). Semantic
// (not theme-tinted) so the scale reads identically in light and dark mode.
const CAT_COLOR: Record<HeatCategory, string> = {
  "highly-auspicious": "#1565c0", // blue
  auspicious: "#43a047", // light green
  neutral: "#f4c20d", // yellow
  inauspicious: "#ef6c00", // orange-red
  "highly-inauspicious": "#6b1313", // dark red (near black-red)
};

const CAT_ORDER: HeatCategory[] = [
  "highly-auspicious",
  "auspicious",
  "neutral",
  "inauspicious",
  "highly-inauspicious",
];

const CAT_LABEL_KEY: Record<HeatCategory, string> = {
  "highly-auspicious": "heat_cat_highly_auspicious",
  auspicious: "heat_cat_auspicious",
  neutral: "heat_cat_neutral",
  inauspicious: "heat_cat_inauspicious",
  "highly-inauspicious": "heat_cat_highly_inauspicious",
};

function Strip({
  strip,
  tz,
  selected,
  onSelect,
}: {
  strip: HeatStrip;
  tz?: string;
  selected: HeatSlot | null;
  onSelect: (s: HeatSlot) => void;
}) {
  const { t } = useI18n();
  const label = strip.period === "day" ? t("heat_period_day") : t("heat_period_night");
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="eyebrow-lg text-ink-soft">{label}</span>
        <span className="text-mini num text-ink-soft">
          {formatTime(new Date(strip.startMs).toISOString(), tz)} -{" "}
          {formatTime(new Date(strip.endMs).toISOString(), tz)}
        </span>
      </div>
      <div className="flex gap-px rounded-sm overflow-hidden" role="list" aria-label={label}>
        {strip.slots.map((slot) => {
          const isSel = selected?.startMs === slot.startMs;
          return (
            <button
              key={slot.startMs}
              type="button"
              role="listitem"
              aria-label={`${formatTime(new Date(slot.startMs).toISOString(), tz)} ${t(CAT_LABEL_KEY[slot.category])}`}
              onClick={() => onSelect(slot)}
              className="group relative h-7 sm:h-8 flex-1 min-w-[6px] transition-transform focus:outline-hidden focus:z-10"
              style={{
                backgroundColor: CAT_COLOR[slot.category],
                outline: isSel ? "2px solid var(--text-strong)" : undefined,
                outlineOffset: isSel ? "-2px" : undefined,
                transform: isSel ? "scaleY(1.12)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function SlotDetail({ slot, tz }: { slot: HeatSlot; tz?: string }) {
  const { t } = useI18n();
  const color = CAT_COLOR[slot.category];
  const pos = slot.events.filter((e) => e.weight > 0);
  const neg = slot.events.filter((e) => e.weight < 0);
  return (
    <div
      className="mt-3 rounded-sm border border-parchment-200 bg-parchment-50 p-3"
      data-testid="heat-slot-detail"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="value-strong num">
          {formatTime(new Date(slot.startMs).toISOString(), tz)} -{" "}
          {formatTime(new Date(slot.endMs).toISOString(), tz)}
        </span>
        <span
          className="eyebrow-lg px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
        >
          {t(CAT_LABEL_KEY[slot.category])}
        </span>
      </div>
      {slot.events.length === 0 ? (
        <p className="meta mt-1.5">{t("heat_no_events")}</p>
      ) : (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {pos.length > 0 && (
            <div>
              <p className="text-mini font-semibold text-ink-soft uppercase tracking-wide mb-0.5">
                {t("heat_favourable")}
              </p>
              <ul className="space-y-0.5">
                {pos.map((e) => (
                  <li key={e.id} className="text-meta text-ink flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#43a047] shrink-0" />
                    {t(e.labelKey)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {neg.length > 0 && (
            <div>
              <p className="text-mini font-semibold text-ink-soft uppercase tracking-wide mb-0.5">
                {t("heat_avoid")}
              </p>
              <ul className="space-y-0.5">
                {neg.map((e) => (
                  <li key={e.id} className="text-meta text-ink flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6b1313] shrink-0" />
                    {t(e.labelKey)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuspiciousHeatmap({ data, tz }: { data: PanchangData; tz?: string }) {
  const { t } = useI18n();
  const model = useMemo(() => buildHeatmap(data), [data]);
  const [selected, setSelected] = useState<HeatSlot | null>(null);

  if (!model.hasSignal || (!model.day && !model.night)) return null;

  return (
    <div data-testid="auspicious-heatmap" className="space-y-3">
      {model.best && (
        <div className="rounded-sm border-l-[3px] border border-parchment-200 border-l-[#1565c0] bg-parchment-50 px-3 py-2">
          <p className="eyebrow-lg text-[#1565c0]">{t("heat_best_window")}</p>
          <p className="value-strong num mt-0.5">
            {formatTime(new Date(model.best.startMs).toISOString(), tz)} -{" "}
            {formatTime(new Date(model.best.endMs).toISOString(), tz)}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {model.day && (
          <Strip strip={model.day} tz={tz} selected={selected} onSelect={setSelected} />
        )}
        {model.night && (
          <Strip strip={model.night} tz={tz} selected={selected} onSelect={setSelected} />
        )}
      </div>

      {selected ? (
        <SlotDetail slot={selected} tz={tz} />
      ) : (
        <p className="meta">{t("heat_tap_hint")}</p>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {CAT_ORDER.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-mini text-ink-soft">
            <span
              className="w-2.5 h-2.5 rounded-[2px] shrink-0"
              style={{ backgroundColor: CAT_COLOR[c] }}
            />
            {t(CAT_LABEL_KEY[c])}
          </span>
        ))}
      </div>
    </div>
  );
}
