"""Tests for the Muhurta finder module."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from muhurta import find_muhurtas, list_purposes, PURPOSES


def test_list_purposes_shape():
    p = list_purposes()
    assert isinstance(p, list)
    assert len(p) >= 5
    ids = {x["id"] for x in p}
    # core purposes should be present
    assert {"marriage", "griha_pravesh", "business", "travel", "education"}.issubset(ids)
    for x in p:
        assert "id" in x and "label" in x


def test_find_muhurtas_marriage_range():
    """Scan 7 days — should return scored results and a resolved timezone."""
    r = find_muhurtas(
        "marriage",
        "2026-04-20", "2026-04-26",
        latitude=28.6139, longitude=77.2090, timezone_name=None,
        min_score=0, limit=30,
    )
    assert r["purpose"] == "marriage"
    assert r["date_range"]["days_scanned"] == 7
    assert r["location"]["timezone"] == "Asia/Kolkata"
    assert len(r["all_days"]) == 7
    # top result should have score + reasons
    top = r["muhurtas"][0]
    assert 0 <= top["score"] <= 100
    assert isinstance(top["reasons"], list)
    assert isinstance(top["cautions"], list)
    # must include the classical fields
    for field in ("tithi", "nakshatra", "vara", "paksha", "moon_rashi",
                  "abhijit", "rahu_kalam", "sunrise", "sunset"):
        assert field in top


def test_marriage_avoids_rikta_tithis():
    """Rikta tithis (4, 9, 14) should get penalized for marriage."""
    r = find_muhurtas(
        "marriage",
        "2026-04-20", "2026-05-20",
        latitude=28.6139, longitude=77.2090, timezone_name="Asia/Kolkata",
        min_score=0, limit=100,
    )
    # Any day whose tithi contains "Chaturthi", "Navami" or "Chaturdashi" must not be top-ranked
    for d in r["all_days"]:
        if "error" in d:
            continue
        if any(t in d["tithi"] for t in ("Chaturthi", "Navami", "Chaturdashi")):
            # penalty applied => should be below 75
            assert d["score"] < 75, f"{d['date']} tithi {d['tithi']} scored {d['score']}"


def test_tarabalam_filter_changes_score():
    """Adding a native birth nakshatra must change at least one day's score."""
    base = find_muhurtas(
        "marriage", "2026-04-20", "2026-04-26",
        latitude=28.6139, longitude=77.2090, timezone_name="Asia/Kolkata",
        min_score=0, limit=30,
    )
    with_filter = find_muhurtas(
        "marriage", "2026-04-20", "2026-04-26",
        latitude=28.6139, longitude=77.2090, timezone_name="Asia/Kolkata",
        birth_rashi_id=4, birth_nakshatra_id=8,
        min_score=0, limit=30,
    )
    # Filter info must be echoed back
    assert with_filter["filter"]["native_rashi_id"] == 4
    assert with_filter["filter"]["native_nakshatra_id"] == 8
    assert with_filter["filter"]["native_rashi"] is not None
    assert with_filter["filter"]["native_nakshatra"] is not None

    # Scores should change for at least one day after applying chandrabalam + tarabalam
    base_map = {d["date"]: d["score"] for d in base["all_days"]}
    filt_map = {d["date"]: d["score"] for d in with_filter["all_days"]}
    diffs = [k for k in base_map if base_map[k] != filt_map[k]]
    assert len(diffs) > 0, "Native filters had no effect on any day"


def test_bad_inputs():
    with pytest.raises(ValueError):
        find_muhurtas("not_a_purpose", "2026-04-20", "2026-04-22", 28.6, 77.2)
    with pytest.raises(ValueError):
        find_muhurtas("marriage", "2026-04-26", "2026-04-20", 28.6, 77.2)  # end < start
    with pytest.raises(ValueError):
        find_muhurtas("marriage", "2026-01-01", "2026-12-31", 28.6, 77.2)  # > 120 days


def test_score_capped_0_100():
    r = find_muhurtas(
        "business", "2026-04-20", "2026-04-30",
        latitude=19.0760, longitude=72.8777, timezone_name="Asia/Kolkata",
        min_score=0, limit=100,
    )
    for d in r["all_days"]:
        if "error" in d:
            continue
        assert 0 <= d["score"] <= 100
