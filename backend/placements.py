"""Special planetary placements - exaltation, debilitation, own sign,
moolatrikona, vargottama, and digbala (directional strength).

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


def compute_special_placements(planets: List[Dict[str, Any]]) -> None:
    """Annotate each planet dict with special placement booleans."""
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
