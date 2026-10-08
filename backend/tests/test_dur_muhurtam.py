"""Regression tests for Dur Muhurtam vs Abhijit / Vijaya Muhurta (issue #97).

Abhijit is always the 8th of the 15 daytime muhurtas (centred on solar noon)
and Vijaya the 11th. Dur Muhurtam is one or two daytime muhurtas per weekday
plus, on Tuesday, the 7th muhurta of the night. Every window below is pinned
to drikpanchang.com (New Delhi) for days in Feb, Jun and Oct 2026. On
Wednesday the 8th muhurta IS the Dur Muhurtam, so Abhijit is suppressed; on
every other weekday neither Abhijit nor Vijaya may coincide with a Dur
Muhurtam window.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from advanced_panchang import compute_detailed_panchang
from panchang_constants import ABHIJIT_MUHURTA_INDEX, DUR_MUHURTA, DUR_MUHURTA_NIGHT

# New Delhi.
LAT, LON, TZ = 28.6139, 77.2090, "Asia/Kolkata"

# drikpanchang.com day panchang, New Delhi (geoname-id 1261481), fetched
# 2026-10-07. Times are local HH:MM; a night window may end after midnight.
DRIK = {
    "2026-02-03": (
        "Tuesday",
        [("09:19", "10:03")],
        [("23:16", "00:09")],
        ("12:13", "12:57"),
    ),
    "2026-02-05": (
        "Thursday",
        [("10:46", "11:30"), ("15:08", "15:52")],
        [],
        ("12:13", "12:57"),
    ),
    "2026-02-06": (
        "Friday",
        [("09:18", "10:02"), ("12:57", "13:41")],
        [],
        ("12:13", "12:57"),
    ),
    "2026-06-17": ("Wednesday", [("11:54", "12:50")], [], None),
    "2026-06-18": (
        "Thursday",
        [("10:03", "10:58"), ("15:38", "16:34")],
        [],
        ("11:54", "12:50"),
    ),
    "2026-06-19": (
        "Friday",
        [("08:11", "09:07"), ("12:50", "13:46")],
        [],
        ("11:55", "12:50"),
    ),
    "2026-06-20": (
        "Saturday",
        [("05:24", "06:20"), ("06:20", "07:15")],
        [],
        ("11:55", "12:51"),
    ),
    "2026-06-21": ("Sunday", [("17:30", "18:26")], [], ("11:55", "12:51")),
    "2026-06-22": (
        "Monday",
        [("12:51", "13:47"), ("15:39", "16:35")],
        [],
        ("11:55", "12:51"),
    ),
    "2026-06-23": (
        "Tuesday",
        [("08:12", "09:08")],
        [("23:23", "00:03")],
        ("11:55", "12:51"),
    ),
    "2026-10-06": (
        "Tuesday",
        [("08:38", "09:25")],
        [("22:56", "23:45")],
        ("11:46", "12:33"),
    ),
    "2026-10-07": ("Wednesday", [("11:45", "12:32")], [], None),
    "2026-10-08": (
        "Thursday",
        [("10:12", "10:58"), ("14:52", "15:39")],
        [],
        ("11:45", "12:32"),
    ),
    "2026-10-09": (
        "Friday",
        [("08:38", "09:25"), ("12:31", "13:18")],
        [],
        ("11:45", "12:31"),
    ),
}

# Drik rounds to the minute and uses its own sunrise model; allow 2 minutes.
TOLERANCE_MIN = 2


def _panchang(date: str) -> dict:
    return compute_detailed_panchang(
        target_date=date, latitude=LAT, longitude=LON, timezone_name=TZ
    )


def _hhmm(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%H:%M")


def _close(a: str, b: str) -> bool:
    """Minute distance on the 24h circle (night windows cross midnight)."""
    ma = int(a[:2]) * 60 + int(a[3:])
    mb = int(b[:2]) * 60 + int(b[3:])
    d = abs(ma - mb)
    return min(d, 1440 - d) <= TOLERANCE_MIN


def _windows(entries) -> list[tuple[str, str]]:
    return [(_hhmm(e["start"]), _hhmm(e["end"])) for e in entries]


def _assert_windows(name, got, expected):
    assert len(got) == len(expected), f"{name}: {got} != {expected}"
    for (gs, ge), (es, ee) in zip(got, expected):
        assert _close(gs, es) and _close(ge, ee), f"{name}: {got} != {expected}"


def test_abhijit_index_constant():
    # Abhijit is, by definition, the middle of 15 daytime muhurtas.
    assert ABHIJIT_MUHURTA_INDEX == 8


def test_tables_match_drikpanchang():
    # isoweekday: Mon=1..Sun=7
    assert DUR_MUHURTA == {
        1: [9, 12],
        2: [4],
        3: [8],
        4: [6, 12],
        5: [4, 9],
        6: [1, 2],
        7: [14],
    }
    assert DUR_MUHURTA_NIGHT == {2: [7]}


@pytest.mark.parametrize("date", sorted(DRIK))
def test_dur_muhurtam_windows_match_drikpanchang(date):
    weekday, day, night, _ = DRIK[date]
    p = _panchang(date)
    assert p["vara"]["english"] == weekday
    entries = p["inauspicious_timings"]["dur_muhurtam"]
    got_day = [e for e in entries if e["period"] == "day"]
    got_night = [e for e in entries if e["period"] == "night"]
    _assert_windows(f"{date} day", _windows(got_day), day)
    _assert_windows(f"{date} night", _windows(got_night), night)
    if night:
        assert [e["muhurta_number"] for e in got_night] == DUR_MUHURTA_NIGHT[2]


@pytest.mark.parametrize("date", sorted(DRIK))
def test_abhijit_matches_drikpanchang(date):
    weekday, _, _, abhijit = DRIK[date]
    p = _panchang(date)
    got = p["auspicious_timings"]["abhijit"]
    if abhijit is None:
        assert weekday == "Wednesday"
        assert got is None, f"{date}: Abhijit must be suppressed on Wednesday"
    else:
        assert got, f"{date}: Abhijit missing"
        _assert_windows(
            f"{date} abhijit", [(_hhmm(got["start"]), _hhmm(got["end"]))], [abhijit]
        )


@pytest.mark.parametrize("date", sorted(DRIK))
def test_dur_muhurtam_never_equals_abhijit_or_vijaya(date):
    """The core invariant from issue #97: the same window must never be
    reported as both auspicious (Abhijit / Vijaya) and inauspicious."""
    p = _panchang(date)
    aus = p["auspicious_timings"]
    good = [w for w in (aus.get("abhijit"), aus.get("vijay_muhurta")) if w]
    for d in p["inauspicious_timings"]["dur_muhurtam"]:
        for w in good:
            same = d["start"] == w["start"] and d["end"] == w["end"]
            assert not same, (
                f"{date}: Dur Muhurtam coincides with a good window at {d['start']}"
            )


def test_abhijit_centered_on_noon_when_present():
    for date, (_, _, _, abhijit) in DRIK.items():
        if abhijit is None:
            continue
        p = _panchang(date)
        ab = p["auspicious_timings"]["abhijit"]
        sm = p["sun_moon"]
        sr = datetime.fromisoformat(sm["sunrise"])
        ss = datetime.fromisoformat(sm["sunset"])
        start = datetime.fromisoformat(ab["start"])
        end = datetime.fromisoformat(ab["end"])
        center = start + (end - start) / 2
        midday = sr + (ss - sr) / 2
        assert abs((center - midday).total_seconds()) < 60, date
