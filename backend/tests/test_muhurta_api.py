"""HTTP tests for the Muhurta Finder endpoints."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.http

EXPECTED_PURPOSE_IDS = {
    "marriage",
    "engagement",
    "griha_pravesh",
    "bhoomi_pujan",
    "property_purchase",
    "vehicle",
    "gold_purchase",
    "business",
    "travel",
    "education",
    "namakarana",
    "annaprashana",
    "medical",
}


# ── /api/muhurta-purposes ────────────────────────────────────────────────
def test_muhurta_purposes_list(api, base_url):
    r = api.get(f"{base_url}/api/muhurta-purposes")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert {x["id"] for x in data} == EXPECTED_PURPOSE_IDS
    for x in data:
        assert isinstance(x.get("label"), str) and x["label"]


# ── /api/find-muhurta happy paths ────────────────────────────────────────
def test_find_muhurta_happy_path(api, base_url):
    r = api.post(
        f"{base_url}/api/find-muhurta",
        json={
            "purpose": "engagement",
            "start_date": "2026-04-20",
            "end_date": "2026-04-26",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "timezone": None,
            "min_score": 0,
            "limit": 30,
        },
    )
    assert r.status_code == 200
    d = r.json()
    assert d["purpose"] == "engagement"
    # timezone auto-resolved from lat/lon
    assert d["location"]["timezone"] == "Asia/Kolkata"
    assert d["date_range"]["start"] == "2026-04-20"
    assert d["date_range"]["end"] == "2026-04-26"
    assert d["date_range"]["days_scanned"] == 7
    assert len(d["all_days"]) == 7
    assert isinstance(d["muhurtas"], list)
    assert d["filter"]["native_rashi_id"] is None
    for day in d["all_days"]:
        if "error" in day:
            continue
        assert 0 <= day["score"] <= 100
        for f in (
            "tithi",
            "nakshatra",
            "vara",
            "sunrise",
            "sunset",
            "abhijit",
            "rahu_kalam",
        ):
            assert f in day


def test_find_muhurta_with_native_filters(api, base_url):
    payload = {
        "purpose": "engagement",
        "start_date": "2026-04-20",
        "end_date": "2026-04-26",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": "Asia/Kolkata",
        "birth_rashi_id": 4,
        "birth_nakshatra_id": 8,
        "min_score": 0,
        "limit": 30,
    }
    r = api.post(f"{base_url}/api/find-muhurta", json=payload)
    assert r.status_code == 200
    d = r.json()
    assert d["filter"]["native_rashi_id"] == 4
    assert d["filter"]["native_nakshatra_id"] == 8
    assert d["filter"]["native_rashi"] is not None
    assert d["filter"]["native_nakshatra"] is not None

    # Same window without native filters: scores should differ on at least
    # one day (otherwise the filter is having no effect).
    base = api.post(
        f"{base_url}/api/find-muhurta",
        json={**payload, "birth_rashi_id": None, "birth_nakshatra_id": None},
    ).json()
    a = {x["date"]: x["score"] for x in base["all_days"]}
    b = {x["date"]: x["score"] for x in d["all_days"]}
    assert any(a[k] != b[k] for k in a), "Native filters produced identical scores"


# ── /api/find-muhurta error handling ─────────────────────────────────────
def test_find_muhurta_unknown_purpose(api, base_url):
    r = api.post(
        f"{base_url}/api/find-muhurta",
        json={
            "purpose": "not_a_real_purpose",
            "start_date": "2026-04-20",
            "end_date": "2026-04-22",
            "latitude": 28.6,
            "longitude": 77.2,
        },
    )
    assert r.status_code == 400


def test_find_muhurta_end_before_start(api, base_url):
    r = api.post(
        f"{base_url}/api/find-muhurta",
        json={
            "purpose": "engagement",
            "start_date": "2026-04-26",
            "end_date": "2026-04-20",
            "latitude": 28.6,
            "longitude": 77.2,
        },
    )
    assert r.status_code == 400


def test_find_muhurta_range_too_large(api, base_url):
    r = api.post(
        f"{base_url}/api/find-muhurta",
        json={
            "purpose": "engagement",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "latitude": 28.6,
            "longitude": 77.2,
        },
    )
    assert r.status_code == 400
