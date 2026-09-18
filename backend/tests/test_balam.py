"""Chandrabalam and Tarabalam, pinned to DrikPanchang (New Delhi, Sep 2026).

Reference values were read from drikpanchang.com day-panchang pages for
New Delhi (geoname 1261481) on 2026-09-17, -18 and -19. DrikPanchang counts
only Sampat, Kshema, Sadhaka, Mitra and Ati Mitra as good Tarabalam (Janma is
not), and publishes a fresh list every time the nakshatra or Moon sign changes.
"""

from __future__ import annotations

import pytest

from advanced_panchang import chandra_house, compute_detailed_panchang, tara_position
from muhurta import (
    PURPOSES,
    _best_window,
    _chandrabalam_score,
    _moonsign_at,
    _taraba_score,
    score_day,
)
from panchang_constants import GOOD_CHANDRA_HOUSES, GOOD_TARA_POSITIONS

DELHI = {"latitude": 28.6139, "longitude": 77.2090, "timezone_name": "Asia/Kolkata"}

# Good-Tarabalam lists per transit nakshatra, as published by DrikPanchang
# (spelling normalised to constants.NAKSHATRAS).
DRIK_TARA = {
    "Anuradha": [
        "Ashwini", "Krittika", "Mrigashira", "Punarvasu", "Ashlesha", "Magha",
        "Uttara Phalguni", "Chitra", "Vishakha", "Jyeshtha", "Mula",
        "Uttara Ashadha", "Dhanishta", "Purva Bhadrapada", "Revati",
    ],
    "Jyeshtha": [
        "Ashwini", "Bharani", "Rohini", "Ardra", "Pushya", "Magha",
        "Purva Phalguni", "Hasta", "Swati", "Anuradha", "Mula", "Purva Ashadha",
        "Shravana", "Shatabhisha", "Uttara Bhadrapada",
    ],
    "Mula": [
        "Bharani", "Krittika", "Mrigashira", "Punarvasu", "Ashlesha",
        "Purva Phalguni", "Uttara Phalguni", "Chitra", "Vishakha", "Jyeshtha",
        "Purva Ashadha", "Uttara Ashadha", "Dhanishta", "Purva Bhadrapada", "Revati",
    ],
    "Purva Ashadha": [
        "Ashwini", "Krittika", "Rohini", "Ardra", "Pushya", "Magha",
        "Uttara Phalguni", "Hasta", "Swati", "Anuradha", "Mula", "Uttara Ashadha",
        "Shravana", "Shatabhisha", "Uttara Bhadrapada",
    ],
}  # fmt: skip

DRIK_CHANDRA = {
    "Vrishchika": ["Vrishabha", "Mithuna", "Kanya", "Vrishchika", "Makara", "Kumbha"],
    "Dhanu": ["Mithuna", "Karka", "Tula", "Dhanu", "Kumbha", "Meena"],
}


@pytest.fixture(scope="module")
def delhi():
    return {
        d: compute_detailed_panchang(target_date=d, **DELHI)
        for d in ("2026-09-17", "2026-09-18", "2026-09-19")
    }


def _tara_names(seg):
    return [n["nakshatra"] for n in seg["good_nakshatras"]]


def _chandra_names(seg):
    return [r["rashi"] for r in seg["good_rashis"]]


class TestTables:
    def test_good_taras_exclude_janma(self):
        assert GOOD_TARA_POSITIONS == {2, 4, 6, 8, 9}

    def test_good_chandra_houses(self):
        assert GOOD_CHANDRA_HOUSES == {1, 3, 6, 7, 10, 11}

    @pytest.mark.parametrize(
        "birth, current, position",
        [
            (0, 0, 1),  # same nakshatra: Janma
            (26, 0, 2),  # Revati-born, Ashwini transit: Sampat (wraps)
            (0, 21, 4),  # Ashwini-born, Uttara Ashadha transit: Kshema
            (0, 9, 1),  # cycle repeats every 9: Magha is Janma again
            (0, 18, 1),
            (16, 0, 3),  # Anuradha-born, Ashwini transit: Vipat
        ],
    )
    def test_tara_position(self, birth, current, position):
        assert tara_position(birth, current) == position

    @pytest.mark.parametrize(
        "birth, current, house",
        [(1, 1, 1), (1, 6, 6), (1, 8, 8), (8, 8, 1), (11, 8, 10), (12, 1, 2)],
    )
    def test_chandra_house(self, birth, current, house):
        assert chandra_house(birth, current) == house


class TestDrikPanchangDelhi:
    def test_17_tarabalam_splits_at_nakshatra_end(self, delhi):
        segs = delhi["2026-09-17"]["tarabalam"]["segments"]
        assert [s["nakshatra"] for s in segs] == ["Anuradha", "Jyeshtha"]
        assert segs[0]["ends_at"][11:16] == "19:53"  # Drik: upto 07:53 PM
        assert _tara_names(segs[0]) == DRIK_TARA["Anuradha"]
        # Drik: "Jyeshtha upto 10:44 PM, Sep 18" (true end, past next sunrise)
        assert segs[1]["ends_at"].startswith("2026-09-18T22:44")
        assert _tara_names(segs[1]) == DRIK_TARA["Jyeshtha"]

    def test_17_chandrabalam_single_segment(self, delhi):
        segs = delhi["2026-09-17"]["chandrabalam"]["segments"]
        assert [s["rashi"] for s in segs] == ["Vrishchika"]
        assert _chandra_names(segs[0]) == DRIK_CHANDRA["Vrishchika"]

    def test_18_chandrabalam_splits_at_moon_sign_change(self, delhi):
        segs = delhi["2026-09-18"]["chandrabalam"]["segments"]
        assert [s["rashi"] for s in segs] == ["Vrishchika", "Dhanu"]
        assert segs[0]["ends_at"][11:16] == "22:44"  # Drik: until 10:44 PM
        assert _chandra_names(segs[0]) == DRIK_CHANDRA["Vrishchika"]
        assert _chandra_names(segs[1]) == DRIK_CHANDRA["Dhanu"]

    def test_18_tarabalam(self, delhi):
        segs = delhi["2026-09-18"]["tarabalam"]["segments"]
        assert [s["nakshatra"] for s in segs] == ["Jyeshtha", "Mula"]
        assert segs[0]["ends_at"][11:16] == "22:44"
        assert _tara_names(segs[0]) == DRIK_TARA["Jyeshtha"]
        assert _tara_names(segs[1]) == DRIK_TARA["Mula"]

    def test_19_tarabalam_ends_after_midnight(self, delhi):
        segs = delhi["2026-09-19"]["tarabalam"]["segments"]
        assert [s["nakshatra"] for s in segs] == ["Mula", "Purva Ashadha"]
        assert segs[0]["ends_at"].startswith("2026-09-20T01:43")  # 01:43 AM, Sep 20
        assert _tara_names(segs[0]) == DRIK_TARA["Mula"]
        assert _tara_names(segs[1]) == DRIK_TARA["Purva Ashadha"]

    def test_19_chandrabalam(self, delhi):
        segs = delhi["2026-09-19"]["chandrabalam"]["segments"]
        assert [s["rashi"] for s in segs] == ["Dhanu"]
        assert _chandra_names(segs[0]) == DRIK_CHANDRA["Dhanu"]

    def test_every_segment_has_15_and_excludes_janma(self, delhi):
        for p in delhi.values():
            for seg in p["tarabalam"]["segments"]:
                names = _tara_names(seg)
                assert len(names) == 15
                assert seg["nakshatra"] not in names
            for seg in p["chandrabalam"]["segments"]:
                assert len(seg["good_rashis"]) == 6

    def test_legacy_fields_mirror_sunrise_segment(self, delhi):
        p = delhi["2026-09-18"]
        assert (
            p["tarabalam"]["good_nakshatras"]
            == p["tarabalam"]["segments"][0]["good_nakshatras"]
        )
        assert (
            p["chandrabalam"]["good_rashis"]
            == p["chandrabalam"]["segments"][0]["good_rashis"]
        )


class TestMuhurtaScoring:
    def test_janma_tara_is_not_auspicious(self):
        assert _taraba_score(0, 0) == 0  # Janma
        assert _taraba_score(1, 0) == 20  # Sampat
        assert _taraba_score(2, 0) == 0  # Vipat
        assert _taraba_score(3, 0) == 20  # Kshema
        assert _taraba_score(5, None) == 10  # no native data: neutral

    def test_chandrabalam_score_tiers(self):
        assert _chandrabalam_score(1, 1) == 20  # house 1
        assert _chandrabalam_score(2, 1) == 10  # house 2 neutral
        assert _chandrabalam_score(8, 1) == 0  # house 8 Chandrashtama
        assert _chandrabalam_score(6, None) == 10

    def test_moonsign_at_follows_the_sequence(self, delhi):
        panch = delhi["2026-09-18"]
        assert _moonsign_at(panch, None)["rashi"] == "Vrishchika"
        assert _moonsign_at(panch, "2026-09-18T10:00:00+05:30")["rashi"] == "Vrishchika"
        assert _moonsign_at(panch, "2026-09-18T23:00:00+05:30")["rashi"] == "Dhanu"

    def test_best_window_prefers_native_friendly_nakshatra(self, delhi):
        # 2026-09-18: Jyeshtha until 22:44, then Mula. For a Jyeshtha-born
        # native Jyeshtha is Janma (bad) and Mula is Sampat (good).
        panch = delhi["2026-09-18"]
        _, nak, _, _ = _best_window(panch, {})
        assert nak["name"] == "Jyeshtha"  # no native data: first window wins
        _, nak, start, _ = _best_window(panch, {}, birth_nak_idx=17)
        assert nak["name"] == "Mula"
        assert start.startswith("2026-09-18T22:44")

    def test_score_day_reports_window_moon_sign_and_tara(self, delhi):
        # Mithuna-born: Vrishchika is house 6 and Dhanu house 7, so whichever
        # Moon sign the chosen window falls in, a Chandrabalam reason names it.
        panch = delhi["2026-09-18"]
        for purpose in ("travel", "marriage", "business"):
            day = score_day(panch, PURPOSES[purpose], 17, 3)
            win = day.get("muhurta_window")
            moon = _moonsign_at(panch, win["start"] if win else None)
            assert day["moon_rashi"] == moon["rashi"]
            texts = day["reasons"] + day["cautions"]
            house = chandra_house(3, moon["index"])
            assert any(f"Chandrabalam: Moon in house {house}" in x for x in texts)
            assert any("Tarabalam:" in x and "tara" in x for x in texts)
