"""Regression tests for Dur Muhurtam vs Abhijit Muhurta (issue #97).

Abhijit is always the 8th of the 15 daytime muhurtas (centered on solar noon).
The Dur Muhurtam muhurta indices per weekday are verified against
drikpanchang.com (New Delhi, June 2026). The key bug was that some weekdays'
Dur Muhurtam landed on the 8th muhurta - the same window as Abhijit - so an
identical time range showed up as both auspicious and inauspicious. On
Wednesday the 8th muhurta IS the Dur Muhurtam, so Abhijit is suppressed; on the
other weekdays the two must never coincide.
"""

from __future__ import annotations

import pytz

from advanced_panchang import compute_detailed_panchang
from panchang_constants import ABHIJIT_MUHURTA_INDEX, DUR_MUHURTA

# New Delhi.
LAT, LON, TZ = 28.6139, 77.2090, "Asia/Kolkata"

# Verified against drikpanchang.com daily panchang, week of 2026-06-15.
# date -> (weekday name, expected Dur Muhurtam muhurta indices, abhijit present?)
WEEK = {
    "2026-06-22": ("Monday", [9, 12], True),
    "2026-06-23": ("Tuesday", [4], True),
    "2026-06-17": ("Wednesday", [8], False),  # Abhijit suppressed
    "2026-06-18": ("Thursday", [6], True),
    "2026-06-19": ("Friday", [4], True),
    "2026-06-20": ("Saturday", [1, 2], True),
    "2026-06-21": ("Sunday", [14], True),
}


def _panchang(date: str) -> dict:
    return compute_detailed_panchang(
        target_date=date, latitude=LAT, longitude=LON, timezone_name=TZ
    )


def test_abhijit_index_constant():
    # Abhijit is, by definition, the middle of 15 daytime muhurtas.
    assert ABHIJIT_MUHURTA_INDEX == 8


def test_table_matches_drikpanchang():
    # isoweekday: Mon=1..Sun=7
    expected = {
        1: [9, 12],
        2: [4],
        3: [8],
        4: [6],
        5: [4],
        6: [1, 2],
        7: [14],
    }
    assert DUR_MUHURTA == expected


def test_dur_muhurtam_indices_per_weekday():
    for date, (name, indices, _) in WEEK.items():
        p = _panchang(date)
        assert p["vara"]["english"] == name, f"{date} expected {name}"
        got = [d["muhurta_number"] for d in p["inauspicious_timings"]["dur_muhurtam"]]
        assert got == indices, f"{name}: dur muhurtam {got} != {indices}"


def test_abhijit_suppressed_on_wednesday():
    p = _panchang("2026-06-17")
    assert p["vara"]["english"] == "Wednesday"
    assert p["auspicious_timings"]["abhijit"] is None


def test_abhijit_present_other_weekdays():
    for date, (name, _, has_abhijit) in WEEK.items():
        if not has_abhijit:
            continue
        p = _panchang(date)
        ab = p["auspicious_timings"]["abhijit"]
        assert ab and ab.get("start") and ab.get("end"), f"{name} should have Abhijit"


def test_abhijit_never_equals_a_dur_muhurtam_window():
    """The core invariant from issue #97: the same exact window must never be
    reported as both auspicious (Abhijit) and inauspicious (Dur Muhurtam)."""
    for date, (name, _, _) in WEEK.items():
        p = _panchang(date)
        ab = p["auspicious_timings"]["abhijit"]
        if ab is None:
            continue  # suppressed - trivially no clash
        for d in p["inauspicious_timings"]["dur_muhurtam"]:
            same = d["start"] == ab["start"] and d["end"] == ab["end"]
            assert not same, f"{name}: Abhijit overlaps Dur Muhurtam at {ab['start']}"


def test_abhijit_centered_on_noon_when_present():
    from datetime import datetime

    tz = pytz.timezone(TZ)  # noqa: F841 - sanity that tz id is valid
    for date, (name, _, has_abhijit) in WEEK.items():
        if not has_abhijit:
            continue
        p = _panchang(date)
        ab = p["auspicious_timings"]["abhijit"]
        sm = p["sun_moon"]
        sr = datetime.fromisoformat(sm["sunrise"])
        ss = datetime.fromisoformat(sm["sunset"])
        center = (
            datetime.fromisoformat(ab["start"])
            + (datetime.fromisoformat(ab["end"]) - datetime.fromisoformat(ab["start"]))
            / 2
        )
        midday = sr + (ss - sr) / 2
        assert abs((center - midday).total_seconds()) < 60, name
