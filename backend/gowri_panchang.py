"""Gowri Panchangam (Nalla Neram) — used in Tamil/Telugu traditions.

Splits the day (sunrise → sunset) and the night (sunset → next sunrise) into
8 equal segments each, and labels every segment with one of the 8 Gowri
names plus an auspicious/inauspicious tag.

The 8-name cycle and auspicious set come from the standard Tamil/Telugu
table:

    Soram (Inauspicious)  →  Uthi (Auspicious)
    Visham (Inauspicious) →  Amridha (Auspicious)
    Rogam (Inauspicious)  →  Labam (Auspicious)
    Dhanam (Auspicious)   →  Sugam (Auspicious)

The starting Gowri for the day rotates by weekday — that's the one part of
the table that varies between regional traditions. The mapping below
matches the standard Drik-Panchangam / Prokerala convention. If your
reference uses a different rotation, change `GOWRI_DAY_START` /
`GOWRI_NIGHT_START` only — every other piece of the algorithm is
data-driven off these tables.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytz


# Cyclic order. Index 0 = Soram, walks forward through the table.
GOWRI_NAMES: List[str] = [
    "Soram",
    "Uthi",
    "Visham",
    "Amridha",
    "Rogam",
    "Labam",
    "Dhanam",
    "Sugam",
]

AUSPICIOUS: set[str] = {"Amridha", "Sugam", "Labam", "Dhanam", "Uthi"}

# Where the day's first Gowri sits in GOWRI_NAMES, keyed by ISO weekday
# (1 = Monday … 7 = Sunday). Standard Tamil/Telugu rotation:
#   Sun → Uthi · Mon → Amridha · Tue → Rogam · Wed → Labam
#   Thu → Sugam · Fri → Visham · Sat → Soram
GOWRI_DAY_START: Dict[int, int] = {
    1: 3,  # Mon → Amridha
    2: 4,  # Tue → Rogam
    3: 5,  # Wed → Labam
    4: 7,  # Thu → Sugam
    5: 2,  # Fri → Visham
    6: 0,  # Sat → Soram
    7: 1,  # Sun → Uthi
}

# Night rotation. Convention: each weekday's night starts 5 segments after
# its day-start (the "5th-from-lord" rule used in Drik-Panchangam tables).
GOWRI_NIGHT_START: Dict[int, int] = {
    k: (v + 5) % len(GOWRI_NAMES) for k, v in GOWRI_DAY_START.items()
}


def _segments(
    start: datetime,
    end: datetime,
    start_index: int,
    n: int = 8,
) -> List[Dict[str, Any]]:
    """Cut [start, end] into `n` equal segments and label them, walking
    forward through GOWRI_NAMES from `start_index`."""
    if end <= start:
        return []
    span = (end - start) / n
    out: List[Dict[str, Any]] = []
    for i in range(n):
        seg_start = start + span * i
        seg_end = start + span * (i + 1)
        name = GOWRI_NAMES[(start_index + i) % len(GOWRI_NAMES)]
        out.append(
            {
                "name": name,
                "start": seg_start.isoformat(),
                "end": seg_end.isoformat(),
                "auspicious": name in AUSPICIOUS,
            }
        )
    return out


def _parse(iso: Optional[str], tz: pytz.BaseTzInfo) -> Optional[datetime]:
    if not iso:
        return None
    dt = datetime.fromisoformat(iso)
    if dt.tzinfo is None:
        dt = tz.localize(dt)
    return dt


def compute_gowri_panchang(
    sunrise_iso: Optional[str],
    sunset_iso: Optional[str],
    next_sunrise_iso: Optional[str],
    weekday_iso: int,
    timezone_name: str,
) -> Dict[str, Any]:
    """Build the day + night Gowri tables.

    Args:
        sunrise_iso: ISO timestamp at the local sunrise.
        sunset_iso: ISO timestamp at the local sunset.
        next_sunrise_iso: ISO timestamp at the *next* day's sunrise.
        weekday_iso: ISO weekday (1=Mon … 7=Sun) of the local sunrise.
        timezone_name: IANA tz used to localize naive ISO strings.

    Returns:
        ``{"day": [8 segments], "night": [8 segments]}``. Each segment is
        ``{name, start, end, auspicious}``. Empty lists if rise/set are
        unavailable for the location/date (polar circles).
    """
    tz = pytz.timezone(timezone_name)
    sunrise = _parse(sunrise_iso, tz)
    sunset = _parse(sunset_iso, tz)
    next_sunrise = _parse(next_sunrise_iso, tz)

    # Fall back to a conventional 12 h night if the next sunrise is missing.
    if sunset and not next_sunrise:
        next_sunrise = sunset + timedelta(hours=12)

    day_segments: List[Dict[str, Any]] = []
    night_segments: List[Dict[str, Any]] = []

    if sunrise and sunset:
        day_segments = _segments(sunrise, sunset, GOWRI_DAY_START[weekday_iso])
    if sunset and next_sunrise:
        night_segments = _segments(sunset, next_sunrise, GOWRI_NIGHT_START[weekday_iso])

    return {"day": day_segments, "night": night_segments}
