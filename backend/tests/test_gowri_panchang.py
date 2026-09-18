"""Unit tests for backend/gowri_panchang.py.

Validates:
* the cycle has 8 names with no duplicates
* each weekday produces exactly 8 day + 8 night segments
* segment time spans add up to (sunset - sunrise) and (next_sunrise - sunset)
* the auspicious tag matches the AUSPICIOUS set verbatim
* Saturday day starts with 'Soram' (matches the example in the feature spec)
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from gowri_panchang import (
    AUSPICIOUS,
    GOWRI_DAY_START,
    GOWRI_NAMES,
    GOWRI_NIGHT_START,
    compute_gowri_panchang,
)


def test_cycle_has_8_unique_names():
    assert len(GOWRI_NAMES) == 8
    assert len(set(GOWRI_NAMES)) == 8


def test_auspicious_set_matches_user_spec():
    # Per the feature spec: 5 auspicious + 3 inauspicious.
    assert AUSPICIOUS == {"Amridha", "Sugam", "Labam", "Dhanam", "Uthi"}
    inauspicious = set(GOWRI_NAMES) - AUSPICIOUS
    assert inauspicious == {"Visham", "Rogam", "Soram"}


def test_all_weekdays_have_starts():
    for wd in range(1, 8):
        assert wd in GOWRI_DAY_START
        assert wd in GOWRI_NIGHT_START
        assert 0 <= GOWRI_DAY_START[wd] < 8
        assert 0 <= GOWRI_NIGHT_START[wd] < 8


def test_saturday_day_starts_with_soram():
    """The example in the feature spec shows the day starting with Soram —
    that's only consistent with a Saturday start (ISO weekday 6)."""
    assert GOWRI_NAMES[GOWRI_DAY_START[6]] == "Soram"


@pytest.mark.parametrize("weekday", range(1, 8))
def test_compute_returns_8_day_and_8_night_segments(weekday):
    sunrise = "2026-04-26T06:00:00+05:30"
    sunset = "2026-04-26T18:30:00+05:30"
    next_sunrise = "2026-04-27T06:01:00+05:30"
    g = compute_gowri_panchang(sunrise, sunset, next_sunrise, weekday, "Asia/Kolkata")
    assert len(g["day"]) == 8
    assert len(g["night"]) == 8


def test_segments_cover_full_day_and_night():
    sunrise = "2026-04-26T06:00:00+05:30"
    sunset = "2026-04-26T18:30:00+05:30"
    next_sunrise = "2026-04-27T06:01:00+05:30"
    g = compute_gowri_panchang(
        sunrise, sunset, next_sunrise, weekday_iso=6, timezone_name="Asia/Kolkata"
    )
    day_first_start = datetime.fromisoformat(g["day"][0]["start"])
    day_last_end = datetime.fromisoformat(g["day"][-1]["end"])
    assert day_first_start == datetime.fromisoformat(sunrise)
    # Allow for sub-second rounding when 12.5h is divided by 8.
    assert abs(day_last_end - datetime.fromisoformat(sunset)) < timedelta(
        microseconds=2
    )

    night_first_start = datetime.fromisoformat(g["night"][0]["start"])
    night_last_end = datetime.fromisoformat(g["night"][-1]["end"])
    assert night_first_start == datetime.fromisoformat(sunset)
    assert abs(night_last_end - datetime.fromisoformat(next_sunrise)) < timedelta(
        microseconds=2
    )


def test_auspicious_flag_is_set_consistently():
    g = compute_gowri_panchang(
        "2026-04-26T06:00:00+05:30",
        "2026-04-26T18:30:00+05:30",
        "2026-04-27T06:01:00+05:30",
        weekday_iso=6,
        timezone_name="Asia/Kolkata",
    )
    for seg in g["day"] + g["night"]:
        assert seg["auspicious"] is (seg["name"] in AUSPICIOUS)


def test_polar_day_returns_empty_lists():
    """At the poles a date can have no sunrise — function should not raise."""
    g = compute_gowri_panchang(
        sunrise_iso=None,
        sunset_iso=None,
        next_sunrise_iso=None,
        weekday_iso=1,
        timezone_name="UTC",
    )
    assert g == {"day": [], "night": []}


def test_saturday_chennai_matches_user_example_order():
    """Saturday in Chennai with sunrise ~06:23, sunset ~18:24 — ordering of
    day labels must match the example: Soram, Uthi, Visham, Amridha, Rogam,
    Labam, Dhanam, Sugam."""
    g = compute_gowri_panchang(
        sunrise_iso="2026-04-25T06:23:00+05:30",
        sunset_iso="2026-04-25T18:24:00+05:30",
        next_sunrise_iso="2026-04-26T06:22:00+05:30",
        weekday_iso=6,  # Saturday
        timezone_name="Asia/Kolkata",
    )
    names = [s["name"] for s in g["day"]]
    assert names == [
        "Soram",
        "Uthi",
        "Visham",
        "Amridha",
        "Rogam",
        "Labam",
        "Dhanam",
        "Sugam",
    ]
