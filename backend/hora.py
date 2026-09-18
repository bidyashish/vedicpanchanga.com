"""Hora timing — every hour of the day is ruled by one of the 7 visible
planets. The first hora of the day is the planet that rules the weekday;
each subsequent hora moves through the fixed Chaldean cycle below.

Cycle (forward): Sun → Venus → Mercury → Moon → Saturn → Jupiter → Mars → …

Day = sunrise → sunset divided into 12 equal segments ("day horas").
Night = sunset → next-sunrise divided into 12 equal segments ("night horas").
The 7-planet cycle continues uninterrupted across the day/night boundary.

Categorisation (per the feature spec):
* Auspicious: Jupiter, Venus, Mercury, Moon
* Inauspicious: Saturn, Mars, Sun
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytz


# Forward Chaldean cycle used for all hora rotations.
HORA_CYCLE: List[str] = [
    "Sun",
    "Venus",
    "Mercury",
    "Moon",
    "Saturn",
    "Jupiter",
    "Mars",
]

AUSPICIOUS: set[str] = {"Jupiter", "Venus", "Mercury", "Moon"}

# Index in HORA_CYCLE of the planet that rules the *first* day hora, keyed by
# ISO weekday (1 = Monday … 7 = Sunday). The day-lord *is* the first-hora
# lord — this is the universally agreed rule.
HORA_DAY_START: Dict[int, int] = {
    1: 3,  # Mon → Moon
    2: 6,  # Tue → Mars
    3: 2,  # Wed → Mercury
    4: 5,  # Thu → Jupiter
    5: 1,  # Fri → Venus
    6: 4,  # Sat → Saturn
    7: 0,  # Sun → Sun
}


def _segments(
    start: datetime,
    end: datetime,
    start_index: int,
    n: int = 12,
) -> List[Dict[str, Any]]:
    """Cut [start, end] into `n` equal segments and label each with the next
    planet in HORA_CYCLE, walking forward from `start_index`."""
    if end <= start:
        return []
    span = (end - start) / n
    out: List[Dict[str, Any]] = []
    for i in range(n):
        seg_start = start + span * i
        seg_end = start + span * (i + 1)
        planet = HORA_CYCLE[(start_index + i) % len(HORA_CYCLE)]
        out.append(
            {
                "name": planet,
                "start": seg_start.isoformat(),
                "end": seg_end.isoformat(),
                "auspicious": planet in AUSPICIOUS,
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


def compute_hora(
    sunrise_iso: Optional[str],
    sunset_iso: Optional[str],
    next_sunrise_iso: Optional[str],
    weekday_iso: int,
    timezone_name: str,
) -> Dict[str, Any]:
    """Build the day + night hora tables.

    The 7-planet cycle continues seamlessly across the day/night boundary,
    so the night's first-hora index is the day's start advanced by 12
    positions in the cycle (12 mod 7 = 5).

    Returns ``{"day": [12 segments], "night": [12 segments]}``. Each
    segment is ``{name (planet), start, end, auspicious}``.
    """
    tz = pytz.timezone(timezone_name)
    sunrise = _parse(sunrise_iso, tz)
    sunset = _parse(sunset_iso, tz)
    next_sunrise = _parse(next_sunrise_iso, tz)

    if sunset and not next_sunrise:
        next_sunrise = sunset + timedelta(hours=12)

    day_start = HORA_DAY_START[weekday_iso]
    night_start = (day_start + 12) % len(HORA_CYCLE)

    day_segments: List[Dict[str, Any]] = []
    night_segments: List[Dict[str, Any]] = []
    if sunrise and sunset:
        day_segments = _segments(sunrise, sunset, day_start)
    if sunset and next_sunrise:
        night_segments = _segments(sunset, next_sunrise, night_start)

    return {"day": day_segments, "night": night_segments}
