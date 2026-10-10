import { useI18n } from "@/i18n";
import { useAstro } from "@/i18n/astro";
import { formatTime, hoursToHM } from "@/lib/format";
import type { FavourableWindow, HeatCategory } from "@/lib/auspiciousHeatmap";

// "Favourable timings" list (issue #92 follow-up): every span of 30 minutes
// or more that the auspicious-time planner grades Favourable or better,
// one row per rising Lagna. Shared by the panchang heatmap card and the
// Muhurta result cards so both pages read the same.

const CAT_COLOR: Record<"highly-auspicious" | "auspicious", string> = {
  "highly-auspicious": "#1b5e20",
  auspicious: "#7cb342",
};

const CAT_LABEL_KEY: Record<HeatCategory, string> = {
  "highly-auspicious": "heat_cat_highly_auspicious",
  auspicious: "heat_cat_auspicious",
  neutral: "heat_cat_neutral",
  inauspicious: "heat_cat_inauspicious",
  "highly-inauspicious": "heat_cat_highly_inauspicious",
};

const iso = (ms: number) => new Date(ms).toISOString();

export function FavourableTimingsList({
  windows,
  tz,
  onSelectTime,
  testId = "favourable-timings",
}: {
  windows: FavourableWindow[];
  tz?: string;
  // When given, each row is a button that jumps the planner to that time.
  onSelectTime?: (ms: number) => void;
  testId?: string;
}) {
  const { t } = useI18n();
  const a = useAstro();
  if (windows.length === 0)
    return (
      <p className="meta" data-testid={`${testId}-empty`}>
        {t("heat_fav_none")}
      </p>
    );
  return (
    <ul className="divide-y divide-parchment-200" data-testid={testId}>
      {windows.map((w) => {
        const color =
          CAT_COLOR[w.category === "highly-auspicious" ? "highly-auspicious" : "auspicious"];
        const inner = (
          <>
            <span className="font-serif text-ink min-w-0 truncate">
              {w.lagna ? a.sign(w.lagna) : "-"}
            </span>
            <span className="value num whitespace-nowrap">
              {formatTime(iso(w.startMs), tz)} - {formatTime(iso(w.endMs), tz)}
            </span>
            <span className="text-mini num text-ink-soft whitespace-nowrap">
              {hoursToHM((w.endMs - w.startMs) / 3_600_000)}
            </span>
            <span
              className="eyebrow-lg px-2 py-0.5 rounded-full whitespace-nowrap justify-self-start sm:justify-self-end"
              style={{ color, backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
            >
              {t(CAT_LABEL_KEY[w.category])}
            </span>
          </>
        );
        const cls =
          "grid grid-cols-[1fr_auto] sm:grid-cols-[9rem_1fr_4.5rem_auto] items-center gap-x-3 gap-y-0.5 py-1.5 w-full text-left";
        return (
          <li key={w.startMs} style={{ boxShadow: `inset 3px 0 0 ${color}` }} className="ps-3">
            {onSelectTime ? (
              <button
                type="button"
                onClick={() => onSelectTime(w.startMs)}
                className={`${cls} hover:bg-parchment-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded-2xs`}
              >
                {inner}
              </button>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
