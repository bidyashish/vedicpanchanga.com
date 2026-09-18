"""Ayanamsa selection over HTTP: the option list and the effect of each
system on the Delhi anchor chart (1990-01-01 12:00, Lahiri ascendant Pisces).
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.http

EXPECTED_IDS = {"lahiri", "kp_new", "kp_old", "raman", "kp_khullar", "sayan", "manoj"}


@pytest.fixture(scope="module")
def calc(api, base_url, delhi_birth):
    def _calc(ayanamsa: str) -> dict:
        r = api.post(
            f"{base_url}/api/calculate",
            json={**delhi_birth, "ayanamsa": ayanamsa},
        )
        assert r.status_code == 200, f"{ayanamsa}: {r.status_code} {r.text[:300]}"
        return r.json()

    return _calc


class TestAyanamsaOptions:
    def test_lists_all_supported_systems(self, api, base_url):
        r = api.get(f"{base_url}/api/ayanamsa-options")
        assert r.status_code == 200
        data = r.json()
        assert {x["id"] for x in data} == EXPECTED_IDS
        for x in data:
            assert x["label"]


class TestAyanamsaCalculate:
    @pytest.mark.parametrize("ayanamsa", ["lahiri", "raman", "manoj"])
    def test_sidereal_ascendant_is_pisces(self, calc, ayanamsa):
        assert calc(ayanamsa)["ascendant"]["sign"] == "Pisces"

    def test_sayan_ascendant_is_tropical_aries(self, calc):
        asc = calc("sayan")["ascendant"]
        assert asc["sign"] == "Aries"
        assert 6.5 <= asc["degree_in_sign"] <= 9.0

    def test_raman_offset_from_lahiri(self, calc):
        # Raman is ~1.4 deg behind Lahiri, so the ascendant sits later in Pisces.
        assert 14.0 <= calc("raman")["ascendant"]["degree_in_sign"] <= 17.0

    def test_kp_new_vs_kp_old_within_a_degree(self, calc):
        new = calc("kp_new")["ascendant"]["degree_in_sign"]
        old = calc("kp_old")["ascendant"]["degree_in_sign"]
        assert abs(new - old) < 1.0

    def test_kp_khullar_near_sign_boundary(self, calc):
        assert calc("kp_khullar")["ascendant"]["sign"] in ("Pisces", "Aries")

    def test_echoes_selected_ayanamsa(self, calc):
        assert calc("raman")["birth"]["ayanamsa_id"] == "raman"
