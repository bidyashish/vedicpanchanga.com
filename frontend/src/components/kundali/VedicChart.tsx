import type { DrishtiData, HouseMap } from "@/types/api";
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

export interface PlanetStatus {
  retrograde: boolean;
  combust: boolean;
}

interface Props {
  houseMap?: HouseMap;
  ascSign: number;
  title?: string;
  testId?: string;
  planetDegrees?: Record<string, number>;
  planetStatus?: Record<string, PlanetStatus>;
  showDegrees?: boolean;
  selectedPlanet?: string | null;
  onSelectPlanet?: (abbr: string | null) => void;
  drishti?: DrishtiData;
  showAspects?: boolean;
}

function orderPlanets(
  planets: string[],
  degrees?: Record<string, number>,
  sign?: number,
): string[] {
  if (!degrees) return planets;
  const desc = sign != null && sign >= 7;
  return [...planets].sort((a, b) => {
    const da = degrees[a];
    const db = degrees[b];
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return desc ? db - da : da - db;
  });
}

const formatDegree = (deg: number) => String(Math.floor(deg)).padStart(2, "0");

function statusTag(status?: PlanetStatus): string {
  if (!status) return "";
  const t: string[] = [];
  if (status.retrograde) t.push("R");
  if (status.combust) t.push("C");
  return t.join(",");
}

export function VedicChart({
  houseMap,
  ascSign,
  title,
  testId,
  planetDegrees,
  planetStatus,
  showDegrees,
  selectedPlanet,
  onSelectPlanet,
  drishti,
  showAspects,
}: Props) {
  const a = useAstro();
  const signForHouse = (h: number) => ((ascSign - 1 + (h - 1)) % 12) + 1;

  const lineCol = "var(--ink-soft)";
  const innerCol = "var(--accent-amber)";
  const signCol = "var(--primary)";
  const surfaceCol = "var(--surface)";
  const ascCol = "var(--primary)";

  const activeAspects = showAspects && selectedPlanet && drishti?.by_planet[selectedPlanet];
  const aspectedHouses = activeAspects
    ? new Set(drishti!.by_planet[selectedPlanet!].aspected_houses)
    : null;
  const fromHouse = activeAspects ? drishti!.by_planet[selectedPlanet!].house : null;

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
          {activeAspects && fromHouse != null && aspectedHouses && (
            <g className="aspect-lines">
              {drishti!.by_planet[selectedPlanet!].details.map((d) => {
                const from = HOUSE_CENTROIDS[fromHouse];
                const to = HOUSE_CENTROIDS[d.to_house];
                if (!from || !to) return null;
                const isSpecial = d.aspect_type === "special";
                const color = d.benefic ? "var(--success)" : "var(--danger)";
                return (
                  <line
                    key={`line-${d.to_house}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={color}
                    strokeWidth={isSpecial ? 2.5 : 1.8}
                    strokeDasharray={isSpecial ? "none" : "6 4"}
                    opacity={0.7}
                    className="transition-opacity duration-200"
                  />
                );
              })}
            </g>
          )}

          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
            const c = HOUSE_CENTROIDS[h];
            const sign = signForHouse(h);
            const planets = orderPlanets(houseMap?.[h] ?? [], planetDegrees, sign);
            const labelPos = SIGN_LABEL_POSITIONS[h];
            const isAspected = aspectedHouses?.has(h) ?? false;
            const isSource = fromHouse === h;
            return (
              <g key={h} data-testid={`${testId}-house-${h}`}>
                {(isAspected || isSource) && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={40}
                    fill={isSource ? planetColor(selectedPlanet!) : "var(--success)"}
                    opacity={0.1}
                    className="transition-opacity duration-200"
                  />
                )}
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
                  const xOffset = (colIdx - (cols - 1) / 2) * 38;
                  const rowGap = showDeg ? 17 : 24;
                  const yStart = showDeg ? -((planets.length - 1) * rowGap) / 2 : 0;
                  const yOffset = yStart + rowIdx * rowGap;
                  const isAsc = abbr === "As" || abbr === "Lg";
                  const tag = isAsc ? "" : statusTag(planetStatus?.[abbr]);
                  const mainLabel = showDeg ? `${a.abbr(abbr)} ${formatDegree(deg)}` : a.abbr(abbr);
                  const isSelected = selectedPlanet === abbr;
                  const dimmed = showAspects && selectedPlanet && !isSelected && !isAsc ? 0.4 : 1;
                  const clickable = !isAsc && onSelectPlanet;
                  const fs = 16;
                  return (
                    <g
                      key={`${h}-${idx}`}
                      onClick={
                        clickable ? () => onSelectPlanet!(isSelected ? null : abbr) : undefined
                      }
                      style={{ cursor: clickable ? "pointer" : "default" }}
                    >
                      <title>{planetTitle(abbr)}</title>
                      {isSelected && (
                        <rect
                          x={c.x + xOffset - 20}
                          y={c.y + yOffset - 10}
                          width={40}
                          height={20}
                          rx={4}
                          fill={planetColor(abbr)}
                          opacity={0.15}
                        />
                      )}
                      <text
                        x={c.x + xOffset}
                        y={c.y + yOffset + 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-serif"
                        fontSize={fs}
                        fontWeight={isAsc ? 800 : isSelected ? 900 : 600}
                        style={{ fill: isAsc ? ascCol : planetColor(abbr) }}
                        opacity={dimmed}
                      >
                        {mainLabel}
                        {tag && (
                          <tspan fontSize={fs * 0.55} dy={-fs * 0.35}>
                            {tag}
                          </tspan>
                        )}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <OmGlyph cx={250} cy={250} size={70} color="var(--primary)" opacity={1} />
        </svg>
      </div>
    </div>
  );
}
