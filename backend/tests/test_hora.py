"""Unit tests for backend/hora.py.

Validates:
* the cycle has the 7 visible planets in Chaldean order
* each weekday's first day-hora is the day-lord
* day = 12 segments, night = 12 segments
* night seamlessly continues the planetary cycle from the day's last hora
* auspicious tag matches the spec (Jupiter/Venus/Mercury/Moon)
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from hora import (
    AUSPICIOUS,
    HORA_CYCLE,
    HORA_DAY_START,
    compute_hora,
)

# Standard "day-lord = first-hora-lord" mapping, ISO weekday → planet name.
DAY_LORD = {
    1: "Moon",  # Mon
    2: "Mars",  # Tue
    3: "Mercury",  # Wed
    4: "Jupiter",  # Thu
    5: "Venus",  # Fri
    6: "Saturn",  # Sat
    7: "Sun",  # Sun
}


def test_cycle_is_chaldean_order():
    assert HORA_CYCLE == [
        "Sun",
        "Venus",
        "Mercury",
        "Moon",
        "Saturn",
        "Jupiter",
        "Mars",
    ]


def test_auspicious_set_matches_spec():
    assert AUSPICIOUS == {"Jupiter", "Venus", "Mercury", "Moon"}
    inauspicious = set(HORA_CYCLE) - AUSPICIOUS
    assert inauspicious == {"Saturn", "Mars", "Sun"}


@pytest.mark.parametrize("weekday,planet", DAY_LORD.items())
def test_first_day_hora_is_day_lord(weekday, planet):
    assert HORA_CYCLE[HORA_DAY_START[weekday]] == planet


@pytest.mark.parametrize("weekday", range(1, 8))
def test_compute_returns_12_day_and_12_night_segments(weekday):
    g = compute_hora(
        sunrise_iso="2026-04-26T06:00:00+05:30",
        sunset_iso="2026-04-26T18:30:00+05:30",
        next_sunrise_iso="2026-04-27T06:01:00+05:30",
        weekday_iso=weekday,
        timezone_name="Asia/Kolkata",
    )
    assert len(g["day"]) == 12
    assert len(g["night"]) == 12


def test_segments_cover_full_day_and_night():
    sunrise = "2026-04-26T06:00:00+05:30"
    sunset = "2026-04-26T18:30:00+05:30"
    next_sunrise = "2026-04-27T06:01:00+05:30"
    g = compute_hora(
        sunrise, sunset, next_sunrise, weekday_iso=7, timezone_name="Asia/Kolkata"
    )
    assert datetime.fromisoformat(g["day"][0]["start"]) == datetime.fromisoformat(
        sunrise
    )
    assert abs(
        datetime.fromisoformat(g["day"][-1]["end"]) - datetime.fromisoformat(sunset)
    ) < timedelta(microseconds=2)
    assert datetime.fromisoformat(g["night"][0]["start"]) == datetime.fromisoformat(
        sunset
    )
    assert abs(
        datetime.fromisoformat(g["night"][-1]["end"])
        - datetime.fromisoformat(next_sunrise)
    ) < timedelta(microseconds=2)


def test_night_continues_planetary_cycle_from_day():
    """The 7-planet cycle should not reset at sunset — night-hora-1's planet
    must be the planet that *would* come next in the cycle after the day's
    last hora (12 day-horas advance the cycle by 12 mod 7 = 5)."""
    g = compute_hora(
        sunrise_iso="2026-04-26T06:00:00+05:30",
        sunset_iso="2026-04-26T18:30:00+05:30",
        next_sunrise_iso="2026-04-27T06:01:00+05:30",
        weekday_iso=7,  # Sunday — day starts with Sun (idx 0)
        timezone_name="Asia/Kolkata",
    )
    # Day hora 12 = idx (0 + 11) % 7 = 4 = Saturn
    assert g["day"][-1]["name"] == "Saturn"
    # Night hora 1 = idx (0 + 12) % 7 = 5 = Jupiter
    assert g["night"][0]["name"] == "Jupiter"


def test_auspicious_flag_is_set_consistently():
    g = compute_hora(
        sunrise_iso="2026-04-26T06:00:00+05:30",
        sunset_iso="2026-04-26T18:30:00+05:30",
        next_sunrise_iso="2026-04-27T06:01:00+05:30",
        weekday_iso=4,
        timezone_name="Asia/Kolkata",
    )
    for seg in g["day"] + g["night"]:
        assert seg["auspicious"] is (seg["name"] in AUSPICIOUS)


def test_polar_returns_empty_lists():
    g = compute_hora(None, None, None, 1, "UTC")
    assert g == {"day": [], "night": []}


def test_sunday_first_day_hora_is_sun():
    """Iconic case: Ravivara → first hora is Sun."""
    g = compute_hora(
        sunrise_iso="2026-04-26T06:00:00+05:30",
        sunset_iso="2026-04-26T18:30:00+05:30",
        next_sunrise_iso="2026-04-27T06:01:00+05:30",
        weekday_iso=7,
        timezone_name="Asia/Kolkata",
    )
    assert g["day"][0]["name"] == "Sun"
    assert g["day"][0]["auspicious"] is False  # Sun is inauspicious per spec
