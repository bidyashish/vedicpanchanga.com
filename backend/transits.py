"""Planetary transit events across a date range.

Three event types are emitted, all in sidereal coordinates with the Lahiri
ayanamsa (matching the rest of the chart pipeline):

- sign_ingress      planet crosses a 30 deg rashi boundary
- nakshatra_ingress planet crosses a 13 deg 20 min nakshatra boundary
- retrograde        planet's longitudinal speed turns negative (D -> R station)
- direct            planet's longitudinal speed turns positive (R -> D station)

For each planet we sample daily (6h for the Moon when enabled) and, whenever a
discrete state changes between samples, binary-search the precise instant of
the event to roughly one minute. The 28-iteration search halves the interval
each step, so after 28 halvings of a one-day window the resolution is
1 day / 2^28 ~ 0.3 ms - we clamp to one minute precision in the formatted
output.

Rahu uses the mean lunar node (`swe.MEAN_NODE`) to match `calculator.py`. Ketu
is derived as the antipode of Rahu (`+180 deg mod 360`); both keep the mean
node's permanent backwards motion, so neither emits retrograde events.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import pytz
import swisseph as swe
from timezonefinder import TimezoneFinder

from ayanamsa import sidereal_context
from constants import NAKSHATRAS, SIGNS

# Swiss Ephemeris is a process-global - if `transits` is imported before any
# other module that calls `swe.set_ephe_path()`, the library silently falls
# back to the Moshier model and Pluto/Neptune drift by arc-minutes. Pin the
# path here so import order can't degrade precision.
swe.set_ephe_path(str(Path(__file__).parent / "ephe"))

_TF = TimezoneFinder()

_SIDEREAL_FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
_NAK_SPAN = 360.0 / 27

# Planets to scan. The order matches calculator.PLANET_ORDER so the frontend
# can rely on it for stable per-planet filters. (planet_name, abbr, has_retro)
# Ketu is included even though it shares Rahu's underlying ephemeris call -
# the state function adds 180 deg.
PLANET_LIST: List[Tuple[str, str, bool]] = [
    ("Sun", "Su", False),
    ("Moon", "Mo", False),
    ("Mars", "Ma", True),
    ("Mercury", "Me", True),
    ("Jupiter", "Ju", True),
    ("Venus", "Ve", True),
    ("Saturn", "Sa", True),
    ("Rahu", "Ra", False),
    ("Ketu", "Ke", False),
    ("Uranus", "Ur", True),
    ("Neptune", "Ne", True),
    ("Pluto", "Pl", True),
]

_SWE_ID: Dict[str, int] = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE,
    "Ketu": swe.MEAN_NODE,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
}


def _state(jd: float, planet: str) -> Tuple[float, float]:
    """Return (sidereal longitude in 0..360, longitudinal speed) for `planet`
    at the given Julian Day. Ketu is computed as Rahu + 180 deg."""
    xx, _ = swe.calc_ut(jd, _SWE_ID[planet], _SIDEREAL_FLAGS)
    lon = xx[0]
    speed = xx[3]
    if planet == "Ketu":
        lon = (lon + 180.0) % 360.0
    else:
        lon = lon % 360.0
    return lon, speed


def _refine_boundary(
    jd_lo: float, jd_hi: float, planet: str, key: Callable[[float], int]
) -> float:
    """Binary-search the Julian Day where `key(longitude)` changes value.

    Caller has already verified that `key` returns different integers at the
    two endpoints. After 28 iterations the interval is squeezed below a
    millisecond - well below the one-minute formatting precision."""
    lo_val = key(_state(jd_lo, planet)[0])
    for _ in range(28):
        mid = (jd_lo + jd_hi) / 2
        if key(_state(mid, planet)[0]) == lo_val:
            jd_lo = mid
        else:
            jd_hi = mid
    return jd_hi


def _refine_zero_speed(
    jd_lo: float, jd_hi: float, planet: str, lo_speed_positive: bool
) -> float:
    """Binary-search the JD where the longitudinal speed flips sign."""
    for _ in range(28):
        mid = (jd_lo + jd_hi) / 2
        s = _state(mid, planet)[1]
        if (s >= 0) == lo_speed_positive:
            jd_lo = mid
        else:
            jd_hi = mid
    return jd_hi


def _sign_id(lon: float) -> int:
    """Zero-indexed sign id from longitude (0=Aries .. 11=Pisces)."""
    return int(lon // 30) % 12


def _nak_id(lon: float) -> int:
    """Zero-indexed nakshatra id from longitude (0=Ashwini .. 26=Revati)."""
    return int(lon // _NAK_SPAN) % 27


def _jd_to_iso(jd_ut: float, tz: pytz.tzinfo.BaseTzInfo) -> Dict[str, str]:
    """Convert a Julian Day (UT) into both UTC and local-ISO timestamps.

    `swe.revjul` returns (year, month, day, fractional_hour); we unpack the
    fractional hour into HH:MM:SS and clamp seconds back into hours to avoid
    `datetime` rejecting minute=60."""
    y, m, d, h = swe.revjul(jd_ut)
    hour = int(h)
    mfrac = (h - hour) * 60
    minute = int(mfrac)
    sec = int(round((mfrac - minute) * 60))
    if sec == 60:
        sec, minute = 0, minute + 1
    if minute == 60:
        minute, hour = 0, hour + 1
    utc_dt = datetime(int(y), int(m), int(d), hour, minute, sec, tzinfo=timezone.utc)
    local_dt = utc_dt.astimezone(tz)
    return {
        "date_utc": utc_dt.isoformat().replace("+00:00", "Z"),
        "date_local": local_dt.isoformat(),
    }


def _parse_date(s: str) -> datetime:
    """Accept either 'YYYY-MM-DD' or ISO datetime, return naive midnight."""
    if "T" in s:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    y, m, d = s.split("-")
    return datetime(int(y), int(m), int(d))


def compute_transits(
    *,
    start_date: str,
    end_date: str,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str] = None,
    include_signs: bool = True,
    include_nakshatras: bool = True,
    include_retrograde: bool = True,
    include_moon: bool = False,
    moon_nakshatras: bool = False,
) -> Dict[str, Any]:
    """Compute transit events for the given date range.

    Always Lahiri - sidereal_context pins the mode for the whole scan so a
    concurrent /calculate with another ayanamsa cannot shift ingress times.

    Parameters
    ----------
    start_date, end_date : YYYY-MM-DD inclusive bounds (local timezone).
    latitude, longitude : used only to resolve `timezone_name` when omitted.
    timezone_name        : IANA tz string for local-time stamps.
    include_signs        : emit sign-ingress events.
    include_nakshatras   : emit nakshatra-ingress events.
    include_retrograde   : emit retrograde / direct station events.
    include_moon         : include Moon at all (Moon defaults off because its
                           sign cycle is 27 days - 12+ events per month dwarfs
                           every other planet combined).
    moon_nakshatras      : only honoured when include_moon=True; gates the
                           Moon-only nakshatra events (about one per day).
    """
    with sidereal_context("lahiri"):
        return _compute_transits_locked(
            start_date=start_date,
            end_date=end_date,
            latitude=latitude,
            longitude=longitude,
            timezone_name=timezone_name,
            include_signs=include_signs,
            include_nakshatras=include_nakshatras,
            include_retrograde=include_retrograde,
            include_moon=include_moon,
            moon_nakshatras=moon_nakshatras,
        )


def _compute_transits_locked(
    *,
    start_date: str,
    end_date: str,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str],
    include_signs: bool,
    include_nakshatras: bool,
    include_retrograde: bool,
    include_moon: bool,
    moon_nakshatras: bool,
) -> Dict[str, Any]:
    if not timezone_name:
        timezone_name = _TF.timezone_at(lat=latitude, lng=longitude) or "UTC"
    tz = pytz.timezone(timezone_name)

    start_local = tz.localize(_parse_date(start_date))
    end_local = tz.localize(_parse_date(end_date)) + timedelta(days=1)
    start_utc = start_local.astimezone(pytz.utc)
    end_utc = end_local.astimezone(pytz.utc)

    start_jd = swe.julday(
        start_utc.year,
        start_utc.month,
        start_utc.day,
        start_utc.hour + start_utc.minute / 60 + start_utc.second / 3600,
    )
    end_jd = swe.julday(
        end_utc.year,
        end_utc.month,
        end_utc.day,
        end_utc.hour + end_utc.minute / 60 + end_utc.second / 3600,
    )

    events: List[Dict[str, Any]] = []

    for name, abbr, has_retro in PLANET_LIST:
        if name == "Moon" and not include_moon:
            continue
        # Moon needs 6h sampling to never miss a nakshatra crossing; Mercury
        # near a retrograde station also benefits, but a 1-day step suffices
        # because the speed sign change is sticky.
        step = 0.25 if name == "Moon" else 1.0

        jd = start_jd
        prev_lon, prev_speed = _state(jd, name)
        prev_sign = _sign_id(prev_lon)
        prev_nak = _nak_id(prev_lon)
        prev_speed_pos = prev_speed >= 0

        while jd < end_jd:
            next_jd = min(jd + step, end_jd)
            curr_lon, curr_speed = _state(next_jd, name)
            curr_sign = _sign_id(curr_lon)
            curr_nak = _nak_id(curr_lon)
            curr_speed_pos = curr_speed >= 0

            if include_signs and curr_sign != prev_sign:
                jd_event = _refine_boundary(jd, next_jd, name, _sign_id)
                iso = _jd_to_iso(jd_event, tz)
                events.append(
                    {
                        "planet": name,
                        "abbr": abbr,
                        "event_type": "sign_ingress",
                        "from_sign_id": prev_sign + 1,
                        "from_sign": SIGNS[prev_sign],
                        "to_sign_id": curr_sign + 1,
                        "to_sign": SIGNS[curr_sign],
                        **iso,
                    }
                )

            if include_nakshatras and curr_nak != prev_nak:
                # Skip Moon nakshatras unless explicitly requested - even when
                # the Moon is enabled we keep this hidden by default because
                # a 1-year window emits roughly 370 of them.
                if not (name == "Moon" and not moon_nakshatras):
                    jd_event = _refine_boundary(jd, next_jd, name, _nak_id)
                    iso = _jd_to_iso(jd_event, tz)
                    events.append(
                        {
                            "planet": name,
                            "abbr": abbr,
                            "event_type": "nakshatra_ingress",
                            "from_nakshatra_id": prev_nak + 1,
                            "from_nakshatra": NAKSHATRAS[prev_nak],
                            "to_nakshatra_id": curr_nak + 1,
                            "to_nakshatra": NAKSHATRAS[curr_nak],
                            **iso,
                        }
                    )

            if include_retrograde and has_retro and curr_speed_pos != prev_speed_pos:
                jd_event = _refine_zero_speed(jd, next_jd, name, prev_speed_pos)
                iso = _jd_to_iso(jd_event, tz)
                in_lon, _ = _state(jd_event, name)
                in_sign = _sign_id(in_lon)
                in_nak = _nak_id(in_lon)
                events.append(
                    {
                        "planet": name,
                        "abbr": abbr,
                        "event_type": "retrograde" if not curr_speed_pos else "direct",
                        "in_sign_id": in_sign + 1,
                        "in_sign": SIGNS[in_sign],
                        "in_nakshatra_id": in_nak + 1,
                        "in_nakshatra": NAKSHATRAS[in_nak],
                        **iso,
                    }
                )

            prev_lon = curr_lon
            prev_speed = curr_speed
            prev_sign = curr_sign
            prev_nak = curr_nak
            prev_speed_pos = curr_speed_pos
            jd = next_jd

    events.sort(key=lambda e: e["date_utc"])

    return {
        "start_date": start_date,
        "end_date": end_date,
        "timezone": timezone_name,
        "count": len(events),
        "events": events,
    }
