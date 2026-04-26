"""HTTP integration tests for the ayanamsa selector and the advanced
panchang yogas (Amrit Kālam, Varjyam, Sarvārtha Siddhi, Amṛita Siddhi).

The `api` fixture (see conftest.py) probes the backend at session start
and skips the whole module if it isn't reachable, so collection no longer
crashes when the server is offline.
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.http

# Mirror of the conftest fixture so module-level helpers can use it without
# a fixture argument (we still parametrise individual tests with `delhi_birth`).
DELHI_BIRTH = {
    "birth_date": "1990-01-01",
    "birth_time": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata",
    "place_name": "New Delhi",
    "ayanamsa": "lahiri",
}

EXPECTED_AYANAMSA_IDS = {
    "lahiri", "kp_new", "kp_old", "raman", "kp_khullar", "sayan", "manoj",
}


# ── /api/ayanamsa-options ────────────────────────────────────────────────
class TestAyanamsaOptions:
    def test_returns_seven_options(self, api, base_url):
        r = api.get(f"{base_url}/api/ayanamsa-options", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 7
        ids = {opt["id"] for opt in data}
        assert ids == EXPECTED_AYANAMSA_IDS, f"IDs mismatch: {ids}"

    def test_each_option_has_id_and_label(self, api, base_url):
        data = api.get(f"{base_url}/api/ayanamsa-options", timeout=15).json()
        for opt in data:
            assert isinstance(opt.get("id"), str) and opt["id"]
            assert isinstance(opt.get("label"), str) and opt["label"]


# ── /api/calculate with ayanamsa variations ──────────────────────────────
def _calc(api, base_url, ayanamsa: str):
    payload = {**DELHI_BIRTH, "ayanamsa": ayanamsa}
    r = api.post(f"{base_url}/api/calculate", json=payload, timeout=30)
    assert r.status_code == 200, f"{ayanamsa}: {r.status_code} {r.text}"
    return r.json()


class TestAyanamsaCalculate:
    def test_lahiri_default_ascendant_pisces(self, api, base_url):
        c = _calc(api, base_url, "lahiri")
        assert c["ascendant"]["sign"] == "Pisces"

    def test_raman_ascendant_pisces(self, api, base_url):
        c = _calc(api, base_url, "raman")
        # Raman ayanamsa ~22.27° vs Lahiri ~23.65°. Tropical asc was ~Aries 7.6°,
        # so subtracting Raman gives ~Pisces 15° (still Pisces).
        assert c["ascendant"]["sign"] == "Pisces"
        assert 14.0 <= c["ascendant"]["degree_in_sign"] <= 17.0

    def test_sayan_tropical_ascendant_aries(self, api, base_url):
        c = _calc(api, base_url, "sayan")
        # Tropical (no sidereal shift): ascendant lands in Aries ~7.6°.
        assert c["ascendant"]["sign"] == "Aries"
        assert 6.5 <= c["ascendant"]["degree_in_sign"] <= 9.0

    def test_kp_new_and_kp_old_consistent(self, api, base_url):
        c1 = _calc(api, base_url, "kp_new")
        c2 = _calc(api, base_url, "kp_old")
        assert c1["ascendant"]["sign"] == c2["ascendant"]["sign"] == "Pisces"
        diff = abs(
            c1["ascendant"]["degree_in_sign"] - c2["ascendant"]["degree_in_sign"]
        )
        assert diff < 1.0

    def test_kp_khullar_returns_chart(self, api, base_url):
        c = _calc(api, base_url, "kp_khullar")
        assert c["ascendant"]["sign"] in ("Pisces", "Aries")

    def test_manoj_returns_chart(self, api, base_url):
        c = _calc(api, base_url, "manoj")
        assert c["ascendant"]["sign"] == "Pisces"


# ── Legacy fields preserved across ayanamsa choices ──────────────────────
class TestLegacyFieldsPreserved:
    def test_dasha_ashtakavarga_charts_intact(self, api, base_url):
        c = _calc(api, base_url, "lahiri")
        for f in ["d1_chart", "d2_chart", "d9_chart", "dasha", "ashtakavarga", "planets_data"]:
            assert f in c, f"Missing field {f}"
        # SAV totals (8 contributors × 12 signs minus self) sum to 337 with Lahiri.
        assert sum(c["ashtakavarga"]["sav"]) == 337
        assert len(c["dasha"]) == 9


# ── /api/get-panchang advanced timings ───────────────────────────────────
@pytest.fixture(scope="module")
def panchang_detailed(api, base_url):
    r = api.get(
        f"{base_url}/api/get-panchang",
        params={
            "latitude": DELHI_BIRTH["latitude"],
            "longitude": DELHI_BIRTH["longitude"],
            "timezone": DELHI_BIRTH["timezone"],
            "date": "2024-01-04",
            "detailed": "true",
        },
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()


class TestAdvancedPanchangYogas:
    def test_auspicious_timings_present(self, panchang_detailed):
        au = panchang_detailed["auspicious_timings"]
        for key in ("amrit_kalam", "sarvartha_siddhi_yoga", "amrita_siddhi_yoga"):
            assert isinstance(au.get(key), list), f"{key} missing or not a list"

    def test_amrit_kalam_entries_have_start_end_nakshatra(self, panchang_detailed):
        amrit = panchang_detailed["auspicious_timings"]["amrit_kalam"]
        assert amrit, "amrit_kalam empty"
        for entry in amrit:
            assert entry.get("start") and entry.get("end") and entry.get("nakshatra")

    def test_inauspicious_varjyam_present(self, panchang_detailed):
        varjyam = panchang_detailed["inauspicious_timings"].get("varjyam") or []
        assert varjyam, "varjyam empty"
        for entry in varjyam:
            assert entry.get("start") and entry.get("end")

    def test_siddhi_yoga_lists_are_lists(self, panchang_detailed):
        au = panchang_detailed["auspicious_timings"]
        # Both can be empty for some weekday/nakshatra combos, but must exist as lists.
        assert isinstance(au["sarvartha_siddhi_yoga"], list)
        assert isinstance(au["amrita_siddhi_yoga"], list)
