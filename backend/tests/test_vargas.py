"""Divisional charts D1..D60.

HTTP tests check the ``vargas`` block of ``/api/calculate``; the unit tests
pin the D30 Trimshamsha uneven-segment rules, the D11 Rudramsha start-sign
rule and ``varga_degree_in_sign``.
"""

from __future__ import annotations

import pytest

from vargas import varga_degree_in_sign, varga_sign

EXPECTED_VARGA_ORDER = [1, 2, 3, 4, 7, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60]
EXPECTED_VARGA_KEYS = {f"d{n}" for n in EXPECTED_VARGA_ORDER}


def _house(chart: dict, h: int) -> list:
    """Chart houses are str keys over HTTP and int keys in-process."""
    return chart.get(str(h), chart.get(h, []))


@pytest.fixture(scope="module")
def chart(api, base_url, delhi_birth):
    r = api.post(f"{base_url}/api/calculate", json=delhi_birth)
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
            assert 1 <= v["asc_sign"] <= 12
            assert "division" in v
            for h in range(1, 13):
                assert str(h) in v["chart"] or h in v["chart"], (
                    f"{key} missing house {h}"
                )

    @pytest.mark.parametrize(
        ("key", "field", "expected"),
        [
            ("d1", "subtitle", "Physical Self / Body"),
            ("d11", "subtitle", "Gains / Income"),
            ("d11", "name", "Rudramsa"),
            ("d30", "subtitle", "Misfortunes"),
            ("d60", "subtitle", "Past-Life Karma"),
        ],
    )
    def test_labels(self, chart, key, field, expected):
        assert chart["vargas"][key][field] == expected

    def test_planets_present_in_each_varga(self, chart):
        for key, v in chart["vargas"].items():
            flat = [abbr for h in range(1, 13) for abbr in _house(v["chart"], h)]
            assert "Su" in flat, f"Sun missing in {key}"
            assert "As" in flat, f"Ascendant missing in {key}"

    def test_planet_degrees_present_on_every_varga(self, chart):
        for key, v in chart["vargas"].items():
            pd = v["planet_degrees"]
            assert "Su" in pd and "As" in pd, f"{key} planet_degrees incomplete"
            for abbr, deg in pd.items():
                assert 0.0 <= deg <= 30.0, f"{key} {abbr} degree out of range: {deg}"

    def test_d1_matches_planets_data_degree_in_sign(self, chart):
        d1_degrees = chart["vargas"]["d1"]["planet_degrees"]
        for p in chart["planets_data"]:
            assert d1_degrees[p["abbr"]] == pytest.approx(p["degree_in_sign"])


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
                assert _house(legacy, h) == _house(new, h), f"d{n} house {h} mismatch"


@pytest.mark.http
class TestNavamsaFormula:
    def test_d9_formula_for_each_planet(self, chart):
        d9 = chart["vargas"]["d9"]
        for p in chart["planets_data"]:
            expected_sign = int(((p["longitude"] * 9) % 360) // 30) + 1
            expected_house = ((expected_sign - d9["asc_sign"]) % 12) + 1
            cell = _house(d9["chart"], expected_house)
            assert p["abbr"] in cell, (
                f"{p['name']} expected in D9 house {expected_house}, got {cell}"
            )


class TestD30Trimshamsha:
    def test_odd_sign_aries_segments(self):
        # Aries (odd): Ma 0-5 -> Aries(1), Sa 5-10 -> Aquarius(11),
        # Ju 10-18 -> Sagittarius(9), Me 18-25 -> Gemini(3), Ve 25-30 -> Libra(7)
        assert varga_sign(2, 30) == 1
        assert varga_sign(7, 30) == 11
        assert varga_sign(14, 30) == 9
        assert varga_sign(22, 30) == 3
        assert varga_sign(28, 30) == 7

    def test_even_sign_taurus_segments(self):
        # Taurus (even, starts at 30): Ve 0-5 -> Ta(2), Me 5-12 -> Vi(6),
        # Ju 12-20 -> Pi(12), Sa 20-25 -> Cp(10), Ma 25-30 -> Sc(8)
        assert varga_sign(30 + 2, 30) == 2
        assert varga_sign(30 + 8, 30) == 6
        assert varga_sign(30 + 15, 30) == 12
        assert varga_sign(30 + 22, 30) == 10
        assert varga_sign(30 + 27, 30) == 8

    def test_capricorn_10_degrees_lands_in_virgo(self):
        # Capricorn (even, starts 270). 10 deg in sign -> Mercury segment (5-12) -> Virgo(6).
        assert varga_sign(280.0, 30) == 6


class TestD11Rudramsha:
    """Start sign is found by counting the rasi's number anti-zodiacally from
    Aries; the 11 parts (30/11 deg each) then run forward. No odd/even split.
    Worked examples are from PVR Narasimha Rao's method (Jagannatha Hora)."""

    def test_mercury_11deg_gemini_stays_in_gemini(self):
        # 11 Gemini = 71. 5th part; Gemini (3rd from Aries) -> start Aquarius
        # (3rd anti-zodiacally); 5th from Aquarius = Gemini(3).
        assert varga_sign(71.0, 11) == 3

    def test_jupiter_19deg_scorpio_goes_to_pisces(self):
        # 19 Scorpio = 229. 7th part; Scorpio (8th from Aries) -> start Virgo
        # (8th anti-zodiacally); 7th from Virgo = Pisces(12).
        assert varga_sign(229.0, 11) == 12

    def test_aries_first_part_is_aries(self):
        assert varga_sign(0.0, 11) == 1

    def test_aries_last_part_is_aquarius(self):
        # Aries 29 = 11th part counted forward from Aries -> Aquarius(11).
        assert varga_sign(29.0, 11) == 11

    def test_taurus_first_part_is_pisces(self):
        # Taurus (2nd from Aries) -> start Pisces; confirms no odd/even distinction.
        assert varga_sign(30.0, 11) == 12

    def test_part_width_boundary(self):
        # Each part spans 30/11 ~ 2.7273 deg.
        assert varga_sign(30 / 11 - 1e-6, 11) == 1
        assert varga_sign(30 / 11 + 1e-6, 11) == 2


class TestVargaDegreeInSign:
    def test_d1_is_degree_in_rashi(self):
        assert varga_degree_in_sign(5.0, 1) == pytest.approx(5.0)
        assert varga_degree_in_sign(35.0, 1) == pytest.approx(5.0)  # 5 Taurus
        assert varga_degree_in_sign(123.4, 1) == pytest.approx(3.4)  # 3.4 Leo

    def test_d9_uniform_formula(self):
        # Aries 5 lies in the 2nd navamsa (3.33-6.66). Position within = 1.67;
        # scaled to 30 deg within the navamsa sign = 15.
        assert varga_degree_in_sign(5.0, 9) == pytest.approx(15.0, abs=1e-9)
        assert varga_degree_in_sign(0.0, 9) == pytest.approx(0.0, abs=1e-9)
        assert varga_degree_in_sign(30 / 9, 9) == pytest.approx(0.0, abs=1e-9)

    def test_d2_hora(self):
        assert varga_degree_in_sign(5.0, 2) == pytest.approx(10.0)
        assert varga_degree_in_sign(15.0, 2) == pytest.approx(0.0)
        assert varga_degree_in_sign(22.5, 2) == pytest.approx(15.0)

    def test_d60_shashtiamsa(self):
        # 60 parts of 0.5 deg. 0.25 -> halfway into first segment -> 15.
        assert varga_degree_in_sign(0.25, 60) == pytest.approx(15.0, abs=1e-9)
        assert varga_degree_in_sign(0.5, 60) == pytest.approx(0.0, abs=1e-9)

    def test_d11_rudramsha(self):
        part = 30 / 11
        assert varga_degree_in_sign(part / 2, 11) == pytest.approx(15.0, abs=1e-9)
        assert varga_degree_in_sign(part + 1e-9, 11) == pytest.approx(0.0, abs=1e-6)
        assert varga_degree_in_sign(part * 2 + part / 4, 11) == pytest.approx(
            7.5, abs=1e-9
        )

    def test_d30_odd_sign_segments(self):
        # Aries (odd) breaks: 0-5 (Mars), 5-10 (Sat), 10-18 (Jup), 18-25 (Mer), 25-30 (Ven).
        assert varga_degree_in_sign(2.0, 30) == pytest.approx(12.0)
        assert varga_degree_in_sign(5.0, 30) == pytest.approx(0.0)
        assert varga_degree_in_sign(14.0, 30) == pytest.approx(15.0)

    def test_d30_even_sign_segments(self):
        # Taurus (even) breaks: 0-5 (Ven), 5-12 (Mer), 12-20 (Jup), 20-25 (Sat), 25-30 (Mars).
        # 8 deg in Taurus -> 3/7 of the Mercury segment.
        assert varga_degree_in_sign(30 + 8, 30) == pytest.approx(3.0 / 7.0 * 30.0)

    def test_range_is_within_0_30(self):
        for lon in (0.0, 12.34, 30.0, 89.99, 180.5, 359.999):
            for n in EXPECTED_VARGA_ORDER:
                d = varga_degree_in_sign(lon, n)
                assert 0.0 <= d <= 30.0, f"out of range for lon={lon}, n={n}: {d}"
