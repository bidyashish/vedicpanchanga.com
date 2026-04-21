"""HTTP-level tests for Muhurta Finder endpoints + regression for existing endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sidereal-ephemeris.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -- Muhurta purposes -------------------------------------------------
def test_muhurta_purposes_list(api):
    r = api.get(f"{BASE_URL}/api/muhurta-purposes", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    ids = {x["id"] for x in data}
    expected = {"marriage", "griha_pravesh", "business", "travel",
                "education", "vehicle", "namakarana", "medical"}
    assert expected.issubset(ids), f"Missing: {expected - ids}"
    assert len(data) == 8
    for x in data:
        assert "id" in x and "label" in x and isinstance(x["label"], str)


# -- Muhurta happy path -----------------------------------------------
def test_find_muhurta_happy_path(api):
    payload = {
        "purpose": "marriage",
        "start_date": "2026-04-20",
        "end_date": "2026-04-26",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": None,
        "min_score": 0,
        "limit": 30,
    }
    r = api.post(f"{BASE_URL}/api/find-muhurta", json=payload, timeout=90)
    assert r.status_code == 200
    d = r.json()
    assert d["purpose"] == "marriage"
    # timezone auto-resolved from lat/lon
    assert d["location"]["timezone"] == "Asia/Kolkata"
    assert d["date_range"]["start"] == "2026-04-20"
    assert d["date_range"]["end"] == "2026-04-26"
    assert d["date_range"]["days_scanned"] == 7
    assert len(d["all_days"]) == 7
    assert "muhurtas" in d and isinstance(d["muhurtas"], list)
    assert "filter" in d and d["filter"]["native_rashi_id"] is None
    # every day's score must be in [0, 100]
    for day in d["all_days"]:
        if "error" in day:
            continue
        assert 0 <= day["score"] <= 100
        for f in ("tithi", "nakshatra", "vara", "sunrise", "sunset", "abhijit", "rahu_kalam"):
            assert f in day


def test_find_muhurta_with_native_filters(api):
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
    r = api.post(f"{BASE_URL}/api/find-muhurta", json=payload, timeout=90)
    assert r.status_code == 200
    d = r.json()
    assert d["filter"]["native_rashi_id"] == 4
    assert d["filter"]["native_nakshatra_id"] == 8
    assert d["filter"]["native_rashi"] is not None
    assert d["filter"]["native_nakshatra"] is not None

    # baseline (no filters) to confirm scores differ
    base_payload = {**payload, "birth_rashi_id": None, "birth_nakshatra_id": None}
    r2 = api.post(f"{BASE_URL}/api/find-muhurta", json=base_payload, timeout=90)
    assert r2.status_code == 200
    base = r2.json()
    a = {x["date"]: x["score"] for x in base["all_days"]}
    b = {x["date"]: x["score"] for x in d["all_days"]}
    diffs = [k for k in a if a[k] != b[k]]
    assert diffs, "Native filters produced identical scores"


# -- Error handling ---------------------------------------------------
def test_find_muhurta_unknown_purpose(api):
    r = api.post(f"{BASE_URL}/api/find-muhurta", json={
        "purpose": "not_a_real_purpose",
        "start_date": "2026-04-20", "end_date": "2026-04-22",
        "latitude": 28.6, "longitude": 77.2,
    }, timeout=30)
    assert r.status_code == 400


def test_find_muhurta_end_before_start(api):
    r = api.post(f"{BASE_URL}/api/find-muhurta", json={
        "purpose": "marriage",
        "start_date": "2026-04-26", "end_date": "2026-04-20",
        "latitude": 28.6, "longitude": 77.2,
    }, timeout=30)
    assert r.status_code == 400


def test_find_muhurta_range_too_large(api):
    r = api.post(f"{BASE_URL}/api/find-muhurta", json={
        "purpose": "marriage",
        "start_date": "2026-01-01", "end_date": "2026-12-31",
        "latitude": 28.6, "longitude": 77.2,
    }, timeout=30)
    assert r.status_code == 400


# -- Regression on existing endpoints --------------------------------
def test_calculate_regression(api):
    r = api.post(f"{BASE_URL}/api/calculate", json={
        "birth_date": "1990-01-01",
        "birth_time": "12:00",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": "Asia/Kolkata",
        "ayanamsa": "lahiri",
    }, timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert "id" in d
    # Iteration-4 vargas structure check
    assert "vargas" in d
    assert "d1" in d["vargas"] and "d9" in d["vargas"] and "d60" in d["vargas"]


def test_get_panchang_regression(api):
    r = api.get(f"{BASE_URL}/api/get-panchang",
                params={"latitude": 28.6139, "longitude": 77.2090,
                        "date": "2026-04-20", "timezone": "Asia/Kolkata"},
                timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert "panchang" in d
    assert "tithi" in d["panchang"]
    assert "nakshatra" in d["panchang"]


def test_ayanamsa_options_regression(api):
    r = api.get(f"{BASE_URL}/api/ayanamsa-options", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 0
    assert all("id" in x and "label" in x for x in data)
