"""Jaimini Chara karakas + Karakamsa & Swamsa chart construction.

Karakamsa lagna = D9 sign of the Atmakaraka (rotation reference for the
Karakamsa kundli). Swamsa lagna = D9 sign of the natal ascendant degree.
Both charts use the same planet → D9-sign mapping, only the house numbering
rotates.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from calculator import d9_sign_index

KARAKA_TITLES = [
    ("AK", "Atmakaraka"),
    ("AmK", "Amatyakaraka"),
    ("BK", "Bhratrukaraka"),
    ("MK", "Matrukaraka"),
    ("PK", "Putrakaraka"),
    ("GK", "Gnatikaraka"),
    ("DK", "Darakaraka"),
]

KARAKA_PLANETS = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")


def compute_chara_karakas(
    planets: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Rank the 7 visible planets by degree-in-sign desc and assign karaka titles."""
    by_name = {p["name"]: p for p in planets}
    candidates: List[Tuple[float, str]] = []
    for name in KARAKA_PLANETS:
        p = by_name.get(name)
        if not p:
            continue
        candidates.append((float(p["degree_in_sign"]), name))
    candidates.sort(key=lambda t: t[0], reverse=True)

    out: List[Dict[str, Any]] = []
    for (abbr, full), (deg, name) in zip(KARAKA_TITLES, candidates):
        p = by_name[name]
        out.append(
            {
                "rank": len(out) + 1,
                "abbr": abbr,
                "title": full,
                "planet": name,
                "planet_abbr": p["abbr"],
                "sign": p["sign"],
                "sign_id": p["sign_id"],
                "degree_in_sign": p["degree_in_sign"],
                "dms": p.get("dms", ""),
            }
        )
    return out


def _draw_chart_from_lagna(
    planets: List[Dict[str, Any]],
    lagna_sign: int,
) -> Dict[int, List[str]]:
    """Build a {house: [planet_abbrs]} map for the navamsa, with `lagna_sign`
    placed in house 1. Uses each planet's `d9_sign` field (added by the
    main calculator)."""
    houses: Dict[int, List[str]] = {h: [] for h in range(1, 13)}
    for p in planets:
        d9_sign = p.get("d9_sign")
        if d9_sign is None:
            continue
        house = ((d9_sign - lagna_sign) % 12) + 1
        houses[house].append(p["abbr"])
    return houses


def compute_karakamsa_swamsa(
    planets: List[Dict[str, Any]],
    karakas: List[Dict[str, Any]],
    asc_longitude: float,
) -> Dict[str, Any]:
    """Return both Karakamsa and Swamsa charts (house-map + lagna sign)."""
    ak = next((k for k in karakas if k["abbr"] == "AK"), None)
    if ak is None:
        karakamsa_lagna = 1
    else:
        ak_planet = next((p for p in planets if p["name"] == ak["planet"]), None)
        karakamsa_lagna = d9_sign_index(ak_planet["longitude"]) if ak_planet else 1

    swamsa_lagna = d9_sign_index(asc_longitude)

    return {
        "karakamsa": {
            "lagna_sign": karakamsa_lagna,
            "chart": _draw_chart_from_lagna(planets, karakamsa_lagna),
        },
        "swamsa": {
            "lagna_sign": swamsa_lagna,
            "chart": _draw_chart_from_lagna(planets, swamsa_lagna),
        },
    }
