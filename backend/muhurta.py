"""Muhurta Finder - classical auspicious-timing search for a purpose over a date range.

Each purpose has preferred Tithis, Nakshatras and Weekdays per the conventions
of Muhurta Chintamani as published by mainstream panchangas (regional
traditions vary; these tables encode the most widely published lists). On top
of the per-purpose tables, universal rules apply to every purpose:

- Rikta tithis (Chaturthi, Navami, Chaturdashi of BOTH pakshas) and Amavasya
  are penalized via each purpose's `bad_tithis`.
- Bhadra (Vishti karana) is avoided: the best tithi+nakshatra window is
  trimmed around Vishti spans, and the day is penalized when no usable
  Bhadra-free portion remains.
- Optional Chandrabalam (Moon-sign compatibility) and Tarabalam (birth
  nakshatra compatibility) for the native.
- Hard veto blackouts per purpose (the rules mainstream panchangas such as
  DrikPanchang apply before any day-quality scoring): Guru/Shukra Asta
  (Jupiter/Venus combustion, padded by the Balya/Vriddha tara days),
  Chaturmas (Devshayani Ekadashi to Devuthani Ekadashi), Kharmas/Malmas
  (Sun in Dhanu or Meena) and Adhika Maas. A vetoed day scores 0
  regardless of tithi/nakshatra/vara quality.

We score each day 0-100 then rank. Deliberately out of scope at day-level
granularity: lagna selection within the window.
"""

from __future__ import annotations

from datetime import date as date_cls
from datetime import datetime as dt_cls
from datetime import timedelta
from datetime import timezone as _timezone
from functools import lru_cache as _lru_cache
from typing import Any, Dict, List, Optional, Set, Tuple

import swisseph as swe

from advanced_panchang import compute_detailed_panchang
from ayanamsa import sidereal_context
from constants import NAKSHATRAS
from panchang_constants import GOOD_CHANDRA_OFFSETS, RASHI_NAMES
from tyajyam import (
    _GURU_ASTHAMANAM_ORB,
    _SUKRA_ASTHAMANAM_ORB_RETRO,
)

# ---- Rule-table building blocks ----
# Tithi ids 1-30 (1-15 Shukla, 15=Purnima, 16-30 Krishna, 30=Amavasya).
# Nakshatra ids 1-27 (Ashwini..Revati). Weekdays are isoweekday 1=Mon..7=Sun.

MON, TUE, WED, THU, FRI, SAT, SUN = 1, 2, 3, 4, 5, 6, 7

_NAK_ID: Dict[str, int] = {name: i + 1 for i, name in enumerate(NAKSHATRAS)}


def _naks(*names: str) -> Set[int]:
    """1-based nakshatra ids for the given names. Raises on a typo, so the
    rule tables below are checked against constants.NAKSHATRAS at import."""
    return {_NAK_ID[n] for n in names}


def _both_pakshas(*tithi_nums: int) -> Set[int]:
    """Tithi ids for the given 1-14 numbers in both Shukla and Krishna paksha."""
    return {n for t in tithi_nums for n in (t, t + 15)}


PURNIMA, AMAVASYA = 15, 30
# Rikta ("empty") tithis are barren for auspicious starts - in BOTH pakshas.
RIKTA_TITHIS = _both_pakshas(4, 9, 14)

# Scoring weights (baseline 50, clamped to 0-100).
_W_GOOD_TITHI, _W_BAD_TITHI = 15, -25
_W_GOOD_NAK, _W_BAD_NAK = 20, -25
_W_GOOD_VARA, _W_BAD_VARA = 10, -20
_W_BHADRA = -15
# A trimmed Bhadra-free window shorter than this is treated as unusable.
_MIN_WINDOW_MINUTES = 30

# ---- Veto rules (hard blackouts, applied before scoring) ----
# Purposes opt in via a "vetoes" set with any of: "combust", "chaturmas",
# "kharmas", "adhika". A triggered veto forces the day's score to 0. These
# are the blackout rules mainstream panchangas (DrikPanchang et al.) apply
# before any day-quality scoring.

# Panchangas extend the combustion blackout by ~3 days on each side
# (Vriddha tara before setting, Balya tara after rising).
_TARA_BALA_PAD_DAYS = 3.0
# Direct (superior-conjunction side) Venus is bright enough to be seen at
# ~6 deg from the Sun, so published udaya/asta dates (DrikPanchang et al.)
# correspond to a tighter orb than the classical 10 deg used for display
# in the Dosha Tyajyam panel.
_MUHURTA_SHUKRA_ORB_DIRECT = 6.0
# Kharmas / Malmas: Sun in Dhanu (9) or Meena (12) - no shubha samskaras.
_KHARMAS_SUN_SIGNS = {9, 12}

_SYNODIC_MONTH = 29.530589  # days
_MEAN_ELONGATION_RATE = 360.0 / _SYNODIC_MONTH  # Moon-Sun, degrees/day
_MEAN_SUN_RATE = 360.0 / 365.2422  # degrees/day


def _moon_sun_elongation(jd: float) -> float:
    """Tropical Moon-Sun elongation in [0, 360). Tithi n spans
    [(n-1)*12, n*12); new moon at 0, Shukla Ekadashi begins at 120."""
    moon = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH)[0][0]
    sun = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH)[0][0]
    return (moon - sun) % 360.0


def _elongation_crossing(jd_guess: float, target: float) -> float:
    """JD where Moon-Sun elongation reaches `target` deg, nearest jd_guess.
    Newton iteration on the mean rate; elongation grows ~11-15 deg/day so a
    handful of steps converges to well under a minute."""
    jd = jd_guess
    for _ in range(8):
        diff = (_moon_sun_elongation(jd) - target + 180.0) % 360.0 - 180.0
        if abs(diff) < 1e-4:
            break
        jd -= diff / _MEAN_ELONGATION_RATE
    return jd


def _prev_new_moon(jd: float) -> float:
    """JD of the last new moon at or before jd."""
    nm = _elongation_crossing(jd - _moon_sun_elongation(jd) / _MEAN_ELONGATION_RATE, 0)
    while nm > jd:
        nm = _elongation_crossing(nm - _SYNODIC_MONTH, 0)
    return nm


def _sun_sidereal(jd: float) -> float:
    with sidereal_context("lahiri"):
        return swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)[0][0]


def _sankranti_jd(year: int, target_long: float) -> float:
    """JD when the sidereal Sun reaches target_long (a sign boundary) in the
    given Gregorian year. Seeks forward from Jan 1 so the crossing found is
    this year's, then refines with Newton steps."""
    jd = swe.julday(year, 1, 1, 0.0)
    jd += ((target_long - _sun_sidereal(jd)) % 360.0) / _MEAN_SUN_RATE
    for _ in range(10):
        diff = (_sun_sidereal(jd) - target_long + 180.0) % 360.0 - 180.0
        if abs(diff) < 1e-4:
            break
        jd -= diff / _MEAN_SUN_RATE
    return jd


def _sankranti_between(jd1: float, jd2: float) -> bool:
    """True when the sidereal Sun crosses a 30-degree sign boundary in
    (jd1, jd2). A lunar month with no sankranti is Adhika (intercalary)."""
    l1, l2 = _sun_sidereal(jd1), _sun_sidereal(jd2)
    travelled = (l2 - l1) % 360.0
    into_sign = l1 % 30.0
    return travelled >= (30.0 - into_sign)


@_lru_cache(maxsize=32)
def _chaturmas_span(year: int) -> Tuple[float, float]:
    """(start_jd, end_jd) of Chaturmas for the year: start of Devshayani
    Ekadashi (Ashadha Shukla 11) to end of Devuthani Ekadashi (Kartika
    Shukla 11). Amanta months are anchored by the sankranti they contain:
    Ashadha holds Karka sankranti, Kartika holds Vrishchika sankranti."""
    spans = []
    for sank_long, ek_target in ((90.0, 120.0), (210.0, 132.0)):
        sank = _sankranti_jd(year, sank_long)
        nm = _prev_new_moon(sank)
        spans.append(
            _elongation_crossing(nm + ek_target / _MEAN_ELONGATION_RATE, ek_target)
        )
    return spans[0], spans[1]


@_lru_cache(maxsize=512)
def _is_adhika_day(jd_day: int) -> bool:
    """True when the lunar month containing this day (integer JD) has no
    sankranti - an Adhika Maas, barred for shubha karya."""
    nm = _prev_new_moon(float(jd_day))
    nm_next = _elongation_crossing(nm + _SYNODIC_MONTH, 0)
    return not _sankranti_between(nm, nm_next)


@_lru_cache(maxsize=512)
def _combust_labels(jd_day: int) -> Tuple[str, ...]:
    """Guru/Shukra Asta labels active within _TARA_BALA_PAD_DAYS of the day
    (integer JD). The pad reproduces the Vriddha/Balya tara blackout that
    panchangas add around the combustion window itself."""
    labels = []
    sample_jds = (
        float(jd_day) - _TARA_BALA_PAD_DAYS,
        float(jd_day),
        float(jd_day) + _TARA_BALA_PAD_DAYS,
    )
    for planet_id, label in (
        (swe.JUPITER, "Guru Asta (Jupiter combust)"),
        (swe.VENUS, "Shukra Asta (Venus combust)"),
    ):
        for jd in sample_jds:
            sun_lon = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH)[0][0]
            pos = swe.calc_ut(jd, planet_id, swe.FLG_SWIEPH | swe.FLG_SPEED)[0]
            lon, speed = pos[0], pos[3]
            if planet_id == swe.JUPITER:
                orb = _GURU_ASTHAMANAM_ORB
            else:
                orb = (
                    _SUKRA_ASTHAMANAM_ORB_RETRO
                    if speed < 0
                    else _MUHURTA_SHUKRA_ORB_DIRECT
                )
            elongation = abs((lon - sun_lon + 180.0) % 360.0 - 180.0)
            if elongation <= orb:
                labels.append(label)
                break
    return tuple(labels)


def _sunrise_jd(panch: Dict[str, Any]) -> Optional[float]:
    sunrise = panch.get("sun_moon", {}).get("sunrise")
    if not sunrise:
        return None
    utc = dt_cls.fromisoformat(sunrise).astimezone(_timezone.utc)
    return swe.julday(
        utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600
    )


def _veto_reasons(panch: Dict[str, Any], purpose_cfg: Dict[str, Any]) -> List[str]:
    """Blackout reasons for the day, empty when the day is workable."""
    vetoes = purpose_cfg.get("vetoes", set())
    reasons: List[str] = []
    if not vetoes:
        return reasons
    jd = _sunrise_jd(panch)
    if jd is None:
        return reasons
    if "combust" in vetoes:
        for label in _combust_labels(round(jd)):
            reasons.append(f"{label} - event prohibited")
    if "kharmas" in vetoes:
        sun_sign = panch["rashi_nakshatra"]["sunsign"]["index"]
        if sun_sign in _KHARMAS_SUN_SIGNS:
            reasons.append(
                f"Kharmas (Sun in {RASHI_NAMES[sun_sign - 1]}) - prohibited solar month"
            )
    if "chaturmas" in vetoes:
        # Chaturmas never straddles a Gregorian year boundary (Jul-Nov).
        utc_year = swe.revjul(jd)[0]
        start, end = _chaturmas_span(utc_year)
        if start <= jd < end:
            reasons.append(
                "Chaturmas (Devshayani to Devuthani Ekadashi) - event prohibited"
            )
    if "adhika" in vetoes and _is_adhika_day(round(jd)):
        reasons.append("Adhika Maas (intercalary month) - event prohibited")
    return reasons


# ---- Purpose rules ----

PURPOSES: Dict[str, Dict[str, Any]] = {
    "marriage": {
        "label": "Marriage (Vivaha)",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 12, 13),
        # Classical Vivaha star set per Muhurta Chintamani.
        "good_nakshatras": _naks(
            "Rohini",
            "Mrigashira",
            "Magha",
            "Uttara Phalguni",
            "Hasta",
            "Swati",
            "Anuradha",
            "Mula",
            "Uttara Ashadha",
            "Shravana",
            "Uttara Bhadrapada",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        # No hard weekday avoidance: published vivaha lists (DrikPanchang
        # et al.) freely include Tue/Sat/Sun dates when the stars fit.
        "avoid_weekdays": set(),
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
        "vetoes": {"combust", "chaturmas", "kharmas", "adhika"},
    },
    "engagement": {
        "label": "Engagement (Sagai / Vagdana)",
        # Betrothal uses the classical Vivaha star set.
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 12, 13),
        "good_nakshatras": _naks(
            "Rohini",
            "Mrigashira",
            "Magha",
            "Uttara Phalguni",
            "Hasta",
            "Swati",
            "Anuradha",
            "Mula",
            "Uttara Ashadha",
            "Shravana",
            "Uttara Bhadrapada",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SAT, SUN},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
        "vetoes": {"combust", "chaturmas", "kharmas", "adhika"},
    },
    "griha_pravesh": {
        "label": "Griha Pravesha (Housewarming)",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 12, 13),
        # Sthira (fixed) stars for permanence + the standard mridu/kshipra picks.
        # Purva Bhadrapada is an Ugra star - NOT good for house entry.
        "good_nakshatras": _naks(
            "Rohini",
            "Mrigashira",
            "Pushya",
            "Uttara Phalguni",
            "Hasta",
            "Chitra",
            "Anuradha",
            "Uttara Ashadha",
            "Shravana",
            "Shatabhisha",
            "Uttara Bhadrapada",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SUN},
        "bad_tithis": RIKTA_TITHIS | {PURNIMA, AMAVASYA},
        "vetoes": {"combust", "chaturmas", "kharmas", "adhika"},
    },
    "bhoomi_pujan": {
        "label": "Bhoomi Pujan (Foundation / Griharambha)",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 13) | {PURNIMA},
        "good_nakshatras": _naks(
            "Rohini",
            "Mrigashira",
            "Pushya",
            "Uttara Phalguni",
            "Hasta",
            "Chitra",
            "Swati",
            "Anuradha",
            "Uttara Ashadha",
            "Shravana",
            "Dhanishta",
            "Shatabhisha",
            "Uttara Bhadrapada",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SAT, SUN},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
        "vetoes": {"combust", "kharmas", "adhika"},
    },
    "property_purchase": {
        "label": "Property Purchase (Land / House)",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 12, 13) | {PURNIMA},
        # The four Sthira stars anchor permanence in property matters.
        "good_nakshatras": _naks(
            "Rohini",
            "Uttara Phalguni",
            "Uttara Ashadha",
            "Uttara Bhadrapada",
            "Mrigashira",
            "Pushya",
            "Hasta",
            "Chitra",
            "Swati",
            "Anuradha",
            "Shravana",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SUN},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
    },
    "vehicle": {
        "label": "Vehicle Purchase",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 13),
        "good_nakshatras": _naks(
            "Ashwini",
            "Punarvasu",
            "Pushya",
            "Hasta",
            "Chitra",
            "Swati",
            "Anuradha",
            "Shravana",
            "Dhanishta",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SUN},
        "bad_tithis": RIKTA_TITHIS | {PURNIMA, AMAVASYA},
    },
    "gold_purchase": {
        "label": "Gold / Jewellery Purchase",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 13) | {PURNIMA},
        "good_nakshatras": _naks(
            "Ashwini",
            "Rohini",
            "Punarvasu",
            "Pushya",
            "Hasta",
            "Swati",
            "Vishakha",
            "Anuradha",
            "Shravana",
            "Dhanishta",
            "Shatabhisha",
            "Revati",
        ),
        # Gold is the Sun's metal - Sunday is traditionally acceptable here.
        "good_weekdays": {SUN, MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SAT},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
    },
    "business": {
        "label": "Business / Venture (Vyapara)",
        "good_tithis": _both_pakshas(1, 2, 3, 5, 7, 10, 11, 13),
        "good_nakshatras": _naks(
            "Ashwini",
            "Rohini",
            "Mrigashira",
            "Pushya",
            "Uttara Phalguni",
            "Hasta",
            "Chitra",
            "Anuradha",
            "Uttara Ashadha",
            "Shravana",
            "Dhanishta",
            "Revati",
        ),
        "good_weekdays": {WED, THU},  # Mercury and Jupiter days are best
        "avoid_weekdays": {SUN},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
    },
    "travel": {
        "label": "Travel (Yatra)",
        "good_tithis": _both_pakshas(1, 2, 3, 5, 7, 10, 11, 13),
        "good_nakshatras": _naks(
            "Ashwini",
            "Pushya",
            "Hasta",
            "Anuradha",
            "Mula",
            "Uttara Ashadha",
            "Shravana",
            "Dhanishta",
            "Revati",
        ),
        "good_weekdays": {MON, WED, FRI},
        "avoid_weekdays": {TUE, SAT, SUN},
        "bad_tithis": RIKTA_TITHIS | {PURNIMA, AMAVASYA},
    },
    "education": {
        "label": "Vidyarambha (Learning)",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 12, 13),
        "good_nakshatras": _naks(
            "Ashwini",
            "Punarvasu",
            "Pushya",
            "Hasta",
            "Chitra",
            "Swati",
            "Anuradha",
            "Shravana",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SUN},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
    },
    "namakarana": {
        "label": "Name Ceremony (Namakarana)",
        # Bright half preferred for naming - Shukla tithis only.
        "good_tithis": {1, 2, 3, 5, 7, 10, 11, 12, 13},
        "good_nakshatras": _naks(
            "Ashwini",
            "Rohini",
            "Mrigashira",
            "Punarvasu",
            "Pushya",
            "Uttara Phalguni",
            "Hasta",
            "Chitra",
            "Swati",
            "Anuradha",
            "Uttara Ashadha",
            "Shravana",
            "Dhanishta",
            "Shatabhisha",
            "Uttara Bhadrapada",
            "Revati",
        ),
        # Ugra/Tikshna stars and the Purvas are avoided for naming.
        "bad_nakshatras": _naks(
            "Bharani",
            "Krittika",
            "Ardra",
            "Ashlesha",
            "Magha",
            "Purva Phalguni",
            "Jyeshtha",
            "Mula",
            "Purva Ashadha",
            "Purva Bhadrapada",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SUN},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
    },
    "annaprashana": {
        "label": "Annaprashana (First Feeding)",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 13),
        "good_nakshatras": _naks(
            "Ashwini",
            "Rohini",
            "Mrigashira",
            "Punarvasu",
            "Pushya",
            "Uttara Phalguni",
            "Hasta",
            "Chitra",
            "Swati",
            "Anuradha",
            "Uttara Ashadha",
            "Shravana",
            "Dhanishta",
            "Shatabhisha",
            "Uttara Bhadrapada",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {TUE, SAT},
        "bad_tithis": RIKTA_TITHIS | {AMAVASYA},
    },
    "medical": {
        "label": "Medical / Surgery",
        "good_tithis": _both_pakshas(2, 3, 5, 7, 10, 11, 12, 13),
        "good_nakshatras": _naks(
            "Ashwini",
            "Mrigashira",
            "Pushya",
            "Shravana",
            "Revati",
        ),
        "good_weekdays": {MON, WED, THU, FRI},
        "avoid_weekdays": {SUN},
        "bad_tithis": RIKTA_TITHIS | {PURNIMA, AMAVASYA},
    },
}


def _taraba_score(current_nak_idx: int, birth_nak_idx: Optional[int]) -> int:
    """Return 0-20 score. Indices are 0-26. Counting from the birth star,
    taras cycle in 9: Janma(1), Sampat(2), Vipat(3), Kshema(4), Pratyari(5),
    Sadhaka(6), Vadha(7), Mitra(8), Param Mitra(9)."""
    if birth_nak_idx is None:
        return 10  # neutral
    offset = (current_nak_idx - birth_nak_idx) % 27
    star_sub = (offset % 9) + 1  # 1-9
    if star_sub in {2, 4, 6, 8, 9}:  # Sampat, Kshema, Sadhaka, Mitra, Param Mitra
        return 20
    if star_sub == 1:  # Janma - mixed; acceptable for most purposes
        return 12
    return 0  # Vipat, Pratyari, Vadha


def _chandrabalam_score(current_sign_id: int, birth_sign_id: Optional[int]) -> int:
    """0-20 score. Transit Moon in houses 1,3,6,7,10,11 from the natal rashi
    is strong; 2,5,9 neutral; 4,8,12 weak."""
    if birth_sign_id is None:
        return 10
    offset = (current_sign_id - birth_sign_id) % 12
    if offset in GOOD_CHANDRA_OFFSETS:
        return 20
    if offset in {1, 4, 8}:  # houses 2/5/9 - neutral
        return 10
    return 0


def _bhadra_spans(panch: Dict[str, Any]) -> List[Tuple[dt_cls, dt_cls]]:
    """Vishti (Bhadra) karana intervals during the panchang day."""
    spans = []
    for k in panch["panchang"].get("karana_sequence", []):
        if k.get("is_bhadra") and k.get("starts_at") and k.get("ends_at"):
            spans.append(
                (
                    dt_cls.fromisoformat(k["starts_at"]),
                    dt_cls.fromisoformat(k["ends_at"]),
                )
            )
    return spans


def _subtract_spans(
    start: dt_cls, end: dt_cls, spans: List[Tuple[dt_cls, dt_cls]]
) -> Optional[Tuple[dt_cls, dt_cls]]:
    """Longest sub-interval of [start, end] not covered by any span,
    or None when the spans cover the whole interval."""
    pieces = [(start, end)]
    for s0, s1 in spans:
        nxt = []
        for p0, p1 in pieces:
            if s1 <= p0 or s0 >= p1:
                nxt.append((p0, p1))
                continue
            if p0 < s0:
                nxt.append((p0, s0))
            if s1 < p1:
                nxt.append((s1, p1))
        pieces = nxt
        if not pieces:
            return None
    return max(pieces, key=lambda p: p[1] - p[0])


def _best_window(
    panch: Dict[str, Any],
    purpose_cfg: Dict[str, Any],
) -> Tuple[Dict, Dict, Optional[str], Optional[str]]:
    """Find the best tithi+nakshatra overlap window during the day.

    Scans every (tithi, nakshatra) pair that co-exists in the sunrise-to-next-sunrise
    window and picks the combination with the highest raw tithi+nakshatra score.
    Returns (tithi_entry, nak_entry, window_start_iso, window_end_iso).
    """
    tithi_seq = panch["panchang"]["tithi_sequence"]
    nak_seq = panch["panchang"]["nakshatra_sequence"]

    good_tithis = purpose_cfg.get("good_tithis", set())
    bad_tithis = purpose_cfg.get("bad_tithis", set())
    good_naks = purpose_cfg.get("good_nakshatras", set())
    bad_naks = purpose_cfg.get("bad_nakshatras", set())

    best_combo = -999
    best: Optional[Tuple[Dict, Dict, str, str]] = None

    for tithi in tithi_seq:
        for nak in nak_seq:
            t_start = dt_cls.fromisoformat(tithi["starts_at"])
            t_end = dt_cls.fromisoformat(tithi["ends_at"])
            n_start = dt_cls.fromisoformat(nak["starts_at"])
            n_end = dt_cls.fromisoformat(nak["ends_at"])

            w_start = max(t_start, n_start)
            w_end = min(t_end, n_end)
            if w_start >= w_end:
                continue

            combo = 0
            if nak["index"] in bad_naks:
                combo += _W_BAD_NAK
            elif nak["index"] in good_naks:
                combo += _W_GOOD_NAK

            if tithi["index"] in bad_tithis:
                combo += _W_BAD_TITHI
            elif tithi["index"] in good_tithis:
                combo += _W_GOOD_TITHI

            if combo > best_combo:
                best_combo = combo
                best = (tithi, nak, w_start.isoformat(), w_end.isoformat())

    if best is None:
        return tithi_seq[0], nak_seq[0], None, None
    return best


def score_day(
    panch: Dict[str, Any],
    purpose_cfg: Dict[str, Any],
    birth_nak_idx: Optional[int],
    birth_sign_id: Optional[int],
) -> Dict[str, Any]:
    """Score a panchang day for a purpose. Returns dict with score and reasons."""
    reasons: List[str] = []
    reasons_bad: List[str] = []
    score = 50  # baseline

    best_tithi, best_nak, win_start, win_end = _best_window(panch, purpose_cfg)

    tithi_idx = best_tithi["index"]
    tithi_name = best_tithi["name"]
    nak_idx_1 = best_nak["index"]  # 1-27
    nak_idx_0 = nak_idx_1 - 1
    nak_name = best_nak["name"]
    vara_iso = panch["vara"]["index"]
    vara_name = panch["vara"]["sanskrit"]
    moon_sign_id = panch["rashi_nakshatra"]["moonsign"]["index"]

    # Hard vetoes: combustion / Chaturmas / Kharmas / Adhika blackouts kill
    # the day outright - no tithi/nakshatra quality can rescue it.
    veto = _veto_reasons(panch, purpose_cfg)
    reasons_bad.extend(veto)

    # Tithi
    if tithi_idx in purpose_cfg.get("bad_tithis", set()):
        score += _W_BAD_TITHI
        reasons_bad.append(f"Tithi {tithi_name} is inauspicious")
    elif tithi_idx in purpose_cfg.get("good_tithis", set()):
        score += _W_GOOD_TITHI
        reasons.append(f"Tithi {tithi_name} favourable")

    # Nakshatra
    if nak_idx_1 in purpose_cfg.get("bad_nakshatras", set()):
        score += _W_BAD_NAK
        reasons_bad.append(f"Nakshatra {nak_name} inauspicious for this purpose")
    elif nak_idx_1 in purpose_cfg.get("good_nakshatras", set()):
        score += _W_GOOD_NAK
        reasons.append(f"Nakshatra {nak_name} favourable")

    # Weekday
    if vara_iso in purpose_cfg.get("avoid_weekdays", set()):
        score += _W_BAD_VARA
        reasons_bad.append(f"{vara_name} (weekday) to be avoided")
    elif vara_iso in purpose_cfg.get("good_weekdays", set()):
        score += _W_GOOD_VARA
        reasons.append(f"{vara_name} (weekday) favourable")

    # Bhadra (Vishti karana): trim the window around Vishti spans when
    # possible; penalize the day when no usable portion remains.
    if win_start and win_end:
        bhadra = _bhadra_spans(panch)
        if bhadra:
            ws = dt_cls.fromisoformat(win_start)
            we = dt_cls.fromisoformat(win_end)
            piece = _subtract_spans(ws, we, bhadra)
            if piece is None or (piece[1] - piece[0]) < timedelta(
                minutes=_MIN_WINDOW_MINUTES
            ):
                score += _W_BHADRA
                reasons_bad.append(
                    "Bhadra (Vishti karana) prevails over the muhurta window"
                )
            elif (piece[0], piece[1]) != (ws, we):
                win_start, win_end = piece[0].isoformat(), piece[1].isoformat()
                reasons.append("Window trimmed to avoid Bhadra (Vishti karana)")

    # Chandrabalam
    cbal = _chandrabalam_score(moon_sign_id, birth_sign_id)
    if birth_sign_id is not None:
        score += cbal - 10
        if cbal == 20:
            reasons.append("Strong Chandrabalam for native's rashi")
        elif cbal == 0:
            reasons_bad.append("Weak Chandrabalam for native's rashi")

    # Tarabalam
    tbal = _taraba_score(nak_idx_0, birth_nak_idx)
    if birth_nak_idx is not None:
        score += tbal - 10
        if tbal == 20:
            reasons.append("Auspicious Tarabalam for native's birth-nakshatra")
        elif tbal == 0:
            reasons_bad.append("Inauspicious Tarabalam for native's birth-nakshatra")

    score = 0 if veto else max(0, min(100, score))

    aus = panch["auspicious_timings"]
    result: Dict[str, Any] = {
        "score": score,
        "vetoed": bool(veto),
        "reasons": reasons,
        "cautions": reasons_bad,
        "tithi": tithi_name,
        "nakshatra": nak_name,
        "vara": vara_name,
        "paksha": best_tithi.get("paksha", panch["panchang"]["paksha"]),
        "moon_rashi": panch["rashi_nakshatra"]["moonsign"]["rashi"],
        "abhijit": aus["abhijit"],
        "brahma_muhurta": aus.get("brahma_muhurta"),
        "pratah_sandhya": aus.get("pratah_sandhya"),
        "vijay_muhurta": aus.get("vijay_muhurta"),
        "godhuli_muhurta": aus.get("godhuli_muhurta"),
        "sayahna_sandhya": aus.get("sayahna_sandhya"),
        "nishita_muhurta": aus.get("nishita_muhurta"),
        "amrit_kalam": aus.get("amrit_kalam") or [],
        "sarvartha_siddhi_yoga": aus.get("sarvartha_siddhi_yoga") or [],
        "amrita_siddhi_yoga": aus.get("amrita_siddhi_yoga") or [],
        "rahu_kalam": panch["inauspicious_timings"]["rahu_kalam"],
        "sunrise": panch["sun_moon"]["sunrise"],
        "sunset": panch["sun_moon"]["sunset"],
    }
    if win_start and win_end:
        result["muhurta_window"] = {"start": win_start, "end": win_end}
    return result


def find_muhurtas(
    purpose: str,
    start_date: str,
    end_date: str,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str] = None,
    birth_rashi_id: Optional[int] = None,  # 1-12
    birth_nakshatra_id: Optional[int] = None,  # 1-27
    min_score: int = 60,
    limit: int = 30,
) -> Dict[str, Any]:
    """Scan date range and return best auspicious days for the purpose."""
    if purpose not in PURPOSES:
        raise ValueError(f"Unknown purpose '{purpose}'. Valid: {list(PURPOSES.keys())}")
    cfg = PURPOSES[purpose]

    s = date_cls.fromisoformat(start_date)
    e = date_cls.fromisoformat(end_date)
    if e < s:
        raise ValueError("end_date must be >= start_date")
    span = (e - s).days + 1
    if span > 120:
        raise ValueError("date range too large (max 120 days)")

    birth_nak_idx0 = (birth_nakshatra_id - 1) if birth_nakshatra_id else None
    results: List[Dict[str, Any]] = []
    resolved_tz: Optional[str] = None
    for i in range(span):
        d = s + timedelta(days=i)
        try:
            panch = compute_detailed_panchang(
                d.isoformat(), latitude, longitude, timezone_name
            )
            if resolved_tz is None:
                resolved_tz = panch.get("location", {}).get("timezone")
            sc = score_day(panch, cfg, birth_nak_idx0, birth_rashi_id)
            sc["date"] = d.isoformat()
            sc["weekday"] = d.strftime("%A")
            results.append(sc)
        except Exception as ex:
            results.append({"date": d.isoformat(), "score": 0, "error": str(ex)})

    # Filter by min_score + rank
    qualifying = [r for r in results if r.get("score", 0) >= min_score]
    qualifying.sort(key=lambda r: (-r["score"], r["date"]))
    qualifying = qualifying[:limit]

    return {
        "purpose": purpose,
        "purpose_label": cfg["label"],
        "date_range": {"start": start_date, "end": end_date, "days_scanned": span},
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": resolved_tz or timezone_name,
        },
        "filter": {
            "min_score": min_score,
            "native_rashi_id": birth_rashi_id,
            "native_rashi": RASHI_NAMES[birth_rashi_id - 1] if birth_rashi_id else None,
            "native_nakshatra_id": birth_nakshatra_id,
            "native_nakshatra": (
                NAKSHATRAS[birth_nak_idx0] if birth_nak_idx0 is not None else None
            ),
        },
        "total_matches": len(qualifying),
        "muhurtas": qualifying,
        "all_days": results,  # full list (for client-side charting)
    }


def list_purposes():
    return [{"id": k, "label": v["label"]} for k, v in PURPOSES.items()]
