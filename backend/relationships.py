"""Planet friendship table — natural, temporal, and the 5-fold composite.

Natural friendship is the classical Parashara table. Temporal friendship is
derived from the chart: planets in the 2nd, 3rd, 4th, 10th, 11th or 12th
sign from each other are temporary friends; in any other relative house they
are temporary enemies. Composite (panchadha) friendship combines them:

  natural friend  + temporary friend  → great friend
  natural friend  + temporary enemy   → neutral
  natural neutral + temporary friend  → friend
  natural neutral + temporary enemy   → enemy
  natural enemy   + temporary friend  → neutral
  natural enemy   + temporary enemy   → great enemy
"""

from __future__ import annotations

from typing import Any, Dict, List

VISIBLE_PLANETS = (
    "Sun",
    "Moon",
    "Mars",
    "Mercury",
    "Jupiter",
    "Venus",
    "Saturn",
    "Rahu",
    "Ketu",
)

# Classical 7-planet table plus Rahu/Ketu extensions.
# Rahu behaves like Saturn; Ketu behaves like Mars.
NATURAL_FRIENDSHIP: Dict[str, Dict[str, str]] = {
    "Sun": {
        "Moon": "F",
        "Mars": "F",
        "Mercury": "N",
        "Jupiter": "F",
        "Venus": "E",
        "Saturn": "E",
        "Rahu": "E",
        "Ketu": "N",
    },
    "Moon": {
        "Sun": "F",
        "Mars": "N",
        "Mercury": "F",
        "Jupiter": "N",
        "Venus": "N",
        "Saturn": "N",
        "Rahu": "E",
        "Ketu": "N",
    },
    "Mars": {
        "Sun": "F",
        "Moon": "F",
        "Mercury": "E",
        "Jupiter": "F",
        "Venus": "N",
        "Saturn": "N",
        "Rahu": "N",
        "Ketu": "F",
    },
    "Mercury": {
        "Sun": "F",
        "Moon": "E",
        "Mars": "N",
        "Jupiter": "N",
        "Venus": "F",
        "Saturn": "N",
        "Rahu": "F",
        "Ketu": "E",
    },
    "Jupiter": {
        "Sun": "F",
        "Moon": "F",
        "Mars": "F",
        "Mercury": "E",
        "Venus": "E",
        "Saturn": "N",
        "Rahu": "E",
        "Ketu": "F",
    },
    "Venus": {
        "Sun": "E",
        "Moon": "E",
        "Mars": "N",
        "Mercury": "F",
        "Jupiter": "N",
        "Saturn": "F",
        "Rahu": "F",
        "Ketu": "E",
    },
    "Saturn": {
        "Sun": "E",
        "Moon": "E",
        "Mars": "E",
        "Mercury": "F",
        "Jupiter": "N",
        "Venus": "F",
        "Rahu": "F",
        "Ketu": "N",
    },
    "Rahu": {
        "Sun": "E",
        "Moon": "E",
        "Mars": "N",
        "Mercury": "F",
        "Jupiter": "E",
        "Venus": "F",
        "Saturn": "F",
        "Ketu": "E",
    },
    "Ketu": {
        "Sun": "N",
        "Moon": "N",
        "Mars": "F",
        "Mercury": "E",
        "Jupiter": "F",
        "Venus": "E",
        "Saturn": "N",
        "Rahu": "E",
    },
}

LABELS = {
    "GF": "Great Friend",
    "F": "Friend",
    "N": "Neutral",
    "E": "Enemy",
    "GE": "Great Enemy",
}

TEMPORAL_FRIEND_HOUSES = {2, 3, 4, 10, 11, 12}


def _temporal(a_sign: int, b_sign: int) -> str:
    """Relationship of A relative to B from sign positions."""
    if a_sign == b_sign:
        return "F"
    house_of_a_from_b = ((a_sign - b_sign) % 12) + 1
    return "F" if house_of_a_from_b in TEMPORAL_FRIEND_HOUSES else "E"


def _composite(natural: str, temporal: str) -> str:
    table = {
        ("F", "F"): "GF",
        ("F", "E"): "N",
        ("N", "F"): "F",
        ("N", "E"): "E",
        ("E", "F"): "N",
        ("E", "E"): "GE",
    }
    return table[(natural, temporal)]


def compute_friendship_tables(
    planets: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Return three matrices keyed by planet name: natural, temporal, composite.

    Each matrix is `{from_planet: {to_planet: code}}` where code is one of
    F / N / E (natural, temporal) or GF / F / N / E / GE (composite). The
    diagonal (planet vs itself) is filled with the empty string.
    """
    by_name = {p["name"]: p for p in planets if p["name"] in VISIBLE_PLANETS}

    natural: Dict[str, Dict[str, str]] = {}
    temporal: Dict[str, Dict[str, str]] = {}
    composite: Dict[str, Dict[str, str]] = {}

    for a in VISIBLE_PLANETS:
        natural[a] = {}
        temporal[a] = {}
        composite[a] = {}
        for b in VISIBLE_PLANETS:
            if a == b:
                natural[a][b] = ""
                temporal[a][b] = ""
                composite[a][b] = ""
                continue
            n = NATURAL_FRIENDSHIP[a][b]
            pa, pb = by_name.get(a), by_name.get(b)
            if pa and pb:
                t = _temporal(int(pa["sign_id"]), int(pb["sign_id"]))
            else:
                t = "F"
            natural[a][b] = n
            temporal[a][b] = t
            composite[a][b] = _composite(n, t)

    return {
        "planets": list(VISIBLE_PLANETS),
        "natural": natural,
        "temporal": temporal,
        "composite": composite,
        "labels": LABELS,
    }
