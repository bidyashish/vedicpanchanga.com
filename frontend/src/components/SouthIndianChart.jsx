import React from "react";

/**
 * South Indian Kundali chart.
 *
 * Layout: 4x4 grid, center 2x2 blank. Rashis are FIXED around the border.
 * Reading clockwise from top-left:
 *   Pisces(12), Aries(1), Taurus(2), Gemini(3),
 *   Cancer(4) [right col row 2], Leo(5) [right col row 3],
 *   Virgo(6), Libra(7), Scorpio(8), Sagittarius(9),
 *   Capricorn(10) [left col row 3], Aquarius(11) [left col row 2].
 */

// Grid cell positions in a 400x400 viewBox. Each cell is 100x100.
// Returns {x, y} of cell top-left.
const CELL_POSITIONS = {
    12: { x: 0,   y: 0   },  // top-left
    1:  { x: 100, y: 0   },  // top row 2
    2:  { x: 200, y: 0   },  // top row 3
    3:  { x: 300, y: 0   },  // top-right
    4:  { x: 300, y: 100 },  // right col row 2
    5:  { x: 300, y: 200 },  // right col row 3
    6:  { x: 300, y: 300 },  // bottom-right
    7:  { x: 200, y: 300 },  // bottom row 3
    8:  { x: 100, y: 300 },  // bottom row 2
    9:  { x: 0,   y: 300 },  // bottom-left
    10: { x: 0,   y: 200 },  // left col row 3
    11: { x: 0,   y: 100 },  // left col row 2
};

const RASHI_SHORT = ["Ar","Ta","Ge","Cn","Le","Vi","Li","Sc","Sg","Cp","Aq","Pi"];

export default function SouthIndianChart({ houseMap, ascSign, title, testId }) {
    // Convert houseMap to signToPlanets using signForHouse formula
    const signToPlanets = {};
    for (let h = 1; h <= 12; h++) {
        const sign = ((ascSign - 1 + (h - 1)) % 12) + 1;
        const planets = (houseMap?.[h] || []).filter((p) => p !== "As");
        signToPlanets[sign] = planets;
    }

    const CELL = 100;

    return (
        <div className="w-full" data-testid={testId}>
            {title && (
                <h3 className="font-serif text-xl text-center text-[#8B1E0F] mb-3 tracking-wide">
                    {title}
                </h3>
            )}
            <div className="ornate-frame bg-[#FCFAF5] p-3 rounded-sm aspect-square w-full max-w-md mx-auto">
                <svg
                    viewBox="0 0 400 400"
                    className="kundali-svg w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Outer square */}
                    <rect x="0" y="0" width="400" height="400"
                          fill="#FCFAF5" stroke="#8B1E0F" strokeWidth="2.5" />

                    {/* Inner 2x2 blank frame: draw the 12 cell borders by drawing
                        horizontal + vertical dividing lines on outer ring */}
                    {/* Horizontal dividers for rows 1-2 and 3-4 */}
                    <line x1="0" y1="100" x2="400" y2="100" stroke="#8B1E0F" strokeWidth="1.5" />
                    <line x1="0" y1="300" x2="400" y2="300" stroke="#8B1E0F" strokeWidth="1.5" />
                    {/* Vertical dividers for cols 1-2 and 3-4 */}
                    <line x1="100" y1="0" x2="100" y2="400" stroke="#8B1E0F" strokeWidth="1.5" />
                    <line x1="300" y1="0" x2="300" y2="400" stroke="#8B1E0F" strokeWidth="1.5" />
                    {/* Horizontal ticks within top+bottom rows (only break at cols 2-3 for cells) */}
                    <line x1="200" y1="0" x2="200" y2="100" stroke="#8B1E0F" strokeWidth="1.5" />
                    <line x1="200" y1="300" x2="200" y2="400" stroke="#8B1E0F" strokeWidth="1.5" />
                    {/* Vertical ticks within left+right cols (break at rows 2-3) */}
                    <line x1="0" y1="200" x2="100" y2="200" stroke="#8B1E0F" strokeWidth="1.5" />
                    <line x1="300" y1="200" x2="400" y2="200" stroke="#8B1E0F" strokeWidth="1.5" />

                    {/* Center blank - light ornamental fill */}
                    <rect x="100" y="100" width="200" height="200"
                          fill="#F4F1E8" stroke="#C5A059" strokeWidth="0.75"
                          strokeDasharray="3 3" opacity="0.8" />
                    <text x="200" y="195" textAnchor="middle" fontSize="18"
                          className="font-serif" fill="#C5A059" fontStyle="italic">
                        Rāśi Kuṇḍalī
                    </text>
                    <text x="200" y="218" textAnchor="middle" fontSize="12"
                          className="font-serif" fill="#8B1E0F" opacity="0.8">
                        ॥ दक्षिण भारतीय ॥
                    </text>

                    {/* Render each rashi cell */}
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((sign) => {
                        const pos = CELL_POSITIONS[sign];
                        const isAscSign = sign === ascSign;
                        const planets = signToPlanets[sign] || [];
                        return (
                            <g key={sign} data-testid={`${testId}-cell-${sign}`}>
                                {isAscSign && (
                                    <>
                                        {/* Diagonal line to mark ascendant cell */}
                                        <line
                                            x1={pos.x + 6} y1={pos.y + 6}
                                            x2={pos.x + 30} y2={pos.y + 30}
                                            stroke="#D35400" strokeWidth="2"
                                        />
                                        <line
                                            x1={pos.x + 6} y1={pos.y + 30}
                                            x2={pos.x + 30} y2={pos.y + 6}
                                            stroke="#D35400" strokeWidth="2"
                                        />
                                        {/* "Lg" label */}
                                        <text
                                            x={pos.x + 54} y={pos.y + 22}
                                            fontSize="13" fontWeight="700"
                                            className="font-serif" fill="#D35400"
                                        >
                                            Lg
                                        </text>
                                    </>
                                )}
                                {/* Rashi number */}
                                <text
                                    x={pos.x + CELL - 8} y={pos.y + 18}
                                    textAnchor="end" fontSize="16" fontWeight="700"
                                    className="font-serif" fill="#8B1E0F" opacity="0.9"
                                >
                                    {sign}
                                </text>
                                {/* Rashi short name */}
                                <text
                                    x={pos.x + CELL - 8} y={pos.y + 34}
                                    textAnchor="end" fontSize="10"
                                    className="font-sans" fill="#635647"
                                >
                                    {RASHI_SHORT[sign - 1]}
                                </text>
                                {/* Planet abbreviations */}
                                {planets.map((abbr, idx) => {
                                    const cols = 2;
                                    const rowIdx = Math.floor(idx / cols);
                                    const colIdx = idx % cols;
                                    const px = pos.x + 20 + colIdx * 40;
                                    const py = pos.y + 58 + rowIdx * 18;
                                    return (
                                        <text
                                            key={`${sign}-${idx}`}
                                            x={px} y={py}
                                            fontSize="15" fontWeight="600"
                                            className="font-serif" fill="#2C241B"
                                        >
                                            {abbr}
                                        </text>
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
