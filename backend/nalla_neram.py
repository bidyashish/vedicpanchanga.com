"""
Nalla Neram - Hora-based auspicious windows minus inauspicious periods.

NallaNeram = SubhaHora - (RahuKalam + Yamagandam + Gulika)

Subha (auspicious) hora planets: Jupiter, Venus, Mercury, Moon.
"""

from datetime import datetime, timedelta

AUSPICIOUS_PLANETS = {"Jupiter", "Venus", "Mercury", "Moon"}
MIN_WINDOW = timedelta(minutes=5)


def _parse(iso: str) -> datetime:
    return datetime.fromisoformat(iso)


def _fmt(dt: datetime) -> str:
    return dt.isoformat()


def _subtract_exclusion(intervals, excl_start, excl_end):
    """Remove [excl_start, excl_end] from every interval in the list."""
    result = []
    for start, end, planet in intervals:
        if end <= excl_start or start >= excl_end:
            result.append((start, end, planet))
        elif excl_start <= start and excl_end >= end:
            pass
        elif excl_start <= start:
            result.append((excl_end, end, planet))
        elif excl_end >= end:
            result.append((start, excl_start, planet))
        else:
            result.append((start, excl_start, planet))
            result.append((excl_end, end, planet))
    return result


def compute_nalla_neram(hora_day, inauspicious_timings):
    """
    Compute Nalla Neram from day hora segments and inauspicious timings.

    Parameters
    ----------
    hora_day : list[dict]
        Day hora segments from compute_hora()["day"]. Each dict has
        name, start (ISO), end (ISO), auspicious (bool).
    inauspicious_timings : dict
        Must contain rahu_kalam, yamaganda, gulika_kalam - each with
        start/end ISO strings, or None.

    Returns
    -------
    list[dict]
        Auspicious windows: [{start, end, planet}, ...] sorted by start.
    """
    if not hora_day:
        return []

    intervals = [
        (_parse(seg["start"]), _parse(seg["end"]), seg["name"])
        for seg in hora_day
        if seg.get("name") in AUSPICIOUS_PLANETS
    ]

    for key in ("rahu_kalam", "yamaganda", "gulika_kalam"):
        period = inauspicious_timings.get(key)
        if not period or not period.get("start") or not period.get("end"):
            continue
        intervals = _subtract_exclusion(
            intervals, _parse(period["start"]), _parse(period["end"])
        )

    intervals.sort(key=lambda x: x[0])
    return [
        {"start": _fmt(s), "end": _fmt(e), "planet": p}
        for s, e, p in intervals
        if (e - s) >= MIN_WINDOW
    ]
