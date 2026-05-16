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


# ── varga_degree_in_sign direct unit tests ────────────────────────────────
class TestVargaDegreeInSign:
    @pytest.fixture
    def fn(self):
        from vargas import varga_degree_in_sign as f  # noqa: WPS433

        return f

    def test_d1_is_degree_in_rashi(self, fn):
        # D1 should equal longitude % 30 (position within the rashi).
        assert fn(5.0, 1) == pytest.approx(5.0)
        assert fn(35.0, 1) == pytest.approx(5.0)  # 5° Taurus
        assert fn(123.4, 1) == pytest.approx(3.4)  # 3.4° Leo

    def test_d9_uniform_formula(self, fn):
        # Aries 5° lies in the 2nd navamsa (3.33-6.66°). Position within = 1.67;
        # scaled to 30° within the navamsa sign = 15.
        assert fn(5.0, 9) == pytest.approx(15.0, abs=1e-9)
        # Aries 0° → start of first navamsa → 0°.
        assert fn(0.0, 9) == pytest.approx(0.0, abs=1e-9)
        # Aries 3.333...° → end of first navamsa / start of second → ~0°.
        assert fn(30 / 9, 9) == pytest.approx(0.0, abs=1e-9)

    def test_d2_hora(self, fn):
        # Aries 5° → 1/3 into first 15° hora → 10° within the hora sign.
        assert fn(5.0, 2) == pytest.approx(10.0)
        # Aries 15° → start of second hora → 0°.
        assert fn(15.0, 2) == pytest.approx(0.0)
        # Aries 22.5° → halfway through second hora → 15°.
        assert fn(22.5, 2) == pytest.approx(15.0)

    def test_d60_shashtiamsa(self, fn):
        # 60 parts of 0.5°. 0.25° → halfway into first segment → 15°.
        assert fn(0.25, 60) == pytest.approx(15.0, abs=1e-9)
        assert fn(0.5, 60) == pytest.approx(0.0, abs=1e-9)

    def test_d30_odd_sign_segments(self, fn):
        # Aries (odd) breaks: 0-5 (Mars), 5-10 (Sat), 10-18 (Jup), 18-25 (Mer), 25-30 (Ven).
        # 2° → 2/5 of Mars segment → 12° within Aries (Mars varga sign).
        assert fn(2.0, 30) == pytest.approx(12.0)
        # 5° → start of Saturn segment → 0°.
        assert fn(5.0, 30) == pytest.approx(0.0)
        # 14° → 4/8 of Jupiter segment (10-18) → 15° within Sagittarius.
        assert fn(14.0, 30) == pytest.approx(15.0)

    def test_d30_even_sign_segments(self, fn):
        # Taurus (even, starts 30°) breaks: 0-5 (Ven), 5-12 (Mer), 12-20 (Jup), 20-25 (Sat), 25-30 (Mars).
        # 30 + 8 = 8° in Taurus → 3/7 of Mercury segment → ~12.857° within Virgo.
        assert fn(30 + 8, 30) == pytest.approx(3.0 / 7.0 * 30.0)

    def test_range_is_within_0_30(self, fn):
        # No matter the longitude, the result must be in [0, 30) for every varga.
        for lon in (0.0, 12.34, 30.0, 89.99, 180.5, 359.999):
            for n in (1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60):
                d = fn(lon, n)
                assert 0.0 <= d <= 30.0, f"out of range for lon={lon}, n={n}: {d}"


# ── HTTP test: planet_degrees exposed on every varga response ────────────
@pytest.mark.http
class TestPlanetDegreesResponse:
    def test_planet_degrees_present_on_every_varga(self, chart):
        for key, v in chart["vargas"].items():
            assert "planet_degrees" in v, f"{key} missing planet_degrees"
            pd = v["planet_degrees"]
            assert "Su" in pd, f"{key} planet_degrees missing Sun"
            assert "As" in pd, f"{key} planet_degrees missing Ascendant"
            for abbr, deg in pd.items():
                assert 0.0 <= deg <= 30.0, f"{key} {abbr} degree out of range: {deg}"

    def test_d1_matches_planets_data_degree_in_sign(self, chart):
        d1_degrees = chart["vargas"]["d1"]["planet_degrees"]
        for p in chart["planets_data"]:
            assert d1_degrees[p["abbr"]] == pytest.approx(p["degree_in_sign"])
