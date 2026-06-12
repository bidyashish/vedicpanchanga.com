"""Tamil solar calendar (Nirayana / sidereal).

Converts a Gregorian date + IANA timezone into the Tamil weekday, date,
month and 60-year-cycle year name. The month boundaries are computed from
the Sun's sidereal longitude (Lahiri ayanāṁśa) — i.e. each month begins at
the actual sankranti when the Sun enters a new rashi, not from a fixed
April-14 boundary table. This matches Drik / Vakya Panchangam usage.

Cycle reference: Prabhava (id 1) corresponds to the Tamil year that
*starts* on the Mesha sankranti of Gregorian 1987 (Apr 14 1987 → Apr 13
1988). Verified against publicly available references — Apr 14 2026 →
Parabhava (id 40).
"""

from __future__ import annotations

from datetime import date as date_cls
from datetime import datetime
from typing import Any, Dict, Optional

import pytz
import swisseph as swe

from ayanamsa import sidereal_context


# ---- Tables ---------------------------------------------------------------

# 0 = Sunday, per the spec table.
_WEEKDAY_EN = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]
_WEEKDAY_TA = [
    "ஞாயிறு",
    "திங்கள்",
    "செவ்வாய்",
    "புதன்",
    "வியாழன்",
    "வெள்ளி",
    "சனி",
]

# Month id 1..12 maps to Mesha..Meena → Chithirai..Panguni.
_MONTH_EN = [
    "Chithirai",
    "Vaikasi",
    "Aani",
    "Aadi",
    "Avani",
    "Purattasi",
    "Aippasi",
    "Karthigai",
    "Margazhi",
    "Thai",
    "Maasi",
    "Panguni",
]
_MONTH_TA = [
    "சித்திரை",
    "வைகாசி",
    "ஆனி",
    "ஆடி",
    "ஆவணி",
    "புரட்டாசி",
    "ஐப்பசி",
    "கார்த்திகை",
    "மார்கழி",
    "தை",
    "மாசி",
    "பங்குனி",
]
_MONTH_RASHI = [
    "Mesha",
    "Rishabha",
    "Mithuna",
    "Kataka",
    "Simha",
    "Kanya",
    "Thula",
    "Vrischika",
    "Dhanusu",
    "Makara",
    "Kumbha",
    "Meena",
]

# 60-year cycle. Index 0 = Prabhava (id 1), index 59 = Akshaya (id 60).
_YEAR_EN = [
    "Prabhava",
    "Vibhava",
    "Shukla",
    "Pramodhoota",
    "Prajothpatti",
    "Aangirasa",
    "Shrimukha",
    "Bhava",
    "Yuva",
    "Dhata",
    "Eeswara",
    "Bahudhanya",
    "Pramathi",
    "Vikrama",
    "Vrisha",
    "Chitrabhanu",
    "Subhanu",
    "Tarana",
    "Parthiva",
    "Vyaya",
    "Sarvajit",
    "Sarvadhari",
    "Virodhi",
    "Vikruthi",
    "Khara",
    "Nandana",
    "Vijaya",
    "Jaya",
    "Manmadha",
    "Durmukhi",
    "Hevilambi",
    "Vilambi",
    "Vikari",
    "Sharvari",
    "Plava",
    "Subakrithu",
    "Sobakrithu",
    "Krodhi",
    "Vishvavasu",
    "Parabhava",
    "Plavanga",
    "Keelaka",
    "Saumya",
    "Sadharana",
    "Virodhikrithu",
    "Paridhavi",
    "Pramadeecha",
    "Ananda",
    "Rakshasa",
    "Nala",
    "Pingala",
    "Kalayukthi",
    "Siddharthi",
    "Raudra",
    "Durmathi",
    "Dundubhi",
    "Rudhirodgari",
    "Raktakshi",
    "Krodhana",
    "Akshaya",
]
_YEAR_TA = [
    "பிரபவ",
    "விபவ",
    "சுக்ல",
    "பிரமோதூத",
    "பிரஜோற்பத்தி",
    "ஆங்கீரச",
    "ஸ்ரீமுக",
    "பவ",
    "யுவ",
    "தாது",
    "ஈஸ்வர",
    "பகுதான்ய",
    "பிரமாதி",
    "விக்ரம",
    "விருஷ",
    "சித்திரபானு",
    "சுபானு",
    "தாரண",
    "பார்த்திவ",
    "வ்யய",
    "சர்வஜித்",
    "சர்வதாரி",
    "விரோதி",
    "விக்ருதி",
    "கர",
    "நந்தன",
    "விஜய",
    "ஜய",
    "மன்மத",
    "துர்முகி",
    "ஹேவிளம்பி",
    "விளம்பி",
    "விகாரி",
    "சார்வரி",
    "பிளவ",
    "சுபகிருது",
    "சோபகிருது",
    "குரோதி",
    "விஸ்வவாசு",
    "பராபவ",
    "பிளவங்க",
    "கீலக",
    "சௌம்ய",
    "சாதாரண",
    "விரோதிகிருது",
    "பரிதாவி",
    "பிரமாதீச",
    "ஆனந்த",
    "ராட்சச",
    "நள",
    "பிங்கள",
    "கலயுக்தி",
    "சித்தார்த்தி",
    "ரௌத்திர",
    "துர்மதி",
    "துந்துபி",
    "ருதிரோத்காரி",
    "ரக்தாட்சி",
    "க்ரோதன",
    "அக்ஷய",
]

# ---- Day classifications (issue #85) ----

# Nokku Naal - the 27 nakshatras split into three 9-star "facing" groups.
# Keys are 1-based nakshatra indices (Ashwini = 1 .. Revati = 27), matching
# constants.NAKSHATRAS. Verified against the classical Urdhva / Adho /
# Tiryang Mukha grouping used by Tamil panchangams.
_MEL_NOKKU = {4, 6, 8, 12, 21, 22, 23, 24, 26}
# = Rohini, Ardra, Pushya, Uttara Phalguni, Uttara Ashadha, Shravana,
#   Dhanishta, Shatabhisha, Uttara Bhadrapada
_KEEZH_NOKKU = {2, 3, 9, 10, 11, 16, 19, 20, 25}
# = Bharani, Krittika, Ashlesha, Magha, Purva Phalguni, Vishakha, Mula,
#   Purva Ashadha, Purva Bhadrapada
_SAMA_NOKKU = {1, 5, 7, 13, 14, 15, 17, 18, 27}
# = Ashwini, Mrigashira, Punarvasu, Hasta, Chitra, Swati, Anuradha,
#   Jyeshtha, Revati

_NOKKU_INFO = {
    "mel": {
        "en": "Mel Nokku Naal",
        "ta": "மேல் நோக்கு நாள்",
        "direction": "up",
        "arrow": "↑",
    },
    "keezh": {
        "en": "Keezh Nokku Naal",
        "ta": "கீழ் நோக்கு நாள்",
        "direction": "down",
        "arrow": "↓",
    },
    "sama": {
        "en": "Sama Nokku Naal",
        "ta": "சம நோக்கு நாள்",
        "direction": "neutral",
        "arrow": "↔",
    },
}

# Kari Naal - fixed inauspicious Tamil dates per month (1 = Chithirai ..
# 12 = Panguni); the same Tamil dates apply every year. Source: Tamil
# Wikipedia "கரிநாள் (சோதிடம்)", cross-checked with published Tamil daily
# calendars (dailycalendartamil.com 2025/2026 lists).
_KARI_NAAL = {
    1: {6, 15},
    2: {7, 16, 17},
    3: {1, 6},
    4: {2, 10, 20},
    5: {2, 9, 28},
    6: {16, 29},
    7: {6, 20},
    8: {1, 4, 10, 17},
    9: {6, 9, 11},
    10: {1, 2, 3, 11, 17},
    11: {15, 16, 17},
    12: {6, 15, 19},
}

# Thaniya Naal - two fixed Tamil dates per month on which, per Pancha
# Pakshi Shastra, all pakshis are inactive so new ventures are avoided.
# Printed-panchangam tradition (issue #85); regional variants exist for
# Aippasi (8, 19) and Thai (8, 15) - the primary set is used here.
_THANIYA_NAAL = {
    1: {3, 20},
    2: {9, 22},
    3: {8, 22},
    4: {7, 20},
    5: {7, 18},
    6: {9, 26},
    7: {3, 20},
    8: {8, 14},
    9: {8, 26},
    10: {3, 15},
    11: {15, 24},
    12: {18, 24},
}

# Anchor: the Tamil year that starts on the Mesha sankranti of Apr 14 1987 IST
# is Prabhava (id 1).
_CYCLE_ANCHOR_GREGORIAN = 1987

_SIDEREAL_FLAGS = swe.FLG_SIDEREAL | swe.FLG_SWIEPH


# ---- Helpers --------------------------------------------------------------


def _sun_sid(jd: float) -> float:
    """Sun's sidereal (Lahiri) longitude in [0, 360). Helpers in this module
    must run inside the sidereal_context taken by compute_tamil_calendar."""
    return swe.calc_ut(jd, swe.SUN, _SIDEREAL_FLAGS)[0][0] % 360


def _local_end_of_day_jd(d: date_cls, tz: pytz.BaseTzInfo) -> float:
    """JD (UT) at the last second of the given local calendar date.

    We pick *end* of the day (not noon) so the Drik rule "the calendar day
    of a sankranti is day 1 of the new month" holds even when the sankranti
    happens late in the day. E.g. Makara sankranti 2026 IST is 15:07 on
    Jan 14 — at noon Jan 14 the Sun is still in Dhanusu, but the day still
    counts as Thai 1.
    """
    end_local = tz.localize(datetime(d.year, d.month, d.day, 23, 59, 59))
    ut = end_local.astimezone(pytz.utc)
    return swe.julday(
        ut.year, ut.month, ut.day, ut.hour + ut.minute / 60 + ut.second / 3600
    )


def _jd_to_local_date(jd: float, tz: pytz.BaseTzInfo) -> date_cls:
    """Convert a UT JD to the calendar date in the given timezone."""
    y, m, d, h = swe.revjul(jd, swe.GREG_CAL)
    hour = int(h)
    minute = int((h - hour) * 60)
    second = int(round(((h - hour) * 60 - minute) * 60))
    if second >= 60:
        second -= 60
        minute += 1
    if minute >= 60:
        minute -= 60
        hour += 1
    ut = pytz.utc.localize(datetime(y, m, d, hour % 24, minute, second))
    return ut.astimezone(tz).date()


def _find_sankranti_jd(jd: float, sign_id: int) -> float:
    """JD at which the Sun most recently entered `sign_id` (1..12) on or
    before `jd`. Binary search on the 30° span starting at (sign_id-1)*30."""
    target_deg = (sign_id - 1) * 30
    sun_now = swe.calc_ut(jd, swe.SUN, _SIDEREAL_FLAGS)[0][0] % 360
    # Distance the Sun has travelled since entering this sign — at ~360°/yr.
    dist_into_sign = (sun_now - target_deg) % 360
    days_back = dist_into_sign * 365.25 / 360 + 2  # +2 d safety margin
    lo, hi = jd - days_back - 5, jd
    for _ in range(80):
        mid = (lo + hi) / 2
        s_mid = swe.calc_ut(mid, swe.SUN, _SIDEREAL_FLAGS)[0][0] % 360
        # Has the Sun crossed into [target_deg, target_deg+30) at mid?
        if (s_mid - target_deg) % 360 < 30:
            hi = mid
        else:
            lo = mid
        if hi - lo < 1e-7:
            break
    return hi


def _mesha_sankranti_jd(gregorian_year: int) -> float:
    """JD when the Sun crosses 0° sidereal Aries in `gregorian_year`
    (Tamil New Year — around April 13–15)."""
    lo = swe.julday(gregorian_year, 4, 9, 0.0)  # Sun deep in Meena
    hi = swe.julday(gregorian_year, 4, 19, 0.0)  # Sun safely in Mesha
    for _ in range(80):
        mid = (lo + hi) / 2
        s = swe.calc_ut(mid, swe.SUN, _SIDEREAL_FLAGS)[0][0] % 360
        if s < 30:
            hi = mid
        else:
            lo = mid
        if hi - lo < 1e-7:
            break
    return hi


def _cycle_index(cycle_year: int) -> int:
    """1..60 index in the 60-year Prabhava cycle."""
    return ((cycle_year - _CYCLE_ANCHOR_GREGORIAN) % 60 + 60) % 60 + 1


def nakshatra_nokku(nakshatra_index: Optional[int]) -> Optional[Dict[str, str]]:
    """Nokku Naal (facing-day) classification for a 1-based nakshatra index.

    Returns {type, en, ta, direction, arrow} or None when the index is
    missing / out of range.
    """
    if nakshatra_index in _MEL_NOKKU:
        kind = "mel"
    elif nakshatra_index in _KEEZH_NOKKU:
        kind = "keezh"
    elif nakshatra_index in _SAMA_NOKKU:
        kind = "sama"
    else:
        return None
    return {"type": kind, **_NOKKU_INFO[kind]}


# ---- Public entry point ---------------------------------------------------


def compute_tamil_calendar(
    date_iso: str,
    timezone_name: str = "Asia/Kolkata",
    nakshatra_index: Optional[int] = None,
) -> Dict[str, Any]:
    """Convert a Gregorian date (YYYY-MM-DD) into Tamil calendar fields.

    The month is the sidereal sign the Sun is in at local noon on
    ``date_iso``; the date is the count of local days since that sign's
    sankranti; the year is the cycle name of the Tamil year currently in
    progress (anchored to the most recent Mesha sankranti).

    ``nakshatra_index`` (1-based, the day's nakshatra at sunrise) enables
    the Nokku Naal classification; without it ``nokku_naal`` is None.
    """
    y, m, d = (int(x) for x in date_iso.split("-"))
    greg_date = date_cls(y, m, d)
    tz = pytz.timezone(timezone_name)

    # Tamil months follow sidereal (Lahiri) sankrantis. Pin the mode for the
    # whole computation; re-entrant when called from compute_detailed_panchang.
    with sidereal_context("lahiri"):
        jd = _local_end_of_day_jd(greg_date, tz)
        sun_lon = _sun_sid(jd)
        sign_id = int(sun_lon // 30) + 1  # 1..12 (Mesha=1)

        sankranti_jd = _find_sankranti_jd(jd, sign_id)
        sankranti_date = _jd_to_local_date(sankranti_jd, tz)
        tamil_date = (greg_date - sankranti_date).days + 1

        # Tamil-year cycle: compare local dates so the Apr-14-ish boundary is
        # treated consistently regardless of what time of day Mesha sankranti
        # happens to fall on.
        ms_date_this_year = _jd_to_local_date(_mesha_sankranti_jd(y), tz)
    cycle_year = y if greg_date >= ms_date_this_year else y - 1
    cycle_id = _cycle_index(cycle_year)

    # Spec weekday: 0 = Sunday … 6 = Saturday.
    weekday_idx = (greg_date.weekday() + 1) % 7

    month_idx = sign_id - 1
    return {
        "week_day": {
            "en": _WEEKDAY_EN[weekday_idx],
            "ta": _WEEKDAY_TA[weekday_idx],
        },
        "tamil_date": tamil_date,
        "tamil_month": {
            "id": sign_id,
            "en": _MONTH_EN[month_idx],
            "ta": _MONTH_TA[month_idx],
            "rashi": _MONTH_RASHI[month_idx],
        },
        "tamil_year": {
            "id": cycle_id,
            "name_en": _YEAR_EN[cycle_id - 1],
            "name_ta": _YEAR_TA[cycle_id - 1],
            "gregorian_start_year": cycle_year,
        },
        "month_start_iso": sankranti_date.isoformat(),
        "nokku_naal": nakshatra_nokku(nakshatra_index),
        "kari_naal": tamil_date in _KARI_NAAL[sign_id],
        "thaniya_naal": tamil_date in _THANIYA_NAAL[sign_id],
    }


def format_summary(tc: Dict[str, Any], gregorian_iso: Optional[str] = None) -> str:
    """Display string like 'Monday, 27 April 2026 → சித்திரை 14, பராபவ ஆண்டு'."""
    parts = []
    if gregorian_iso:
        try:
            d = date_cls.fromisoformat(gregorian_iso)
            parts.append(d.strftime("%A, %-d %B %Y"))
        except ValueError:
            parts.append(gregorian_iso)
    rhs = (
        f"{tc['tamil_month']['ta']} {tc['tamil_date']}, "
        f"{tc['tamil_year']['name_ta']} ஆண்டு"
    )
    return f"{parts[0]} → {rhs}" if parts else rhs
