import React from "react";

/**
 * North Indian Kundali (Diamond-style) Chart.
 *
 * Layout of 12 houses inside a 400x400 box:
 *
 *     +---------------+
 *     |\    H12 /|\  H2   /|
 *     | \      / | \      / |
 *     |H11  H1   |   H3   |
 *     |  \   /  \|/  \  /  |
 *     |   \ /----X----\ /   |
 *     |   H10   H4|   H4    |
 *     |...............|
 *
 * We define house centroids manually (proven layout).
 * Sign IDs (1-12) are rotated so that `asc_sign` occupies House 1 (top-center diamond).
 *
 * House polygon centroid coordinates (in 400x400 viewBox). House 1 top, moving anti-clockwise
 * as per standard North Indian convention: 1 (top), 2 (top-left), 3 (left-top), 4 (left),
 * 5 (left-bottom), 6 (bottom-left), 7 (bottom), 8 (bottom-right), 9 (right-bottom),
 * 10 (right), 11 (right-top), 12 (top-right).
 */

const HOUSE_CENTROIDS = {
    1:  { x: 200, y: 100 },
    2:  { x: 100, y: 50  },
    3:  { x: 50,  y: 100 },
    4:  { x: 100, y: 200 },
    5:  { x: 50,  y: 300 },
    6:  { x: 100, y: 350 },
    7:  { x: 200, y: 300 },
    8:  { x: 300, y: 350 },
    9:  { x: 350, y: 300 },
    10: { x: 300, y: 200 },
    11: { x: 350, y: 100 },
    12: { x: 300, y: 50  },
};

// Rashi NUMBER label positions (placed near the intersection of two inner triangles of each house)
// These positions are chosen to be at the "tip" of each house diamond, distinct from planet text.
const SIGN_LABEL_POSITIONS = {
    1:  { x: 200, y: 34,  anchor: "middle" },
    2:  { x: 68,  y: 18,  anchor: "start"  },
    3:  { x: 24,  y: 68,  anchor: "start"  },
    4:  { x: 34,  y: 200, anchor: "start"  },
    5:  { x: 24,  y: 332, anchor: "start"  },
    6:  { x: 68,  y: 382, anchor: "start"  },
    7:  { x: 200, y: 366, anchor: "middle" },
    8:  { x: 332, y: 382, anchor: "end"    },
    9:  { x: 376, y: 332, anchor: "end"    },
    10: { x: 366, y: 200, anchor: "end"    },
    11: { x: 376, y: 68,  anchor: "end"    },
    12: { x: 332, y: 18,  anchor: "end"    },
};

const SIGN_SHORT = [
    "Ar", "Ta", "Ge", "Cn", "Le", "Vi",
    "Li", "Sc", "Sg", "Cp", "Aq", "Pi",
];

export default function VedicChart({ houseMap, ascSign, title, testId }) {
    // houseMap: { 1: ['Mo','Su'], 2: [...], ... 12: [...] }
    // Sign for each house = ((ascSign - 1 + (house - 1)) % 12) + 1
    const signForHouse = (h) => ((ascSign - 1 + (h - 1)) % 12) + 1;

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
                    <rect
                        x="0" y="0" width="400" height="400"
                        fill="#FCFAF5"
                        stroke="#8B1E0F"
                        strokeWidth="2.5"
                    />
                    {/* Diagonals (the X) */}
                    <line x1="0" y1="0" x2="400" y2="400" stroke="#8B1E0F" strokeWidth="1.5" />
                    <line x1="400" y1="0" x2="0" y2="400" stroke="#8B1E0F" strokeWidth="1.5" />
                    {/* Inner diamond */}
                    <polygon
                        points="200,0 400,200 200,400 0,200"
                        fill="none"
                        stroke="#8B1E0F"
                        strokeWidth="1.5"
                    />
                    {/* Decorative inner thin diamond (gold) */}
                    <polygon
                        points="200,20 380,200 200,380 20,200"
                        fill="none"
                        stroke="#C5A059"
                        strokeWidth="0.5"
                        strokeDasharray="3 3"
                        opacity="0.45"
                    />

                    {/* Render house number, sign abbr, and planets */}
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                        const c = HOUSE_CENTROIDS[h];
                        const sign = signForHouse(h);
                        const planets = houseMap?.[h] || [];
                        const labelPos = SIGN_LABEL_POSITIONS[h];
                        return (
                            <g key={h} data-testid={`${testId}-house-${h}`}>
                                {/* Rashi number (prominent, in house corner) */}
                                <text
                                    x={labelPos.x}
                                    y={labelPos.y}
                                    textAnchor={labelPos.anchor}
                                    dominantBaseline="middle"
                                    className="font-serif"
                                    fontSize="18"
                                    fontWeight="700"
                                    fill="#8B1E0F"
                                    opacity="0.9"
                                >
                                    {sign}
                                </text>
                                {/* Planet abbreviations in house */}
                                {planets.map((abbr, idx) => {
                                    const cols = Math.min(planets.length, 3);
                                    const rowIdx = Math.floor(idx / cols);
                                    const colIdx = idx % cols;
                                    const xOffset = (colIdx - (cols - 1) / 2) * 26;
                                    const yOffset = rowIdx * 20;
                                    const isAsc = abbr === "As";
                                    return (
                                        <text
                                            key={`${h}-${idx}`}
                                            x={c.x + xOffset}
                                            y={c.y + yOffset + 2}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="font-serif"
                                            fontSize="17"
                                            fontWeight="600"
                                            fill={isAsc ? "#D35400" : "#2C241B"}
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
