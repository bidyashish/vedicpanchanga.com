import type { DrishtiData, HouseMap } from "@/types/api";
import type { PlanetStatus } from "@/components/kundali/VedicChart";
import { planetColor, planetTitle, SIGN_SHORT } from "@/lib/planets";
import { useAstro } from "@/i18n/astro";
import { OmGlyph } from "@/components/kundali/OmGlyph";

const CELL_POSITIONS: Record<number, { x: number; y: number }> = {
  12: { x: 0, y: 0 },
  1: { x: 125, y: 0 },
  2: { x: 250, y: 0 },
  3: { x: 375, y: 0 },
  4: { x: 375, y: 125 },
  5: { x: 375, y: 250 },
  6: { x: 375, y: 375 },
  7: { x: 250, y: 375 },
  8: { x: 125, y: 375 },
  9: { x: 0, y: 375 },
  10: { x: 0, y: 250 },
  11: { x: 0, y: 125 },
};

const CELL_CENTERS: Record<number, { x: number; y: number }> = Object.fromEntries(
  Object.entries(CELL_POSITIONS).map(([k, v]) => [k, { x: v.x + 62.5, y: v.y + 62.5 }]),
);

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

function statusTag(status?: PlanetStatus): string {
  if (!status) return "";
  const t: string[] = [];
  if (status.retrograde) t.push("R");
  if (status.combust) t.push("C");
  return t.join(",");
}

function houseToSign(house: number, ascSign: number): number {
  return ((ascSign - 1 + (house - 1)) % 12) + 1;
}

export function SouthIndianChart({
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
  const signToPlanets: Record<number, string[]> = {};
  for (let h = 1; h <= 12; h++) {
    const sign = ((ascSign - 1 + (h - 1)) % 12) + 1;
    const cellPlanets = (houseMap?.[h] ?? []).filter((p) => p !== "As" && p !== "Lg");
    signToPlanets[sign] = orderPlanets(cellPlanets, planetDegrees);
  }

  const CELL = 125;
  const lineCol = "var(--ink-soft)";
  const innerCol = "var(--accent-amber)";
  const signCol = "var(--primary)";
  const ascCol = "var(--primary)";
  const dimCol = "var(--ink-soft)";
  const innerSurface = "var(--surface-soft)";
  const baseSurface = "var(--surface)";

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
            style={{ fill: baseSurface, stroke: lineCol }}
            strokeWidth="2"
          />
          <line x1="0" y1="125" x2="500" y2="125" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="0" y1="375" x2="500" y2="375" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="125" y1="0" x2="125" y2="500" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="375" y1="0" x2="375" y2="500" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="250" y1="0" x2="250" y2="125" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="250" y1="375" x2="250" y2="500" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="0" y1="250" x2="125" y2="250" style={{ stroke: lineCol }} strokeWidth="1.2" />
          <line x1="375" y1="250" x2="500" y2="250" style={{ stroke: lineCol }} strokeWidth="1.2" />

          <rect
            x="125"
            y="125"
            width="250"
            height="250"
            style={{ fill: innerSurface, stroke: innerCol }}
            strokeWidth="0.6"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <OmGlyph cx={250} cy={250} size={70} color="var(--primary)" opacity={0.76} />

          {activeAspects && fromHouse != null && aspectedHouses && (
            <g className="aspect-lines">
              {drishti!.by_planet[selectedPlanet!].details.map((d) => {
                const fromSign = houseToSign(fromHouse, ascSign);
                const toSign = houseToSign(d.to_house, ascSign);
                const from = CELL_CENTERS[fromSign];
                const to = CELL_CENTERS[toSign];
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

          {Array.from({ length: 12 }, (_, i) => i + 1).map((sign) => {
            const pos = CELL_POSITIONS[sign];
            const isAscSign = sign === ascSign;
            const houseNum = ((sign - ascSign + 12) % 12) + 1;
            const planets = signToPlanets[sign] ?? [];
            const isAspected = aspectedHouses?.has(houseNum) ?? false;
            const isSource = fromHouse === houseNum;
            return (
              <g key={sign} data-testid={`${testId}-cell-${sign}`}>
                {(isAspected || isSource) && (
                  <rect
                    x={pos.x + 2}
                    y={pos.y + 2}
                    width={CELL - 4}
                    height={CELL - 4}
                    rx={4}
                    fill={isSource ? planetColor(selectedPlanet!) : "var(--success)"}
                    opacity={0.1}
                    className="transition-opacity duration-200"
                  />
                )}
                {isAscSign && (
                  <>
                    <line
                      x1={pos.x + 8}
                      y1={pos.y + 8}
                      x2={pos.x + 38}
                      y2={pos.y + 38}
                      style={{ stroke: ascCol }}
                      strokeWidth="2"
                    />
                    <line
                      x1={pos.x + 8}
                      y1={pos.y + 38}
                      x2={pos.x + 38}
                      y2={pos.y + 8}
                      style={{ stroke: ascCol }}
                      strokeWidth="2"
                    />
                    <text
                      x={pos.x + 62}
                      y={pos.y + 28}
                      fontSize="16"
                      fontWeight="700"
                      className="font-serif"
                      style={{ fill: ascCol }}
                    >
                      {a.abbr("Lg")}
                    </text>
                  </>
                )}
                <text
                  x={pos.x + CELL - 10}
                  y={pos.y + 22}
                  textAnchor="end"
                  fontSize="18"
                  fontWeight="700"
                  className="font-serif"
                  style={{ fill: signCol }}
                  opacity="0.95"
                >
                  {a.num(houseNum)}
                </text>
                <text
                  x={pos.x + CELL - 10}
                  y={pos.y + 40}
                  textAnchor="end"
                  fontSize="11"
                  style={{ fill: dimCol }}
                >
                  {SIGN_SHORT[sign - 1]}
                </text>
                {planets.map((abbr, idx) => {
                  const deg = planetDegrees?.[abbr];
                  const showDeg = showDegrees && deg != null;
                  const cols = showDeg ? 1 : 2;
                  const rowIdx = Math.floor(idx / cols);
                  const colIdx = idx % cols;
                  const px = pos.x + 14 + colIdx * (showDeg ? 0 : 48);
                  const rowGap = showDeg ? 16 : 20;
                  const py = pos.y + (showDeg ? 62 : 70) + rowIdx * rowGap;
                  const tag = statusTag(planetStatus?.[abbr]);
                  const mainLabel = showDeg
                    ? `${a.abbr(abbr)} ${formatDegree(deg)}`
                    : a.abbr(abbr);
                  const isSelected = selectedPlanet === abbr;
                  const dimmed = showAspects && selectedPlanet && !isSelected ? 0.4 : 1;
                  const clickable = onSelectPlanet;
                  const fs = showDeg ? 14 : 18;
                  return (
                    <g
                      key={`${sign}-${idx}`}
                      onClick={
                        clickable ? () => onSelectPlanet!(isSelected ? null : abbr) : undefined
                      }
                      style={{ cursor: clickable ? "pointer" : "default" }}
                    >
                      <title>{planetTitle(abbr)}</title>
                      <text
                        x={px}
                        y={py}
                        fontSize={fs}
                        fontWeight={isSelected ? 900 : 600}
                        className="font-serif"
                        style={{ fill: planetColor(abbr) }}
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
        </svg>
      </div>
    </div>
  );
}
