"""Unit tests for `jaimini.compute_chara_karakas` + `compute_karakamsa_swamsa`.

Reference (Knk): all 7 Chara karakas match the AstroSage sample —
Atma=Moon, Amatya=Jupiter, Bhratru=Mercury, Matru=Mars, Putra=Saturn,
Gnati=Sun, Dara=Venus. Karakamsa lagna = D9 sign of AK = Aquarius (11).
"""

from __future__ import annotations

EXPECTED_KNK_KARAKAS = [
    ("AK", "Moon"),
    ("AmK", "Jupiter"),
    ("BK", "Mercury"),
    ("MK", "Mars"),
    ("PK", "Saturn"),
    ("GK", "Sun"),
    ("DK", "Venus"),
]


def test_seven_karakas_in_descending_degree_order(delhi_chart):
    karakas = delhi_chart["karakas"]
    assert len(karakas) == 7
    degs = [k["degree_in_sign"] for k in karakas]
    assert degs == sorted(degs, reverse=True)


def test_karakas_exclude_rahu_and_ketu(delhi_chart):
    names = {k["planet"] for k in delhi_chart["karakas"]}
    assert "Rahu" not in names
    assert "Ketu" not in names
    assert names == {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"}


def test_knk_karakas_match_astrosage_reference(knk_chart):
    actual = [(k["abbr"], k["planet"]) for k in knk_chart["karakas"]]
    assert actual == EXPECTED_KNK_KARAKAS


def test_knk_karakamsa_lagna_is_aquarius(knk_chart):
    assert knk_chart["karakamsa"]["lagna_sign"] == 11


def test_ak_lands_in_house_one_of_karakamsa(knk_chart):
    assert "Mo" in knk_chart["karakamsa"]["chart"][1]


def test_swamsa_lagna_equals_d9_of_natal_ascendant(delhi_chart, chart_module):
    expected = chart_module.d9_sign_index(delhi_chart["ascendant"]["longitude"])
    assert delhi_chart["swamsa"]["lagna_sign"] == expected
