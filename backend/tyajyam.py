"""Tyajyam (inauspicious time periods) calculations.

Computes multiple types of Tyajyam from panchang timing data:
- Nakshatra Tyajyam: ratio-based offset within nakshatra span, 96 min fixed
- Tithi Tyajyam: ratio-based offset within tithi span, 96 min fixed
- Vara Tyajyam: nazhigai offset from sunrise, 90 min fixed
- Amritadi Yogam: weekday + nakshatra lookup (Siddha/Amrita/Marana/Prabalarishta)
- Lagna Tyajyam: defective tenth of each rising sign (begin/middle/end by sign)
- Karana Tyajyam: spans of the inauspicious karanas (Vishti, Chatushpada, Naga)
- Gowri Tyajyam: inauspicious Gowri Panchangam segments (Soram, Visham, Rogam)
- Dosha Tyajyam: eclipses in the local day + Guru/Sukra Asthamanam (combustion)
- Tamil Month Avoidables: per-Tamil-month tithi/nakshatra/lagna avoid lists
- Tithi-Lagna Tyajyam: lagna transits unsuitable during specific tithis
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import swisseph as swe

from constants import NAKSHATRAS, TITHI_BASE

# ---- Nakshatra Tyajyam ----
# Each entry is (numerator, denominator) defining the start offset ratio.
# Tyajyam starts at (duration / denominator) * numerator from nakshatra start,
# then lasts exactly 96 minutes regardless of nakshatra span.
NAKSHATRA_TYAJYAM_RATIO: List[Tuple[int, int]] = [
    (5, 6),  # Ashwini
    (2, 5),  # Bharani
    (1, 2),  # Krittika
    (2, 3),  # Rohini
    (7, 30),  # Mrigashira
    (7, 20),  # Ardra
    (1, 2),  # Punarvasu
    (1, 3),  # Pushya
    (8, 15),  # Ashlesha
    (1, 2),  # Magha
    (1, 3),  # Purva Phalguni
    (3, 10),  # Uttara Phalguni
    (11, 30),  # Hasta
    (14, 15),  # Chitra
    (7, 30),  # Swati
    (7, 30),  # Vishakha
    (1, 6),  # Anuradha
    (7, 30),  # Jyeshtha
    (1, 3),  # Mula
    (2, 5),  # Purva Ashadha
    (1, 3),  # Uttara Ashadha
    (1, 6),  # Shravana
    (1, 6),  # Dhanishta
    (3, 10),  # Shatabhisha
    (4, 15),  # Purva Bhadrapada
    (2, 5),  # Uttara Bhadrapada
    (1, 2),  # Revati
]

NAKSHATRA_TYAJYAM_DURATION_MIN = 96.0
_TYAJYAM_DUR_JD = NAKSHATRA_TYAJYAM_DURATION_MIN / 1440.0  # in Julian days


def compute_nakshatra_tyajyam(
    nakshatras_with_bounds: List[Dict], iso_fn, tz
) -> List[Dict[str, Any]]:
    """Compute Nakshatra Tyajyam for each nakshatra active in the window.

    Args:
        nakshatras_with_bounds: [{nak_idx: 0-26, start_jd, end_jd}, ...]
        iso_fn: callable(jd, tz) -> ISO string
        tz: pytz timezone
    """
    results = []
    for n in nakshatras_with_bounds:
        nak_idx = n["nak_idx"]
        start_jd = n["start_jd"]
        end_jd = n["end_jd"]
        nak_span_jd = end_jd - start_jd
        if nak_span_jd <= 0:
            continue

        num, den = NAKSHATRA_TYAJYAM_RATIO[nak_idx]
        offset_jd = (nak_span_jd / den) * num
        t_start = start_jd + offset_jd
        t_end = t_start + _TYAJYAM_DUR_JD

        # Only include if tyajyam start falls within this nakshatra's window
        if t_start >= end_jd:
            continue

        results.append(
            {
                "start": iso_fn(max(t_start, start_jd), tz),
                "end": iso_fn(min(t_end, end_jd), tz),
                "nakshatra": NAKSHATRAS[nak_idx],
            }
        )
    return results


# ---- Tithi Tyajyam ----
# Ratio table for 30 tithis (index 1-30). Each is (numerator, denominator).
# Tithis 1-14 = Shukla Pratipada..Chaturdashi, 15 = Purnima,
# 16-29 = Krishna Pratipada..Chaturdashi, 30 = Amavasya.
# The ratio repeats for Shukla and Krishna phases (both use the same base-15 table).
_TITHI_TYAJYAM_BASE: List[Tuple[int, int]] = [
    (2, 5),  # Pratipada (1/16)
    (1, 5),  # Dwitiya (2/17)
    (11, 12),  # Tritiya (3/18)
    (1, 12),  # Chaturthi (4/19)
    (9, 10),  # Panchami (5/20)
    (9, 10),  # Shashthi (6/21)
    (31, 60),  # Saptami (7/22)
    (1, 3),  # Ashtami (8/23)
    (1, 12),  # Navami (9/24)
    (11, 20),  # Dashami (10/25)
    (1, 60),  # Ekadashi (11/26)
    (1, 4),  # Dwadashi (12/27)
    (13, 30),  # Trayodashi (13/28)
    (7, 60),  # Chaturdashi (14/29)
    (29, 60),  # Purnima (15) / Amavasya (30)
    (1, 10),  # Amavasya (30) - override below
]

TITHI_TYAJYAM_DURATION_MIN = 96.0
_TITHI_DUR_JD = TITHI_TYAJYAM_DURATION_MIN / 1440.0


def _tithi_ratio(t_idx: int) -> Tuple[int, int]:
    """Get Tyajyam ratio for tithi index 1-30."""
    if t_idx == 30:
        return (1, 10)  # Amavasya
    if t_idx == 15:
        return (29, 60)  # Purnima
    base = (t_idx - 1) % 15
    return _TITHI_TYAJYAM_BASE[base]


def compute_tithi_tyajyam(
    tithis_in_window: List[Dict], iso_fn, tz
) -> List[Dict[str, Any]]:
    """Compute Tithi Tyajyam for each tithi active in the window.

    Args:
        tithis_in_window: [{index: 1-30, name, start_jd, ends_at_jd}, ...]
        iso_fn: callable(jd, tz) -> ISO string
        tz: pytz timezone
    """
    results = []
    for t in tithis_in_window:
        t_idx = t["index"]
        start_jd = t["start_jd"]
        end_jd = t["ends_at_jd"]
        tithi_span_jd = end_jd - start_jd
        if tithi_span_jd <= 0:
            continue

        num, den = _tithi_ratio(t_idx)
        offset_jd = (tithi_span_jd / den) * num
        t_start = start_jd + offset_jd
        t_end = t_start + _TITHI_DUR_JD

        if t_start >= end_jd:
            continue

        results.append(
            {
                "start": iso_fn(max(t_start, start_jd), tz),
                "end": iso_fn(min(t_end, end_jd), tz),
                "tithi": t["name"],
            }
        )
    return results


# ---- Vara Tyajyam ----
# Start nazhigai from sunrise per weekday. 1 nazhigai = 24 minutes.
# Duration = 90 minutes (fixed).
# Keys: ISO weekday (1=Mon..7=Sun)
VARA_TYAJYAM_NAZHIGAI: Dict[int, int] = {
    1: 42,  # Monday
    2: 31,  # Tuesday
    3: 42,  # Wednesday
    4: 31,  # Thursday
    5: 21,  # Friday
    6: 14,  # Saturday
    7: 32,  # Sunday
}

VARA_TYAJYAM_DURATION_MIN = 90.0
_VARA_DUR_JD = VARA_TYAJYAM_DURATION_MIN / 1440.0
_NAZHIGAI_JD = 24.0 / 1440.0  # 1 nazhigai = 24 minutes in JD


def compute_vara_tyajyam(
    sunrise_jd: Optional[float], weekday_iso: int, iso_fn, tz
) -> Optional[Dict[str, Any]]:
    """Compute Vara Tyajyam for the given weekday.

    Args:
        sunrise_jd: Julian day of sunrise
        weekday_iso: ISO weekday (1=Mon..7=Sun)
        iso_fn: callable(jd, tz) -> ISO string
        tz: pytz timezone
    """
    if not sunrise_jd:
        return None
    nazhigai = VARA_TYAJYAM_NAZHIGAI.get(weekday_iso)
    if nazhigai is None:
        return None
    t_start = sunrise_jd + nazhigai * _NAZHIGAI_JD
    t_end = t_start + _VARA_DUR_JD
    return {
        "start": iso_fn(t_start, tz),
        "end": iso_fn(t_end, tz),
    }


# ---- Amritadi Yogam ----
# Weekday + Nakshatra combination lookup.
# Values: "Amrita", "Siddha", "Marana", "Prabalarishta"
# Row = nakshatra index 0-26, Column = ISO weekday 1-7
# Encoded as: A=Amrita, S=Siddha, M=Marana, P=Prabalarishta
_YOGAM_CODE = {
    "A": "Amrita",
    "S": "Siddha",
    "M": "Marana",
    "P": "Prabalarishta",
}

# [Sun(7), Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6)]
# Reordered to ISO weekday order: Mon(1)..Sun(7)
_AMRITADI_TABLE: List[str] = [
    # Mon  Tue  Wed  Thu  Fri  Sat  Sun   - Nakshatra
    "SSMASSA",  # 0  Ashwini
    "SSSSSSP",  # 1  Bharani
    "MSSAMSM",  # 2  Krittika (removed extra S)
    "AASSMMA",  # 3  Rohini
    "SSSSMSS",  # 4  Mrigashira
    "SSMSMSS",  # 5  Ardra
    "ASSASSS",  # 6  Punarvasu
    "SSSSSMS",  # 7  Pushya
    "SSSSSMM",  # 8  Ashlesha
    "MMSAMMA",  # 9  Magha
    "SSASSSS",  # 10 Purva Phalguni
    "SAASMMS",  # 11 Uttara Phalguni (removed extra A)
    "SSMSAMS",  # 12 Hasta (removed extra M)
    "PSSSSSM",  # 13 Chitra
    "ASSASSS",  # 14 Swati
    "MMMSSSM",  # 15 Vishakha
    "SMSSSSM",  # 16 Anuradha
    "SMSPMSM",  # 17 Jyeshtha (removed extra M)
    "SAMSSAS",  # 18 Mula (removed extra A)
    "MSASPSS",  # 19 Purva Ashadha
    "MPAAASS",  # 20 Uttara Ashadha (removed extra A)
    "ASSSSMA",  # 21 Shravana
    "SSSPSSM",  # 22 Dhanishta
    "SSMSMSA",  # 23 Shatabhisha
    "MMASSMM",  # 24 Purva Bhadrapada (removed extra S)
    "SASSSSS",  # 25 Uttara Bhadrapada (removed extra A)
    "SSMSSPA",  # 26 Revati
]


def compute_amritadi_yogam(
    nakshatras_with_bounds: List[Dict],
    weekday_iso: int,
    sunrise_jd: Optional[float],
    next_sunrise_jd: Optional[float],
    iso_fn,
    tz,
) -> List[Dict[str, Any]]:
    """Compute Amritadi Yogam for nakshatras active during this weekday.

    The yogam is valid for the portion of the nakshatra that overlaps with
    the current weekday (sunrise to next sunrise).

    Args:
        nakshatras_with_bounds: [{nak_idx: 0-26, start_jd, end_jd}, ...]
        weekday_iso: ISO weekday (1=Mon..7=Sun)
        sunrise_jd: Julian day of this day's sunrise
        next_sunrise_jd: Julian day of next day's sunrise
        iso_fn: callable(jd, tz) -> ISO string
        tz: pytz timezone
    """
    results = []
    day_start = sunrise_jd or (
        nakshatras_with_bounds[0]["start_jd"] if nakshatras_with_bounds else 0
    )
    day_end = next_sunrise_jd or (day_start + 1.0)

    col = weekday_iso - 1  # 0-indexed column for Mon..Sun

    for n in nakshatras_with_bounds:
        nak_idx = n["nak_idx"]
        row = _AMRITADI_TABLE[nak_idx]
        if col >= len(row):
            continue
        code = row[col]
        yogam = _YOGAM_CODE.get(code, "Siddha")

        # Clip nakshatra span to the weekday window
        seg_start = max(n["start_jd"], day_start)
        seg_end = min(n["end_jd"], day_end)
        if seg_start >= seg_end:
            continue

        results.append(
            {
                "start": iso_fn(seg_start, tz),
                "end": iso_fn(seg_end, tz),
                "nakshatra": NAKSHATRAS[nak_idx],
                "yogam": yogam,
            }
        )
    return results


# ---- Lagna Tyajyam ----
# Defective portion per rising sign group.
# "beginning" = first 10%, "middle" = middle 10%, "end" = last 10%
_LAGNA_DEFECT_POSITION: Dict[str, str] = {
    "Aries": "beginning",
    "Taurus": "beginning",
    "Virgo": "beginning",
    "Sagittarius": "beginning",
    "Gemini": "middle",
    "Leo": "middle",
    "Libra": "middle",
    "Aquarius": "middle",
    "Cancer": "end",
    "Scorpio": "end",
    "Capricorn": "end",
    "Pisces": "end",
}

_LAGNA_DEFECT_RATIO = 0.10  # 10% of lagna duration


def compute_lagna_tyajyam(udaya_lagnas: List[Dict], iso_fn, tz) -> List[Dict[str, Any]]:
    """Compute Lagna Tyajyam for each lagna transit in the window.

    Args:
        udaya_lagnas: [{sign, start_jd, end_jd}, ...] or similar structure
        iso_fn: callable(jd, tz) -> ISO string
        tz: pytz timezone

    Note: This requires lagna start/end JDs which are in udaya_lagna data.
    The current udaya_lagna structure may need adaptation.
    """
    results = []
    for i, lagna in enumerate(udaya_lagnas):
        sign = lagna.get("sign", "")
        position = _LAGNA_DEFECT_POSITION.get(sign)
        if not position:
            continue

        start_jd = lagna.get("start_jd")
        end_jd = lagna.get("end_jd")
        if not start_jd or not end_jd:
            continue

        span = end_jd - start_jd
        if span <= 0:
            continue

        defect_dur = span * _LAGNA_DEFECT_RATIO

        if position == "beginning":
            t_start = start_jd
            t_end = start_jd + defect_dur
        elif position == "middle":
            midpoint = start_jd + span / 2
            t_start = midpoint - defect_dur / 2
            t_end = midpoint + defect_dur / 2
        else:  # end
            t_end = end_jd
            t_start = end_jd - defect_dur

        results.append(
            {
                "start": iso_fn(t_start, tz),
                "end": iso_fn(t_end, tz),
                "sign": sign,
                "position": position,
            }
        )
    return results


# ---- Karana Tyajyam ----
# Vishti (Bhadra) is the classical avoid-at-all-costs karana; Chatushpada and
# Naga (two of the four fixed karanas around Amavasya) are likewise avoided
# for auspicious work. Shakuni and Kimstughna are mixed and not listed.
INAUSPICIOUS_KARANAS = {"Vishti", "Chatushpada", "Naga"}


def compute_karana_tyajyam(
    karanas_in_window: List[Dict], iso_fn, tz
) -> List[Dict[str, Any]]:
    """Spans of inauspicious karanas active in the window.

    Args:
        karanas_in_window: [{name, start_jd, ends_at_jd, ...}, ...]
        iso_fn: callable(jd, tz) -> ISO string
        tz: pytz timezone
    """
    results = []
    for k in karanas_in_window:
        if k.get("name") not in INAUSPICIOUS_KARANAS:
            continue
        start_jd = k.get("start_jd")
        end_jd = k.get("ends_at_jd")
        if not start_jd or not end_jd or start_jd >= end_jd:
            continue
        results.append(
            {
                "start": iso_fn(start_jd, tz),
                "end": iso_fn(end_jd, tz),
                "karana": k["name"],
            }
        )
    return results


# ---- Gowri Tyajyam ----


def compute_gowri_tyajyam(gowri: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Inauspicious Gowri Panchangam segments (Soram, Visham, Rogam).

    Pure filter over the already-computed gowri payload; each segment is
    {name, start, end, auspicious} so no recomputation is needed.
    """
    results = []
    for period in ("day", "night"):
        for seg in (gowri or {}).get(period) or []:
            if seg.get("auspicious"):
                continue
            results.append(
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "name": seg["name"],
                    "period": period,
                }
            )
    return results


# ---- Dosha-based Tyajyam ----
# Eclipses use Swiss Ephemeris geometric searches (no zodiac involved, so no
# sidereal_context needed). Asthamanam (heliacal combustion) compares planet
# and Sun longitudes - a difference, so tropical positions suffice too.
_GURU_ASTHAMANAM_ORB = 11.0  # classical combustion orb for Jupiter
_SUKRA_ASTHAMANAM_ORB_DIRECT = 10.0  # Venus direct
_SUKRA_ASTHAMANAM_ORB_RETRO = 8.0  # Venus retrograde


def _eclipse_window(tret, begin_slots, end_slots, day_start: float, day_end: float):
    """Clip an eclipse span to the local day window. Slot preference differs
    by type (solar glob: 2/3 = eclipse begin/end; lunar: 6/7 = penumbral
    begin/end, then 2/3 = partial); absent phases are 0.0 in tret, so fall
    through to the next slot and finally to the maximum instant."""
    peak = tret[0]
    begin = next((tret[i] for i in begin_slots if tret[i]), peak)
    end = next((tret[i] for i in end_slots if tret[i]), peak)
    return max(begin, day_start), min(end, day_end)


def compute_dosha_tyajyam(
    sunrise_jd: Optional[float],
    next_sunrise_jd: Optional[float],
    iso_fn,
    tz,
) -> List[Dict[str, Any]]:
    """Dosha periods active during the local day (sunrise to next sunrise):
    solar/lunar eclipses whose maximum falls in the window, and whole-day
    Guru/Sukra Asthamanam flags while Jupiter/Venus are combust."""
    if not sunrise_jd:
        return []
    day_start = sunrise_jd
    day_end = next_sunrise_jd or (sunrise_jd + 1.0)
    results: List[Dict[str, Any]] = []

    for finder, dosha, begin_slots, end_slots in (
        (swe.sol_eclipse_when_glob, "solar_eclipse", (2,), (3,)),
        (swe.lun_eclipse_when, "lunar_eclipse", (6, 2), (7, 3)),
    ):
        try:
            # Search forward from just before the window; an eclipse maximum
            # more than ~1.5 days back cannot reach into this local day.
            _, tret = finder(day_start - 1.5, swe.FLG_SWIEPH, 0, False)
        except Exception:
            continue
        if not (day_start <= tret[0] < day_end):
            continue
        w_start, w_end = _eclipse_window(
            tret, begin_slots, end_slots, day_start, day_end
        )
        results.append(
            {
                "start": iso_fn(w_start, tz),
                "end": iso_fn(w_end, tz),
                "dosha": dosha,
            }
        )

    mid_jd = (day_start + day_end) / 2
    try:
        sun_lon = swe.calc_ut(mid_jd, swe.SUN, swe.FLG_SWIEPH)[0][0]
        for planet_id, dosha in (
            (swe.JUPITER, "guru_asthamanam"),
            (swe.VENUS, "sukra_asthamanam"),
        ):
            pos = swe.calc_ut(mid_jd, planet_id, swe.FLG_SWIEPH | swe.FLG_SPEED)[0]
            lon, speed = pos[0], pos[3]
            if planet_id == swe.JUPITER:
                orb = _GURU_ASTHAMANAM_ORB
            else:
                orb = (
                    _SUKRA_ASTHAMANAM_ORB_RETRO
                    if speed < 0
                    else _SUKRA_ASTHAMANAM_ORB_DIRECT
                )
            elongation = abs((lon - sun_lon + 180.0) % 360.0 - 180.0)
            if elongation <= orb:
                results.append(
                    {
                        "start": iso_fn(day_start, tz),
                        "end": iso_fn(day_end, tz),
                        "dosha": dosha,
                    }
                )
    except Exception:
        pass

    return results


# ---- Tamil Month Avoidables ----
# Per Tamil solar month (1 = Chithirai .. 12 = Panguni): tithis, nakshatras
# and lagnas traditionally avoided for muhurta in that month. Names follow
# the repo spellings in constants.py (TITHI_BASE / NAKSHATRAS) and the
# English sign names used by udaya_lagna.
TAMIL_MONTH_AVOIDABLES: Dict[int, Dict[str, List[str]]] = {
    1: {  # Chithirai
        "tithis": ["Ashtami", "Ekadashi"],
        "nakshatras": ["Rohini", "Ashwini"],
        "lagnas": ["Aries"],
    },
    2: {  # Vaikasi
        "tithis": ["Dwadashi"],
        "nakshatras": ["Chitra", "Swati", "Uttara Ashadha"],
        "lagnas": ["Gemini"],
    },
    3: {  # Aani
        "tithis": ["Trayodashi"],
        "nakshatras": ["Punarvasu"],
        "lagnas": ["Taurus"],
    },
    4: {  # Aadi
        "tithis": ["Shashthi"],
        "nakshatras": ["Purva Phalguni", "Dhanishta"],
        "lagnas": ["Gemini"],
    },
    5: {  # Avani
        "tithis": ["Purnima"],
        "nakshatras": ["Purva Ashadha"],
        "lagnas": ["Aries"],
    },
    6: {  # Purattasi
        "tithis": ["Saptami"],
        "nakshatras": ["Revati", "Shatabhisha"],
        "lagnas": ["Virgo"],
    },
    7: {  # Aippasi
        "tithis": ["Navami"],
        "nakshatras": ["Purva Bhadrapada"],
        "lagnas": ["Scorpio"],
    },
    8: {  # Karthigai
        "tithis": ["Panchami"],
        "nakshatras": ["Magha", "Pushya", "Mrigashira", "Krittika"],
        "lagnas": ["Libra"],
    },
    9: {  # Margazhi
        "tithis": ["Dwitiya", "Navami"],
        "nakshatras": ["Anuradha", "Purva Bhadrapada", "Vishakha"],
        "lagnas": ["Sagittarius"],
    },
    10: {  # Thai
        "tithis": ["Pratipada"],
        "nakshatras": ["Hasta", "Ashlesha", "Ardra"],
        "lagnas": ["Cancer"],
    },
    11: {  # Maasi
        "tithis": ["Chaturthi", "Dashami"],
        "nakshatras": ["Shravana", "Mula"],
        "lagnas": ["Capricorn"],
    },
    12: {  # Panguni
        "tithis": ["Chaturdashi"],
        "nakshatras": ["Jyeshtha", "Bharani"],
        "lagnas": ["Leo"],
    },
}


def _tithi_base_name(index: int) -> str:
    """Paksha-free ordinal name for tithi index 1-30."""
    if index == 15:
        return "Purnima"
    if index == 30:
        return "Amavasya"
    return TITHI_BASE[(index - 1) % 15]


def compute_tamil_month_avoidables(
    tamil_month_id: Optional[int],
    tithis_in_window: List[Dict],
    nakshatras_with_bounds: List[Dict],
    udaya_lagnas: List[Dict],
    iso_fn,
    tz,
) -> Optional[Dict[str, Any]]:
    """Avoid lists for the running Tamil month plus concrete windows where
    today's tithis / nakshatras / lagna transits match those lists."""
    info = TAMIL_MONTH_AVOIDABLES.get(tamil_month_id or 0)
    if not info:
        return None

    windows: List[Dict[str, Any]] = []
    for t in tithis_in_window:
        name = _tithi_base_name(t["index"])
        if name in info["tithis"]:
            windows.append(
                {
                    "start": iso_fn(t["start_jd"], tz),
                    "end": iso_fn(t["ends_at_jd"], tz),
                    "kind": "tithi",
                    "name": name,
                }
            )
    for n in nakshatras_with_bounds:
        name = NAKSHATRAS[n["nak_idx"]]
        if name in info["nakshatras"]:
            windows.append(
                {
                    "start": iso_fn(n["start_jd"], tz),
                    "end": iso_fn(n["end_jd"], tz),
                    "kind": "nakshatra",
                    "name": name,
                }
            )
    for lagna in udaya_lagnas:
        sign = lagna.get("sign")
        if sign in info["lagnas"] and lagna.get("start_jd") and lagna.get("end_jd"):
            windows.append(
                {
                    "start": iso_fn(lagna["start_jd"], tz),
                    "end": iso_fn(lagna["end_jd"], tz),
                    "kind": "lagna",
                    "name": sign,
                }
            )

    return {
        "avoid_tithis": info["tithis"],
        "avoid_nakshatras": info["nakshatras"],
        "avoid_lagnas": info["lagnas"],
        "windows": windows,
    }


# ---- Tithi-based Avoidable Lagnas ----
# During a given tithi, muhurta should avoid these rising signs. Keyed by the
# paksha-free tithi ordinal; Dashami, Purnima and Amavasya carry no rule.
TITHI_AVOIDABLE_LAGNAS: Dict[str, List[str]] = {
    "Pratipada": ["Taurus", "Leo"],
    "Dwitiya": ["Gemini", "Virgo"],
    "Tritiya": ["Leo", "Scorpio"],
    "Chaturthi": ["Aquarius", "Aries"],
    "Panchami": ["Gemini", "Virgo"],
    "Shashthi": ["Taurus", "Leo"],
    "Saptami": ["Gemini", "Capricorn"],
    "Ashtami": ["Virgo", "Gemini"],
    "Navami": ["Scorpio", "Sagittarius"],
    "Ekadashi": ["Gemini", "Virgo"],
    "Dwadashi": ["Taurus", "Leo"],
    "Trayodashi": ["Aries", "Scorpio"],
    "Chaturdashi": ["Virgo", "Gemini", "Taurus", "Leo"],
}


def compute_tithi_lagna_tyajyam(
    tithis_in_window: List[Dict],
    udaya_lagnas: List[Dict],
    iso_fn,
    tz,
) -> List[Dict[str, Any]]:
    """Windows where an avoidable lagna for the running tithi is rising:
    the intersection of each tithi span with the day's lagna transits."""
    results = []
    for t in tithis_in_window:
        base = _tithi_base_name(t["index"])
        avoid = TITHI_AVOIDABLE_LAGNAS.get(base)
        if not avoid:
            continue
        for lagna in udaya_lagnas:
            if lagna.get("sign") not in avoid:
                continue
            start_jd = lagna.get("start_jd")
            end_jd = lagna.get("end_jd")
            if not start_jd or not end_jd:
                continue
            seg_start = max(t["start_jd"], start_jd)
            seg_end = min(t["ends_at_jd"], end_jd)
            if seg_start >= seg_end:
                continue
            results.append(
                {
                    "start": iso_fn(seg_start, tz),
                    "end": iso_fn(seg_end, tz),
                    "tithi": base,
                    "sign": lagna["sign"],
                }
            )
    return results


# ---- Combined entry point ----


def compute_tyajyam(
    nakshatras_with_bounds: List[Dict],
    tithis_in_window: List[Dict],
    sunrise_jd: Optional[float],
    next_sunrise_jd: Optional[float],
    weekday_iso: int,
    iso_fn,
    tz,
) -> Dict[str, Any]:
    """Compute all Tyajyam types for a panchang day.

    Returns:
        {
            "nakshatra_tyajyam": [...],
            "tithi_tyajyam": [...],
            "vara_tyajyam": {...} or None,
            "amritadi_yogam": [...],
        }
    """
    return {
        "nakshatra_tyajyam": compute_nakshatra_tyajyam(
            nakshatras_with_bounds, iso_fn, tz
        ),
        "tithi_tyajyam": compute_tithi_tyajyam(tithis_in_window, iso_fn, tz),
        "vara_tyajyam": compute_vara_tyajyam(sunrise_jd, weekday_iso, iso_fn, tz),
        "amritadi_yogam": compute_amritadi_yogam(
            nakshatras_with_bounds, weekday_iso, sunrise_jd, next_sunrise_jd, iso_fn, tz
        ),
    }
