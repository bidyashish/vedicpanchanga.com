"""HTTP integration tests for the Muhūrta Finder endpoints + light
regression smoke-tests on `/api/calculate`, `/api/get-panchang`,
`/api/ayanamsa-options`."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.http

EXPECTED_PURPOSE_IDS = {
    "marriage",
    "griha_pravesh",
    "business",
    "travel",
    "education",
    "vehicle",
    "namakarana",
    "medical",
}


# ── /api/muhurta-purposes ────────────────────────────────────────────────
def test_muhurta_purposes_list(api, base_url):
    r = api.get(f"{base_url}/api/muhurta-purposes", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 8
    ids = {x["id"] for x in data}
    assert EXPECTED_PURPOSE_IDS.issubset(ids), f"Missing: {EXPECTED_PURPOSE_IDS - ids}"
    for x in data:
        assert isinstance(x.get("label"), str) and x["label"]


# ── /api/find-muhurta happy paths ────────────────────────────────────────
def test_find_muhurta_happy_path(api, base_url):
    r = api.post(
        f"{base_url}/api/find-muhurta",
        json={
            "purpose": "marriage",
            "start_date": "2026-04-20",
            "end_date": "2026-04-26",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "timezone": None,
            "min_score": 0,
            "limit": 30,
        },
        timeout=90,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["purpose"] == "marriage"
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
        "purpose": "marriage",
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
    r = api.post(f"{base_url}/api/find-muhurta", json=payload, timeout=90)
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
        timeout=90,
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
        timeout=30,
    )
    assert r.status_code == 400


def test_find_muhurta_end_before_start(api, base_url):
    r = api.post(
        f"{base_url}/api/find-muhurta",
        json={
            "purpose": "marriage",
            "start_date": "2026-04-26",
            "end_date": "2026-04-20",
            "latitude": 28.6,
            "longitude": 77.2,
        },
        timeout=30,
    )
    assert r.status_code == 400


def test_find_muhurta_range_too_large(api, base_url):
    r = api.post(
        f"{base_url}/api/find-muhurta",
        json={
            "purpose": "marriage",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "latitude": 28.6,
            "longitude": 77.2,
        },
        timeout=30,
    )
    assert r.status_code == 400


# ── Regression smoke-tests on the existing endpoints ────────────────────
def test_calculate_regression(api, base_url, delhi_birth):
    r = api.post(f"{base_url}/api/calculate", json=delhi_birth, timeout=60)
    assert r.status_code == 200
    d = r.json()
    # Vargas + the new sub-period / Jaimini fields are part of the contract.
    assert "vargas" in d and {"d1", "d9", "d60"}.issubset(d["vargas"])
    assert "dasha_antar" in d
    assert "karakas" in d
    assert "kalsarpa" in d


def test_get_panchang_regression(api, base_url):
    r = api.get(
        f"{base_url}/api/get-panchang",
        params={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "date": "2026-04-20",
            "timezone": "Asia/Kolkata",
        },
        timeout=60,
    )
    assert r.status_code == 200
    d = r.json()
    assert "panchang" in d
    for k in ("tithi", "nakshatra", "yoga", "karana"):
        assert k in d["panchang"]
    assert "yogas_extra" in d
    assert {"ganda_mula", "ravi_yoga"}.issubset(d["yogas_extra"].keys())


def test_ayanamsa_options_regression(api, base_url):
    r = api.get(f"{base_url}/api/ayanamsa-options", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and data
    assert all("id" in x and "label" in x for x in data)
