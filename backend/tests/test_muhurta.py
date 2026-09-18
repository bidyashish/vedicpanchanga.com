"""Tests for the Muhurta finder module."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from muhurta import find_muhurtas, list_purposes


def test_list_purposes_shape():
    p = list_purposes()
    assert isinstance(p, list)
    assert len(p) >= 5
    ids = {x["id"] for x in p}
    # core purposes should be present
    assert {"engagement", "griha_pravesh", "business", "travel", "education"}.issubset(
        ids
    )
    for x in p:
        assert "id" in x and "label" in x


def test_find_muhurtas_engagement_range():
    """Scan 7 days — should return scored results and a resolved timezone."""
    r = find_muhurtas(
        "engagement",
        "2026-04-20",
        "2026-04-26",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name=None,
        min_score=0,
        limit=30,
    )
    assert r["purpose"] == "engagement"
    assert r["date_range"]["days_scanned"] == 7
    assert r["location"]["timezone"] == "Asia/Kolkata"
    assert len(r["all_days"]) == 7
    # top result should have score + reasons
    top = r["muhurtas"][0]
    assert 0 <= top["score"] <= 100
    assert isinstance(top["reasons"], list)
    assert isinstance(top["cautions"], list)
    # must include the classical fields
    for field in (
        "tithi",
        "nakshatra",
        "vara",
        "paksha",
        "moon_rashi",
        "abhijit",
        "rahu_kalam",
        "sunrise",
        "sunset",
    ):
        assert field in top
    # shubh muhurat windows surfaced for the frontend Muhurta finder
    for field in (
        "brahma_muhurta",
        "pratah_sandhya",
        "vijay_muhurta",
        "godhuli_muhurta",
        "sayahna_sandhya",
        "nishita_muhurta",
        "amrit_kalam",
        "sarvartha_siddhi_yoga",
        "amrita_siddhi_yoga",
    ):
        assert field in top
    # list fields default to [] (never None) so the frontend can map without guarding
    assert isinstance(top["amrit_kalam"], list)
    assert isinstance(top["sarvartha_siddhi_yoga"], list)
    assert isinstance(top["amrita_siddhi_yoga"], list)


def test_engagement_avoids_rikta_tithis():
    """Rikta tithis (4, 9, 14) should get penalized for engagement."""
    r = find_muhurtas(
        "engagement",
        "2026-04-20",
        "2026-05-20",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
        min_score=0,
        limit=100,
    )
    # Any day whose tithi contains "Chaturthi", "Navami" or "Chaturdashi" must not be top-ranked
    for d in r["all_days"]:
        if "error" in d:
            continue
        if any(t in d["tithi"] for t in ("Chaturthi", "Navami", "Chaturdashi")):
            # penalty applied => should be below 75
            assert d["score"] < 75, (
                f"{d['date']} tithi {d['tithi']} scored {d['score']}"
            )


def test_tarabalam_filter_changes_score():
    """Adding a native birth nakshatra must change at least one day's score."""
    base = find_muhurtas(
        "engagement",
        "2026-04-20",
        "2026-04-26",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
        min_score=0,
        limit=30,
    )
    with_filter = find_muhurtas(
        "engagement",
        "2026-04-20",
        "2026-04-26",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
        birth_rashi_id=4,
        birth_nakshatra_id=8,
        min_score=0,
        limit=30,
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
        find_muhurtas(
            "engagement", "2026-04-26", "2026-04-20", 28.6, 77.2
        )  # end < start
    with pytest.raises(ValueError):
        find_muhurtas(
            "engagement", "2026-01-01", "2026-12-31", 28.6, 77.2
        )  # > 120 days


def test_score_capped_0_100():
    r = find_muhurtas(
        "business",
        "2026-04-20",
        "2026-04-30",
        latitude=19.0760,
        longitude=72.8777,
        timezone_name="Asia/Kolkata",
        min_score=0,
        limit=100,
    )
    for d in r["all_days"]:
        if "error" in d:
            continue
        assert 0 <= d["score"] <= 100


def test_new_purposes_listed():
    """The purposes added for house/ceremony coverage must be exposed."""
    ids = {x["id"] for x in list_purposes()}
    assert {
        "marriage",
        "engagement",
        "property_purchase",
        "bhoomi_pujan",
        "annaprashana",
        "gold_purchase",
    }.issubset(ids)
    assert len(ids) == 13


def test_rule_tables_consistent():
    """Good/bad sets must be disjoint, ids in range, and Rikta tithis of BOTH
    pakshas penalized for every purpose (classical universal rule)."""
    from muhurta import PURPOSES, RIKTA_TITHIS

    assert RIKTA_TITHIS == {4, 9, 14, 19, 24, 29}
    for pid, cfg in PURPOSES.items():
        good_t = cfg.get("good_tithis", set())
        bad_t = cfg.get("bad_tithis", set())
        good_n = cfg.get("good_nakshatras", set())
        bad_n = cfg.get("bad_nakshatras", set())
        assert not (good_t & bad_t), f"{pid}: tithi overlap"
        assert not (good_n & bad_n), f"{pid}: nakshatra overlap"
        assert not (
            cfg.get("good_weekdays", set()) & cfg.get("avoid_weekdays", set())
        ), f"{pid}: weekday overlap"
        assert all(1 <= t <= 30 for t in good_t | bad_t), f"{pid}: tithi id range"
        assert all(1 <= n <= 27 for n in good_n | bad_n), f"{pid}: nakshatra id range"
        assert RIKTA_TITHIS <= bad_t, f"{pid}: missing rikta tithis in bad_tithis"


def test_griha_pravesh_excludes_ugra_purva_bhadrapada():
    """Purva Bhadrapada (25) is an Ugra star - never good for house entry."""
    from muhurta import PURPOSES

    assert 25 not in PURPOSES["griha_pravesh"]["good_nakshatras"]


def test_subtract_spans():
    """Bhadra interval subtraction: trim, split (keep longest), full cover."""
    from datetime import datetime

    from muhurta import _subtract_spans

    t = lambda h, m=0: datetime(2026, 6, 1, h, m)  # noqa: E731

    # No overlap: window unchanged
    assert _subtract_spans(t(6), t(12), [(t(13), t(15))]) == (t(6), t(12))
    # Vishti covers the head: trimmed to the tail
    assert _subtract_spans(t(6), t(12), [(t(5), t(8))]) == (t(8), t(12))
    # Vishti in the middle: longest remaining piece wins
    assert _subtract_spans(t(6), t(12), [(t(7), t(11))]) == (t(11), t(12)) or (
        _subtract_spans(t(6), t(12), [(t(7), t(11))]) == (t(6), t(7))
    )
    piece = _subtract_spans(t(6), t(12), [(t(7), t(8))])
    assert piece == (t(8), t(12))  # 4h tail beats 1h head
    # Fully covered: None
    assert _subtract_spans(t(6), t(12), [(t(5), t(13))]) is None


def test_property_purchase_scan():
    """New purpose end-to-end: scored days with the standard fields."""
    r = find_muhurtas(
        "property_purchase",
        "2026-04-20",
        "2026-04-26",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
        min_score=0,
        limit=30,
    )
    assert r["purpose_label"] == "Property Purchase (Land / House)"
    assert len(r["all_days"]) == 7
    for d in r["all_days"]:
        if "error" in d:
            continue
        assert 0 <= d["score"] <= 100
        assert "tithi" in d and "nakshatra" in d and "vara" in d


def test_muhurta_window_avoids_bhadra():
    """Returned windows must not overlap Vishti spans unless flagged."""
    from datetime import datetime

    from advanced_panchang import compute_detailed_panchang
    from muhurta import _bhadra_spans

    r = find_muhurtas(
        "engagement",
        "2026-06-01",
        "2026-06-10",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
        min_score=0,
        limit=100,
    )
    for d in r["all_days"]:
        if "error" in d or "muhurta_window" not in d:
            continue
        if any("Bhadra" in c for c in d.get("cautions", [])):
            continue  # explicitly flagged as Bhadra-afflicted
        panch = compute_detailed_panchang(d["date"], 28.6139, 77.2090, "Asia/Kolkata")
        ws = datetime.fromisoformat(d["muhurta_window"]["start"])
        we = datetime.fromisoformat(d["muhurta_window"]["end"])
        for s0, s1 in _bhadra_spans(panch):
            overlap = (min(we, s1) - max(ws, s0)).total_seconds()
            assert overlap <= 0, f"{d['date']}: window overlaps Vishti"
