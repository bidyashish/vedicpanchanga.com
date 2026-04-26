"""Sade Sati / Small Panoti transit periods.

Tracks Saturn's sidereal-sign transits relative to the natal Moon over a
configurable horizon (default 120 years from birth), grouping consecutive
days in the same sign into segments. Each segment is classified:

- 12th from Moon  → Sade Sati, Rising phase
- 1st from Moon   → Sade Sati, Peak phase
- 2nd from Moon   → Sade Sati, Setting phase
- 4th from Moon   → Small Panoti (Ardha Ashtama)
- 8th from Moon   → Small Panoti (Ashtama / Kantaka)

Daily stepping is sufficient — Saturn moves <0.15°/day so missing a
mid-day ingress shifts boundaries by at most ~12 hours. We refine each
detected sign-change with a small binary search to get day-precision.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

import swisseph as swe

SIGN_NAMES = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]


def _saturn_sid_long(jd: float) -> float:
    flag = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    pos, _ = swe.calc_ut(jd, swe.SATURN, flag)
    return pos[0] % 360.0


def _sign_at(jd: float) -> int:
    """1..12 sign id for Saturn at jd_ut."""
    return int(_saturn_sid_long(jd) // 30) + 1


def _refine_boundary(jd_lo: float, jd_hi: float, sign_lo: int) -> float:
    """Binary-search the moment Saturn leaves `sign_lo` between jd_lo and jd_hi."""
    for _ in range(20):
        mid = (jd_lo + jd_hi) / 2
        if _sign_at(mid) == sign_lo:
            jd_lo = mid
        else:
            jd_hi = mid
    return jd_hi


def compute_sade_sati(
    *,
    birth_jd_ut: float,
    moon_sign_id: int,
    horizon_years: int = 120,
    step_days: float = 1.0,
) -> List[Dict[str, Any]]:
    """Return a list of relevant Saturn-transit segments classified as
    Sade Sati or Small Panoti.

    Each entry: { kind, phase, sign, sign_id, start, end, house_from_moon }.
    `start` and `end` are ISO date strings (UTC midnight precision).
    """
    end_jd = birth_jd_ut + horizon_years * 365.2422

    segments: List[Dict[str, Any]] = []
    jd = birth_jd_ut
    cur_sign = _sign_at(jd)
    seg_start = jd

    while jd <= end_jd:
        next_jd = jd + step_days
        if next_jd > end_jd:
            next_jd = end_jd
        next_sign = _sign_at(next_jd)
        if next_sign != cur_sign:
            boundary = _refine_boundary(jd, next_jd, cur_sign)
            segments.append(
                {"sign_id": cur_sign, "start_jd": seg_start, "end_jd": boundary}
            )
            seg_start = boundary
            cur_sign = next_sign
        jd = next_jd
        if jd >= end_jd:
            break

    segments.append({"sign_id": cur_sign, "start_jd": seg_start, "end_jd": end_jd})

    # Classify
    out: List[Dict[str, Any]] = []
    for seg in segments:
        house = ((seg["sign_id"] - moon_sign_id) % 12) + 1
        if house == 12:
            kind, phase = "Sade Sati", "Rising"
        elif house == 1:
            kind, phase = "Sade Sati", "Peak"
        elif house == 2:
            kind, phase = "Sade Sati", "Setting"
        elif house == 4:
            kind, phase = "Small Panoti", "Ardha Ashtama"
        elif house == 8:
            kind, phase = "Small Panoti", "Ashtama"
        else:
            continue

        start_dt = swe.revjul(seg["start_jd"])
        end_dt = swe.revjul(seg["end_jd"])
        start_iso = datetime(
            int(start_dt[0]), int(start_dt[1]), int(start_dt[2])
        ).strftime("%Y-%m-%d")
        end_iso = datetime(int(end_dt[0]), int(end_dt[1]), int(end_dt[2])).strftime(
            "%Y-%m-%d"
        )

        out.append(
            {
                "kind": kind,
                "phase": phase,
                "sign_id": seg["sign_id"],
                "sign": SIGN_NAMES[seg["sign_id"] - 1],
                "house_from_moon": house,
                "start": start_iso,
                "end": end_iso,
            }
        )
    return out
