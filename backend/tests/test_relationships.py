"""Unit tests for `relationships.compute_friendship_tables`."""

from __future__ import annotations

import pytest

from relationships import (
    NATURAL_FRIENDSHIP,
    VISIBLE_PLANETS,
    compute_friendship_tables,
)

EXPECTED_NAT_F = ("F", "GF", "F")
EXPECTED_NAT_E = ("E", "GE", "E")


@pytest.fixture
def fr(delhi_chart):
    return delhi_chart["friendships"]


def test_seven_planets_all_present(fr):
    assert fr["planets"] == list(VISIBLE_PLANETS)


def test_diagonal_is_blank(fr):
    for kind in ("natural", "temporal", "composite"):
        for p in VISIBLE_PLANETS:
            assert fr[kind][p][p] == "", f"{kind}[{p}][{p}] should be empty"


def test_natural_table_matches_canonical(fr):
    for a, row in NATURAL_FRIENDSHIP.items():
        for b, expected in row.items():
            assert fr["natural"][a][b] == expected, (
                f"natural[{a}][{b}]: expected {expected}, got {fr['natural'][a][b]}"
            )


def test_composite_codes_are_in_legend(fr):
    valid = set(fr["labels"].keys()) | {""}
    for a in VISIBLE_PLANETS:
        for b in VISIBLE_PLANETS:
            assert fr["composite"][a][b] in valid


def test_natural_friend_plus_temporal_friend_yields_great_friend():
    # Pure-function check: synthesise minimal planet entries so we can craft
    # a temporal-friend relationship without relying on the live ephemeris.
    planets = [
        # Sun in sign 1 (Aries); Moon in sign 2 (Taurus) — Moon is in 2nd
        # from Sun → temporal Friend; Sun-Moon naturally Friend → composite GF.
        {"name": "Sun",     "sign_id": 1},
        {"name": "Moon",    "sign_id": 2},
        {"name": "Mars",    "sign_id": 5},
        {"name": "Mercury", "sign_id": 8},
        {"name": "Jupiter", "sign_id": 11},
        {"name": "Venus",   "sign_id": 3},
        {"name": "Saturn",  "sign_id": 7},
    ]
    out = compute_friendship_tables(planets)
    assert out["natural"]["Sun"]["Moon"] == "F"
    assert out["temporal"]["Sun"]["Moon"] == "F"
    assert out["composite"]["Sun"]["Moon"] == "GF"


def test_natural_enemy_plus_temporal_enemy_yields_great_enemy():
    # Sun and Saturn are natural enemies. Place them 6 signs apart so neither
    # is in {2,3,4,10,11,12} from the other → temporal enemy → composite GE.
    planets = [
        {"name": "Sun",     "sign_id": 1},
        {"name": "Saturn",  "sign_id": 7},   # 7th from Sun → temporal enemy
        {"name": "Moon",    "sign_id": 4},
        {"name": "Mars",    "sign_id": 5},
        {"name": "Mercury", "sign_id": 6},
        {"name": "Jupiter", "sign_id": 9},
        {"name": "Venus",   "sign_id": 11},
    ]
    out = compute_friendship_tables(planets)
    assert out["natural"]["Sun"]["Saturn"] == "E"
    assert out["temporal"]["Sun"]["Saturn"] == "E"
    assert out["composite"]["Sun"]["Saturn"] == "GE"
