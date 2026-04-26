"""Mangal Dosha (Manglik) analysis.

Mangal Dosha is considered present when Mars occupies certain houses
counted from the Lagna (ascendant) and/or from the natal Moon. The houses
generally counted as dosha-bearing are 1, 4, 7, 8, 12 from Lagna or Moon.
Some traditions also include the 2nd house.

This module returns:
- Mars house from Lagna and from Moon
- Whether dosha is present in either chart
- An overall verdict + a list of cancellation conditions that may apply
"""

from __future__ import annotations

from typing import Any, Dict, List

# Houses from Lagna / Moon that traditionally produce Mangal Dosha
DOSHA_HOUSES_LAGNA = {1, 2, 4, 7, 8, 12}
DOSHA_HOUSES_MOON = {1, 2, 4, 7, 8, 12}


def _house_from(sign_a: int, sign_b: int) -> int:
    """House of `sign_a` counted starting from `sign_b` as house 1."""
    return ((sign_a - sign_b) % 12) + 1


def analyse(*, ascendant: Dict[str, Any], planets: List[Dict[str, Any]]) -> Dict[str, Any]:
    moon = next((p for p in planets if p["name"] == "Moon"), None)
    mars = next((p for p in planets if p["name"] == "Mars"), None)
    if mars is None:
        return {"present": False, "reason": "Mars position unavailable"}

    asc_sign = ascendant["sign_id"]
    moon_sign = moon["sign_id"] if moon else None

    h_from_lagna = _house_from(mars["sign_id"], asc_sign)
    h_from_moon = _house_from(mars["sign_id"], moon_sign) if moon_sign else None

    in_lagna_dosha = h_from_lagna in DOSHA_HOUSES_LAGNA
    in_moon_dosha = (h_from_moon in DOSHA_HOUSES_MOON) if h_from_moon else False
    present = in_lagna_dosha or in_moon_dosha

    # Common cancellation (parihara) conditions
    cancellations: List[str] = []
    if mars["sign_id"] in (1, 8):  # Mars in own sign
        cancellations.append("Mars in own sign (Aries / Scorpio).")
    if mars["sign_id"] == 10:  # Mars exalted
        cancellations.append("Mars is exalted in Capricorn.")
    if mars.get("retrograde"):
        cancellations.append("Mars is retrograde.")
    if asc_sign in (4, 5):
        cancellations.append("Cancer or Leo Lagna (Mars not maraka).")
    if h_from_lagna in (1, 4, 7, 8, 12) and mars.get("sign_lord") == "Mars":
        cancellations.append("Mars in own / friendly sign in dosha-house.")

    if in_lagna_dosha and in_moon_dosha:
        verdict = "Mangal Dosha present from both Lagna and Moon."
    elif in_lagna_dosha:
        verdict = "Mangal Dosha present from Lagna only."
    elif in_moon_dosha:
        verdict = "Mangal Dosha present from Moon only."
    else:
        verdict = "No Mangal Dosha (Mars is not in dosha-bearing houses)."

    return {
        "present": present,
        "house_from_lagna": h_from_lagna,
        "house_from_moon": h_from_moon,
        "mars_sign": mars["sign"],
        "mars_sign_id": mars["sign_id"],
        "mars_retrograde": bool(mars.get("retrograde")),
        "in_lagna_dosha": in_lagna_dosha,
        "in_moon_dosha": in_moon_dosha,
        "verdict": verdict,
        "cancellations": cancellations,
    }
