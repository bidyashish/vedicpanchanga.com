import type { HouseMap } from "@/types/api";
import { planetColor, planetTitle, SIGN_SHORT } from "@/lib/planets";

const CELL_POSITIONS: Record<number, { x: number; y: number }> = {
  12: { x: 0,   y: 0   },
  1:  { x: 125, y: 0   },
  2:  { x: 250, y: 0   },
  3:  { x: 375, y: 0   },
  4:  { x: 375, y: 125 },
  5:  { x: 375, y: 250 },
  6:  { x: 375, y: 375 },
  7:  { x: 250, y: 375 },
  8:  { x: 125, y: 375 },
  9:  { x: 0,   y: 375 },
  10: { x: 0,   y: 250 },
  11: { x: 0,   y: 125 },
};

interface Props {
  houseMap?: HouseMap;
  ascSign: number;
  title?: string;
  testId?: string;
}

export function SouthIndianChart({ houseMap, ascSign, title, testId }: Props) {
  const signToPlanets: Record<number, string[]> = {};
  for (let h = 1; h <= 12; h++) {
    const sign = ((ascSign - 1 + (h - 1)) % 12) + 1;
    signToPlanets[sign] = (houseMap?.[h] ?? []).filter((p) => p !== "As" && p !== "Lg");
  }

  const CELL = 125;

  return (
    <div className="w-full" data-testid={testId}>
      {title && (
        <h3 className="font-serif text-xl lg:text-2xl text-center text-crimson mb-3 tracking-wide">
          {title}
        </h3>
      )}
      <div className="ornate-frame bg-parchment-50 p-3 sm:p-4 rounded-sm aspect-square w-full max-w-lg mx-auto">
        <svg
          viewBox="0 0 500 500"
          className="kundali-svg w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="0" y="0" width="500" height="500" fill="#FCFAF5" stroke="#993D2E" strokeWidth="2.5" />
          <line x1="0" y1="125" x2="500" y2="125" stroke="#993D2E" strokeWidth="1.5" />
          <line x1="0" y1="375" x2="500" y2="375" stroke="#993D2E" strokeWidth="1.5" />
          <line x1="125" y1="0" x2="125" y2="500" stroke="#993D2E" strokeWidth="1.5" />
          <line x1="375" y1="0" x2="375" y2="500" stroke="#993D2E" strokeWidth="1.5" />
          <line x1="250" y1="0" x2="250" y2="125" stroke="#993D2E" strokeWidth="1.5" />
          <line x1="250" y1="375" x2="250" y2="500" stroke="#993D2E" strokeWidth="1.5" />
          <line x1="0" y1="250" x2="125" y2="250" stroke="#993D2E" strokeWidth="1.5" />
          <line x1="375" y1="250" x2="500" y2="250" stroke="#993D2E" strokeWidth="1.5" />

          <rect x="125" y="125" width="250" height="250" fill="#F4F1E8" stroke="#C5A059" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.8" />
          <text x="250" y="240" textAnchor="middle" fontSize="22" className="font-serif" fill="#C5A059" fontStyle="italic">
            Rāśi Kuṇḍalī
          </text>
          <text x="250" y="270" textAnchor="middle" fontSize="14" className="font-serif" fill="#993D2E" opacity="0.8">
            ॥ दक्षिण भारतीय ॥
          </text>

          {Array.from({ length: 12 }, (_, i) => i + 1).map((sign) => {
            const pos = CELL_POSITIONS[sign];
            const isAscSign = sign === ascSign;
            const planets = signToPlanets[sign] ?? [];
            return (
              <g key={sign} data-testid={`${testId}-cell-${sign}`}>
                {isAscSign && (
                  <>
                    <line x1={pos.x + 8} y1={pos.y + 8} x2={pos.x + 38} y2={pos.y + 38} stroke="#B26329" strokeWidth="2" />
                    <line x1={pos.x + 8} y1={pos.y + 38} x2={pos.x + 38} y2={pos.y + 8} stroke="#B26329" strokeWidth="2" />
                    <text x={pos.x + 62} y={pos.y + 28} fontSize="16" fontWeight="700" className="font-serif" fill="#B26329">
                      Lg
                    </text>
                  </>
                )}
                <text
                  x={pos.x + CELL - 10} y={pos.y + 22}
                  textAnchor="end" fontSize="18" fontWeight="700"
                  className="font-serif" fill="#993D2E" opacity="0.95"
                >
                  {sign}
                </text>
                <text
                  x={pos.x + CELL - 10} y={pos.y + 40}
                  textAnchor="end" fontSize="12"
                  fill="#635647"
                >
                  {SIGN_SHORT[sign - 1]}
                </text>
                {planets.map((abbr, idx) => {
                  const cols = 2;
                  const rowIdx = Math.floor(idx / cols);
                  const colIdx = idx % cols;
                  const px = pos.x + 28 + colIdx * 48;
                  const py = pos.y + 70 + rowIdx * 22;
                  return (
                    <g key={`${sign}-${idx}`}>
                      <title>{planetTitle(abbr)}</title>
                      <text
                        x={px} y={py}
                        fontSize="18" fontWeight="600"
                        className="font-serif"
                        fill={planetColor(abbr)}
                      >
                        {abbr}
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
