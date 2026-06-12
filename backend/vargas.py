"""Vedic divisional charts (Vargas) D1..D60.

Standard Parashara rules:
  D1  Rashi (birth chart)
  D2  Hora - odd sign: 0-15 Leo, 15-30 Cancer; even: 0-15 Cancer, 15-30 Leo
  D3  Drekkana - 3 parts of 10°: same, 5th, 9th sign from itself
  D4  Chaturthamsha - 4 parts of 7.5°: same, 4th, 7th, 10th from itself
  D7  Saptamamsha - 7 parts of ~4.29°: odd starts from same sign; even from 7th
  D9  Navamsha - (lon * 9) % 360 / 30
  D10 Dashamamsha - odd starts from same, even from 9th
  D12 Dwadashamsha - 12 parts of 2.5°, starts from same sign, sequential
  D16 Shodashamsha - movable from Aries, fixed from Leo, dual from Sagittarius
  D20 Vimshamsha - movable from Aries, fixed from Sagittarius, dual from Leo
  D24 Siddhamsha - odd from Leo, even from Cancer
  D27 Bhamsha - fire from Aries, earth from Cancer, air from Libra, water from Capricorn
  D30 Trimshamsha - SPECIAL uneven divisions by planetary lords
  D40 Khavedamsha - odd from Aries, even from Libra
  D45 Akshavedamsha - movable from Aries, fixed from Leo, dual from Sagittarius
  D60 Shashtiamsha - 60 parts of 0.5°, starts from same sign, sequential
"""

from functools import lru_cache

# Varga order we render
VARGA_ORDER = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]

VARGA_NAMES = {
    1: "Rashi",
    2: "Hora",
    3: "Drekkana",
    4: "Chaturthamsa",
    7: "Saptamsa",
    9: "Navamsa",
    10: "Dashamsa",
    12: "Dvadashamsa",
    16: "Shodashamsa",
    20: "Vimshamsa",
    24: "Chaturvimshamsa",
    27: "Bhamsa",
    30: "Trimshamsa",
    40: "Khavedamsa",
    45: "Akshavedamsa",
    60: "Shashtyamsa",
}

VARGA_SUBTITLE = {
    1: "Physical Self / Body",
    2: "Wealth",
    3: "Siblings / Courage",
    4: "Fortunes / Home",
    7: "Children",
    9: "Spouse / Dharma",
    10: "Career / Achievement",
    12: "Parents",
    16: "Vehicles / Comforts",
    20: "Spiritual Progress",
    24: "Education / Learning",
    27: "Strengths / Weaknesses",
    30: "Misfortunes",
    40: "Maternal Legacy",
    45: "Paternal Legacy",
    60: "Past-Life Karma",
}


SIGN_QUALITY = {
    # 1 = movable (chara), 2 = fixed (sthira), 3 = dual (dwi-swabhava)
    1: 1,
    4: 1,
    7: 1,
    10: 1,
    2: 2,
    5: 2,
    8: 2,
    11: 2,
    3: 3,
    6: 3,
    9: 3,
    12: 3,
}

SIGN_ELEMENT = {
    # 1 = fire, 2 = earth, 3 = air, 4 = water
    1: 1,
    5: 1,
    9: 1,
    2: 2,
    6: 2,
    10: 2,
    3: 3,
    7: 3,
    11: 3,
    4: 4,
    8: 4,
    12: 4,
}


def _add_sign(sign: int, offset: int) -> int:
    """1-indexed sign arithmetic: returns sign in 1..12 after adding offset."""
    return ((sign - 1 + offset) % 12) + 1


@lru_cache(maxsize=1024)
def varga_sign(longitude: float, n: int) -> int:
    """Return 1-12 sign id for the given longitude in divisional chart D<n>.

    Pure function of its arguments, called 12 planets × 16 vargas per chart
    (plus per-varga ascendant lookups), so the process-level cache is safe
    and saves most of the repeat work across requests for the same chart."""
    longitude = longitude % 360
    sign = int(longitude // 30) + 1  # 1-12
    deg_in_sign = longitude - (sign - 1) * 30  # 0-30
    is_odd = sign % 2 == 1

    if n == 1:
        return sign

    if n == 2:
        # Hora
        if is_odd:
            return 5 if deg_in_sign < 15 else 4
        return 4 if deg_in_sign < 15 else 5

    if n == 3:
        # Drekkana: same / 5th / 9th
        part = int(deg_in_sign // 10)  # 0,1,2
        return _add_sign(sign, [0, 4, 8][part])

    if n == 4:
        # Chaturthamsha: same / 4th / 7th / 10th
        part = int(deg_in_sign // 7.5)  # 0..3
        return _add_sign(sign, [0, 3, 6, 9][part])

    if n == 7:
        # Saptamamsha: odd starts from same; even from 7th
        part = int(deg_in_sign // (30 / 7))  # 0..6
        start = sign if is_odd else _add_sign(sign, 6)
        return _add_sign(start, part)

    if n == 9:
        # Navamsha
        nav = (longitude * 9) % 360
        return int(nav // 30) + 1

    if n == 10:
        # Dashamamsha: odd starts from same; even from 9th
        part = int(deg_in_sign // 3)  # 0..9
        start = sign if is_odd else _add_sign(sign, 8)
        return _add_sign(start, part)

    if n == 12:
        # Dwadashamsha: 12 parts of 2.5°, starts from same sign
        part = int(deg_in_sign // 2.5)
        return _add_sign(sign, part)

    if n == 16:
        # Shodashamsha: movable from Aries, fixed from Leo, dual from Sagittarius
        part = int(deg_in_sign // (30 / 16))  # 0..15
        start_map = {1: 1, 2: 5, 3: 9}  # movable=Ar, fixed=Le, dual=Sg
        start = start_map[SIGN_QUALITY[sign]]
        return _add_sign(start, part)

    if n == 20:
        # Vimshamsha: movable from Aries, fixed from Sag, dual from Leo
        part = int(deg_in_sign // 1.5)  # 0..19
        start_map = {1: 1, 2: 9, 3: 5}
        start = start_map[SIGN_QUALITY[sign]]
        return _add_sign(start, part)

    if n == 24:
        # Chaturvimshamsha: odd from Leo(5), even from Cancer(4)
        part = int(deg_in_sign // 1.25)  # 0..23
        start = 5 if is_odd else 4
        return _add_sign(start, part)

    if n == 27:
        # Bhamsha: fire=Aries, earth=Cancer, air=Libra, water=Capricorn
        part = int(deg_in_sign // (30 / 27))  # 0..26
        start_map = {1: 1, 2: 4, 3: 7, 4: 10}  # fire=Ar, earth=Cn, air=Li, water=Cp
        start = start_map[SIGN_ELEMENT[sign]]
        return _add_sign(start, part)

    if n == 30:
        # Trimshamsha - SPECIAL (5 uneven planetary segments per sign)
        # Odd: Mars(Ar)0-5, Sat(Aq)5-10, Jup(Sg)10-18, Merc(Ge)18-25, Ven(Li)25-30
        # Even: Ven(Ta)0-5, Merc(Vi)5-12, Jup(Pi)12-20, Sat(Cp)20-25, Mars(Sc)25-30
        if is_odd:
            if deg_in_sign < 5:
                return 1  # Aries (Mars)
            if deg_in_sign < 10:
                return 11  # Aquarius (Saturn)
            if deg_in_sign < 18:
                return 9  # Sagittarius (Jupiter)
            if deg_in_sign < 25:
                return 3  # Gemini (Mercury)
            return 7  # Libra (Venus)
        else:
            if deg_in_sign < 5:
                return 2  # Taurus (Venus)
            if deg_in_sign < 12:
                return 6  # Virgo (Mercury)
            if deg_in_sign < 20:
                return 12  # Pisces (Jupiter)
            if deg_in_sign < 25:
                return 10  # Capricorn (Saturn)
            return 8  # Scorpio (Mars)

    if n == 40:
        # Khavedamsha: odd from Aries, even from Libra
        part = int(deg_in_sign // 0.75)  # 0..39
        start = 1 if is_odd else 7
        return _add_sign(start, part)

    if n == 45:
        # Akshavedamsha: movable from Aries, fixed from Leo, dual from Sagittarius
        part = int(deg_in_sign // (30 / 45))  # 0..44
        start_map = {1: 1, 2: 5, 3: 9}
        start = start_map[SIGN_QUALITY[sign]]
        return _add_sign(start, part)

    if n == 60:
        # Shashtiamsha: 60 parts of 0.5°, starts from same sign
        part = int(deg_in_sign // 0.5)  # 0..59
        return _add_sign(sign, part)

    # Fallback
    return sign


# D30 uneven planetary segments per rasi (mirrors the breakpoints in
# varga_sign() above). Odd-sign breaks: Mars 0-5, Saturn 5-10, Jupiter 10-18,
# Mercury 18-25, Venus 25-30. Even-sign breaks: Venus 0-5, Mercury 5-12,
# Jupiter 12-20, Saturn 20-25, Mars 25-30.
_D30_BREAKS_ODD = (0.0, 5.0, 10.0, 18.0, 25.0, 30.0)
_D30_BREAKS_EVEN = (0.0, 5.0, 12.0, 20.0, 25.0, 30.0)


@lru_cache(maxsize=1024)
def varga_degree_in_sign(longitude: float, n: int) -> float:
    """Return the planet's position within its divisional D<n> sign (0-30°).

    For D1 this is just `longitude % 30`. For uniform vargas the formula is
    `(deg_in_rashi * n) mod 30` — each rasi is split into n equal segments
    of width 30/n, and scaling the offset within a segment back to 30° gives
    the sub-degree. D30 is the exception (uneven planetary segments) and
    needs piecewise scaling against `_D30_BREAKS_*`.
    """
    lon = longitude % 360
    sign = int(lon // 30) + 1
    deg_in_sign = lon - (sign - 1) * 30

    if n <= 1:
        return deg_in_sign

    if n == 30:
        breaks = _D30_BREAKS_ODD if sign % 2 == 1 else _D30_BREAKS_EVEN
        for i in range(len(breaks) - 1):
            lo, hi = breaks[i], breaks[i + 1]
            if deg_in_sign < hi:
                return (deg_in_sign - lo) / (hi - lo) * 30.0
        return 30.0

    return (deg_in_sign * n) % 30
