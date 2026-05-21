"""Special planetary placements - exaltation, debilitation, own sign,
moolatrikona, vargottama, digbala, pushkara, neecha bhanga, parivartana,
mrityu bhaga, gandanta, and planetary war.

Tables follow classical Parashara rules. Each function takes the
planets list (already populated with sign_id, house, d9_sign, etc.)
and annotates it in-place.
"""

from __future__ import annotations

from typing import Any, Dict, List

# sign_id is 1-indexed: 1=Aries .. 12=Pisces

EXALTATION_SIGN: Dict[str, int] = {
    "Sun": 1,
    "Moon": 2,
    "Mars": 10,
    "Mercury": 6,
    "Jupiter": 4,
    "Venus": 12,
    "Saturn": 7,
    "Rahu": 2,
    "Ketu": 8,
}

DEBILITATION_SIGN: Dict[str, int] = {
    "Sun": 7,
    "Moon": 8,
    "Mars": 4,
    "Mercury": 12,
    "Jupiter": 10,
    "Venus": 6,
    "Saturn": 1,
    "Rahu": 8,
    "Ketu": 2,
}

SIGN_LORDS = [
    "Mars",
    "Venus",
    "Mercury",
    "Moon",
    "Sun",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Saturn",
    "Jupiter",
]

# Moolatrikona: (sign_id, start_degree, end_degree)
# Planet must be in this sign AND degree_in_sign within [start, end).
MOOLATRIKONA: Dict[str, tuple[int, float, float]] = {
    "Sun": (5, 0.0, 20.0),
    "Moon": (2, 4.0, 20.0),
    "Mars": (1, 0.0, 12.0),
    "Mercury": (6, 16.0, 20.0),
    "Jupiter": (9, 0.0, 10.0),
    "Venus": (7, 0.0, 15.0),
    "Saturn": (11, 0.0, 20.0),
}

# Digbala: planet gains directional strength in these houses (1-indexed).
DIGBALA: Dict[str, int] = {
    "Jupiter": 1,
    "Mercury": 1,
    "Sun": 10,
    "Mars": 10,
    "Moon": 4,
    "Venus": 4,
    "Saturn": 7,
}

# Pushkara Bhaga: specific "nourishing" degrees per sign (1-indexed).
# Classical orb: planet within 1 degree of the exact bhaga.
PUSHKARA_BHAGA: Dict[int, float] = {
    1: 21.0,
    2: 14.0,
    3: 18.0,
    4: 9.0,
    5: 19.0,
    6: 24.0,
    7: 21.0,
    8: 14.0,
    9: 18.0,
    10: 9.0,
    11: 19.0,
    12: 24.0,
}
_PUSHKARA_ORB = 1.0

# Pushkara Navamsa: D9 sign positions considered auspicious.
# Keyed by D1 sign_id -> set of D9 sign_ids that are Pushkara.
PUSHKARA_NAVAMSA: Dict[int, set] = {
    1: {7, 9},
    2: {3, 5},
    3: {11, 1},
    4: {7, 9},
    5: {3, 5},
    6: {11, 1},
    7: {7, 9},
    8: {3, 5},
    9: {11, 1},
    10: {7, 9},
    11: {3, 5},
    12: {11, 1},
}

# Mrityu Bhaga: sensitive weak degrees per planet per sign (1-indexed).
# Within 1 degree of these values the planet is in Mrityu Bhaga.
MRITYU_BHAGA: Dict[str, List[float]] = {
    "Sun": [20, 9, 12, 6, 8, 24, 16, 17, 22, 2, 3, 23],
    "Moon": [26, 12, 13, 25, 24, 11, 26, 14, 13, 25, 5, 12],
    "Mars": [19, 28, 25, 23, 29, 28, 14, 21, 2, 15, 11, 6],
    "Mercury": [15, 14, 13, 12, 8, 18, 20, 10, 21, 22, 7, 5],
    "Jupiter": [19, 29, 12, 27, 6, 4, 13, 10, 17, 11, 15, 28],
    "Venus": [28, 15, 11, 17, 10, 13, 4, 6, 27, 12, 29, 19],
    "Saturn": [10, 4, 7, 9, 12, 16, 3, 18, 28, 21, 14, 13],
}
_MRITYU_ORB = 1.0

# Gandanta: water-fire sign junctions. Last 3d20m of water signs and
# first 3d20m of fire signs are gandanta zones.
_WATER_SIGNS = {4, 8, 12}  # Cancer, Scorpio, Pisces
_FIRE_SIGNS = {1, 5, 9}  # Aries, Leo, Sagittarius
_GANDANTA_DEG = 3 + 20 / 60  # 3 degrees 20 minutes

# Graha Yuddha: only these five planets can be in planetary war.
_WAR_PLANETS = {"Mars", "Mercury", "Jupiter", "Venus", "Saturn"}
_WAR_ORB = 1.0

KENDRA_HOUSES = {1, 4, 7, 10}


def compute_special_placements(planets: List[Dict[str, Any]]) -> None:
    """Annotate each planet dict with special placement booleans."""
    by_name: Dict[str, Dict[str, Any]] = {p["name"]: p for p in planets}

    for p in planets:
        name = p["name"]
        sign_id = p["sign_id"]
        deg = p.get("degree_in_sign", 0.0)

        p["exalted"] = sign_id == EXALTATION_SIGN.get(name, -1)
        p["debilitated"] = sign_id == DEBILITATION_SIGN.get(name, -1)
        p["own_sign"] = name == SIGN_LORDS[sign_id - 1] if 1 <= sign_id <= 12 else False

        mt = MOOLATRIKONA.get(name)
        p["moolatrikona"] = sign_id == mt[0] and mt[1] <= deg < mt[2] if mt else False

        d1 = p.get("d1_sign")
        d9 = p.get("d9_sign")
        p["vargottama"] = d1 is not None and d9 is not None and d1 == d9

        house = p.get("house")
        p["digbala"] = house == DIGBALA.get(name, -1) if house else False

        # Pushkara Bhaga
        pb_deg = PUSHKARA_BHAGA.get(sign_id)
        p["pushkara_bhaga"] = pb_deg is not None and abs(deg - pb_deg) <= _PUSHKARA_ORB

        # Pushkara Navamsa
        pn_set = PUSHKARA_NAVAMSA.get(sign_id)
        p["pushkara_navamsa"] = d9 is not None and pn_set is not None and d9 in pn_set

        # Mrityu Bhaga
        mb_list = MRITYU_BHAGA.get(name)
        if mb_list and 1 <= sign_id <= 12:
            p["mrityu_bhaga"] = abs(deg - mb_list[sign_id - 1]) <= _MRITYU_ORB
        else:
            p["mrityu_bhaga"] = False

        # Gandanta
        if sign_id in _WATER_SIGNS:
            p["gandanta"] = deg >= (30 - _GANDANTA_DEG)
        elif sign_id in _FIRE_SIGNS:
            p["gandanta"] = deg <= _GANDANTA_DEG
        else:
            p["gandanta"] = False

    # Cross-planet computations

    # Neecha Bhanga (cancellation of debilitation)
    _compute_neecha_bhanga(planets, by_name)

    # Parivartana Yoga (mutual exchange of signs)
    _compute_parivartana(planets, by_name)

    # Graha Yuddha (planetary war)
    _compute_graha_yuddha(planets)


def _compute_neecha_bhanga(
    planets: List[Dict[str, Any]],
    by_name: Dict[str, Dict[str, Any]],
) -> None:
    """A debilitated planet gets neecha bhanga if the lord of its
    debilitation sign is in a kendra from the lagna or Moon, or if
    the planet that gets exalted in the debilitation sign is in a
    kendra from lagna or Moon."""
    moon = by_name.get("Moon")
    moon_house = moon["house"] if moon else None

    for p in planets:
        p["neecha_bhanga"] = False
        if not p.get("debilitated"):
            continue

        deb_sign = p["sign_id"]
        deb_lord = SIGN_LORDS[deb_sign - 1] if 1 <= deb_sign <= 12 else None

        # Condition 1: lord of debilitation sign in kendra from lagna/Moon
        if deb_lord and deb_lord in by_name:
            lord_house = by_name[deb_lord].get("house")
            if lord_house and lord_house in KENDRA_HOUSES:
                p["neecha_bhanga"] = True
                continue
            if moon_house and lord_house:
                rel = ((lord_house - moon_house) % 12) + 1
                if rel in KENDRA_HOUSES:
                    p["neecha_bhanga"] = True
                    continue

        # Condition 2: planet exalted in the debilitation sign is in kendra
        for ex_name, ex_sign in EXALTATION_SIGN.items():
            if ex_sign == deb_sign and ex_name in by_name:
                ex_house = by_name[ex_name].get("house")
                if ex_house and ex_house in KENDRA_HOUSES:
                    p["neecha_bhanga"] = True
                    break
                if moon_house and ex_house:
                    rel = ((ex_house - moon_house) % 12) + 1
                    if rel in KENDRA_HOUSES:
                        p["neecha_bhanga"] = True
                        break


def _compute_parivartana(
    planets: List[Dict[str, Any]],
    by_name: Dict[str, Dict[str, Any]],
) -> None:
    """Two planets exchange signs when each occupies the other's sign."""
    for p in planets:
        p["parivartana"] = False
        p["parivartana_with"] = None

    checked: set = set()
    for p in planets:
        name = p["name"]
        sign_id = p["sign_id"]
        if not (1 <= sign_id <= 12) or name in checked:
            continue
        sign_lord = SIGN_LORDS[sign_id - 1]
        if sign_lord == name:
            continue
        other = by_name.get(sign_lord)
        if not other:
            continue
        other_sign = other["sign_id"]
        if not (1 <= other_sign <= 12):
            continue
        if SIGN_LORDS[other_sign - 1] == name:
            p["parivartana"] = True
            p["parivartana_with"] = sign_lord
            other["parivartana"] = True
            other["parivartana_with"] = name
            checked.add(name)
            checked.add(sign_lord)


def _compute_graha_yuddha(planets: List[Dict[str, Any]]) -> None:
    """Two planets within 1 degree longitude are in planetary war.
    Only Mars, Mercury, Jupiter, Venus, Saturn participate."""
    for p in planets:
        p["graha_yuddha"] = False
        p["graha_yuddha_with"] = None

    war_planets = [p for p in planets if p["name"] in _WAR_PLANETS]
    for i, a in enumerate(war_planets):
        for b in war_planets[i + 1 :]:
            diff = abs(a["longitude"] - b["longitude"])
            if diff > 180:
                diff = 360 - diff
            if diff <= _WAR_ORB:
                a["graha_yuddha"] = True
                a["graha_yuddha_with"] = b["name"]
                b["graha_yuddha"] = True
                b["graha_yuddha_with"] = a["name"]
