"""Iteration 4 backend tests: 16 divisional charts D1..D60."""

import os
from pathlib import Path

import pytest
import requests

# Resolve backend URL from frontend .env (no defaults)
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = (BASE_URL or "").rstrip("/")

DELHI_PAYLOAD = {
    "birth_date": "1990-01-01",
    "birth_time": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata",
    "place_name": "New Delhi",
    "ayanamsa": "lahiri",
}

EXPECTED_VARGA_ORDER = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]
EXPECTED_VARGA_KEYS = {f"d{n}" for n in EXPECTED_VARGA_ORDER}


@pytest.fixture(scope="module")
def chart():
    r = requests.post(f"{BASE_URL}/api/calculate", json=DELHI_PAYLOAD, timeout=30)
    assert r.status_code == 200, f"calculate failed: {r.status_code} {r.text[:300]}"
    return r.json()


# --------------- vargas top-level structure ---------------


class TestVargasStructure:
    def test_varga_order_field(self, chart):
        assert "varga_order" in chart, "varga_order missing"
        assert chart["varga_order"] == EXPECTED_VARGA_ORDER

    def test_vargas_keys_present(self, chart):
        assert "vargas" in chart, "vargas dict missing"
        keys = set(chart["vargas"].keys())
        assert (
            keys == EXPECTED_VARGA_KEYS
        ), f"varga keys mismatch: {keys ^ EXPECTED_VARGA_KEYS}"

    def test_each_varga_shape(self, chart):
        for key, v in chart["vargas"].items():
            assert "chart" in v, f"{key} missing 'chart'"
            assert "asc_sign" in v, f"{key} missing 'asc_sign'"
            assert "name" in v and v["name"], f"{key} missing 'name'"
            assert "subtitle" in v and v["subtitle"], f"{key} missing 'subtitle'"
            assert "division" in v, f"{key} missing 'division'"
            # chart house map must have keys 1..12 (JSON keys are strings)
            ch = v["chart"]
            for h in range(1, 13):
                assert str(h) in ch or h in ch, f"{key} chart missing house {h}"
            # asc_sign in 1..12
            assert (
                1 <= v["asc_sign"] <= 12
            ), f"{key} asc_sign out of range: {v['asc_sign']}"

    def test_d1_subtitle(self, chart):
        assert chart["vargas"]["d1"]["subtitle"] == "Physical Self / Body"

    def test_d30_subtitle(self, chart):
        assert chart["vargas"]["d30"]["subtitle"] == "Misfortunes"

    def test_d60_subtitle(self, chart):
        assert chart["vargas"]["d60"]["subtitle"] == "Past-Life Karma"

    def test_planets_present_in_each_varga(self, chart):
        # Sun ('Su') must appear somewhere in every varga's house map
        for key, v in chart["vargas"].items():
            ch = v["chart"]
            flat = []
            for h in range(1, 13):
                flat.extend(ch.get(str(h), ch.get(h, [])))
            assert "Su" in flat, f"Sun missing in {key}"
            assert "As" in flat, f"Ascendant missing in {key}"


# --------------- backward compatibility ---------------


class TestBackwardCompat:
    def test_legacy_d1_d2_d9_present(self, chart):
        for f in ["d1_chart", "d2_chart", "d9_chart", "d1_asc_sign"]:
            assert f in chart, f"legacy field missing: {f}"

    def test_legacy_d1_chart_matches_vargas_d1(self, chart):
        legacy = chart["d1_chart"]
        new = chart["vargas"]["d1"]["chart"]
        # Compare per-house ordered list
        for h in range(1, 13):
            l = legacy.get(str(h), legacy.get(h, []))
            n = new.get(str(h), new.get(h, []))
            assert l == n, f"d1 house {h} mismatch legacy={l} new={n}"

    def test_legacy_d9_chart_matches_vargas_d9(self, chart):
        legacy = chart["d9_chart"]
        new = chart["vargas"]["d9"]["chart"]
        for h in range(1, 13):
            l = legacy.get(str(h), legacy.get(h, []))
            n = new.get(str(h), new.get(h, []))
            assert l == n, f"d9 house {h} mismatch"


# --------------- D9 navamsa formula sanity ---------------


class TestNavamsaFormula:
    def test_d9_formula_for_each_planet(self, chart):
        # For each planet, recompute navamsa sign and ensure it matches what's in
        # the d9 house map.
        d9 = chart["vargas"]["d9"]
        d9_asc = d9["asc_sign"]
        for p in chart["planets_data"]:
            lon = p["longitude"]
            expected_sign = int(((lon * 9) % 360) // 30) + 1
            expected_house = ((expected_sign - d9_asc) % 12) + 1
            ch = d9["chart"]
            cell = ch.get(str(expected_house), ch.get(expected_house, []))
            assert (
                p["abbr"] in cell
            ), f"{p['name']} expected in D9 house {expected_house} but got {cell}"


# --------------- D30 Trimshamsha special rules ---------------
# Direct unit test against the vargas module to verify uneven planetary segments.


class TestD30TrimshamshaUnit:
    def test_module_import(self):
        # Use absolute import path; backend dir is on sys.path via uvicorn but
        # not pytest. Add it.
        import sys

        sys.path.insert(0, "/app/backend")
        from vargas import varga_sign  # noqa: F401

    def _vs(self, lon, n):
        import sys

        sys.path.insert(0, "/app/backend")
        from vargas import varga_sign

        return varga_sign(lon, n)

    def test_d30_odd_sign_aries_segments(self):
        # Aries (sign 1, odd): Mars 0-5 -> Aries(1); Sat 5-10 -> Aquarius(11);
        # Jup 10-18 -> Sg(9); Merc 18-25 -> Ge(3); Ven 25-30 -> Li(7)
        assert self._vs(0 + 2, 30) == 1  # 2° Aries
        assert self._vs(0 + 7, 30) == 11
        assert self._vs(0 + 14, 30) == 9
        assert self._vs(0 + 22, 30) == 3
        assert self._vs(0 + 28, 30) == 7

    def test_d30_even_sign_taurus_segments(self):
        # Taurus starts at 30°. Even: Ven 0-5 -> Ta(2); Merc 5-12 -> Vi(6);
        # Jup 12-20 -> Pi(12); Sat 20-25 -> Cp(10); Mars 25-30 -> Sc(8)
        assert self._vs(30 + 2, 30) == 2
        assert self._vs(30 + 8, 30) == 6
        assert self._vs(30 + 15, 30) == 12
        assert self._vs(30 + 22, 30) == 10
        assert self._vs(30 + 27, 30) == 8

    def test_d30_capricorn_10_degrees(self):
        # Capricorn = sign 10 (even). 10° in sign falls in 5-12 segment => Virgo(6)
        # Cap starts at 270°, so lon=280° = 10° Cp
        assert self._vs(280.0, 30) == 6
