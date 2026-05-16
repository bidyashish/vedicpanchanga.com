"""Vedic planetary aspects (Drishti / Graha Drishti).

Every planet has a full (100%) aspect on the 7th house from itself.
Mars, Jupiter and Saturn have additional special aspects:

  Mars    : 4th, 8th  (full)
  Jupiter : 5th, 9th  (full)
  Saturn  : 3rd, 10th (full)

Rahu/Ketu special aspects follow the Jupiter pattern (5, 7, 9) per
some traditions - included but flagged as optional.

Strength is computed from the angular distance between the aspecting
planet's longitude and the midpoint of the aspected sign (house).
Closer to exact = stronger.
"""

from __future__ import annotations

from typing import Any, Dict, List

BENEFICS = {"Jupiter", "Venus", "Moon", "Mercury"}
MALEFICS = {"Sun", "Mars", "Saturn", "Rahu", "Ketu"}

SPECIAL_ASPECTS: Dict[str, List[int]] = {
    "Mars": [4, 8],
    "Jupiter": [5, 9],
    "Saturn": [3, 10],
    "Rahu": [5, 9],
    "Ketu": [5, 9],
}


def _house_offset(from_sign: int, to_sign: int) -> int:
    """1-based house distance: same sign = 1, next = 2, ..., opposite = 7."""
    return ((to_sign - from_sign) % 12) + 1


def _aspect_strength(planet_lon: float, target_sign_mid: float) -> int:
    """Percentage strength (0-100) based on angular closeness.

    ``target_sign_mid`` is the midpoint longitude of the aspected sign
    (e.g. Aries midpoint = 15.0).  A planet sitting exactly at the
    midpoint gets 100%; one a full 15 degrees away within the sign
    gets ~50%.
    """
    diff = abs(planet_lon - target_sign_mid) % 360
    if diff > 180:
        diff = 360 - diff
    ideal = round(diff / 30) * 30
    deviation = abs(diff - ideal)
    if deviation < 1:
        return 100
    if deviation < 5:
        return 90
    if deviation < 10:
        return 75
    if deviation < 15:
        return 60
    return 50


def compute_aspects(
    planets_data: List[Dict[str, Any]],
    asc_sign: int,
) -> Dict[str, Any]:
    """Return full aspect data for the chart.

    Returns
    -------
    dict with keys:
        aspects : list[dict]   - every individual aspect edge
        by_planet : dict       - planet abbr -> {aspected_houses, details}
        mutual : list[dict]    - pairs that aspect each other
    """
    sign_midpoints = {s: (s - 1) * 30 + 15.0 for s in range(1, 13)}

    all_aspects: List[Dict[str, Any]] = []
    by_planet: Dict[str, Dict[str, Any]] = {}

    real_planets = [p for p in planets_data if p["name"] != "Ascendant"]

    for p in real_planets:
        p_sign = p["sign_id"]
        p_house = p.get("house", ((p_sign - asc_sign) % 12) + 1)
        p_lon = p["longitude"]
        is_benefic = p["name"] in BENEFICS
        specials = SPECIAL_ASPECTS.get(p["name"], [])
        aspect_houses: List[int] = []
        details: List[Dict[str, Any]] = []

        for target_sign in range(1, 13):
            if target_sign == p_sign:
                continue
            offset = _house_offset(p_sign, target_sign)
            is_seventh = offset == 7
            is_special = offset in specials

            if not is_seventh and not is_special:
                continue

            target_house = ((target_sign - asc_sign) % 12) + 1
            strength = _aspect_strength(p_lon, sign_midpoints[target_sign])

            aspect_type = "special" if is_special and not is_seventh else "standard"

            entry = {
                "planet": p["name"],
                "planet_abbr": p["abbr"],
                "from_sign": p_sign,
                "from_house": p_house,
                "to_sign": target_sign,
                "to_house": target_house,
                "offset": offset,
                "aspect_type": aspect_type,
                "strength": strength,
                "benefic": is_benefic,
            }
            all_aspects.append(entry)
            aspect_houses.append(target_house)
            details.append(entry)

        by_planet[p["abbr"]] = {
            "name": p["name"],
            "abbr": p["abbr"],
            "house": p_house,
            "benefic": is_benefic,
            "retrograde": p.get("retrograde", False),
            "combust": p.get("combust", False),
            "aspected_houses": sorted(set(aspect_houses)),
            "details": details,
        }

    mutual = _find_mutual_aspects(all_aspects)

    return {
        "aspects": all_aspects,
        "by_planet": by_planet,
        "mutual": mutual,
    }


def _find_mutual_aspects(
    aspects: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Identify pairs of planets that aspect each other."""
    targets_by_planet: Dict[str, set] = {}
    sign_of: Dict[str, int] = {}
    for a in aspects:
        targets_by_planet.setdefault(a["planet"], set()).add(a["to_sign"])
        sign_of[a["planet"]] = a["from_sign"]

    seen: set = set()
    mutual: List[Dict[str, Any]] = []
    for p1, signs1 in targets_by_planet.items():
        for p2, signs2 in targets_by_planet.items():
            if p1 >= p2:
                continue
            pair = (p1, p2)
            if pair in seen:
                continue
            if sign_of.get(p2) in signs1 and sign_of.get(p1) in signs2:
                seen.add(pair)
                mutual.append({"planet1": p1, "planet2": p2})

    return mutual
