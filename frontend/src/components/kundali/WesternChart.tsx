import type { Planet } from "@/types/api";
import { planetColor, planetTitle } from "@/lib/planets";
import { useAstro } from "@/i18n/astro";
import { OmGlyph } from "@/components/kundali/OmGlyph";

const SIGN_ABBR = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];

const NAKSHATRA_ABBR = [
  "Aśw",
  "Bha",
  "Krt",
  "Roh",
  "Mrg",
  "Ārd",
  "Pun",
  "Puṣ",
  "Āśl",
  "Mag",
  "PPh",
  "UPh",
  "Has",
  "Cit",
  "Swā",
  "Viś",
  "Anu",
  "Jye",
  "Mūl",
  "PĀṣ",
  "UĀṣ",
  "Śra",
  "Dha",
  "Śat",
  "PBh",
  "UBh",
  "Rev",
];

interface Props {
  planets: Planet[];
  ascendant: Planet;
  ascSign: number;
  title?: string;
  testId?: string;
}

const CX = 250;
const CY = 250;

const R_OUTER = 240;
const R_SIGN_INNER = 215;
const R_NAK_INNER = 175;
const R_PLANET_TICK_OUT = 175;
const R_PLANET_TICK_IN = 165;
const R_PLANET_LABEL = 150;
const R_HOUSE_NUM = 70;

// Aries CENTER (longitude 15) sits at SVG -90deg (top of circle), matching
// the conventional sayan layout where the sign sectors are at the cardinal
// points and the sign-division spokes fall on the inter-cardinals.
function svgRad(longitude: number): number {
  return ((-longitude - 75) * Math.PI) / 180;
}

function pointAt(longitude: number, r: number): { x: number; y: number } {
  const a = svgRad(longitude);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function tangentRotation(longitude: number): number {
  return -longitude - 75 + 90;
}

// Spread overlapping labels apart, but never let an adjusted longitude
// cross out of the sign that the planet actually occupies - otherwise the
// label visually drifts into the next house.
function spreadOverlaps(longs: number[], minGap = 4): number[] {
  const indexed = longs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const adjusted = indexed.map((p) => p.v);
  const signOf = (lng: number) => Math.floor(lng / 30);
  const clampToSign = (orig: number, next: number): number => {
    const sign = signOf(orig);
    const lo = sign * 30 + 1;
    const hi = sign * 30 + 29;
    return Math.min(hi, Math.max(lo, next));
  };
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let k = 0; k < adjusted.length; k++) {
      const next = (k + 1) % adjusted.length;
      let diff = adjusted[next] - adjusted[k];
      if (next === 0) diff += 360;
      if (diff < minGap) {
        const push = (minGap - diff) / 2;
        const newK = clampToSign(indexed[k].v, adjusted[k] - push);
        const newNext = clampToSign(indexed[next].v, adjusted[next] + push);
        if (newK !== adjusted[k] || newNext !== adjusted[next]) moved = true;
        adjusted[k] = newK;
        adjusted[next] = newNext;
      }
    }
    if (!moved) break;
  }
  const out = Array.from({ length: longs.length }, () => 0);
  indexed.forEach((p, k) => {
    out[p.i] = adjusted[k];
  });
  return out;
}

export function WesternChart({ planets, ascendant, ascSign, title, testId }: Props) {
  const a = useAstro();
  const lineCol = "var(--ink-soft)";
  const surfaceCol = "var(--surface)";
  const innerSurface = "var(--surface-soft)";
  const ascCol = "var(--primary)";

  const all = [...planets, ascendant];
  const labelLongs = spreadOverlaps(all.map((p) => p.longitude));

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
          <rect x="0" y="0" width="500" height="500" fill={surfaceCol} />
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER}
            fill={innerSurface}
            stroke={lineCol}
            strokeWidth="1.5"
          />
          <circle cx={CX} cy={CY} r={R_SIGN_INNER} fill="none" stroke={lineCol} strokeWidth="1" />
          <circle
            cx={CX}
            cy={CY}
            r={R_NAK_INNER}
            fill={surfaceCol}
            stroke={lineCol}
            strokeWidth="1.2"
          />

          {Array.from({ length: 12 }, (_, i) => {
            const long = i * 30;
            const inner = pointAt(long, R_NAK_INNER);
            const outer = pointAt(long, R_OUTER);
            return (
              <line
                key={`sign-div-${i}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={lineCol}
                strokeWidth="1"
              />
            );
          })}

          {Array.from({ length: 27 }, (_, i) => {
            if (i % 9 === 0) return null;
            const long = i * (360 / 27);
            const inner = pointAt(long, R_NAK_INNER);
            const outer = pointAt(long, R_SIGN_INNER);
            return (
              <line
                key={`nak-div-${i}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={lineCol}
                strokeWidth="0.5"
                opacity="0.76"
              />
            );
          })}

          {Array.from({ length: 360 }, (_, i) => {
            const long = i;
            const tickLen = i % 5 === 0 ? 4 : 2;
            const a = pointAt(long, R_NAK_INNER);
            const b = pointAt(long, R_NAK_INNER + tickLen);
            return (
              <line
                key={`deg-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={lineCol}
                strokeWidth={i % 5 === 0 ? 0.7 : 0.4}
                opacity="0.6"
              />
            );
          })}

          {SIGN_ABBR.map((abbr, i) => {
            const long = i * 30 + 15;
            const r = (R_OUTER + R_SIGN_INNER) / 2;
            const p = pointAt(long, r);
            return (
              <text
                key={`sign-${i}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="14"
                fontWeight="700"
                className="font-serif"
                fill="var(--ink)"
                transform={`rotate(${tangentRotation(long)} ${p.x} ${p.y})`}
              >
                {abbr}
              </text>
            );
          })}

          {NAKSHATRA_ABBR.map((abbr, i) => {
            const long = (i + 0.5) * (360 / 27);
            const r = (R_SIGN_INNER + R_NAK_INNER) / 2;
            const p = pointAt(long, r);
            return (
              <text
                key={`nak-${i}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                className="font-serif"
                fill="var(--ink-soft)"
                transform={`rotate(${tangentRotation(long)} ${p.x} ${p.y})`}
              >
                {`${a.num(i + 1)} ${abbr}`}
              </text>
            );
          })}

          {Array.from({ length: 12 }, (_, i) => {
            const long = i * 30;
            const inner = { x: CX, y: CY };
            const outer = pointAt(long, R_NAK_INNER);
            return (
              <line
                key={`spoke-${i}`}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={lineCol}
                strokeWidth="0.5"
                strokeDasharray="3 3"
                opacity="0.45"
              />
            );
          })}

          {Array.from({ length: 12 }, (_, i) => {
            const houseNum = i + 1;
            const signIdx = (ascSign - 1 + i) % 12;
            const long = signIdx * 30 + 15;
            const p = pointAt(long, R_HOUSE_NUM);
            return (
              <text
                key={`house-${i}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="14"
                className="font-serif"
                fill="var(--ink-soft)"
              >
                {a.num(houseNum)}
              </text>
            );
          })}

          <OmGlyph cx={CX} cy={CY} size={70} color="var(--primary)" opacity={1} />

          {all.map((planet, idx) => {
            const trueLong = planet.longitude;
            const labelLong = labelLongs[idx];
            const tickOut = pointAt(trueLong, R_PLANET_TICK_OUT);
            const tickIn = pointAt(trueLong, R_PLANET_TICK_IN);
            const labelPos = pointAt(labelLong, R_PLANET_LABEL);
            const isAsc = planet.abbr === "As" || planet.abbr === "Lg";
            const color = isAsc ? ascCol : planetColor(planet.abbr);
            return (
              <g key={`planet-${idx}`} data-testid={`${testId}-planet-${planet.abbr}`}>
                <title>{`${planetTitle(planet.abbr)} · ${planet.dms} ${planet.sign}`}</title>
                <line
                  x1={tickOut.x}
                  y1={tickOut.y}
                  x2={tickIn.x}
                  y2={tickIn.y}
                  stroke={color}
                  strokeWidth="2"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="14"
                  fontWeight={isAsc ? 800 : 700}
                  className="font-serif"
                  fill={color}
                  transform={`rotate(${tangentRotation(labelLong)} ${labelPos.x} ${labelPos.y})`}
                >
                  {planet.abbr}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
