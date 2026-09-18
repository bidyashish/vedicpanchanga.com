"""Kalsarpa Yoga detection: all 7 visible planets confined to one
Rahu↔Ketu arc. Variant name (Anant..Sheshnag) keyed by Rahu's house from
the lagna; direction (forward/reverse) by which arc holds the planets."""

from __future__ import annotations

from typing import Any, Dict, List

VISIBLE = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")

KALSARPA_TYPES = [
    "Anant",
    "Kulik",
    "Vasuki",
    "Shankhpal",
    "Padma",
    "Mahapadma",
    "Takshak",
    "Karkotak",
    "Shankhachood",
    "Ghatak",
    "Vishaktak",
    "Sheshnag",
]


def _on_arc(start: float, end: float, lon: float) -> bool:
    """True if `lon` lies on the directed arc from `start` to `end`,
    travelling counter-clockwise (increasing longitude, mod 360)."""
    span = (end - start) % 360
    pos = (lon - start) % 360
    return pos <= span + 1e-9


def analyse_kalsarpa(
    planets: List[Dict[str, Any]],
    asc_sign: int,
) -> Dict[str, Any]:
    by_name = {p["name"]: p for p in planets}
    rahu = by_name.get("Rahu")
    ketu = by_name.get("Ketu")
    if not rahu or not ketu:
        return {"present": False, "verdict": "Insufficient data"}

    rahu_lon = float(rahu["longitude"])
    ketu_lon = float(ketu["longitude"])
    rahu_house = ((int(rahu["sign_id"]) - asc_sign) % 12) + 1
    ketu_house = ((int(ketu["sign_id"]) - asc_sign) % 12) + 1

    visible_lons = [float(by_name[n]["longitude"]) for n in VISIBLE if n in by_name]

    forward = all(_on_arc(rahu_lon, ketu_lon, lon) for lon in visible_lons)
    reverse = all(_on_arc(ketu_lon, rahu_lon, lon) for lon in visible_lons)

    if not (forward or reverse):
        return {
            "present": False,
            "verdict": "Kalsarpa Yoga is NOT present",
            "rahu_house": rahu_house,
            "ketu_house": ketu_house,
            "kind": None,
            "direction": None,
        }

    type_name = KALSARPA_TYPES[(rahu_house - 1) % 12]
    direction = "Forward (Rahu leading)" if forward else "Reverse (Ketu leading)"
    return {
        "present": True,
        "verdict": f"{type_name} Kalsarpa Yoga is present",
        "kind": type_name,
        "direction": direction,
        "rahu_house": rahu_house,
        "ketu_house": ketu_house,
    }
