"""Monthly Tarabala and Chandrabala calculations."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pytz
import swisseph as swe
from timezonefinder import TimezoneFinder

from advanced_panchang import _iso, _moonsigns_in_window, _nakshatras_in_window
from ayanamsa import sidereal_context
from constants import NAKSHATRAS, SIGNS
from panchang_constants import GOOD_CHANDRA_OFFSETS, RASHI_NAMES

TARA_NAMES = (
    "janma",
    "sampat",
    "vipat",
    "kshema",
    "pratyak",
    "sadhana",
    "naidhana",
    "mitra",
    "parama_mitra",
)
FAVORABLE_TARAS = {2, 4, 6, 8, 9}
TARA_GUIDANCE = {
    "janma": {
        "result": "Mental tension & danger to body.",
        "do": "Perform routine, low-risk tasks. Be mindful.",
        "dont": "Start new ventures, travel, or make critical decisions.",
    },
    "sampat": {
        "result": "Wealth, prosperity, and gain.",
        "do": "Engage in financial activities, investments, and start important work.",
        "dont": "Be reckless with money; assess opportunities carefully.",
    },
    "vipat": {
        "result": "Dangers, accidents, and losses.",
        "do": "Be extra cautious in all activities, especially travel and finances.",
        "dont": "Take risks, start new projects, or get into conflicts.",
    },
    "kshema": {
        "result": "Well-being, prosperity, and security.",
        "do": "Travel, seek medical help, build relationships, and work on well-being.",
        "dont": "Neglect your health or take peace for granted.",
    },
    "pratyak": {
        "result": "Obstacles, enmity, and opposition.",
        "do": "Keep a low profile, work independently.",
        "dont": "Start partnerships, seek favors, or engage in arguments.",
    },
    "sadhana": {
        "result": "Achievement, success, and goals realized.",
        "do": "Pursue goals, start learning, and put in efforts for success.",
        "dont": "Postpone important work or doubt your abilities.",
    },
    "naidhana": {
        "result": "Danger, suffering, highly unfavorable.",
        "do": "Meditate, pray, and perform only essential duties.",
        "dont": "Engage in any important activity. Avoid travel at all costs.",
    },
    "mitra": {
        "result": "Help from friends and favorable outcomes.",
        "do": "Network, collaborate, and engage in social activities.",
        "dont": "Isolate yourself or mistrust others' intentions.",
    },
    "parama_mitra": {
        "result": "Extremely favorable, great friendships, and success.",
        "do": "Engage in any auspicious activity; excellent for major life events.",
        "dont": "Miss opportunities due to inaction.",
    },
}
CHANDRABALA_GUIDANCE = {
    True: {
        "result": "Good mental strength, positive thoughts, success in endeavors.",
        "do": "Make important decisions, start new tasks, and interact with people.",
        "dont": "Let overconfidence lead to carelessness.",
    },
    False: {
        "result": "Mental anxiety, confusion, negative thoughts, and indecisiveness.",
        "do": "Practice patience, meditate, and stick to routine tasks.",
        "dont": "Make major decisions, get into arguments, or start new ventures.",
    },
}
_TF = TimezoneFinder()


def tarabala(birth_nakshatra_id: int, current_nakshatra_id: int) -> Dict[str, Any]:
    """Return the inclusive nine-Tara relationship between two nakshatras."""
    if not 1 <= birth_nakshatra_id <= 27 or not 1 <= current_nakshatra_id <= 27:
        raise ValueError("Nakshatra IDs must be between 1 and 27")
    count = (current_nakshatra_id - birth_nakshatra_id) % 27 + 1
    tara_number = (count - 1) % 9 + 1
    tara = TARA_NAMES[tara_number - 1]
    return {
        "count": count,
        "cycle": (count - 1) // 9 + 1,
        "tara_number": tara_number,
        "tara": tara,
        "favorable": tara_number in FAVORABLE_TARAS,
        **TARA_GUIDANCE[tara],
    }


def chandrabala(birth_rashi_id: int, current_rashi_id: int) -> Dict[str, Any]:
    """Return the current Moon sign's inclusive house from the birth Moon sign."""
    if not 1 <= birth_rashi_id <= 12 or not 1 <= current_rashi_id <= 12:
        raise ValueError("Rashi IDs must be between 1 and 12")
    house = (current_rashi_id - birth_rashi_id) % 12 + 1
    favorable = house - 1 in GOOD_CHANDRA_OFFSETS
    return {
        "house": house,
        "favorable": favorable,
        **CHANDRABALA_GUIDANCE[favorable],
    }


def _julian_day(value: datetime) -> float:
    utc = value.astimezone(pytz.utc)
    hour = (
        utc.hour + utc.minute / 60 + utc.second / 3600 + utc.microsecond / 3_600_000_000
    )
    return swe.julday(utc.year, utc.month, utc.day, hour)


def _common_windows(
    taras: List[Tuple[float, float, bool]],
    chandras: List[Tuple[float, float, bool]],
    tz: pytz.BaseTzInfo,
) -> List[Dict[str, str]]:
    windows: List[Tuple[float, float]] = []
    for tara_start, tara_end, tara_good in taras:
        if not tara_good:
            continue
        for chandra_start, chandra_end, chandra_good in chandras:
            start, end = max(tara_start, chandra_start), min(tara_end, chandra_end)
            if chandra_good and start < end:
                if windows and start - windows[-1][1] < 1e-7:
                    windows[-1] = (windows[-1][0], max(windows[-1][1], end))
                else:
                    windows.append((start, end))
    return [{"start": _iso(start, tz), "end": _iso(end, tz)} for start, end in windows]


def calculate_bala_range(
    start_date: str,
    end_date: str,
    birth_rashi_id: int,
    birth_nakshatra_id: int,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Calculate exact local civil-day Tarabala and Chandrabala intervals."""
    try:
        first_day = date.fromisoformat(start_date)
        last_day = date.fromisoformat(end_date)
    except ValueError as exc:
        raise ValueError("Dates must use YYYY-MM-DD format") from exc
    day_count = (last_day - first_day).days + 1
    if day_count < 1:
        raise ValueError("End date must be on or after start date")
    if day_count > 120:
        raise ValueError("Date range cannot exceed 120 days")
    if not 1 <= birth_rashi_id <= 12:
        raise ValueError("Birth rashi ID must be between 1 and 12")
    if not 1 <= birth_nakshatra_id <= 27:
        raise ValueError("Birth nakshatra ID must be between 1 and 27")
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("Invalid latitude or longitude")

    timezone_name = (
        timezone_name or _TF.timezone_at(lat=latitude, lng=longitude) or "UTC"
    )
    try:
        tz = pytz.timezone(timezone_name)
    except pytz.UnknownTimeZoneError as exc:
        raise ValueError(f"Unknown timezone: {timezone_name}") from exc

    days: List[Dict[str, Any]] = []
    with sidereal_context("lahiri"):
        for day_offset in range(day_count):
            current_date = first_day + timedelta(days=day_offset)
            next_date = current_date + timedelta(days=1)
            start_jd = _julian_day(
                tz.localize(datetime.combine(current_date, datetime.min.time()))
            )
            end_jd = _julian_day(
                tz.localize(datetime.combine(next_date, datetime.min.time()))
            )

            tara_segments = []
            tara_intervals: List[Tuple[float, float, bool]] = []
            for segment in _nakshatras_in_window(start_jd, end_jd):
                start = max(start_jd, segment["start_jd"])
                end = min(end_jd, segment["ends_at_jd"])
                if start >= end:
                    continue
                result = tarabala(birth_nakshatra_id, segment["index"])
                tara_segments.append(
                    {
                        "start": _iso(start, tz),
                        "end": _iso(end, tz),
                        "nakshatra_id": segment["index"],
                        "nakshatra": segment["name"],
                        **result,
                    }
                )
                tara_intervals.append((start, end, result["favorable"]))

            chandra_segments = []
            chandra_intervals: List[Tuple[float, float, bool]] = []
            cursor = start_jd
            for segment in _moonsigns_in_window(start_jd, end_jd):
                end = min(end_jd, segment["ends_at_jd"])
                result = chandrabala(birth_rashi_id, segment["index"])
                chandra_segments.append(
                    {
                        "start": _iso(cursor, tz),
                        "end": _iso(end, tz),
                        "rashi_id": segment["index"],
                        "sign": segment["name"],
                        "rashi": segment["rashi"],
                        **result,
                    }
                )
                chandra_intervals.append((cursor, end, result["favorable"]))
                cursor = end

            days.append(
                {
                    "date": current_date.isoformat(),
                    "tarabala": tara_segments,
                    "chandrabala": chandra_segments,
                    "favorable_windows": _common_windows(
                        tara_intervals, chandra_intervals, tz
                    ),
                }
            )

    return {
        "date_range": {
            "start_date": start_date,
            "end_date": end_date,
            "days": day_count,
        },
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone_name,
        },
        "birth": {
            "rashi_id": birth_rashi_id,
            "rashi": RASHI_NAMES[birth_rashi_id - 1],
            "sign": SIGNS[birth_rashi_id - 1],
            "nakshatra_id": birth_nakshatra_id,
            "nakshatra": NAKSHATRAS[birth_nakshatra_id - 1],
        },
        "rules": {
            "ayanamsa": "lahiri",
            "day_boundary": "local_midnight",
            "favorable_taras": sorted(FAVORABLE_TARAS),
            "favorable_chandra_houses": [1, 3, 6, 7, 10, 11],
        },
        "favorable_days": sum(bool(day["favorable_windows"]) for day in days),
        "days": days,
    }
