"""Drik-style detailed Panchang with all traditional elements."""

from __future__ import annotations

import calendar as _cal
from datetime import date as date_cls
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytz
import swisseph as swe
from timezonefinder import TimezoneFinder

from constants import (
    GULIKA_SEGMENT,
    NAKSHATRAS,
    RAHU_KAAL_SEGMENT,
    SIGNS,
    VARA_ENGLISH,
    VARA_NAMES,
    YAMAGANDA_SEGMENT,
    YOGAS,
    karana_name,
    tithi_name,
)
from panchang_constants import (
    CHANDRA_MASA,
    CHANDRA_VASA,
    DISHA_SHOOL,
    DUR_MUHURTA,
    GOOD_CHANDRA_OFFSETS,
    NIRAYANA_MONTHS,
    RAHU_VASA,
    RASHI_NAMES,
    SAMVATSARAS,
    SHAKA_MONTHS,
    SIGN_TO_DRIK_RITU,
    SIGN_TO_VEDIC_RITU,
)

# Varjyam starting ghatika (out of 60) for each of 27 nakshatras (Ashwini=idx 0)
# Source: classical muhurta tables (Drik reference).
VARJYAM_GHATIKAS = [
    50,
    24,
    30,
    40,
    14,
    21,
    30,
    20,
    32,
    30,
    20,
    18,
    21,
    20,
    14,
    14,
    10,
    14,
    56,
    24,
    20,
    10,
    10,
    18,
    16,
    24,
    30,
]
VARJYAM_DURATION_GHATIKAS = 1.6  # 1 ghatika 36 vighati (fixed across all nakshatras)

# Amrit Kalam starting ghatika per nakshatra — Varjyam of the 12th subsequent nakshatra's point
# Classical correspondence: Amrit Kalam of nakshatra N = Varjyam of nakshatra (N + ?) adjusted.
# Simpler accepted rule: Amrit Kalam is 60 * (12/27) = ~26.67 ghatikas after Varjyam within Moon motion.
# We compute Amrit Kalam as: offset = (VARJYAM + 26.67) mod 60 (approx).
AMRIT_KALAM_GHATIKAS = [(g + 26.67) % 60 for g in VARJYAM_GHATIKAS]
AMRIT_KALAM_DURATION_GHATIKAS = 1.6

# Sarvartha Siddhi Yoga: nakshatras (0-indexed) allowed per isoweekday (1=Mon..7=Sun)
SARVARTHA_SIDDHI = {
    1: {
        3,
        4,
        7,
        17,
    },  # Mon: Rohini(3), Mrigashira(4), Pushya(7), Anuradha(16)... adjusting
    2: {
        0,
        2,
        8,
        25,
    },  # Tue: Ashwini(0), Krittika(2), Ashlesha(8), Uttara Bhadrapada(25)
    3: {
        0,
        2,
        3,
        4,
        12,
        16,
    },  # Wed: Ashwini, Krittika, Rohini, Mrigashira, Hasta, Anuradha
    4: {
        0,
        6,
        7,
        16,
        26,
    },  # Thu: Ashwini, Punarvasu(6), Pushya(7), Anuradha(16), Revati(26)
    5: {0, 6, 16, 21, 26},  # Fri: Ashwini, Punarvasu, Anuradha, Shravana(21), Revati
    6: {3, 14, 21},  # Sat: Rohini, Swati(14), Shravana
    7: {
        0,
        7,
        10,
        11,
        12,
        18,
        20,
        25,
    },  # Sun: Ashwini, Pushya, Purva Phalguni(10), Uttara Phalguni(11),
    #      Hasta(12), Mula(18), Uttara Ashadha(20), Uttara Bhadrapada
}

# Amrita Siddhi Yoga: exact weekday + nakshatra pair
AMRITA_SIDDHI = {
    1: {4},  # Mon + Mrigashira
    2: {0},  # Tue + Ashwini
    3: {16},  # Wed + Anuradha
    4: {7},  # Thu + Pushya
    5: {26},  # Fri + Revati
    6: {3},  # Sat + Rohini
    7: {12},  # Sun + Hasta
}

_TF = TimezoneFinder()

NAK_SPAN = 360.0 / 27
SIGN_SPAN = 30.0

# ---- Helpers ----


def _jd_to_local(jd_ut: Optional[float], tz: pytz.BaseTzInfo) -> Optional[datetime]:
    if jd_ut is None or jd_ut <= 0:
        return None
    y, m, d, h = swe.revjul(jd_ut)
    hour = int(h)
    mfull = (h - hour) * 60
    minute = int(mfull)
    second = int(round((mfull - minute) * 60))
    if second == 60:
        second = 0
        minute += 1
    if minute == 60:
        minute = 0
        hour += 1
    dt = datetime(y, m, d, hour % 24, minute, second, tzinfo=pytz.utc)
    if hour >= 24:
        dt += timedelta(days=1)
    return dt.astimezone(tz)


def _iso(jd_ut: Optional[float], tz: pytz.BaseTzInfo) -> Optional[str]:
    dt = _jd_to_local(jd_ut, tz)
    return dt.isoformat() if dt else None


def _rise_trans(jd_start: float, body: int, geopos, which: int) -> Optional[float]:
    # Use Swiss Ephemeris' default: apparent upper-limb rise/set with refraction.
    # That matches the convention used by drikpanchang and most published panchangs.
    # Passing BIT_DISC_CENTER would compute geometric centre-of-disc rise/set, which
    # is ~1 min off (sunrise too late, sunset too early).
    try:
        res, tret = swe.rise_trans(jd_start, body, which, geopos)
        if res == 0:
            return tret[0]
    except Exception:
        pass
    return None


def _sun_moon_sid(jd: float):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SWIEPH
    s = swe.calc_ut(jd, swe.SUN, flags)[0][0] % 360
    m = swe.calc_ut(jd, swe.MOON, flags)[0][0] % 360
    return s, m


def _sun_trop(jd: float) -> float:
    return swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH)[0][0] % 360


def _find_angle_time(
    ref_jd: float, target_deg: float, angle_type: str, max_days: float = 1.5
) -> Optional[float]:
    """Bisection search for JD when named angle reaches target modular value."""

    def f(jd):
        s, m = _sun_moon_sid(jd)
        if angle_type == "tithi":
            return (m - s) % 360
        if angle_type == "moon":
            return m
        if angle_type == "sun":
            return s
        if angle_type == "yoga":
            return (s + m) % 360
        return 0.0

    current = f(ref_jd)
    delta = (target_deg - current) % 360
    if delta < 1e-9:
        delta = 360
    lo, hi = ref_jd, ref_jd + max_days + 0.5
    for _ in range(40):
        mid = (lo + hi) / 2
        d = (f(mid) - current) % 360
        if d >= delta - 1e-7:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def _ascendant_at(jd: float, lat: float, lon: float) -> float:
    """Sidereal ascendant longitude at given JD."""
    cusps, ascmc = swe.houses_ex(jd, lat, lon, b"P", swe.FLG_SIDEREAL)
    return ascmc[0] % 360


# ---- Samvat / Calendars ----


def _shaka_samvatsara(shaka_year: int) -> str:
    """Name of Prabhavadi samvatsara for a Shaka year."""
    idx = (shaka_year + 11) % 60
    return SAMVATSARAS[idx]


def _vikram_samvatsara(vikram_year: int) -> str:
    """North Indian Vikram samvatsara (matches Drik reference: Vikram 2083 -> Siddharthi)."""
    idx = (vikram_year + 9) % 60
    return SAMVATSARAS[idx]


def _national_civil_date(greg_date: date_cls):
    """Indian National (Saka) calendar date for a given Gregorian date."""
    Y = greg_date.year
    is_leap = _cal.isleap(Y)
    chaitra_start = date_cls(Y, 3, 21 if is_leap else 22)
    if greg_date < chaitra_start:
        Y -= 1
        is_leap = _cal.isleap(Y)
        chaitra_start = date_cls(Y, 3, 21 if is_leap else 22)
    days = (greg_date - chaitra_start).days
    shaka_year = Y - 78
    # Month lengths (Chaitra = 31 in leap year)
    month_lens = [31 if is_leap else 30, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30]
    m_idx = 0
    while m_idx < 12 and days >= month_lens[m_idx]:
        days -= month_lens[m_idx]
        m_idx += 1
    return {
        "month": SHAKA_MONTHS[m_idx][0],
        "day": days + 1,
        "shaka_year": shaka_year,
    }


def _nirayana_solar_date(sun_sid: float, jd: float):
    """Sidereal (Nirayana) solar date. Month begins when Sun enters each sign."""
    sign_id = int(sun_sid // 30) + 1  # 1-12
    # Find the JD when Sun entered this sign (sankranti)
    start_deg = (sign_id - 1) * 30
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SWIEPH
    # Sun moves ~1°/day, search back up to 40 days
    lo, hi = jd - 40, jd
    for _ in range(50):
        mid = (lo + hi) / 2
        s_mid = swe.calc_ut(mid, swe.SUN, flags)[0][0] % 360
        if s_mid >= start_deg and s_mid < start_deg + 30:
            hi = mid
        else:
            lo = mid
        if hi - lo < 1e-5:
            break
    sankranti_jd = hi
    # Day 1 of the month = day of sankranti
    days_in = int((jd - sankranti_jd) + 1e-6) + 1
    # Map Mesha(1) -> Vaishakha as NIRAYANA_MONTHS[0]
    month_name = NIRAYANA_MONTHS[sign_id - 1]
    return {
        "month": month_name,
        "day": days_in,
        "sankranti_at_jd": sankranti_jd,
    }


# ---- Ritu / Ayana ----


def _ritu_ayana(sun_sid: float, sun_trop: float):
    """Compute Drik (tropical) and Vedic (sidereal) Ritu and Ayana."""
    sid_sign = int(sun_sid // 30) + 1
    trop_sign = int(sun_trop // 30) + 1

    # Ayana: Uttarayana when Sun's tropical longitude is 270-360 or 0-90
    #        (from winter solstice at tropical Capricorn 0° to summer solstice at Cancer 0°)
    drik_ayana = "Uttarayana" if (sun_trop >= 270 or sun_trop < 90) else "Dakshinayana"
    # Vedic (Nirayana) Ayana: uses sidereal; Uttarayana when Sun in Makara..Mithuna (signs 10-3)
    vedic_ayana = "Uttarayana" if sid_sign in {10, 11, 12, 1, 2, 3} else "Dakshinayana"

    return {
        "drik_ritu": SIGN_TO_DRIK_RITU.get(trop_sign, "—"),
        "vedic_ritu": SIGN_TO_VEDIC_RITU.get(sid_sign, "—"),
        "drik_ayana": drik_ayana,
        "vedic_ayana": vedic_ayana,
    }


# ---- Nakshatra pada transitions within a 24h window ----


def _nakshatra_padas_in_window(start_jd: float, end_jd: float) -> List[Dict]:
    """Return list of {pada, nakshatra, ends_at_jd} intervals within [start_jd, end_jd]."""
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 20:
        safety += 1
        _, m = _sun_moon_sid(cursor)
        nak_idx = int(m // NAK_SPAN)
        pada_idx = int((m - nak_idx * NAK_SPAN) // (NAK_SPAN / 4))
        pada_end_deg = nak_idx * NAK_SPAN + (pada_idx + 1) * (NAK_SPAN / 4)
        end_of_pada = _find_angle_time(cursor, pada_end_deg, "moon", max_days=2.0)
        ends = min(end_of_pada, end_jd) if end_of_pada else end_jd
        out.append(
            {
                "nakshatra": NAKSHATRAS[nak_idx],
                "pada": pada_idx + 1,
                "ends_at_jd": ends,
            }
        )
        if end_of_pada and end_of_pada < end_jd:
            cursor = end_of_pada + 1e-5
        else:
            break
    return out


def _compute_varjyam_amrit(nakshatras_with_starts: List[Dict], tz) -> Dict:
    """For each nakshatra in window, compute Varjyam + Amrit Kalam windows.

    `nakshatras_with_starts` is a list of dicts with keys:
      - nak_idx (0-26)
      - start_jd, end_jd (JD span during which this nakshatra is active)
    """
    varjyam = []
    amrit = []
    for n in nakshatras_with_starts:
        nak_span_jd = n["end_jd"] - n["start_jd"]
        if nak_span_jd <= 0:
            continue
        ghatika_jd = nak_span_jd / 60.0
        # Varjyam
        v_start = n["start_jd"] + VARJYAM_GHATIKAS[n["nak_idx"]] * ghatika_jd
        v_end = v_start + VARJYAM_DURATION_GHATIKAS * ghatika_jd
        if v_start < n["end_jd"]:  # only include if it falls within this nakshatra span
            varjyam.append(
                {
                    "start": _iso(max(v_start, n["start_jd"]), tz),
                    "end": _iso(min(v_end, n["end_jd"]), tz),
                    "nakshatra": NAKSHATRAS[n["nak_idx"]],
                }
            )
        # Amrit Kalam
        a_start = n["start_jd"] + AMRIT_KALAM_GHATIKAS[n["nak_idx"]] * ghatika_jd
        a_end = a_start + AMRIT_KALAM_DURATION_GHATIKAS * ghatika_jd
        # Amrit may wrap past end, in which case skip or clip
        if a_start < n["end_jd"]:
            amrit.append(
                {
                    "start": _iso(max(a_start, n["start_jd"]), tz),
                    "end": _iso(min(a_end, n["end_jd"]), tz),
                    "nakshatra": NAKSHATRAS[n["nak_idx"]],
                }
            )
    return {"varjyam": varjyam, "amrit_kalam": amrit}


def _compute_siddhi_yogas(nakshatras_in_window: List[Dict], vara_iso: int, tz) -> Dict:
    """Sarvartha Siddhi Yoga + Amrita Siddhi Yoga active during today (via nakshatra match)."""
    sarvartha = []
    amrita = []
    sarv_set = SARVARTHA_SIDDHI.get(vara_iso, set())
    amr_set = AMRITA_SIDDHI.get(vara_iso, set())
    for n in nakshatras_in_window:
        n_idx0 = n["nak_idx"]
        if n_idx0 in sarv_set:
            sarvartha.append(
                {
                    "start": _iso(n["start_jd"], tz),
                    "end": _iso(n["end_jd"], tz),
                    "nakshatra": NAKSHATRAS[n_idx0],
                }
            )
        if n_idx0 in amr_set:
            amrita.append(
                {
                    "start": _iso(n["start_jd"], tz),
                    "end": _iso(n["end_jd"], tz),
                    "nakshatra": NAKSHATRAS[n_idx0],
                }
            )
    return {"sarvartha_siddhi": sarvartha, "amrita_siddhi": amrita}


def _nakshatras_with_bounds(start_jd: float, end_jd: float) -> List[Dict]:
    """Return nakshatras active in [start_jd, end_jd] with precise start/end JDs."""
    out = []
    cursor = start_jd
    # Find actual start of current nakshatra (which may begin before window)
    _, m0 = _sun_moon_sid(cursor)
    nak_idx0 = int(m0 // NAK_SPAN)
    nak_start_deg = nak_idx0 * NAK_SPAN
    # Search backward for when moon crossed nak_start_deg
    lo_b, hi_b = cursor - 1.5, cursor
    for _ in range(35):
        mid = (lo_b + hi_b) / 2
        _, mm = _sun_moon_sid(mid)
        if mm >= nak_start_deg:
            hi_b = mid
        else:
            lo_b = mid
        if hi_b - lo_b < 1e-6:
            break
    prev_nak_start_jd = hi_b

    cursor_start = prev_nak_start_jd
    safety = 0
    while cursor < end_jd and safety < 6:
        safety += 1
        _, m = _sun_moon_sid(cursor)
        nak_idx = int(m // NAK_SPAN)
        nak_end_deg = (nak_idx + 1) * NAK_SPAN
        end_jd_nak = _find_angle_time(cursor, nak_end_deg, "moon", max_days=2.0)
        out.append(
            {
                "nak_idx": nak_idx,
                "start_jd": cursor_start,
                "end_jd": end_jd_nak if end_jd_nak else end_jd,
            }
        )
        if end_jd_nak and end_jd_nak < end_jd:
            cursor = end_jd_nak + 1e-5
            cursor_start = end_jd_nak
        else:
            break
    return out
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 6:
        safety += 1
        _, m = _sun_moon_sid(cursor)
        nak_idx = int(m // NAK_SPAN)
        nak_end_deg = (nak_idx + 1) * NAK_SPAN
        end = _find_angle_time(cursor, nak_end_deg, "moon", max_days=2.0)
        ends = min(end, end_jd) if end else end_jd
        out.append(
            {
                "name": NAKSHATRAS[nak_idx],
                "index": nak_idx + 1,
                "ends_at_jd": ends,
            }
        )
        if end and end < end_jd:
            cursor = end + 1e-5
        else:
            break
    return out


def _nakshatras_in_window(start_jd: float, end_jd: float) -> List[Dict]:
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 6:
        safety += 1
        _, m = _sun_moon_sid(cursor)
        nak_idx = int(m // NAK_SPAN)
        nak_end_deg = (nak_idx + 1) * NAK_SPAN
        end = _find_angle_time(cursor, nak_end_deg, "moon", max_days=2.0)
        ends = min(end, end_jd) if end else end_jd
        out.append(
            {
                "name": NAKSHATRAS[nak_idx],
                "index": nak_idx + 1,
                "ends_at_jd": ends,
            }
        )
        if end and end < end_jd:
            cursor = end + 1e-5
        else:
            break
    return out


def _tithis_in_window(start_jd: float, end_jd: float) -> List[Dict]:
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 4:
        safety += 1
        s, m = _sun_moon_sid(cursor)
        diff = (m - s) % 360
        t_idx = int(diff // 12) + 1
        t_end_deg = t_idx * 12
        end = _find_angle_time(cursor, t_end_deg, "tithi", max_days=2.0)
        ends = min(end, end_jd) if end else end_jd
        out.append(
            {
                "index": t_idx,
                "name": tithi_name(t_idx),
                "paksha": "Shukla Paksha" if t_idx <= 15 else "Krishna Paksha",
                "ends_at_jd": ends,
            }
        )
        if end and end < end_jd:
            cursor = end + 1e-5
        else:
            break
    return out


def _yogas_in_window(start_jd: float, end_jd: float) -> List[Dict]:
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 4:
        safety += 1
        s, m = _sun_moon_sid(cursor)
        total = (s + m) % 360
        y_idx = int(total // NAK_SPAN)
        y_end_deg = (y_idx + 1) * NAK_SPAN
        end = _find_angle_time(cursor, y_end_deg, "yoga", max_days=2.0)
        ends = min(end, end_jd) if end else end_jd
        out.append(
            {
                "index": y_idx + 1,
                "name": YOGAS[y_idx],
                "ends_at_jd": ends,
            }
        )
        if end and end < end_jd:
            cursor = end + 1e-5
        else:
            break
    return out


def _karanas_in_window(start_jd: float, end_jd: float) -> List[Dict]:
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 6:
        safety += 1
        s, m = _sun_moon_sid(cursor)
        diff = (m - s) % 360
        h_idx = int(diff // 6)
        h_end_deg = (h_idx + 1) * 6
        end = _find_angle_time(cursor, h_end_deg, "tithi", max_days=2.0)
        ends = min(end, end_jd) if end else end_jd
        out.append(
            {
                "half_index": h_idx,
                "name": karana_name(h_idx),
                "ends_at_jd": ends,
                "is_bhadra": karana_name(h_idx) == "Vishti",
            }
        )
        if end and end < end_jd:
            cursor = end + 1e-5
        else:
            break
    return out


def _moonsigns_in_window(start_jd: float, end_jd: float) -> List[Dict]:
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 4:
        safety += 1
        _, m = _sun_moon_sid(cursor)
        sid = int(m // 30)  # 0-11
        end_deg = (sid + 1) * 30
        end = _find_angle_time(cursor, end_deg, "moon", max_days=3.5)
        ends = min(end, end_jd) if end else end_jd
        out.append(
            {
                "index": sid + 1,
                "name": SIGNS[sid],
                "rashi": RASHI_NAMES[sid],
                "ends_at_jd": ends,
            }
        )
        if end and end < end_jd:
            cursor = end + 1e-5
        else:
            break
    return out


def _udaya_lagna_in_window(
    start_jd: float, end_jd: float, lat: float, lon: float
) -> List[Dict]:
    """Sign transits of the Ascendant over the window."""
    out = []
    cursor = start_jd
    safety = 0
    while cursor < end_jd and safety < 14:
        safety += 1
        asc = _ascendant_at(cursor, lat, lon)
        sign = int(asc // 30)
        end_deg = (sign + 1) * 30
        # Bisect forward up to 4h
        lo, hi = cursor, min(cursor + 4.0 / 24, end_jd + 0.5)
        for _ in range(35):
            mid = (lo + hi) / 2
            a = _ascendant_at(mid, lat, lon)
            d = (a - asc) % 360
            if d >= (end_deg - asc) % 360 - 1e-6 and d > 0:
                hi = mid
            else:
                lo = mid
            if hi - lo < 1e-6:
                break
        end = (lo + hi) / 2
        ends = min(end, end_jd)
        out.append(
            {
                "sign": SIGNS[sign],
                "rashi": RASHI_NAMES[sign],
                "start_jd": cursor,
                "end_jd": ends,
            }
        )
        if end < end_jd:
            cursor = end + 1e-5
        else:
            break
    return out


# ---- Muhurta Timings ----


def _muhurta_timings(sunrise_jd, sunset_jd, next_sunrise_jd, tz):
    """Auspicious muhurtas."""
    if not (sunrise_jd and sunset_jd):
        return {}
    dinaman = sunset_jd - sunrise_jd
    ratriman = (next_sunrise_jd - sunset_jd) if next_sunrise_jd else (1.0 - dinaman)
    muhurta_day = dinaman / 15
    muhurta_night = ratriman / 15

    # Brahma Muhurta: 14th night muhurta (before sunrise) = sunrise - 2*muhurta_night to sunrise - muhurta_night
    brahma_start = sunrise_jd - 2 * muhurta_night
    brahma_end = sunrise_jd - 1 * muhurta_night

    # Pratah Sandhya: 1h before sunrise to sunrise
    pratah_start = sunrise_jd - 1.0 / 24
    pratah_end = sunrise_jd

    # Abhijit: middle of day, 1 muhurta centered on madhyahna
    madhyahna_jd = (sunrise_jd + sunset_jd) / 2
    abhijit_start = madhyahna_jd - muhurta_day / 2
    abhijit_end = madhyahna_jd + muhurta_day / 2

    # Vijay Muhurta: 11th muhurta of day (start = sunrise + 10*muhurta_day)
    vijay_start = sunrise_jd + 10 * muhurta_day
    vijay_end = sunrise_jd + 11 * muhurta_day

    # Godhuli Muhurta: 24 minutes bridging sunset (approx -12min to +12min)
    twelve_min_jd = 12.0 / (24 * 60)
    godhuli_start = sunset_jd - twelve_min_jd
    godhuli_end = sunset_jd + twelve_min_jd

    # Sayahna Sandhya: sunset to sunset + 1h
    sayahna_start = sunset_jd
    sayahna_end = sunset_jd + 1.0 / 24

    # Nishita Muhurta: 8th night muhurta = sunset + 7*muhurta_night to sunset + 8*muhurta_night
    nishita_start = sunset_jd + 7 * muhurta_night
    nishita_end = sunset_jd + 8 * muhurta_night

    return {
        "brahma_muhurta": {
            "start": _iso(brahma_start, tz),
            "end": _iso(brahma_end, tz),
        },
        "pratah_sandhya": {
            "start": _iso(pratah_start, tz),
            "end": _iso(pratah_end, tz),
        },
        "abhijit": {"start": _iso(abhijit_start, tz), "end": _iso(abhijit_end, tz)},
        "vijay_muhurta": {"start": _iso(vijay_start, tz), "end": _iso(vijay_end, tz)},
        "godhuli_muhurta": {
            "start": _iso(godhuli_start, tz),
            "end": _iso(godhuli_end, tz),
        },
        "sayahna_sandhya": {
            "start": _iso(sayahna_start, tz),
            "end": _iso(sayahna_end, tz),
        },
        "nishita_muhurta": {
            "start": _iso(nishita_start, tz),
            "end": _iso(nishita_end, tz),
        },
        "madhyahna": _iso(madhyahna_jd, tz),
    }


def _dur_muhurtam(sunrise_jd, sunset_jd, vara_iso, tz):
    """Dur Muhurtam periods by weekday."""
    if not (sunrise_jd and sunset_jd):
        return []
    muhurta_day = (sunset_jd - sunrise_jd) / 15
    result = []
    for idx in DUR_MUHURTA.get(vara_iso, []):
        start = sunrise_jd + (idx - 1) * muhurta_day
        end = sunrise_jd + idx * muhurta_day
        result.append(
            {
                "muhurta_number": idx,
                "start": _iso(start, tz),
                "end": _iso(end, tz),
            }
        )
    return result


# ---- Tarabalam / Chandrabalam ----


def _tarabalam(current_nak_idx: int) -> Dict:
    """Return nakshatras with good tarabalam (offset from birth nakshatra)."""
    # current_nak_idx 0-26 (current moon's nakshatra)
    # For a person born in nakshatra N (0-26), offset = (current_nak_idx - N) % 27
    # Good if offset % 9 in {0,1,3,5,7,8}
    good_from = []
    for n_birth in range(27):
        offset = (current_nak_idx - n_birth) % 27
        star_number = offset + 1  # 1-27
        sub = (star_number - 1) % 9 + 1  # 1-9 position within cycle
        if sub in {1, 2, 4, 6, 8, 9}:
            good_from.append({"nakshatra": NAKSHATRAS[n_birth], "index": n_birth + 1})
    return {"good_nakshatras": good_from}


def _chandrabalam(current_sign_id: int) -> Dict:
    """Return rashis with good Chandrabalam."""
    good = []
    for birth_sign in range(1, 13):
        offset = (current_sign_id - birth_sign) % 12
        if offset in GOOD_CHANDRA_OFFSETS:
            good.append({"rashi": RASHI_NAMES[birth_sign - 1], "index": birth_sign})
    return {"good_rashis": good}


# ---- Lunar month (Chaitradi) ----


def _chandramasa(tithi_idx: int, sun_sign_id: int) -> Dict:
    """Approx Amanta & Purnimanta lunar month based on Sun's sign at Amavasya/Purnima."""
    # Amanta: Lunar month named after sidereal sign Sun is in at Amavasya (new moon)
    # Purnimanta: Starts 15 days before Amanta month starts; named after the lunar month
    #             whose Purnima is in it. For a given instant:
    #   If current tithi is in Shukla (1-15): Amanta = Purnimanta = month named by the sign
    #     Sun was in around the preceding amavasya (approx current sun sign or sign-1)
    #   If current tithi is in Krishna (16-30): Amanta uses upcoming amavasya sun sign,
    #     while Purnimanta still uses the month that contained the preceding Purnima.
    # Simplified: use Sun's sidereal sign mapping.
    # Sun in sign X => lunar month NIRAYANA of sign X? Slight offset - standard rule:
    #   Sun in Pisces (12): Chaitra; Aries (1): Vaishakha; etc.
    # Standard Chaitradi rule: lunar month is named after the sign whose sankrānti
    # falls within it. Mesha sankrānti (Sun → Aries, sign 1) falls in lunar Vaishakha,
    # Vrishabha (sign 2) in Jyeshtha, ... and Mīna (sign 12) in Chaitra.
    #   sun sign 1  → CHANDRA_MASA[1] = Vaishakha
    #   sun sign 12 → CHANDRA_MASA[0] = Chaitra
    lunar_idx = sun_sign_id % 12
    amanta_name = CHANDRA_MASA[lunar_idx]
    # Purnimanta month is the next one vs Amanta during Krishna paksha
    if tithi_idx <= 15:
        purnimanta_name = amanta_name
    else:
        purnimanta_name = CHANDRA_MASA[(lunar_idx + 1) % 12]
    return {
        "amanta": amanta_name,
        "purnimanta": purnimanta_name,
    }


# ---- Pravishte (solar day count in current nirayana solar month) ----
# Already computed by _nirayana_solar_date["day"]


# ---- Main comprehensive function ----


def compute_detailed_panchang(
    target_date: str,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute Drik-style comprehensive Panchang for given local date."""
    if not timezone_name:
        timezone_name = _TF.timezone_at(lat=latitude, lng=longitude) or "UTC"
    tz = pytz.timezone(timezone_name)

    y, mo, d = [int(x) for x in target_date.split("-")]
    greg_date = date_cls(y, mo, d)

    local_midnight = tz.localize(datetime(y, mo, d, 0, 0))
    utc_midnight = local_midnight.astimezone(pytz.utc)
    jd_start = swe.julday(
        utc_midnight.year,
        utc_midnight.month,
        utc_midnight.day,
        utc_midnight.hour + utc_midnight.minute / 60,
    )

    geopos = (longitude, latitude, 0)

    # Rise / set
    sunrise_jd = _rise_trans(jd_start, swe.SUN, geopos, swe.CALC_RISE)
    sunset_jd = _rise_trans(jd_start, swe.SUN, geopos, swe.CALC_SET)
    if sunrise_jd and sunset_jd and sunset_jd < sunrise_jd:
        sunset_jd = _rise_trans(sunrise_jd, swe.SUN, geopos, swe.CALC_SET)
    next_sunrise_jd = _rise_trans(
        sunset_jd if sunset_jd else jd_start + 0.5, swe.SUN, geopos, swe.CALC_RISE
    )
    moonrise_jd = _rise_trans(jd_start, swe.MOON, geopos, swe.CALC_RISE)
    moonset_jd = _rise_trans(jd_start, swe.MOON, geopos, swe.CALC_SET)

    dinaman_h = (sunset_jd - sunrise_jd) * 24 if sunrise_jd and sunset_jd else None
    ratriman_h = (
        (next_sunrise_jd - sunset_jd) * 24 if next_sunrise_jd and sunset_jd else None
    )

    ref_jd = sunrise_jd if sunrise_jd else jd_start
    end_of_day_jd = next_sunrise_jd if next_sunrise_jd else ref_jd + 1.0

    sun_sid, moon_sid = _sun_moon_sid(ref_jd)
    sun_trop = _sun_trop(ref_jd)
    sun_sign_id = int(sun_sid // 30) + 1
    moon_sign_id = int(moon_sid // 30) + 1

    # Sun Nakshatra + Pada
    sun_nak_idx = int(sun_sid // NAK_SPAN)
    sun_pada = int((sun_sid - sun_nak_idx * NAK_SPAN) // (NAK_SPAN / 4)) + 1
    # End of Sun's current pada
    sun_pada_end_deg = sun_nak_idx * NAK_SPAN + sun_pada * (NAK_SPAN / 4)
    sun_pada_end_jd = _find_angle_time(ref_jd, sun_pada_end_deg, "sun", max_days=6.0)

    # Weekday (Drik: based on sunrise)
    if sunrise_jd:
        ysr, msr, dsr, hsr = swe.revjul(sunrise_jd)
        local_sr = datetime(ysr, msr, dsr, int(hsr), tzinfo=pytz.utc).astimezone(tz)
        vara_iso = local_sr.isoweekday()
    else:
        vara_iso = greg_date.isoweekday()

    # Five limbs in the window (sunrise to next sunrise) — capture transitions
    tithis = _tithis_in_window(ref_jd, end_of_day_jd)
    nakshatras = _nakshatras_in_window(ref_jd, end_of_day_jd)
    yogas = _yogas_in_window(ref_jd, end_of_day_jd)
    karanas = _karanas_in_window(ref_jd, end_of_day_jd)
    moonsigns = _moonsigns_in_window(ref_jd, end_of_day_jd)
    padas = _nakshatra_padas_in_window(ref_jd, end_of_day_jd)
    udaya_lagnas = _udaya_lagna_in_window(ref_jd, end_of_day_jd, latitude, longitude)
    naks_with_bounds = _nakshatras_with_bounds(ref_jd, end_of_day_jd)

    # Convert JD -> ISO for the transitions
    def _attach_iso(items, jd_key="ends_at_jd"):
        out = []
        for it in items:
            cp = dict(it)
            cp["ends_at"] = _iso(it[jd_key], tz)
            cp.pop(jd_key, None)
            out.append(cp)
        return out

    tithis_iso = _attach_iso(tithis)
    nakshatras_iso = _attach_iso(nakshatras)
    yogas_iso = _attach_iso(yogas)
    karanas_iso = _attach_iso(karanas)
    moonsigns_iso = _attach_iso(moonsigns)
    padas_iso = _attach_iso(padas)
    udaya_iso = []
    for it in udaya_lagnas:
        udaya_iso.append(
            {
                "sign": it["sign"],
                "rashi": it["rashi"],
                "start": _iso(it["start_jd"], tz),
                "end": _iso(it["end_jd"], tz),
            }
        )

    # Current state (first entry of each)
    current_tithi = tithis_iso[0] if tithis_iso else None
    current_nak = nakshatras_iso[0] if nakshatras_iso else None
    current_yoga = yogas_iso[0] if yogas_iso else None
    current_karana = karanas_iso[0] if karanas_iso else None
    current_moonsign = moonsigns_iso[0] if moonsigns_iso else None

    # Inauspicious / auspicious windows
    segs = _eight_segments(sunrise_jd, sunset_jd, tz)
    rahu = segs[RAHU_KAAL_SEGMENT[vara_iso] - 1] if segs else None
    yama = segs[YAMAGANDA_SEGMENT[vara_iso] - 1] if segs else None
    gulika = segs[GULIKA_SEGMENT[vara_iso] - 1] if segs else None
    dur_muhurtas = _dur_muhurtam(sunrise_jd, sunset_jd, vara_iso, tz)

    aus = _muhurta_timings(sunrise_jd, sunset_jd, next_sunrise_jd, tz)

    # Varjyam + Amrit Kalam + Sarvartha/Amrita Siddhi Yoga
    va = _compute_varjyam_amrit(naks_with_bounds, tz)
    siddhi = _compute_siddhi_yogas(naks_with_bounds, vara_iso, tz)

    # Bhadra (any Vishti karana period in window) - compute start/end
    bhadra = []
    prev_end_jd = ref_jd
    for k in karanas:
        if karana_name(k["half_index"]) == "Vishti":
            bhadra.append(
                {
                    "start": _iso(prev_end_jd, tz),
                    "end": _iso(k["ends_at_jd"], tz),
                }
            )
        prev_end_jd = k["ends_at_jd"]

    # Samvat / calendars
    shaka_year = greg_date.year - 78  # rough; overwritten below
    civil = _national_civil_date(greg_date)
    shaka_year = civil["shaka_year"]

    # Vikram Samvat: generally Gregorian + 56 or 57. Starts Chaitra Shukla Pratipada.
    # Simpler: derive from date - if date is on/after Chaitra start of year, vikram = greg + 57; else +56
    chaitra_start = date_cls(
        greg_date.year, 3, 22 if not _cal.isleap(greg_date.year) else 21
    )
    vikram_year = greg_date.year + (57 if greg_date >= chaitra_start else 56)
    # Gujarati Samvat starts on Kartika Shukla Pratipada (around Oct-Nov); approx
    gujarati_year = vikram_year - 1

    shaka_samvatsara = _shaka_samvatsara(shaka_year)
    vikram_samvatsara = _vikram_samvatsara(vikram_year)

    # Nirayana solar date (Pravishte)
    niriyana_month = _nirayana_solar_date(sun_sid, ref_jd)

    # Chandramasa (Purnimanta / Amanta)
    chandramasa = _chandramasa(
        current_tithi["index"] if current_tithi else 1, sun_sign_id
    )

    # Ritu / Ayana
    ritu = _ritu_ayana(sun_sid, sun_trop)

    # Other calendars
    KALI_START_JD = 588465.5  # Feb 18, 3102 BCE midnight
    RATA_DIE_EPOCH_JD = 1721424.5  # Jan 1, 1 CE midnight

    # JD at local noon for reporting
    noon_local = tz.localize(datetime(y, mo, d, 12, 0))
    noon_utc = noon_local.astimezone(pytz.utc)
    noon_jd = swe.julday(
        noon_utc.year,
        noon_utc.month,
        noon_utc.day,
        noon_utc.hour + noon_utc.minute / 60,
    )
    ayanamsha = swe.get_ayanamsa_ut(noon_jd)
    kali_ahargana = int(round(noon_jd - KALI_START_JD))
    kali_year = greg_date.year + 3101 + (1 if greg_date.month >= 3 else 0)
    julian_day = round(noon_jd - 0.5, 2)  # conventional civil JD at midnight
    modified_jd = int(noon_jd - 2400000.5)
    rata_die = int(noon_jd - RATA_DIE_EPOCH_JD)

    # Tarabalam & Chandrabalam
    tara = _tarabalam(int(moon_sid // NAK_SPAN))
    chandra = _chandrabalam(moon_sign_id)

    # Shool & Vasa
    disha_shool = DISHA_SHOOL[vara_iso]
    rahu_vasa = RAHU_VASA[vara_iso]
    chandra_vasa = CHANDRA_VASA[moon_sign_id]

    return {
        "date": target_date,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone_name,
        },
        "sun_moon": {
            "sunrise": _iso(sunrise_jd, tz),
            "sunset": _iso(sunset_jd, tz),
            "moonrise": _iso(moonrise_jd, tz),
            "moonset": _iso(moonset_jd, tz),
            "next_sunrise": _iso(next_sunrise_jd, tz),
            "dinaman_hours": round(dinaman_h, 4) if dinaman_h else None,
            "ratriman_hours": round(ratriman_h, 4) if ratriman_h else None,
            "madhyahna": aus.get("madhyahna"),
        },
        "vara": {
            "index": vara_iso,
            "sanskrit": VARA_NAMES[vara_iso],
            "english": VARA_ENGLISH[vara_iso],
        },
        "panchang": {
            "tithi": current_tithi,
            "tithi_sequence": tithis_iso,
            "nakshatra": current_nak,
            "nakshatra_sequence": nakshatras_iso,
            "yoga": current_yoga,
            "yoga_sequence": yogas_iso,
            "karana": current_karana,
            "karana_sequence": karanas_iso,
            "paksha": (
                "Shukla Paksha"
                if current_tithi and current_tithi["index"] <= 15
                else "Krishna Paksha"
            ),
        },
        "rashi_nakshatra": {
            "moonsign": current_moonsign,
            "moonsign_sequence": moonsigns_iso,
            "sunsign": {
                "index": sun_sign_id,
                "sign": SIGNS[sun_sign_id - 1],
                "rashi": RASHI_NAMES[sun_sign_id - 1],
                "longitude": round(sun_sid, 4),
            },
            "surya_nakshatra": {
                "index": sun_nak_idx + 1,
                "name": NAKSHATRAS[sun_nak_idx],
                "pada": sun_pada,
                "ends_at": _iso(sun_pada_end_jd, tz) if sun_pada_end_jd else None,
            },
            "moon_nakshatra_padas": padas_iso,
        },
        "lunar_month": {
            "samvatsara_shaka": shaka_samvatsara,
            "samvatsara_vikram": vikram_samvatsara,
            "vikram_samvat": vikram_year,
            "shaka_samvat": shaka_year,
            "gujarati_samvat": gujarati_year,
            "chandramasa_amanta": chandramasa["amanta"],
            "chandramasa_purnimanta": chandramasa["purnimanta"],
            "paksha": (
                "Shukla Paksha"
                if current_tithi and current_tithi["index"] <= 15
                else "Krishna Paksha"
            ),
            "pravishte_day": niriyana_month["day"],
            "nirayana_solar_month": niriyana_month["month"],
        },
        "ritu_ayana": ritu,
        "auspicious_timings": {
            "brahma_muhurta": aus.get("brahma_muhurta"),
            "pratah_sandhya": aus.get("pratah_sandhya"),
            "abhijit": aus.get("abhijit"),
            "vijay_muhurta": aus.get("vijay_muhurta"),
            "godhuli_muhurta": aus.get("godhuli_muhurta"),
            "sayahna_sandhya": aus.get("sayahna_sandhya"),
            "nishita_muhurta": aus.get("nishita_muhurta"),
            "amrit_kalam": va["amrit_kalam"],
            "sarvartha_siddhi_yoga": siddhi["sarvartha_siddhi"],
            "amrita_siddhi_yoga": siddhi["amrita_siddhi"],
        },
        "inauspicious_timings": {
            "rahu_kalam": rahu,
            "yamaganda": yama,
            "gulika_kalam": gulika,
            "dur_muhurtam": dur_muhurtas,
            "bhadra": bhadra,
            "varjyam": va["varjyam"],
        },
        "udaya_lagna": udaya_iso,
        "chandrabalam": chandra,
        "tarabalam": tara,
        "shool_vasa": {
            "disha_shool": disha_shool,
            "rahu_vasa": rahu_vasa,
            "chandra_vasa": chandra_vasa,
        },
        "calendars": {
            "kali_year": kali_year,
            "kali_ahargana_days": kali_ahargana,
            "julian_day": julian_day,
            "modified_julian_day": modified_jd,
            "rata_die": rata_die,
            "ayanamsha_lahiri": round(ayanamsha, 6),
            "national_civil_date": {
                "month": civil["month"],
                "day": civil["day"],
                "shaka_year": civil["shaka_year"],
            },
            "national_nirayana_date": {
                "month": niriyana_month["month"],
                "day": niriyana_month["day"],
                "shaka_year": civil["shaka_year"],
            },
        },
    }


def _eight_segments(sunrise_jd, sunset_jd, tz):
    if not (sunrise_jd and sunset_jd):
        return None
    seg = (sunset_jd - sunrise_jd) / 8
    out = []
    for i in range(8):
        s = sunrise_jd + i * seg
        e = s + seg
        out.append({"start": _iso(s, tz), "end": _iso(e, tz)})
    return out
