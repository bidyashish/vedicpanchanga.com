"""Drik-style Panchang calculations."""
from __future__ import annotations

from datetime import datetime, timedelta, date as date_cls
from typing import Dict, Any, Optional

import pytz
import swisseph as swe
from timezonefinder import TimezoneFinder

from constants import (
    NAKSHATRAS, YOGAS, SIGNS,
    tithi_name, karana_name,
    VARA_NAMES, VARA_ENGLISH,
    RAHU_KAAL_SEGMENT, YAMAGANDA_SEGMENT, GULIKA_SEGMENT,
)

_TF = TimezoneFinder()

NAKSHATRA_SPAN = 360.0 / 27  # 13°20'


def _jd_to_local_iso(jd_ut: float, tz: pytz.BaseTzInfo) -> Optional[str]:
    """Convert JD in UT to local-time ISO string."""
    if jd_ut is None or jd_ut <= 0:
        return None
    y, m, d, h = swe.revjul(jd_ut)
    hour = int(h)
    minute_full = (h - hour) * 60
    minute = int(minute_full)
    second = int(round((minute_full - minute) * 60))
    if second == 60:
        second = 0
        minute += 1
    if minute == 60:
        minute = 0
        hour += 1
    dt_utc = datetime(y, m, d, hour % 24, minute, second, tzinfo=pytz.utc)
    if hour >= 24:
        dt_utc += timedelta(days=1)
    local = dt_utc.astimezone(tz)
    return local.isoformat()


def _rise_trans(jd_start: float, body: int, geopos, which: int) -> Optional[float]:
    """Return JD of event or None if not found."""
    try:
        res, tret = swe.rise_trans(jd_start, body, which | swe.BIT_DISC_CENTER, geopos)
        if res == 0:
            return tret[0]
    except Exception:
        pass
    return None


def compute_panchang(
    target_date: str,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute the Drik Panchang for a given local date.

    target_date: 'YYYY-MM-DD' (local date)
    """
    if not timezone_name:
        timezone_name = _TF.timezone_at(lat=latitude, lng=longitude) or "UTC"
    tz = pytz.timezone(timezone_name)

    y, mo, d = [int(x) for x in target_date.split("-")]
    local_date = date_cls(y, mo, d)

    # Start JD at local midnight converted to UT to search for events from that moment onward
    local_midnight = tz.localize(datetime(y, mo, d, 0, 0))
    utc_midnight = local_midnight.astimezone(pytz.utc)
    jd_start = swe.julday(
        utc_midnight.year, utc_midnight.month, utc_midnight.day,
        utc_midnight.hour + utc_midnight.minute / 60,
    )

    geopos = (longitude, latitude, 0)

    # Sun rise & set for target local date
    sunrise_jd = _rise_trans(jd_start, swe.SUN, geopos, swe.CALC_RISE)
    sunset_jd = _rise_trans(jd_start, swe.SUN, geopos, swe.CALC_SET)
    # Ensure sunset is after sunrise; if not, search forward
    if sunrise_jd and sunset_jd and sunset_jd < sunrise_jd:
        sunset_jd = _rise_trans(sunrise_jd, swe.SUN, geopos, swe.CALC_SET)

    # Moon rise / set (any within ~36h window)
    moonrise_jd = _rise_trans(jd_start, swe.MOON, geopos, swe.CALC_RISE)
    moonset_jd = _rise_trans(jd_start, swe.MOON, geopos, swe.CALC_SET)

    # Day duration (Dinaman) in hours
    dinaman_hours = None
    if sunrise_jd and sunset_jd:
        dinaman_hours = (sunset_jd - sunrise_jd) * 24.0

    # Panchang angles are computed AT SUNRISE (Drik style - display "prevailing" at sunrise)
    ref_jd = sunrise_jd if sunrise_jd else jd_start

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SWIEPH
    sun_sid = swe.calc_ut(ref_jd, swe.SUN, flags)[0][0] % 360
    moon_sid = swe.calc_ut(ref_jd, swe.MOON, flags)[0][0] % 360

    # === Tithi ===
    diff = (moon_sid - sun_sid) % 360
    tithi_idx = int(diff // 12) + 1  # 1-30
    tithi_progress = (diff % 12) / 12  # 0-1 within current tithi
    # End time of current tithi: find JD when diff reaches next boundary
    next_tithi_end_deg = tithi_idx * 12  # degrees of diff
    tithi_end_jd = _find_angle_time(ref_jd, next_tithi_end_deg, angle_type="tithi", max_days=1.5)

    # === Karana (half-tithi) ===
    half_idx = int(diff // 6)  # 0..59
    next_karana_end_deg = (half_idx + 1) * 6
    karana_end_jd = _find_angle_time(ref_jd, next_karana_end_deg, angle_type="tithi", max_days=1.0)

    # === Nakshatra ===
    nak_idx = int(moon_sid // NAKSHATRA_SPAN)  # 0-26
    pada = int((moon_sid - nak_idx * NAKSHATRA_SPAN) // (NAKSHATRA_SPAN / 4)) + 1
    nak_end_deg = (nak_idx + 1) * NAKSHATRA_SPAN
    nak_end_jd = _find_angle_time(ref_jd, nak_end_deg, angle_type="moon", max_days=1.5)

    # === Yoga ===
    yoga_sum = (sun_sid + moon_sid) % 360
    yoga_idx = int(yoga_sum // NAKSHATRA_SPAN)  # 0-26
    yoga_end_deg = (yoga_idx + 1) * NAKSHATRA_SPAN
    yoga_end_jd = _find_angle_time(ref_jd, yoga_end_deg, angle_type="yoga", max_days=1.5)

    # === Vara (weekday based on sunrise date) ===
    if sunrise_jd:
        ysr, msr, dsr, hsr = swe.revjul(sunrise_jd)
        local_sr = datetime(ysr, msr, dsr, int(hsr), tzinfo=pytz.utc).astimezone(tz)
        vara_iso = local_sr.isoweekday()
    else:
        vara_iso = local_date.isoweekday()

    vara_name = VARA_NAMES[vara_iso]

    # === Moon sign (Rashi) ===
    moon_sign_id = int(moon_sid // 30) + 1
    moon_sign = SIGNS[moon_sign_id - 1]

    # === Paksha ===
    paksha = "Shukla Paksha" if tithi_idx <= 15 else "Krishna Paksha"

    # === Eight-fold segments (Rahu Kaal etc.) ===
    segments = _eight_segments(sunrise_jd, sunset_jd, tz)
    rahu = segments[RAHU_KAAL_SEGMENT[vara_iso] - 1] if segments else None
    yama = segments[YAMAGANDA_SEGMENT[vara_iso] - 1] if segments else None
    gulika = segments[GULIKA_SEGMENT[vara_iso] - 1] if segments else None

    # === Abhijit Muhurta ===
    abhijit = None
    if sunrise_jd and sunset_jd:
        midday_jd = (sunrise_jd + sunset_jd) / 2
        # Abhijit span = 1 muhurta = dinaman/15
        muhurta_jd = (sunset_jd - sunrise_jd) / 15
        abhijit = {
            "start": _jd_to_local_iso(midday_jd - muhurta_jd / 2, tz),
            "end": _jd_to_local_iso(midday_jd + muhurta_jd / 2, tz),
        }

    return {
        "date": target_date,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone_name,
        },
        "sun": {
            "sunrise": _jd_to_local_iso(sunrise_jd, tz),
            "sunset": _jd_to_local_iso(sunset_jd, tz),
            "day_length_hours": round(dinaman_hours, 4) if dinaman_hours else None,
        },
        "moon": {
            "moonrise": _jd_to_local_iso(moonrise_jd, tz),
            "moonset": _jd_to_local_iso(moonset_jd, tz),
            "rashi": moon_sign,
            "rashi_id": moon_sign_id,
            "longitude": round(moon_sid, 4),
        },
        "vara": {
            "index": vara_iso,
            "sanskrit": vara_name,
            "english": VARA_ENGLISH[vara_iso],
        },
        "tithi": {
            "index": tithi_idx,
            "name": tithi_name(tithi_idx),
            "paksha": paksha,
            "progress": round(tithi_progress * 100, 2),
            "ends_at": _jd_to_local_iso(tithi_end_jd, tz) if tithi_end_jd else None,
        },
        "nakshatra": {
            "index": nak_idx + 1,
            "name": NAKSHATRAS[nak_idx],
            "pada": pada,
            "ends_at": _jd_to_local_iso(nak_end_jd, tz) if nak_end_jd else None,
        },
        "yoga": {
            "index": yoga_idx + 1,
            "name": YOGAS[yoga_idx],
            "ends_at": _jd_to_local_iso(yoga_end_jd, tz) if yoga_end_jd else None,
        },
        "karana": {
            "half_index": half_idx,
            "name": karana_name(half_idx),
            "ends_at": _jd_to_local_iso(karana_end_jd, tz) if karana_end_jd else None,
        },
        "inauspicious": {
            "rahu_kaal": rahu,
            "yamaganda": yama,
            "gulika": gulika,
        },
        "auspicious": {
            "abhijit_muhurta": abhijit,
        },
    }


def _eight_segments(sunrise_jd, sunset_jd, tz):
    if not sunrise_jd or not sunset_jd:
        return None
    seg_jd = (sunset_jd - sunrise_jd) / 8
    out = []
    for i in range(8):
        start = sunrise_jd + i * seg_jd
        end = start + seg_jd
        out.append({
            "start": _jd_to_local_iso(start, tz),
            "end": _jd_to_local_iso(end, tz),
        })
    return out


def _find_angle_time(ref_jd: float, target_angle_deg: float,
                     angle_type: str, max_days: float = 1.5) -> Optional[float]:
    """Binary/iterative search for JD when given angle reaches target.

    angle_type:
      - 'tithi' -> (moon - sun) mod 360
      - 'moon'  -> moon longitude
      - 'yoga'  -> (sun + moon) mod 360
    target_angle_deg should be > current angle; search forward up to max_days.
    """
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SWIEPH

    def angle_at(jd):
        s = swe.calc_ut(jd, swe.SUN, flags)[0][0] % 360
        m = swe.calc_ut(jd, swe.MOON, flags)[0][0] % 360
        if angle_type == "tithi":
            return (m - s) % 360
        if angle_type == "moon":
            return m
        if angle_type == "yoga":
            return (s + m) % 360
        return 0.0

    current = angle_at(ref_jd)
    # Normalize target to be just above current (within 360)
    delta = (target_angle_deg - current) % 360
    if delta == 0:
        delta = 360  # already at boundary, find next
    # Approximate motion per day:
    # tithi: ~12°/day, moon: ~13.2°/day, yoga: ~14°/day
    speeds = {"tithi": 12.19, "moon": 13.18, "yoga": 14.0}
    approx_days = delta / speeds.get(angle_type, 12.19)
    approx_days = min(approx_days, max_days)

    # Iterative refinement
    lo, hi = ref_jd, ref_jd + max_days + 0.5
    # First ensure hi crosses the target by extension if needed
    # (approx_days kept above for reference)
    # Newton-ish iteration: 40 iterations bisection
    for _ in range(40):
        mid = (lo + hi) / 2
        a = angle_at(mid)
        d = (a - current) % 360
        if d >= delta - 1e-6:
            hi = mid
        else:
            lo = mid
        if hi - lo < 1e-6:
            break
    return (lo + hi) / 2
