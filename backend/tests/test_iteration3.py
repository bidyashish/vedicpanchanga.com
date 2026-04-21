"""Iteration 3 backend tests: ayanamsa selector + advanced panchang yogas (Amrit/Varjyam/Siddhi)."""
import os
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")

DELHI_PAYLOAD = {
    "birth_date": "1990-01-01",
    "birth_time": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata",
    "place_name": "New Delhi",
}

EXPECTED_AYANAMSA_IDS = {"lahiri", "kp_new", "kp_old", "raman", "kp_khullar", "sayan", "manoj"}


# ==================== /api/ayanamsa-options ====================

class TestAyanamsaOptions:
    def test_returns_seven_options(self):
        r = requests.get(f"{BASE_URL}/api/ayanamsa-options", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 7
        ids = {opt["id"] for opt in data}
        assert ids == EXPECTED_AYANAMSA_IDS, f"IDs mismatch: {ids}"

    def test_each_option_has_id_and_label(self):
        data = requests.get(f"{BASE_URL}/api/ayanamsa-options", timeout=15).json()
        for opt in data:
            assert "id" in opt and isinstance(opt["id"], str)
            assert "label" in opt and isinstance(opt["label"], str)
            assert len(opt["label"]) > 0


# ==================== /api/calculate with ayanamsa variations ====================

def _calc(ayanamsa: str):
    payload = {**DELHI_PAYLOAD, "ayanamsa": ayanamsa}
    r = requests.post(f"{BASE_URL}/api/calculate", json=payload, timeout=30)
    assert r.status_code == 200, f"Status {r.status_code} for {ayanamsa}: {r.text}"
    return r.json()


class TestAyanamsaCalculate:
    def test_lahiri_default_ascendant_pisces(self):
        c = _calc("lahiri")
        asc = c["ascendant"]
        assert asc["sign"] == "Pisces", f"Lahiri asc sign: {asc['sign']}"

    def test_raman_ascendant_pisces(self):
        c = _calc("raman")
        asc = c["ascendant"]
        # Raman ayanamsa ~22.27° vs Lahiri ~23.65°. Tropical asc was ~Aries 7.6°,
        # so subtracting Raman gives ~Pisces 15° (still Pisces).
        assert asc["sign"] == "Pisces", f"Raman asc sign: {asc['sign']}"
        # Degree-in-sign should be roughly 15° (within 1°)
        assert 14.0 <= asc["degree_in_sign"] <= 17.0, (
            f"Raman degree_in_sign expected ~15°, got {asc['degree_in_sign']}"
        )

    def test_sayan_tropical_ascendant_aries(self):
        c = _calc("sayan")
        asc = c["ascendant"]
        # Tropical (no sidereal shift): ascendant should land in Aries ~7.6°
        assert asc["sign"] == "Aries", f"Sayan asc sign: {asc['sign']}"
        assert 6.5 <= asc["degree_in_sign"] <= 9.0, (
            f"Sayan degree_in_sign expected ~7.6°, got {asc['degree_in_sign']}"
        )

    def test_kp_new_and_kp_old_consistent(self):
        c1 = _calc("kp_new")
        c2 = _calc("kp_old")
        # Both KP variants should land in Pisces (very close ayanamsa values)
        assert c1["ascendant"]["sign"] == "Pisces"
        assert c2["ascendant"]["sign"] == "Pisces"
        # Within ~0.5° of each other
        diff = abs(c1["ascendant"]["degree_in_sign"] - c2["ascendant"]["degree_in_sign"])
        assert diff < 1.0, f"KP new/old asc differ by {diff}"

    def test_kp_khullar_returns_chart(self):
        c = _calc("kp_khullar")
        assert c["ascendant"]["sign"] in ("Pisces", "Aries")

    def test_manoj_returns_chart(self):
        c = _calc("manoj")
        assert c["ascendant"]["sign"] == "Pisces"


# ==================== Legacy fields preserved ====================

class TestLegacyFieldsPreserved:
    def test_dasha_ashtakavarga_charts_intact_with_ayanamsa_param(self):
        c = _calc("lahiri")
        # All legacy top-level fields
        for f in ["d1_chart", "d2_chart", "d9_chart", "dasha", "ashtakavarga", "planets_data"]:
            assert f in c, f"Missing legacy field {f}"
        # SAV total still 337 with Lahiri
        sav_total = sum(c["ashtakavarga"]["sav"])
        assert sav_total == 337, f"SAV total {sav_total} != 337"
        # 9 dasha lords
        assert len(c["dasha"]) == 9


# ==================== /api/get-panchang advanced timings ====================

@pytest.fixture(scope="module")
def panchang_detailed():
    r = requests.get(f"{BASE_URL}/api/get-panchang", params={
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": "Asia/Kolkata",
        "date": "2024-01-04",
        "detailed": "true",
    }, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


class TestAdvancedPanchangYogas:
    def test_auspicious_timings_present(self, panchang_detailed):
        assert "auspicious_timings" in panchang_detailed
        au = panchang_detailed["auspicious_timings"]
        for key in ["amrit_kalam", "sarvartha_siddhi_yoga", "amrita_siddhi_yoga"]:
            assert key in au, f"Missing auspicious key: {key}"
            assert isinstance(au[key], list), f"{key} not a list"

    def test_amrit_kalam_entries_have_start_end_nakshatra(self, panchang_detailed):
        amrit = panchang_detailed["auspicious_timings"]["amrit_kalam"]
        # Must have at least one entry covering the day's nakshatra(s)
        assert len(amrit) >= 1, "amrit_kalam empty"
        for entry in amrit:
            assert "start" in entry and entry["start"]
            assert "end" in entry and entry["end"]
            assert "nakshatra" in entry and entry["nakshatra"]

    def test_inauspicious_varjyam_present(self, panchang_detailed):
        assert "inauspicious_timings" in panchang_detailed
        ina = panchang_detailed["inauspicious_timings"]
        assert "varjyam" in ina, "Missing varjyam list"
        assert isinstance(ina["varjyam"], list)
        assert len(ina["varjyam"]) >= 1, "varjyam empty"
        for entry in ina["varjyam"]:
            assert entry.get("start") and entry.get("end")

    def test_siddhi_yoga_lists_are_lists(self, panchang_detailed):
        au = panchang_detailed["auspicious_timings"]
        # Both can be empty depending on weekday/nakshatra combos, but must be lists
        assert isinstance(au["sarvartha_siddhi_yoga"], list)
        assert isinstance(au["amrita_siddhi_yoga"], list)
