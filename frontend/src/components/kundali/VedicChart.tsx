import type { HouseMap } from "@/types/api";
import { planetColor, planetTitle } from "@/lib/planets";
import { useAstro } from "@/i18n/astro";
import { OmGlyph } from "@/components/kundali/OmGlyph";

const HOUSE_CENTROIDS: Record<number, { x: number; y: number }> = {
  1: { x: 250, y: 125 },
  2: { x: 125, y: 65 },
  3: { x: 65, y: 125 },
  4: { x: 125, y: 250 },
  5: { x: 65, y: 375 },
  6: { x: 125, y: 435 },
  7: { x: 250, y: 375 },
  8: { x: 375, y: 435 },
  9: { x: 435, y: 375 },
  10: { x: 375, y: 250 },
  11: { x: 435, y: 125 },
  12: { x: 375, y: 65 },
};

const SIGN_LABEL_POSITIONS: Record<
  number,
  { x: number; y: number; anchor: "start" | "middle" | "end" }
> = {
  1: { x: 250, y: 38, anchor: "middle" },
  2: { x: 86, y: 22, anchor: "start" },
  3: { x: 30, y: 86, anchor: "start" },
  4: { x: 42, y: 250, anchor: "start" },
  5: { x: 30, y: 414, anchor: "start" },
  6: { x: 86, y: 478, anchor: "start" },
  7: { x: 250, y: 462, anchor: "middle" },
  8: { x: 414, y: 478, anchor: "end" },
  9: { x: 470, y: 414, anchor: "end" },
  10: { x: 458, y: 250, anchor: "end" },
  11: { x: 470, y: 86, anchor: "end" },
  12: { x: 414, y: 22, anchor: "end" },
};

interface Props {
  houseMap?: HouseMap;
  ascSign: number;
  title?: string;
  testId?: string;
  planetDegrees?: Record<string, number>;
  showDegrees?: boolean;
}

function orderPlanets(planets: string[], degrees?: Record<string, number>): string[] {
  if (!degrees) return planets;
  return [...planets].sort((a, b) => {
    const da = degrees[a];
    const db = degrees[b];
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });
}

const formatDegree = (deg: number) => String(Math.floor(deg)).padStart(2, "0");

export function VedicChart({
  houseMap,
  ascSign,
  title,
  testId,
  planetDegrees,
  showDegrees,
}: Props) {
  const a = useAstro();
  const signForHouse = (h: number) => ((ascSign - 1 + (h - 1)) % 12) + 1;

  // CSS variables resolved at render so colours follow the active theme.
  const lineCol = "var(--ink-soft)";
  const innerCol = "var(--accent-amber)";
  const signCol = "var(--primary)";
  const surfaceCol = "var(--surface)";
  const ascCol = "var(--primary)";

  return (
    <div className="w-full" data-testid={testId}>
      {title && (
        <h3 className="font-serif text-base sm:text-lg text-center text-saffron mb-2 font-semibold">
          {title}
        </h3>
      )}
      <div
        className="ornate-frame p-3 sm:p-4 rounded-md aspect-square w-full max-w-lg mx-auto"
        style={{ background: "var(--surface-soft)" }}
      >
        <svg
          viewBox="0 0 500 500"
          className="kundali-svg w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="0"
            y="0"
            width="500"
            height="500"
            style={{ fill: surfaceCol, stroke: lineCol }}
            strokeWidth="2"
          />
          <line x1="0" y1="0" x2="500" y2="500" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="500" y1="0" x2="0" y2="500" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <polygon
            points="250,0 500,250 250,500 0,250"
            fill="none"
            style={{ stroke: lineCol }}
            strokeWidth="1.2"
          />
          <polygon
            points="250,24 476,250 250,476 24,250"
            fill="none"
            style={{ stroke: innerCol }}
            strokeWidth="0.6"
            strokeDasharray="4 4"
            opacity="0.4"
          />
          <OmGlyph cx={250} cy={250} size={70} color="var(--primary)" opacity={0.76} />

          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
            const c = HOUSE_CENTROIDS[h];
            const sign = signForHouse(h);
            const planets = orderPlanets(houseMap?.[h] ?? [], planetDegrees);
            const labelPos = SIGN_LABEL_POSITIONS[h];
            return (
              <g key={h} data-testid={`${testId}-house-${h}`}>
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor={labelPos.anchor}
                  dominantBaseline="middle"
                  className="font-serif"
                  fontSize="20"
                  fontWeight="700"
                  style={{ fill: signCol }}
                  opacity="0.9"
                >
                  {a.num(sign)}
                </text>
                {planets.map((abbr, idx) => {
                  const deg = planetDegrees?.[abbr];
                  const showDeg = showDegrees && deg != null;
                  const cols = showDeg ? 1 : Math.min(Math.max(planets.length, 1), 3);
                  const rowIdx = Math.floor(idx / cols);
                  const colIdx = idx % cols;
                  const xOffset = (colIdx - (cols - 1) / 2) * 32;
                  const rowGap = showDeg ? 17 : 24;
                  const yStart = showDeg ? -((planets.length - 1) * rowGap) / 2 : 0;
                  const yOffset = yStart + rowIdx * rowGap;
                  const isAsc = abbr === "As" || abbr === "Lg";
                  const label = showDeg ? `${a.abbr(abbr)} ${formatDegree(deg)}` : a.abbr(abbr);
                  return (
                    <g key={`${h}-${idx}`}>
                      <title>{planetTitle(abbr)}</title>
                      <text
                        x={c.x + xOffset}
                        y={c.y + yOffset + 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-serif"
                        fontSize={showDeg ? 15 : 18}
                        fontWeight={isAsc ? 800 : 600}
                        style={{ fill: isAsc ? ascCol : planetColor(abbr) }}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
