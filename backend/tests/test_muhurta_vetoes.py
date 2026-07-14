"""Veto blackout rules in the muhurta finder.

Anchors are 2026 events cross-checked against DrikPanchang (New Delhi):
- Guru Asta (Jupiter combust): dates blocked from Jul 12, 2026
- Chaturmas: Devshayani Ekadashi Jul 24, 2026 to Devuthani Ekadashi Nov 20, 2026
- Kharmas: Sun in Dhanu from Dec 16, 2026; Sun in Meena Mar 15 - Apr 13, 2026
- Adhika Jyeshtha: May 17 - Jun 14, 2026
- Shukra Asta around the Jan 6, 2026 superior conjunction: marriage dates
  resume Feb 5, 2026
"""

import sys
from pathlib import Path

import swisseph as swe

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from muhurta import (  # noqa: E402
    _chaturmas_span,
    _combust_labels,
    _is_adhika_day,
    find_muhurtas,
)

DELHI = dict(latitude=28.6139, longitude=77.2090, timezone_name="Asia/Kolkata")


def _day_result(res, iso_date):
    return next(d for d in res["all_days"] if d["date"] == iso_date)


def _jd(y, m, d, h=6.0):
    return round(swe.julday(y, m, d, h))


def test_chaturmas_span_2026():
    start, end = _chaturmas_span(2026)
    sy, sm, sd, _ = swe.revjul(start)
    ey, em, ed, _ = swe.revjul(end)
    assert (sy, sm, sd) == (2026, 7, 24)  # Devshayani Ekadashi begins
    assert (ey, em, ed) == (2026, 11, 21)  # Devuthani Ekadashi ends (01:03 UT)


def test_chaturmas_vetoes_marriage_but_kartika_dwadashi_is_free():
    res = find_muhurtas("marriage", "2026-11-15", "2026-11-25", **DELHI)
    vetoed = _day_result(res, "2026-11-19")
    assert vetoed["vetoed"] and vetoed["score"] == 0
    assert any("Chaturmas" in c for c in vetoed["cautions"])
    free = _day_result(res, "2026-11-21")  # Drik's first post-Chaturmas date
    assert not free["vetoed"]


def test_guru_asta_blocks_mid_july_2026():
    labels_jul_16 = _combust_labels(_jd(2026, 7, 16))
    assert any("Guru Asta" in x for x in labels_jul_16)
    labels_jul_8 = _combust_labels(_jd(2026, 7, 8))
    assert not any("Guru Asta" in x for x in labels_jul_8)


def test_shukra_asta_clears_by_feb_5_2026():
    assert any("Shukra Asta" in x for x in _combust_labels(_jd(2026, 1, 25)))
    assert not any("Shukra Asta" in x for x in _combust_labels(_jd(2026, 2, 5)))


def test_kharmas_vetoes_late_december():
    res = find_muhurtas("marriage", "2026-12-15", "2026-12-25", **DELHI)
    kharmas = _day_result(res, "2026-12-20")
    assert kharmas["vetoed"]
    assert any("Kharmas" in c for c in kharmas["cautions"])


def test_adhika_jyeshtha_2026():
    assert _is_adhika_day(_jd(2026, 5, 25))
    assert _is_adhika_day(_jd(2026, 6, 10))
    assert not _is_adhika_day(_jd(2026, 6, 20))
    assert not _is_adhika_day(_jd(2026, 5, 10))


def test_marriage_july_2026_matches_drik_block():
    """After Jul 11 there must be no marriage muhurta until Chaturmas ends
    (Guru Asta from Jul 12, then Devshayani from Jul 24) - per DrikPanchang."""
    res = find_muhurtas("marriage", "2026-07-01", "2026-07-31", **DELHI)
    listed = {m["date"] for m in res["muhurtas"]}
    assert not any(d >= "2026-07-12" for d in listed)
    assert "2026-07-01" in listed and "2026-07-06" in listed


def test_purpose_without_vetoes_unaffected_by_chaturmas():
    res = find_muhurtas("travel", "2026-08-01", "2026-08-10", **DELHI)
    assert res["total_matches"] > 0
    assert not any(d.get("vetoed") for d in res["all_days"])
