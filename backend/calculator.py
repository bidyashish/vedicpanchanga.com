"""Vedic Astrology Calculator using Swiss Ephemeris (Lahiri Ayanamsa)."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import pytz
import swisseph as swe
from timezonefinder import TimezoneFinder

from ayanamsa import set_ayanamsa
from vargas import VARGA_NAMES, VARGA_ORDER, VARGA_SUBTITLE, varga_sign

# Configure Swiss Ephemeris
EPHE_PATH = str(Path(__file__).parent / "ephe")
swe.set_ephe_path(EPHE_PATH)
swe.set_sid_mode(swe.SIDM_LAHIRI)

_TF = TimezoneFinder()

SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

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

NAKSHATRAS = [
    "Ashwini",
    "Bharani",
    "Krittika",
    "Rohini",
    "Mrigashira",
    "Ardra",
    "Punarvasu",
    "Pushya",
    "Ashlesha",
    "Magha",
    "Purva Phalguni",
    "Uttara Phalguni",
    "Hasta",
    "Chitra",
    "Swati",
    "Vishakha",
    "Anuradha",
    "Jyeshtha",
    "Mula",
    "Purva Ashadha",
    "Uttara Ashadha",
    "Shravana",
    "Dhanishta",
    "Shatabhisha",
    "Purva Bhadrapada",
    "Uttara Bhadrapada",
    "Revati",
]

# Vimshottari Dasha periods (years) - Mahadasha sequence starts from nakshatra lord
NAKSHATRA_LORDS = [
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
    "Saturn",
    "Mercury",
]
# Nakshatra index -> lord (repeats every 9)
DASHA_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17,
}
DASHA_SEQUENCE = [
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
    "Saturn",
    "Mercury",
]

PLANET_ORDER = [
    ("Sun", swe.SUN, "Su"),
    ("Moon", swe.MOON, "Mo"),
    ("Mars", swe.MARS, "Ma"),
    ("Mercury", swe.MERCURY, "Me"),
    ("Jupiter", swe.JUPITER, "Ju"),
    ("Venus", swe.VENUS, "Ve"),
    ("Saturn", swe.SATURN, "Sa"),
    ("Rahu", swe.MEAN_NODE, "Ra"),  # Mean node for Rahu
]

# Ashtakavarga contribution tables (benefic points)
# Each planet gives points to houses counted from: itself, Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Ascendant
# Source: Classical Parasara texts (standard Prastarashtakavarga tables)
BAV_RULES = {
    "Sun": {
        "Sun": [1, 2, 4, 7, 8, 9, 10, 11],
        "Moon": [3, 6, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [5, 6, 9, 11],
        "Venus": [6, 7, 12],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Asc": [3, 4, 6, 10, 11, 12],
    },
    "Moon": {
        "Sun": [3, 6, 7, 8, 10, 11],
        "Moon": [3, 6, 7, 8, 10, 11],
        "Mars": [2, 3, 5, 6, 9, 10, 11],
        "Mercury": [1, 3, 4, 5, 7, 8, 10, 11],
        "Jupiter": [1, 4, 7, 8, 10, 11, 12],
        "Venus": [3, 4, 5, 7, 9, 10, 11],
        "Saturn": [3, 5, 6, 11],
        "Asc": [3, 6, 10, 11],
    },
    "Mars": {
        "Sun": [3, 5, 6, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [3, 5, 6, 11],
        "Jupiter": [6, 10, 11, 12],
        "Venus": [6, 8, 11, 12],
        "Saturn": [1, 4, 7, 8, 9, 10, 11],
        "Asc": [1, 3, 6, 10, 11],
    },
    "Mercury": {
        "Sun": [5, 6, 9, 11, 12],
        "Moon": [2, 4, 6, 8, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [6, 8, 11, 12],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Asc": [1, 2, 4, 6, 8, 10, 11],
    },
    "Jupiter": {
        "Sun": [1, 2, 3, 4, 7, 8, 9, 10, 11],
        "Moon": [2, 5, 7, 9, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [1, 2, 4, 5, 6, 9, 10, 11],
        "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
        "Venus": [2, 5, 6, 9, 10, 11],
        "Saturn": [3, 5, 6, 12],
        "Asc": [1, 2, 4, 5, 6, 7, 9, 10, 11],
    },
    "Venus": {
        "Sun": [8, 11, 12],
        "Moon": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Mars": [3, 5, 6, 9, 11, 12],
        "Mercury": [3, 5, 6, 9, 11],
        "Jupiter": [5, 8, 9, 10, 11],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 10, 11],
        "Saturn": [3, 4, 5, 8, 9, 10, 11],
        "Asc": [1, 2, 3, 4, 5, 8, 9, 11],
    },
    "Saturn": {
        "Sun": [1, 2, 4, 7, 8, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [3, 5, 6, 10, 11, 12],
        "Mercury": [6, 8, 9, 10, 11, 12],
        "Jupiter": [5, 6, 11, 12],
        "Venus": [6, 11, 12],
        "Saturn": [3, 5, 6, 11],
        "Asc": [1, 3, 4, 6, 10, 11],
    },
}


def sign_index_from_longitude(lon: float) -> int:
    """Return 1-12 sign index (1=Aries)."""
    return int(lon // 30) + 1


def nakshatra_info(lon: float) -> Dict[str, Any]:
    """Return nakshatra name, pada (1-4), and lord."""
    # 27 nakshatras, each 13°20' = 13.3333°
    n_idx = int(lon // (360 / 27))  # 0-26
    deg_in_nak = lon - n_idx * (360 / 27)
    pada = int(deg_in_nak // (360 / 27 / 4)) + 1
    return {
        "name": NAKSHATRAS[n_idx],
        "pada": pada,
        "lord": NAKSHATRA_LORDS[n_idx % 9],
        "index": n_idx,
    }


def d9_sign_index(lon: float) -> int:
    """Navamsha sign: sign = floor( (lon * 9) / 30 ) % 12, returns 1-12."""
    nav = (lon * 9) % 360
    return int(nav // 30) + 1


def d2_sign_index(lon: float) -> int:
    """Hora:
    Odd signs (Ar,Ge,Le,Li,Sg,Aq): 0-15 => Leo (5), 15-30 => Cancer (4)
    Even signs (Ta,Cn,Vi,Sc,Cp,Pi): 0-15 => Cancer (4), 15-30 => Leo (5)
    """
    sign = int(lon // 30) + 1  # 1-12
    deg_in_sign = lon - (sign - 1) * 30
    is_odd = sign % 2 == 1
    if is_odd:
        return 5 if deg_in_sign < 15 else 4
    else:
        return 4 if deg_in_sign < 15 else 5


def format_dms(deg_in_sign: float) -> str:
    d = int(deg_in_sign)
    m_full = (deg_in_sign - d) * 60
    m = int(m_full)
    s = int(round((m_full - m) * 60))
    if s == 60:
        s = 0
        m += 1
    return f"{d:02d}° {m:02d}' {s:02d}\""


def compute_vimshottari_dasha(
    moon_longitude: float, birth_dt_utc: datetime
) -> List[Dict[str, Any]]:
    """Compute Vimshottari Mahadasha sequence starting from birth."""
    # Nakshatra index & how far into it
    nak_span = 360.0 / 27  # 13.333..
    n_idx = int(moon_longitude // nak_span)
    deg_in_nak = moon_longitude - n_idx * nak_span
    fraction_elapsed = deg_in_nak / nak_span  # 0-1
    lord = NAKSHATRA_LORDS[n_idx % 9]
    years_first = DASHA_YEARS[lord]
    balance_years = years_first * (1 - fraction_elapsed)

    # Build sequence starting from lord
    start_idx = DASHA_SEQUENCE.index(lord)
    result = []
    current_start = birth_dt_utc
    # First dasha has balance
    first_end = _add_years(current_start, balance_years)
    result.append(
        {
            "lord": lord,
            "start": current_start.isoformat(),
            "end": first_end.isoformat(),
            "years": round(balance_years, 3),
        }
    )
    current_start = first_end
    # Next 8 Mahadashas
    for i in range(1, 9):
        next_lord = DASHA_SEQUENCE[(start_idx + i) % 9]
        yrs = DASHA_YEARS[next_lord]
        end = _add_years(current_start, yrs)
        result.append(
            {
                "lord": next_lord,
                "start": current_start.isoformat(),
                "end": end.isoformat(),
                "years": yrs,
            }
        )
        current_start = end
    return result


def _add_years(dt: datetime, years: float) -> datetime:
    """Add fractional years (365.25 days/year) to a UTC datetime."""
    from datetime import timedelta

    return dt + timedelta(days=years * 365.25)


def compute_ashtakavarga(
    planets: Dict[str, Dict[str, Any]], asc_sign: int
) -> Dict[str, Any]:
    """Compute BAV (Bhinnashtakavarga) and SAV (Sarvashtakavarga)."""
    # sign positions 1-12 for each contributor
    contributor_signs = {
        name: planets[name]["sign_id"]
        for name in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    }
    contributor_signs["Asc"] = asc_sign

    bav = {}  # planet -> list[12] of points per sign (index 0 = Aries)
    for planet, rules in BAV_RULES.items():
        sign_points = [0] * 12
        for contributor, positions in rules.items():
            base_sign = contributor_signs[contributor]  # 1-12
            for pos in positions:
                target_sign = (base_sign - 1 + pos - 1) % 12  # 0-11
                sign_points[target_sign] += 1
        bav[planet] = sign_points

    # SAV = sum across all 7 planets
    sav = [0] * 12
    for i in range(12):
        sav[i] = sum(bav[p][i] for p in BAV_RULES.keys())

    return {"bav": bav, "sav": sav}


def compute_chart(
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    latitude: float,
    longitude: float,
    timezone_name: str | None = None,
    ayanamsa: str = "lahiri",
) -> Dict[str, Any]:
    """Main calculation entry. Takes LOCAL time + timezone; returns full chart JSON."""

    # Resolve timezone
    if not timezone_name:
        timezone_name = _TF.timezone_at(lat=latitude, lng=longitude) or "UTC"
    tz = pytz.timezone(timezone_name)

    # Local time -> UTC
    local_dt = tz.localize(datetime(year, month, day, hour, minute))
    utc_dt = local_dt.astimezone(pytz.utc)

    # Julian Day (UT)
    jd_ut = swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600,
    )

    # Apply chosen ayanamsa
    sidereal_flag, ayanamsa_label = set_ayanamsa(ayanamsa)
    flags = sidereal_flag | swe.FLG_SWIEPH | swe.FLG_SPEED

    # Compute planets
    planets: Dict[str, Dict[str, Any]] = {}
    for name, pid, abbr in PLANET_ORDER:
        xx, _ret = swe.calc_ut(jd_ut, pid, flags)
        lon = xx[0] % 360
        speed = xx[3]
        retro = speed < 0 and name not in ("Sun", "Moon", "Rahu", "Ketu")
        planets[name] = _planet_entry(name, abbr, lon, retro)

    # Ketu = Rahu + 180
    rahu_lon = planets["Rahu"]["longitude"]
    ketu_lon = (rahu_lon + 180) % 360
    planets["Ketu"] = _planet_entry("Ketu", "Ke", ketu_lon, False)

    # Ascendant
    cusps, ascmc = swe.houses_ex(jd_ut, latitude, longitude, b"P", sidereal_flag)
    asc_lon = ascmc[0] % 360
    asc_sign = sign_index_from_longitude(asc_lon)
    asc_entry = _planet_entry("Ascendant", "As", asc_lon, False)

    # Assign house (D1) based on Ascendant sign (whole sign houses)
    for p in planets.values():
        p["house"] = ((p["sign_id"] - asc_sign) % 12) + 1
    asc_entry["house"] = 1

    # === Build all divisional charts (D1..D60) ===
    varga_charts: Dict[str, Any] = {}
    for n in VARGA_ORDER:
        v_asc_sign = varga_sign(asc_lon, n)
        house_map = {i: [] for i in range(1, 13)}
        # Populate with planets
        for p in planets.values():
            p_sign = varga_sign(p["longitude"], n)
            house = ((p_sign - v_asc_sign) % 12) + 1
            house_map[house].append(p["abbr"])
            # Store D-n sign on each planet for later tables
            p[f"d{n}_sign"] = p_sign
        # Put "As" in house 1
        house_map[1].insert(0, "As")
        varga_charts[f"d{n}"] = {
            "chart": house_map,
            "asc_sign": v_asc_sign,
            "name": VARGA_NAMES[n],
            "subtitle": VARGA_SUBTITLE[n],
            "division": n,
        }

    # Preserve legacy top-level keys for backward-compat
    d1_chart = varga_charts["d1"]["chart"]
    d2_chart = varga_charts["d2"]["chart"]
    d9_chart = varga_charts["d9"]["chart"]

    # Vimshottari Dasha
    dasha = compute_vimshottari_dasha(
        planets["Moon"]["longitude"], utc_dt.replace(tzinfo=None)
    )

    # Ashtakavarga
    ashtakavarga = compute_ashtakavarga(planets, asc_sign)

    # Build planets table (ordered)
    planets_list = []
    for name in [
        "Sun",
        "Moon",
        "Mars",
        "Mercury",
        "Jupiter",
        "Venus",
        "Saturn",
        "Rahu",
        "Ketu",
    ]:
        planets_list.append(planets[name])

    return {
        "birth": {
            "local_time": local_dt.isoformat(),
            "utc_time": utc_dt.isoformat(),
            "timezone": timezone_name,
            "latitude": latitude,
            "longitude": longitude,
            "julian_day": jd_ut,
            "ayanamsa": swe.get_ayanamsa_ut(jd_ut) if sidereal_flag else 0.0,
            "ayanamsa_id": ayanamsa,
            "ayanamsa_label": ayanamsa_label,
        },
        "ascendant": asc_entry,
        "planets_data": planets_list,
        "d1_chart": d1_chart,
        "d2_chart": d2_chart,
        "d9_chart": d9_chart,
        "d1_asc_sign": asc_sign,
        "d2_asc_sign": varga_charts["d2"]["asc_sign"],
        "d9_asc_sign": varga_charts["d9"]["asc_sign"],
        "vargas": varga_charts,
        "varga_order": VARGA_ORDER,
        "dasha": dasha,
        "ashtakavarga": ashtakavarga,
    }


def _planet_entry(name: str, abbr: str, lon: float, retro: bool) -> Dict[str, Any]:
    sign_id = sign_index_from_longitude(lon)
    deg_in_sign = lon - (sign_id - 1) * 30
    nak = nakshatra_info(lon)
    return {
        "name": name,
        "abbr": abbr,
        "longitude": round(lon, 6),
        "sign_id": sign_id,
        "sign": SIGNS[sign_id - 1],
        "sign_lord": SIGN_LORDS[sign_id - 1],
        "degree_in_sign": round(deg_in_sign, 4),
        "dms": format_dms(deg_in_sign),
        "nakshatra": nak["name"],
        "nakshatra_pada": nak["pada"],
        "nakshatra_lord": nak["lord"],
        "retrograde": retro,
    }


def _build_house_map(
    planets: Dict[str, Dict[str, Any]], asc_sign: int, key: str
) -> Dict[int, List[str]]:
    """Return dict house (1-12) -> list of planet abbreviations, using whole-sign houses."""
    houses: Dict[int, List[str]] = {i: [] for i in range(1, 13)}
    for p in planets.values():
        sign = p[key]
        house = ((sign - asc_sign) % 12) + 1
        houses[house].append(p["abbr"])
    return houses
