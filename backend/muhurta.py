"""Muhurta Finder — classical auspicious-timing search for a purpose over a date range.

Each purpose has preferred Tithis, Nakshatras, Weekdays, Yogas and specific caveats.
We score each day (0–100) then rank. Optionally filter by the native's Chandrabalam
(Moon sign compatibility) and Tarabalam (birth nakshatra compatibility).
"""
from __future__ import annotations

from datetime import date as date_cls, timedelta
from typing import Dict, Any, List, Optional

from advanced_panchang import compute_detailed_panchang
from constants import NAKSHATRAS
from panchang_constants import GOOD_CHANDRA_OFFSETS, RASHI_NAMES

# ---- Purpose rules ----
# All indices: Tithi 1-30 (1-15 Shukla, 15=Purnima, 16-30 Krishna, 30=Amavasya)
# Nakshatras 1-27 (Ashwini..Revati)
# Weekdays (isoweekday): 1=Mon..7=Sun

PURPOSES: Dict[str, Dict[str, Any]] = {
    "marriage": {
        "label": "Marriage (Vivāha)",
        "good_tithis": {2, 3, 5, 7, 10, 11, 12, 13, 17, 18, 20, 22, 25, 26, 27, 28},
        "good_nakshatras": {4, 5, 10, 12, 13, 15, 17, 19, 21, 22, 26, 27},  # Ro,Mri,Ma,U.Ph,Ha,Sw,An,Mu,U.As,Shr,U.Bh,Re
        "good_weekdays": {1, 3, 4, 5},  # Mon Wed Thu Fri
        "avoid_weekdays": {2, 6, 7},     # Tue Sat Sun
        "bad_tithis": {4, 9, 14, 19, 24, 29, 30, 15},  # Rikta, Amavasya, Purnima
    },
    "griha_pravesh": {
        "label": "Griha Praveśa (Housewarming)",
        "good_tithis": {2, 3, 5, 7, 10, 11, 12, 13, 17, 18, 20, 22, 25, 26, 27, 28},
        "good_nakshatras": {4, 5, 12, 14, 17, 21, 22, 25, 26},  # Ro,Mri,Ha,Ch,An,U.As,Shr,P.Bh,U.Bh
        "good_weekdays": {1, 3, 4, 5},
        "avoid_weekdays": {2, 7},
        "bad_tithis": {4, 9, 14, 30, 15, 19, 24, 29},
    },
    "business": {
        "label": "Business / Venture (Vyāpāra)",
        "good_tithis": {1, 2, 3, 5, 7, 10, 11, 13, 16, 17, 18, 20, 22, 25, 26, 28},
        "good_nakshatras": {1, 4, 5, 8, 12, 13, 14, 17, 21, 22, 23, 27},  # Asw,Ro,Mri,Pu,Ha,Ch,Sw,An,Shr,Dha,Re
        "good_weekdays": {3, 4},         # Wed Thu (best)
        "avoid_weekdays": {7},           # Sunday
        "bad_tithis": {4, 9, 14, 30},
    },
    "travel": {
        "label": "Travel (Yātrā)",
        "good_tithis": {1, 2, 3, 5, 7, 10, 11, 13, 16, 17, 18, 20, 22, 25, 26, 28},
        "good_nakshatras": {1, 8, 13, 17, 19, 21, 22, 23, 27},
        "good_weekdays": {1, 3, 5},      # Mon Wed Fri
        "avoid_weekdays": {2, 6, 7},
        "bad_tithis": {4, 9, 14, 30, 15},
    },
    "education": {
        "label": "Vidyārambha (Learning)",
        "good_tithis": {2, 3, 5, 7, 10, 11, 12, 13, 17, 18, 20, 22, 25, 26, 27, 28},
        "good_nakshatras": {1, 7, 8, 13, 14, 15, 17, 22, 27},  # Asw,Pun,Pu,Ha,Ch,Sw,An,Shr,Re
        "good_weekdays": {1, 3, 4, 5},
        "avoid_weekdays": {2, 7},
        "bad_tithis": {4, 9, 14, 30},
    },
    "vehicle": {
        "label": "Vehicle Purchase",
        "good_tithis": {2, 3, 5, 7, 10, 11, 13, 17, 18, 20, 22, 25, 26, 28},
        "good_nakshatras": {1, 7, 8, 13, 14, 15, 17, 22, 23, 27},
        "good_weekdays": {1, 3, 4, 5},
        "avoid_weekdays": {2, 7},
        "bad_tithis": {4, 9, 14, 30, 15},
    },
    "namakarana": {
        "label": "Name Ceremony (Nāmakaraṇa)",
        "good_tithis": {1, 2, 3, 5, 7, 10, 11, 12, 13},
        # Avoid: Bharani(2), Krittika(3), Ashlesha(9), Magha(10), Jyeshtha(18), Mula(19), P.Ash(20)
        "bad_nakshatras": {2, 3, 9, 10, 18, 19, 20},
        "good_weekdays": {1, 3, 4, 5},
        "avoid_weekdays": {2, 7},
        "bad_tithis": {4, 9, 14, 30},
    },
    "medical": {
        "label": "Medical / Surgery",
        "good_tithis": {2, 3, 5, 7, 11, 12, 13, 17, 18, 20, 22, 25, 26},
        "good_nakshatras": {1, 5, 8, 22, 27},  # Ashwini, Mrigashira, Pushya, Shravana, Revati
        "good_weekdays": {1, 3, 4, 5},
        "avoid_weekdays": {7},
        "bad_tithis": {4, 9, 14, 30, 15},
    },
}


def _taraba_score(current_nak_idx: int, birth_nak_idx: Optional[int]) -> int:
    """Return 0-20 score. birth_nak_idx is 0-26 of native."""
    if birth_nak_idx is None:
        return 10  # neutral
    offset = (current_nak_idx - birth_nak_idx) % 27
    star_sub = (offset % 9) + 1  # 1-9
    # Good stars: Janma(1), Sampat(2), Kshema(4), Sadhaka(6), Mitra(8), Param Mitra(9)
    if star_sub in {2, 4, 6, 8, 9}:
        return 20
    if star_sub == 1:
        return 12
    return 0


def _chandrabalam_score(current_sign_id: int, birth_sign_id: Optional[int]) -> int:
    """0-20 score."""
    if birth_sign_id is None:
        return 10
    offset = (current_sign_id - birth_sign_id) % 12
    if offset in GOOD_CHANDRA_OFFSETS:
        return 20
    if offset in {1, 4, 8}:  # 2nd/5th/9th — neutral
        return 10
    return 0


def score_day(panch: Dict[str, Any], purpose_cfg: Dict[str, Any],
              birth_nak_idx: Optional[int], birth_sign_id: Optional[int]) -> Dict[str, Any]:
    """Score a panchang day for a purpose. Returns dict with score and reasons."""
    reasons: List[str] = []
    reasons_bad: List[str] = []
    score = 50  # baseline

    # Read the day's prevailing tithi/nakshatra/weekday (at sunrise)
    tithi_idx = panch["panchang"]["tithi"]["index"]
    tithi_name = panch["panchang"]["tithi"]["name"]
    nak_idx_1 = panch["panchang"]["nakshatra"]["index"]  # 1-27
    nak_idx_0 = nak_idx_1 - 1
    nak_name = panch["panchang"]["nakshatra"]["name"]
    vara_iso = panch["vara"]["index"]
    vara_name = panch["vara"]["sanskrit"]
    moon_sign_id = panch["rashi_nakshatra"]["moonsign"]["index"]

    # Tithi
    if tithi_idx in purpose_cfg.get("bad_tithis", set()):
        score -= 25
        reasons_bad.append(f"Tithi {tithi_name} is inauspicious")
    elif tithi_idx in purpose_cfg.get("good_tithis", set()):
        score += 15
        reasons.append(f"Tithi {tithi_name} favourable")

    # Nakshatra
    if nak_idx_1 in purpose_cfg.get("bad_nakshatras", set()):
        score -= 25
        reasons_bad.append(f"Nakshatra {nak_name} inauspicious for this purpose")
    elif nak_idx_1 in purpose_cfg.get("good_nakshatras", set()):
        score += 20
        reasons.append(f"Nakshatra {nak_name} favourable")

    # Weekday
    if vara_iso in purpose_cfg.get("avoid_weekdays", set()):
        score -= 20
        reasons_bad.append(f"{vara_name} (weekday) to be avoided")
    elif vara_iso in purpose_cfg.get("good_weekdays", set()):
        score += 10
        reasons.append(f"{vara_name} (weekday) favourable")

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

    score = max(0, min(100, score))

    return {
        "score": score,
        "reasons": reasons,
        "cautions": reasons_bad,
        "tithi": tithi_name,
        "nakshatra": nak_name,
        "vara": vara_name,
        "paksha": panch["panchang"]["paksha"],
        "moon_rashi": panch["rashi_nakshatra"]["moonsign"]["rashi"],
        "abhijit": panch["auspicious_timings"]["abhijit"],
        "rahu_kalam": panch["inauspicious_timings"]["rahu_kalam"],
        "sunrise": panch["sun_moon"]["sunrise"],
        "sunset": panch["sun_moon"]["sunset"],
    }


def find_muhurtas(
    purpose: str,
    start_date: str,
    end_date: str,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str] = None,
    birth_rashi_id: Optional[int] = None,       # 1-12
    birth_nakshatra_id: Optional[int] = None,   # 1-27
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
            panch = compute_detailed_panchang(d.isoformat(), latitude, longitude, timezone_name)
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
            "native_nakshatra": NAKSHATRAS[birth_nak_idx0] if birth_nak_idx0 is not None else None,
        },
        "total_matches": len(qualifying),
        "muhurtas": qualifying,
        "all_days": results,  # full list (for client-side charting)
    }


def list_purposes():
    return [{"id": k, "label": v["label"]} for k, v in PURPOSES.items()]
