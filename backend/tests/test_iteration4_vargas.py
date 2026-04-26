"""Divisional charts D1..D60: HTTP shape tests + direct unit tests for the
D30 Trimshāṁśa uneven-segment rules."""

from __future__ import annotations

import pytest

EXPECTED_VARGA_ORDER = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]
EXPECTED_VARGA_KEYS = {f"d{n}" for n in EXPECTED_VARGA_ORDER}


# ── HTTP fixture: Delhi sample chart ─────────────────────────────────────
@pytest.fixture(scope="module")
def chart(api, base_url):
    payload = {
        "birth_date": "1990-01-01",
        "birth_time": "12:00",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": "Asia/Kolkata",
        "ayanamsa": "lahiri",
    }
    r = api.post(f"{base_url}/api/calculate", json=payload, timeout=30)
    assert r.status_code == 200, f"calculate failed: {r.status_code} {r.text[:300]}"
    return r.json()


@pytest.mark.http
class TestVargasStructure:
    def test_varga_order_field(self, chart):
        assert chart["varga_order"] == EXPECTED_VARGA_ORDER

    def test_vargas_keys_present(self, chart):
        assert set(chart["vargas"].keys()) == EXPECTED_VARGA_KEYS

    def test_each_varga_shape(self, chart):
        for key, v in chart["vargas"].items():
            assert v.get("chart"), f"{key} missing chart"
            assert v.get("name"), f"{key} missing name"
            assert v.get("subtitle"), f"{key} missing subtitle"
            assert "asc_sign" in v
            assert 1 <= v["asc_sign"] <= 12
            assert "division" in v
            for h in range(1, 13):
                ch = v["chart"]
                assert str(h) in ch or h in ch, f"{key} missing house {h}"

    def test_d1_subtitle(self, chart):
        assert chart["vargas"]["d1"]["subtitle"] == "Physical Self / Body"

    def test_d30_subtitle(self, chart):
        assert chart["vargas"]["d30"]["subtitle"] == "Misfortunes"

    def test_d60_subtitle(self, chart):
        assert chart["vargas"]["d60"]["subtitle"] == "Past-Life Karma"

    def test_planets_present_in_each_varga(self, chart):
        for key, v in chart["vargas"].items():
            ch = v["chart"]
            flat = []
            for h in range(1, 13):
                flat.extend(ch.get(str(h), ch.get(h, [])))
            assert "Su" in flat, f"Sun missing in {key}"
            assert "As" in flat, f"Ascendant missing in {key}"


@pytest.mark.http
class TestBackwardCompat:
    def test_legacy_d1_d2_d9_present(self, chart):
        for f in ("d1_chart", "d2_chart", "d9_chart", "d1_asc_sign"):
            assert f in chart, f"legacy field missing: {f}"

    def test_legacy_chart_matches_new(self, chart):
        for n in (1, 2, 9):
            legacy = chart[f"d{n}_chart"]
            new = chart["vargas"][f"d{n}"]["chart"]
            for h in range(1, 13):
                a = legacy.get(str(h), legacy.get(h, []))
                b = new.get(str(h), new.get(h, []))
                assert a == b, f"d{n} house {h} mismatch legacy={a} new={b}"


@pytest.mark.http
class TestNavamsaFormula:
    def test_d9_formula_for_each_planet(self, chart):
        d9 = chart["vargas"]["d9"]
        d9_asc = d9["asc_sign"]
        for p in chart["planets_data"]:
            expected_sign = int(((p["longitude"] * 9) % 360) // 30) + 1
            expected_house = ((expected_sign - d9_asc) % 12) + 1
            cell = d9["chart"].get(
                str(expected_house), d9["chart"].get(expected_house, [])
            )
            assert p["abbr"] in cell, (
                f"{p['name']} expected in D9 house {expected_house}, got {cell}"
            )


# ── D30 Trimshāṁśa direct unit tests (no HTTP) ───────────────────────────
class TestD30Trimshamsha:
    @pytest.fixture
    def varga_sign(self):
        from vargas import varga_sign as vs  # noqa: WPS433

        return vs

    def test_odd_sign_aries_segments(self, varga_sign):
        # Aries (odd): Ma 0-5° → Aries(1) · Sa 5-10° → Aquarius(11)
        # · Ju 10-18° → Sagittarius(9) · Me 18-25° → Gemini(3) · Ve 25-30° → Libra(7)
        assert varga_sign(2, 30) == 1
        assert varga_sign(7, 30) == 11
        assert varga_sign(14, 30) == 9
        assert varga_sign(22, 30) == 3
        assert varga_sign(28, 30) == 7

    def test_even_sign_taurus_segments(self, varga_sign):
        # Taurus (even, starts at 30°): Ve 0-5° → Ta(2) · Me 5-12° → Vi(6)
        # · Ju 12-20° → Pi(12) · Sa 20-25° → Cp(10) · Ma 25-30° → Sc(8)
        assert varga_sign(30 + 2, 30) == 2
        assert varga_sign(30 + 8, 30) == 6
        assert varga_sign(30 + 15, 30) == 12
        assert varga_sign(30 + 22, 30) == 10
        assert varga_sign(30 + 27, 30) == 8

    def test_capricorn_10_degrees_lands_in_virgo(self, varga_sign):
        # Capricorn (even, starts 270°). 10° in sign → Mercury segment (5-12°) → Virgo(6).
        assert varga_sign(280.0, 30) == 6
