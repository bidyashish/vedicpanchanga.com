"""Hindu festival calendar computed from the ephemeris for any location.

`compute_festivals(year, latitude, longitude, timezone_name)` returns every
festival, vrat, Sankranti, Purnima / Amavasya, Ekadashi and Pitru Paksha
Shraddha tithi of a Gregorian year for the given place, each with the exact
local start / end of its tithi (or nakshatra) and the puja window that fixes
the day, plus the multi-day periods (Adhika Masa, Chaturmas, Pitru Paksha,
Navratri, Durga Puja).

Nothing here is a lookup table of dates: sunrise, sunset, moonrise, tithi and
nakshatra boundaries, Sun ingresses and eclipses all come from swisseph (via
the helpers in advanced_panchang), so the same rules give correct local dates
in Auckland or Toronto, not just New Delhi. DrikPanchang (New Delhi) is the
verification oracle: `tests/test_festivals.py` pins two full years against it
and every rule below was tuned on Drik's published muhurta pages.

How a rule becomes a date
-------------------------
* Lunar rules are written in the Purnimanta (North Indian) month convention,
  the one DrikPanchang labels its calendar with: `("Kartika", "Krishna", 4)`
  is Karwa Chauth. Month names are the amanta names for Shukla paksha and the
  next month's name for Krishna paksha; an Adhika month keeps its own name for
  both pakshas and hosts no festivals other than its Ekadashis, Purnima and
  Amavasya (Ganga Dussehra is the one exception Drik makes: it is kept in the
  adhika month when Jyeshtha doubles).
* Each tithi segment (start / end instant) is mapped to a civil day through a
  `kala` (time of day) rule: `udaya` = tithi at sunrise (default), or the day on
  which the tithi covers most of madhyahna (Ganesh Chaturthi, Rama Navami,
  Rishi Panchami), purvahna (Akshaya Tritiya: sunrise to midday, the earlier
  day keeps it unless the next covers a muhurta more), aparahna (Vijayadashami, Maha Navami, every
  Shraddha), pradosh (Diwali, Dhanteras), nishita (Shivaratri, Kali Puja: the
  tithi must cover the midpoint of the night), moonrise (Karwa Chauth, Sakat
  Chauth) or arunodaya (Narak Chaturdashi). `mode="full"` (Balarama Jayanti)
  demands the tithi cover the whole window, otherwise the udaya day wins. When
  a tithi touches no sunrise at all (kshaya) the udaya rule falls back to the
  day it starts and ends in.
* Ekadashi (Smarta): the last day on which Ekadashi prevails at sunrise, or
  the day it starts and ends in when it touches no sunrise; if Dwadashi would
  not be present at the following sunrise (Dwadashi kshaya, so parana could not
  fall in Dwadashi) the fast moves one day earlier. Vaishnava (Gauna) dates are
  not listed. The parana window is the first fifth of the next day, after Hari
  Vasara (the first quarter of Dwadashi) and before Dwadashi ends.
* Krishna Janmashtami: the day Ashtami and Rohini both cover the midpoint of
  the night (Jayanti yoga); otherwise the last day Ashtami prevails at sunrise;
  otherwise the night Ashtami covers midnight.
* Holika Dahan follows Drik's Bhadra rules: pradosh with Purnima once Bhadra
  (the first half of Purnima) is over; else after Bhadra if it ends before
  Hindu midnight; else in Bhadra Puccha if that lies between pradosh and
  midnight; else the next evening (Pratipada) when Purnima lasts until within
  two muhurtas of that sunset, otherwise pradosh with Bhadra. Holi is the day
  after. Raksha Bandhan: Bhadra-free aparahna, else pradosh after Bhadra, else
  the next morning if Purnima lasts three muhurtas past sunrise, else the night
  after Bhadra ends.
* Sankranti is observed on the civil day of the Sun's ingress. When the ingress
  falls after sunset and the punya kala lies after the moment (Makara and the
  Shadashiti signs Mithuna, Kanya, Dhanu, Meena) it moves to the next day.
* Nakshatra festivals (Onam, Saraswati Avahan / Puja, Maha Bharani, Magha
  Shraddha) pick the day the nakshatra prevails at sunrise (Onam) or through
  aparahna, restricted to the right solar or lunar month.

Known simplifications: Vaishnava Ekadashi variants and regional calendars
(Tamil solar months, Bengali tithi conventions) are not modelled, eclipse
times are global (not filtered for local visibility), and Bhadra Puccha uses
Drik's proportional split of the Bhadra span.
"""

from __future__ import annotations

import bisect
from dataclasses import dataclass, field
from datetime import date as date_cls, datetime, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

import pytz
import swisseph as swe
from timezonefinder import TimezoneFinder

from advanced_panchang import (
    NAK_SPAN,
    _find_angle_time,
    _jd_to_local,
    _rise_trans,
    _segment_start,
    _sun_moon_sid,
)
from ayanamsa import sidereal_context
from constants import NAKSHATRAS, TITHI_BASE
from panchang_constants import CHANDRA_MASA, RASHI_NAMES

_TF = TimezoneFinder()

MIN_YEAR, MAX_YEAR = 1900, 2100

# Time-of-day windows, in days. Daylight is split into five equal parts
# (pratah, sangava, madhyahna, aparahna, sayahna); pradosh is the first fifth
# of the night after sunset, nishita the 48 minutes around Hindu midnight (the
# midpoint of the night), arunodaya the 1h36m before sunrise.
_NISHITA_HALF = 1 / 60
_ARUNODAYA = 1 / 15
_MUHURTA = 1 / 30
_ROHINI = 3  # nakshatra index for the Janmashtami Jayanti-yoga test
# Signs whose Sankranti punya kala lies after the ingress moment: Makara and
# the four Shadashiti signs. An ingress after sunset moves these to the next day.
_SANKRANTI_PUNYA_AFTER = {3, 6, 9, 10, 12}

SHUKLA, KRISHNA = "Shukla", "Krishna"

# ---------------------------------------------------------------------------
# Rule tables
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TithiRule:
    id: str
    month: str  # Purnimanta month, CHANDRA_MASA spelling
    paksha: str
    tithi: int  # 1..15 within the paksha (15 = Purnima / Amavasya)
    kala: str = "udaya"
    major: bool = False
    series: Optional[str] = None
    prefer: str = "first"  # which day wins when two days qualify equally
    mode: str = "overlap"  # "full": the tithi must cover the whole kala window
    margin: float = 0.0  # days: a later day must beat the earlier one by this much
    adhika: str = "skip"  # "first": keep the adhika-month occurrence (Ganga Dussehra)


def _r(
    id,
    month,
    paksha,
    tithi,
    kala="udaya",
    major=False,
    series=None,
    prefer="first",
    **kw,
):
    return TithiRule(id, month, paksha, tithi, kala, major, series, prefer, **kw)


# fmt: off
TITHI_RULES: List[TithiRule] = [
    # Chaitra
    _r("chaitra_navratri", "Chaitra", SHUKLA, 1, major=True, series="navratri"),
    _r("hindu_new_year", "Chaitra", SHUKLA, 1, major=True),
    _r("gangaur", "Chaitra", SHUKLA, 3),
    _r("yamuna_chhath", "Chaitra", SHUKLA, 6),
    _r("rama_navami", "Chaitra", SHUKLA, 9, "madhyahna", major=True, series="navratri"),
    _r("hanuman_jayanti", "Chaitra", SHUKLA, 15, major=True),
    _r("sheetala_ashtami", "Chaitra", KRISHNA, 8),
    # Vaishakha
    _r("parashurama_jayanti", "Vaishakha", SHUKLA, 3, "pradosh"),
    _r("akshaya_tritiya", "Vaishakha", SHUKLA, 3, "purvahna", major=True, margin=_MUHURTA),
    _r("ganga_saptami", "Vaishakha", SHUKLA, 7, "madhyahna"),
    _r("sita_navami", "Vaishakha", SHUKLA, 9, "madhyahna"),
    _r("narasimha_jayanti", "Vaishakha", SHUKLA, 14, "sayahna"),
    _r("buddha_purnima", "Vaishakha", SHUKLA, 15, major=True),
    # Jyeshtha
    _r("narada_jayanti", "Jyeshtha", KRISHNA, 1),
    _r("vat_savitri_vrat", "Jyeshtha", KRISHNA, 15),
    _r("shani_jayanti", "Jyeshtha", KRISHNA, 15),
    _r("ganga_dussehra", "Jyeshtha", SHUKLA, 10, adhika="first"),
    _r("vat_purnima_vrat", "Jyeshtha", SHUKLA, 15),
    # Ashadha
    _r("jagannath_rathyatra", "Ashadha", SHUKLA, 2, major=True),
    _r("guru_purnima", "Ashadha", SHUKLA, 15, major=True),
    # Shravana
    _r("hariyali_teej", "Shravana", SHUKLA, 3),
    _r("nag_panchami", "Shravana", SHUKLA, 5, major=True),
    _r("raksha_bandhan", "Shravana", SHUKLA, 15, "rakhi", major=True),
    _r("gayatri_jayanti", "Shravana", SHUKLA, 15),
    # Bhadrapada
    _r("kajari_teej", "Bhadrapada", KRISHNA, 3),
    _r("krishna_janmashtami", "Bhadrapada", KRISHNA, 8, "janmashtami", major=True),
    _r("hartalika_teej", "Bhadrapada", SHUKLA, 3),
    _r("ganesh_chaturthi", "Bhadrapada", SHUKLA, 4, "madhyahna", major=True),
    _r("rishi_panchami", "Bhadrapada", SHUKLA, 5, "madhyahna"),
    _r("balarama_jayanti", "Bhadrapada", SHUKLA, 6, "madhyahna", mode="full"),
    _r("radha_ashtami", "Bhadrapada", SHUKLA, 8),
    _r("anant_chaturdashi", "Bhadrapada", SHUKLA, 14, major=True),
    _r("purnima_shraddha", "Bhadrapada", SHUKLA, 15, "aparahna", series="pitru_paksha"),
    # Ashwin - Krishna paksha is Pitru Paksha (Shraddha tithis added below)
    _r("sarva_pitru_amavasya", "Ashwin", KRISHNA, 15, "aparahna", major=True, series="pitru_paksha"),
    _r("navratri_begins", "Ashwin", SHUKLA, 1, major=True, series="navratri"),
    _r("maha_shashthi", "Ashwin", SHUKLA, 6, series="durga_puja"),
    _r("maha_saptami", "Ashwin", SHUKLA, 7, series="durga_puja"),
    _r("durga_ashtami", "Ashwin", SHUKLA, 8, major=True, series="durga_puja"),
    _r("maha_navami", "Ashwin", SHUKLA, 9, "aparahna", major=True, series="durga_puja"),
    _r("vijayadashami", "Ashwin", SHUKLA, 10, "aparahna", major=True, series="durga_puja"),
    _r("sharad_purnima", "Ashwin", SHUKLA, 15, "nishita", major=True),
    # Kartika
    _r("karwa_chauth", "Kartika", KRISHNA, 4, "moonrise", major=True),
    _r("ahoi_ashtami", "Kartika", KRISHNA, 8, "pradosh"),
    _r("govatsa_dwadashi", "Kartika", KRISHNA, 12, "pradosh"),
    _r("dhanteras", "Kartika", KRISHNA, 13, "pradosh", major=True),
    _r("narak_chaturdashi", "Kartika", KRISHNA, 14, "arunodaya"),
    _r("kali_puja", "Kartika", KRISHNA, 15, "nishita", major=True),
    _r("diwali", "Kartika", KRISHNA, 15, "pradosh", major=True),
    _r("govardhan_puja", "Kartika", SHUKLA, 1),
    _r("bhaiya_dooj", "Kartika", SHUKLA, 2, "aparahna", major=True),
    _r("chhath_puja", "Kartika", SHUKLA, 6, major=True),
    _r("kansa_vadh", "Kartika", SHUKLA, 10),
    _r("tulasi_vivah", "Kartika", SHUKLA, 12),
    _r("kartika_purnima", "Kartika", SHUKLA, 15, major=True),
    # Margashirsha
    _r("kalabhairav_jayanti", "Margashirsha", KRISHNA, 8, "nishita"),
    _r("vivah_panchami", "Margashirsha", SHUKLA, 5),
    _r("gita_jayanti", "Margashirsha", SHUKLA, 11),
    _r("dattatreya_jayanti", "Margashirsha", SHUKLA, 15, "pradosh"),
    # Magha
    _r("sakat_chauth", "Magha", KRISHNA, 4, "moonrise"),
    _r("mauni_amavasya", "Magha", KRISHNA, 15),
    _r("vasant_panchami", "Magha", SHUKLA, 5, major=True),
    _r("ratha_saptami", "Magha", SHUKLA, 7),
    _r("bhishma_ashtami", "Magha", SHUKLA, 8, "madhyahna"),
    _r("magha_purnima", "Magha", SHUKLA, 15),
    # Phalguna
    _r("maha_shivaratri", "Phalguna", KRISHNA, 14, "nishita", major=True),
    _r("holika_dahan", "Phalguna", SHUKLA, 15, "holika", major=True),
]
# fmt: on

# Pitru Paksha: Pratipada .. Chaturdashi Shraddha, tithi prevailing in aparahna.
for _t in range(1, 15):
    TITHI_RULES.append(
        TithiRule(
            f"{TITHI_BASE[_t - 1].lower()}_shraddha",
            "Ashwin",
            KRISHNA,
            _t,
            "aparahna",
            series="pitru_paksha",
        )
    )

# Ekadashi names by Purnimanta month and paksha; adhika months use their own pair.
EKADASHI_NAMES: Dict[Tuple[str, str], str] = {
    ("Chaitra", SHUKLA): "kamada",
    ("Chaitra", KRISHNA): "papamochani",
    ("Vaishakha", SHUKLA): "mohini",
    ("Vaishakha", KRISHNA): "varuthini",
    ("Jyeshtha", SHUKLA): "nirjala",
    ("Jyeshtha", KRISHNA): "apara",
    ("Ashadha", SHUKLA): "devshayani",
    ("Ashadha", KRISHNA): "yogini",
    ("Shravana", SHUKLA): "shravana_putrada",
    ("Shravana", KRISHNA): "kamika",
    ("Bhadrapada", SHUKLA): "parsva",
    ("Bhadrapada", KRISHNA): "aja",
    ("Ashwin", SHUKLA): "papankusha",
    ("Ashwin", KRISHNA): "indira",
    ("Kartika", SHUKLA): "devutthana",
    ("Kartika", KRISHNA): "rama",
    ("Margashirsha", SHUKLA): "mokshada",
    ("Margashirsha", KRISHNA): "utpanna",
    ("Pausha", SHUKLA): "pausha_putrada",
    ("Pausha", KRISHNA): "saphala",
    ("Magha", SHUKLA): "jaya",
    ("Magha", KRISHNA): "shattila",
    ("Phalguna", SHUKLA): "amalaki",
    ("Phalguna", KRISHNA): "vijaya",
}
ADHIKA_EKADASHI = {SHUKLA: "padmini", KRISHNA: "parama"}
MAJOR_EKADASHIS = {"nirjala", "devshayani", "devutthana", "mokshada"}

# Nakshatra rules: (id, nakshatra index 0-based, constraint, kala, major)
#   constraint "sun_sign:5"   -> Sun in that sidereal sign (1..12) at nakshatra start
#   constraint "lunar:Ashwin:Shukla" / "lunar:Ashwin:Krishna" -> tithi at nakshatra start
NAKSHATRA_RULES = [
    ("onam", 21, "sun_sign:5", "udaya", True),
    ("saraswati_avahan", 18, "lunar:Ashwin:Shukla", "aparahna", False),
    ("saraswati_puja", 19, "lunar:Ashwin:Shukla", "aparahna", True),
    ("maha_bharani", 1, "lunar:Ashwin:Krishna", "aparahna", False),
    ("magha_shraddha", 9, "lunar:Ashwin:Krishna", "aparahna", False),
]

# Solar festivals keyed by the sign the Sun enters (1 = Mesha .. 12 = Meena).
SANKRANTI_EXTRAS = {1: ["solar_new_year"], 6: ["vishwakarma_puja"], 10: ["pongal"]}
MAJOR_SANKRANTIS = {1, 4, 10}

# English display names (frontend locales carry the 15-language versions).
FESTIVAL_NAMES_EN: Dict[str, str] = {
    "chaitra_navratri": "Chaitra Navratri",
    "hindu_new_year": "Hindu New Year (Gudi Padwa, Ugadi)",
    "gangaur": "Gangaur",
    "yamuna_chhath": "Yamuna Chhath",
    "rama_navami": "Rama Navami",
    "hanuman_jayanti": "Hanuman Jayanti",
    "sheetala_ashtami": "Sheetala Ashtami (Basoda)",
    "parashurama_jayanti": "Parashurama Jayanti",
    "akshaya_tritiya": "Akshaya Tritiya",
    "ganga_saptami": "Ganga Saptami",
    "sita_navami": "Sita Navami",
    "narasimha_jayanti": "Narasimha Jayanti",
    "buddha_purnima": "Buddha Purnima",
    "narada_jayanti": "Narada Jayanti",
    "vat_savitri_vrat": "Vat Savitri Vrat",
    "shani_jayanti": "Shani Jayanti",
    "ganga_dussehra": "Ganga Dussehra",
    "vat_purnima_vrat": "Vat Purnima Vrat",
    "jagannath_rathyatra": "Jagannath Rath Yatra",
    "guru_purnima": "Guru Purnima",
    "hariyali_teej": "Hariyali Teej",
    "nag_panchami": "Nag Panchami",
    "raksha_bandhan": "Raksha Bandhan",
    "gayatri_jayanti": "Gayatri Jayanti",
    "varalakshmi_vrat": "Varalakshmi Vrat",
    "kajari_teej": "Kajari Teej",
    "krishna_janmashtami": "Krishna Janmashtami",
    "hartalika_teej": "Hartalika Teej",
    "ganesh_chaturthi": "Ganesh Chaturthi",
    "rishi_panchami": "Rishi Panchami",
    "balarama_jayanti": "Balarama Jayanti",
    "radha_ashtami": "Radha Ashtami",
    "anant_chaturdashi": "Anant Chaturdashi (Ganesh Visarjan)",
    "purnima_shraddha": "Purnima Shraddha",
    "sarva_pitru_amavasya": "Sarva Pitru Amavasya",
    "navratri_begins": "Sharad Navratri begins",
    "maha_shashthi": "Maha Shashthi (Durga Puja begins)",
    "maha_saptami": "Maha Saptami",
    "durga_ashtami": "Durga Ashtami",
    "maha_navami": "Maha Navami",
    "vijayadashami": "Vijayadashami (Dussehra)",
    "sharad_purnima": "Sharad Purnima (Kojagara Puja)",
    "karwa_chauth": "Karwa Chauth",
    "ahoi_ashtami": "Ahoi Ashtami",
    "govatsa_dwadashi": "Govatsa Dwadashi",
    "dhanteras": "Dhanteras",
    "narak_chaturdashi": "Narak Chaturdashi (Kali Chaudas)",
    "kali_puja": "Kali Puja",
    "diwali": "Diwali (Lakshmi Puja)",
    "govardhan_puja": "Govardhan Puja",
    "bhaiya_dooj": "Bhai Dooj",
    "chhath_puja": "Chhath Puja",
    "kansa_vadh": "Kansa Vadh",
    "tulasi_vivah": "Tulasi Vivah",
    "kartika_purnima": "Kartika Purnima (Dev Deepawali)",
    "kalabhairav_jayanti": "Kalabhairav Jayanti",
    "vivah_panchami": "Vivah Panchami",
    "gita_jayanti": "Gita Jayanti",
    "dattatreya_jayanti": "Dattatreya Jayanti",
    "sakat_chauth": "Sakat Chauth",
    "mauni_amavasya": "Mauni Amavasya",
    "vasant_panchami": "Vasant Panchami (Saraswati Puja)",
    "ratha_saptami": "Ratha Saptami",
    "bhishma_ashtami": "Bhishma Ashtami",
    "magha_purnima": "Magha Purnima",
    "maha_shivaratri": "Maha Shivaratri",
    "holika_dahan": "Holika Dahan (Chhoti Holi)",
    "holi": "Holi",
    "onam": "Onam (Thiruvonam)",
    "saraswati_avahan": "Saraswati Avahan",
    "saraswati_puja": "Saraswati Puja (Navratri)",
    "maha_bharani": "Maha Bharani Shraddha",
    "magha_shraddha": "Magha Shraddha",
    "solar_new_year": "Solar New Year (Baisakhi, Vishu, Puthandu)",
    "vishwakarma_puja": "Vishwakarma Puja",
    "pongal": "Pongal",
    "somavati_amavasya": "Somavati Amavasya",
    "surya_grahan": "Solar Eclipse (Surya Grahan)",
    "chandra_grahan": "Lunar Eclipse (Chandra Grahan)",
    "purnima": "Purnima",
    "amavasya": "Amavasya",
    "sankranti": "Sankranti",
    # periods
    "adhika_masa": "Adhika Masa",
    "chaturmas": "Chaturmas (Vishnu's sleep)",
    "pitru_paksha": "Pitru Paksha",
    "sharad_navratri": "Sharad Navratri",
    "durga_puja": "Durga Puja",
}
for _t in range(1, 15):
    FESTIVAL_NAMES_EN[f"{TITHI_BASE[_t - 1].lower()}_shraddha"] = (
        f"{TITHI_BASE[_t - 1]} Shraddha"
    )

EKADASHI_NAMES_EN = {
    "kamada": "Kamada Ekadashi",
    "papamochani": "Papamochani Ekadashi",
    "mohini": "Mohini Ekadashi",
    "varuthini": "Varuthini Ekadashi",
    "nirjala": "Nirjala Ekadashi",
    "apara": "Apara Ekadashi",
    "devshayani": "Devshayani Ekadashi",
    "yogini": "Yogini Ekadashi",
    "shravana_putrada": "Shravana Putrada Ekadashi",
    "kamika": "Kamika Ekadashi",
    "parsva": "Parsva Ekadashi",
    "aja": "Aja Ekadashi",
    "papankusha": "Papankusha Ekadashi",
    "indira": "Indira Ekadashi",
    "devutthana": "Devutthana Ekadashi",
    "rama": "Rama Ekadashi",
    "mokshada": "Mokshada Ekadashi",
    "utpanna": "Utpanna Ekadashi",
    "pausha_putrada": "Pausha Putrada Ekadashi",
    "saphala": "Saphala Ekadashi",
    "jaya": "Jaya Ekadashi",
    "shattila": "Shattila Ekadashi",
    "amalaki": "Amalaki Ekadashi",
    "vijaya": "Vijaya Ekadashi",
    "padmini": "Padmini Ekadashi",
    "parama": "Parama Ekadashi",
}
for _k, _v in EKADASHI_NAMES_EN.items():
    FESTIVAL_NAMES_EN[f"ekadashi_{_k}"] = _v


# ---------------------------------------------------------------------------
# Ephemeris scaffolding
# ---------------------------------------------------------------------------


@dataclass
class _Day:
    date: date_cls
    sunrise: float
    sunset: float
    next_sunrise: float
    moonrise: Optional[float]

    @property
    def midnight(self) -> float:
        """Hindu midnight: the midpoint of the night."""
        return (self.sunset + self.next_sunrise) / 2

    def kala(self, name: str) -> Optional[Tuple[float, float]]:
        d = self.sunset - self.sunrise
        sr = self.sunrise
        if name == "pratah":
            return sr, sr + 0.2 * d
        if name == "purvahna":
            return sr, sr + 0.5 * d
        if name == "sangava":
            return sr + 0.2 * d, sr + 0.4 * d
        if name == "madhyahna":
            return sr + 0.4 * d, sr + 0.6 * d
        if name == "aparahna":
            return sr + 0.6 * d, sr + 0.8 * d
        if name == "sayahna":
            return sr + 0.8 * d, self.sunset
        if name == "pradosh":
            return self.sunset, self.sunset + (self.next_sunrise - self.sunset) / 5
        if name == "nishita":
            return self.midnight - _NISHITA_HALF, self.midnight + _NISHITA_HALF
        if name == "arunodaya":
            return sr - _ARUNODAYA, sr
        if name == "moonrise":
            if self.moonrise is None:
                return None
            return self.moonrise, self.moonrise + _MUHURTA
        return None


@dataclass
class _Segment:
    index: int  # tithi 1..30 or nakshatra 0..26
    start: float
    end: float


@dataclass
class _Month:
    start: float  # new moon that begins the amanta month
    end: float  # next new moon
    amanta: int  # 1 = Chaitra .. 12 = Phalguna
    adhika: bool
    after_adhika: bool = False  # the nija month that follows its own adhika month


@dataclass
class _Sky:
    tz: pytz.BaseTzInfo
    days: List[_Day]
    tithis: List[_Segment]
    nakshatras: List[_Segment]
    months: List[_Month]
    ingresses: List[Tuple[int, float]]  # (sign entered 1..12, jd)
    _day_by_date: Dict[date_cls, _Day] = field(default_factory=dict)
    _tithi_starts: List[float] = field(default_factory=list)
    _month_starts: List[float] = field(default_factory=list)

    def __post_init__(self):
        self._day_by_date = {d.date: d for d in self.days}
        self._tithi_starts = [s.start for s in self.tithis]
        self._month_starts = [m.start for m in self.months]

    def day(self, d: date_cls) -> Optional[_Day]:
        return self._day_by_date.get(d)

    def day_after(self, d: _Day) -> Optional[_Day]:
        return self.day(d.date + timedelta(days=1))

    def day_before(self, d: _Day) -> Optional[_Day]:
        return self.day(d.date - timedelta(days=1))

    def tithi_at(self, jd: float) -> _Segment:
        i = bisect.bisect_right(self._tithi_starts, jd) - 1
        return self.tithis[max(i, 0)]

    def month_of(self, jd: float) -> Optional[_Month]:
        i = bisect.bisect_right(self._month_starts, jd) - 1
        if i < 0 or i >= len(self.months):
            return None
        m = self.months[i]
        return m if m.start <= jd < m.end else None

    def sun_sign(self, jd: float) -> int:
        return int(_sun_moon_sid(jd)[0] // 30) + 1

    def candidates(self, start: float, end: float) -> List[_Day]:
        """Days whose Vedic day (sunrise to next sunrise) overlaps [start, end]."""
        return [d for d in self.days if d.next_sunrise > start and d.sunrise < end]

    def nakshatra_spans(self, index: int, lo: float, hi: float) -> List[_Segment]:
        return [
            s
            for s in self.nakshatras
            if s.index == index and s.end > lo and s.start < hi
        ]


def _jd_local_midnight(d: date_cls, tz: pytz.BaseTzInfo) -> float:
    utc = tz.localize(datetime(d.year, d.month, d.day)).astimezone(pytz.utc)
    return swe.julday(
        utc.year, utc.month, utc.day, utc.hour + utc.minute / 60 + utc.second / 3600
    )


def _build_days(
    first: date_cls, last: date_cls, lat: float, lon: float, tz
) -> List[_Day]:
    geopos = (lon, lat, 0)
    out = []
    d = first
    while d <= last:
        jd0 = _jd_local_midnight(d, tz)
        sunrise = _rise_trans(jd0, swe.SUN, geopos, swe.CALC_RISE)
        sunset = _rise_trans(jd0, swe.SUN, geopos, swe.CALC_SET)
        if sunrise is None or sunrise > jd0 + 1:
            sunrise = jd0 + 0.25  # polar fallback: 06:00 local
        if sunset is None or sunset < sunrise or sunset > sunrise + 1:
            sunset = (
                _rise_trans(sunrise, swe.SUN, geopos, swe.CALC_SET) or sunrise + 0.5
            )
        nxt = _rise_trans(sunset, swe.SUN, geopos, swe.CALC_RISE)
        if nxt is None or nxt > sunrise + 1.5:
            nxt = sunrise + 1.0
        moonrise = _rise_trans(jd0, swe.MOON, geopos, swe.CALC_RISE)
        if moonrise is not None and moonrise > jd0 + 1:
            moonrise = None
        out.append(_Day(d, sunrise, sunset, nxt, moonrise))
        d += timedelta(days=1)
    return out


def _scan_segments(jd_lo: float, jd_hi: float, kind: str) -> List[_Segment]:
    """Consecutive tithi ("tithi") or nakshatra ("moon") segments covering
    [jd_lo, jd_hi]. Each segment carries its true start and end instants."""
    span = 12.0 if kind == "tithi" else NAK_SPAN
    count = 30 if kind == "tithi" else 27
    s, m = _sun_moon_sid(jd_lo)
    angle = (m - s) % 360 if kind == "tithi" else m
    idx = int(angle // span)
    start = _segment_start(jd_lo, idx * span, kind, max_back=2.0)
    out: List[_Segment] = []
    cursor = jd_lo
    while start < jd_hi:
        end = _find_angle_time(cursor, ((idx + 1) * span) % 360, kind, max_days=2.0)
        if end is None or end <= start:
            break
        out.append(_Segment(idx + 1 if kind == "tithi" else idx, start, end))
        cursor = end + 1e-5
        start = end
        idx = (idx + 1) % count
    return out


def _scan_ingresses(days: List[_Day]) -> List[Tuple[int, float]]:
    out = []
    prev_jd = days[0].sunrise - 1.0
    prev_sign = int(_sun_moon_sid(prev_jd)[0] // 30)
    for d in days:
        jd = d.sunrise
        sign = int(_sun_moon_sid(jd)[0] // 30)
        if sign != prev_sign:
            when = _find_angle_time(prev_jd, sign * 30.0, "sun", max_days=1.5)
            if when is not None:
                out.append((sign + 1, when))
        prev_sign, prev_jd = sign, jd
    return out


def _build_months(tithis: List[_Segment]) -> List[_Month]:
    new_moons = [s.end for s in tithis if s.index == 30]
    months = []
    for a, b in zip(new_moons, new_moons[1:]):
        sign_start = int(_sun_moon_sid(a + 1e-4)[0] // 30) + 1
        sign_end = int(_sun_moon_sid(b - 1e-4)[0] // 30) + 1
        if sign_start == sign_end:
            months.append(_Month(a, b, sign_end % 12 + 1, True))
        else:
            months.append(_Month(a, b, sign_end, False))
    for prev, cur in zip(months, months[1:]):
        cur.after_adhika = prev.adhika and prev.amanta == cur.amanta
    return months


@lru_cache(maxsize=64)
def _sky(year: int, lat: float, lon: float, tz_name: str) -> _Sky:
    tz = pytz.timezone(tz_name)
    first = date_cls(year - 1, 12, 20)
    last = date_cls(year + 1, 1, 12)
    with sidereal_context("lahiri"):
        days = _build_days(first, last, lat, lon, tz)
        jd_lo = days[0].sunrise - 35.0  # a full month back so month naming is anchored
        jd_hi = days[-1].next_sunrise + 2.0
        tithis = _scan_segments(jd_lo, jd_hi, "tithi")
        nakshatras = _scan_segments(days[0].sunrise - 2.0, jd_hi, "moon")
        months = _build_months(tithis)
        ingresses = _scan_ingresses(days)
    return _Sky(tz, days, tithis, nakshatras, months, ingresses)


# ---------------------------------------------------------------------------
# Day selection. Every picker returns the observed civil day plus the local
# window (jd pair) in which the puja falls, or None for a plain udaya rule.
# ---------------------------------------------------------------------------

Window = Tuple[float, float]
Pick = Tuple[_Day, Optional[Window]]


def _clip(window: Optional[Window], seg: _Segment) -> Window:
    if window is None:
        return seg.start, seg.start
    return max(window[0], seg.start), min(window[1], seg.end)


def _udaya_day(sky: _Sky, seg: _Segment, prefer: str = "first") -> Optional[_Day]:
    cands = sky.candidates(seg.start, seg.end)
    hits = [d for d in cands if seg.start <= d.sunrise < seg.end]
    if hits:
        return hits[0] if prefer == "first" else hits[-1]
    return cands[0] if cands else None  # kshaya tithi: the day it starts and ends in


def _kala_pick(
    sky: _Sky,
    seg: _Segment,
    kala: str,
    prefer: str = "first",
    mode: str = "overlap",
    margin: float = 0.0,
) -> Optional[Pick]:
    """The day whose `kala` window the segment covers most (or fully when
    mode == "full"); the udaya day when no window is touched at all. With a
    `margin` (days) a later day only wins by covering that much more."""
    best: Optional[_Day] = None
    best_score = 0.0
    best_window: Optional[Window] = None
    for d in sky.candidates(seg.start, seg.end):
        window = d.kala(kala)
        if window is None:
            continue
        a, b = window
        lo, hi = _clip(window, seg)
        score = max(0.0, hi - lo) / (b - a) if b > a else 0.0
        if mode == "full" and score < 0.999:
            score = 0.0
        tol = margin / (b - a) if b > a else 0.0
        better = score > best_score + max(tol, 1e-9)
        tie = abs(score - best_score) <= 1e-9 and score > 0 and prefer == "last"
        if better or tie:
            best, best_score, best_window = d, score, (lo, hi)
    if best is not None:
        return best, best_window
    d = _udaya_day(sky, seg, prefer)
    return (d, d.kala(kala)) if d else None


def _nishita_pick(sky: _Sky, seg: _Segment, prefer: str = "first") -> Optional[Pick]:
    """The night whose midpoint the tithi covers; udaya day as a fallback."""
    cands = sky.candidates(seg.start, seg.end)
    hits = [d for d in cands if seg.start <= d.midnight < seg.end]
    if hits:
        d: Optional[_Day] = hits[0] if prefer == "first" else hits[-1]
    else:
        d = _udaya_day(sky, seg, prefer)
    return (d, d.kala("nishita")) if d else None


def _ekadashi_pick(sky: _Sky, seg: _Segment, dwadashi: _Segment) -> Optional[Pick]:
    """Smarta Ekadashi day plus its parana window on the following morning."""
    cands = sky.candidates(seg.start, seg.end)
    if not cands:
        return None
    hits = [d for d in cands if seg.start <= d.sunrise < seg.end]
    d = hits[-1] if hits else cands[0]
    nxt = sky.day_after(d)
    if nxt is not None and not (dwadashi.start <= nxt.sunrise < dwadashi.end):
        # Dwadashi kshaya: parana could not fall in Dwadashi, so fast a day earlier.
        prev = sky.day_before(d)
        if prev is not None and seg.start < d.sunrise:
            d, nxt = prev, d
    if nxt is None:
        return d, None
    pratah = nxt.kala("pratah")
    assert pratah is not None
    if dwadashi.end <= nxt.sunrise:
        return d, pratah
    hari_vasara_end = dwadashi.start + (dwadashi.end - dwadashi.start) / 4
    start = max(nxt.sunrise, hari_vasara_end)
    end = min(dwadashi.end, pratah[1])
    if end <= start:
        end = min(dwadashi.end, nxt.sunset)
    if end <= start:
        start, end = pratah
    return d, (start, end)


def _janmashtami_pick(sky: _Sky, seg: _Segment) -> Optional[Pick]:
    cands = sky.candidates(seg.start, seg.end)
    if not cands:
        return None
    rohini = sky.nakshatra_spans(_ROHINI, seg.start - 2.0, seg.end + 2.0)
    night = [d for d in cands if seg.start <= d.midnight < seg.end]
    jayanti = [d for d in night if any(s.start <= d.midnight < s.end for s in rohini)]
    hits = [d for d in cands if seg.start <= d.sunrise < seg.end]
    if jayanti:
        d = jayanti[0]
    elif hits:
        d = next((h for h in hits if h in night), hits[-1])
    elif night:
        d = night[0]
    else:
        d = cands[0]
    return d, d.kala("nishita")


def _bhadra_end(seg: _Segment) -> float:
    """Vishti karana (Bhadra) is the first half of a Shukla Purnima; it ends
    when the Moon is 174 degrees ahead of the Sun."""
    return (
        _find_angle_time(seg.start, 174.0, "tithi", max_days=1.0)
        or (seg.start + seg.end) / 2
    )


def _holika_pick(sky: _Sky, seg: _Segment) -> Optional[Pick]:
    cands = sky.candidates(seg.start, seg.end)
    if not cands:
        return None
    bhadra_end = _bhadra_end(seg)
    bhadra = bhadra_end - seg.start
    puccha = (seg.start + bhadra * 19.5 / 30, seg.start + bhadra * 22.5 / 30)
    evenings = []
    for d in cands:
        lo, hi = _clip(d.kala("pradosh"), seg)
        if hi > lo:
            evenings.append((d, lo, hi))
    if not evenings:
        d = _udaya_day(sky, seg, "last")
        return (d, d.kala("pradosh")) if d else None
    # 1. pradosh with Purnima once Bhadra is over (the later evening wins)
    for d, lo, hi in reversed(evenings):
        lo = max(lo, bhadra_end)
        if hi > lo:
            return d, (lo, hi)
    d1 = evenings[0][0]
    # 2. Bhadra ends before Hindu midnight
    if bhadra_end < d1.midnight:
        return d1, (bhadra_end, d1.midnight)
    # 3. Bhadra Puccha between pradosh and midnight
    lo, hi = max(puccha[0], d1.sunset), min(puccha[1], d1.midnight)
    if hi > lo:
        return d1, (lo, hi)
    # 4. next evening (Pratipada) when Purnima lasts to within two muhurtas of sunset
    d2 = sky.day_after(d1)
    if d2 is not None and seg.end >= d2.sunset - 2 * _MUHURTA:
        return d2, d2.kala("pradosh")
    # 5. pradosh with Bhadra
    return d1, d1.kala("pradosh")


def _rakhi_pick(sky: _Sky, seg: _Segment) -> Optional[Pick]:
    cands = sky.candidates(seg.start, seg.end)
    if not cands:
        return None
    bhadra_end = _bhadra_end(seg)
    for kala in ("aparahna", "pradosh"):
        for d in cands:
            lo, hi = _clip(d.kala(kala), seg)
            lo = max(lo, bhadra_end)
            if hi > lo:
                return d, (lo, hi)
    d1 = cands[0]
    d2 = sky.day_after(d1)
    if (
        d2 is not None
        and seg.start <= d2.sunrise
        and seg.end >= d2.sunrise + 3 * _MUHURTA
    ):
        return d2, (max(d2.sunrise, bhadra_end), seg.end)
    return d1, (max(bhadra_end, seg.start), min(seg.end, d1.next_sunrise))


_WINDOW_LABEL = {"holika": "muhurta", "rakhi": "muhurta", "janmashtami": "nishita"}


def _pick(sky: _Sky, seg: _Segment, rule: TithiRule) -> Optional[Pick]:
    kala = rule.kala
    if kala == "udaya":
        d = _udaya_day(sky, seg, rule.prefer)
        return (d, None) if d else None
    if kala == "nishita":
        return _nishita_pick(sky, seg, rule.prefer)
    if kala == "janmashtami":
        return _janmashtami_pick(sky, seg)
    if kala == "holika":
        return _holika_pick(sky, seg)
    if kala == "rakhi":
        return _rakhi_pick(sky, seg)
    return _kala_pick(sky, seg, kala, rule.prefer, rule.mode, rule.margin)


def _lunar_label(sky: _Sky, seg: _Segment) -> Optional[Tuple[str, str, int, _Month]]:
    """(purnimanta month name, paksha, tithi within paksha, month) for a tithi segment."""
    month = sky.month_of(seg.start)
    if month is None:
        return None
    paksha = SHUKLA if seg.index <= 15 else KRISHNA
    tithi = seg.index if seg.index <= 15 else seg.index - 15
    if month.adhika or paksha == SHUKLA:
        name_idx = month.amanta
    else:
        name_idx = month.amanta % 12 + 1
    return CHANDRA_MASA[name_idx - 1], paksha, tithi, month


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def _iso(sky: _Sky, jd: Optional[float]) -> Optional[str]:
    if jd is None:
        return None
    dt = _jd_to_local(jd, sky.tz)
    return dt.isoformat() if dt else None


def _event(
    sky: _Sky,
    day: _Day,
    fid: str,
    *,
    kind: str,
    rule: Dict[str, Any],
    major: bool = False,
    series: Optional[str] = None,
    span: Optional[Window] = None,
    window: Optional[Window] = None,
    kala: Optional[str] = None,
    parana: Optional[Window] = None,
    instant: Optional[float] = None,
) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "date": day.date.isoformat(),
        "id": fid,
        "name": FESTIVAL_NAMES_EN.get(fid, fid),
        "kind": kind,
        "major": major,
        "series": series,
        "rule": rule,
        "sunrise": _iso(sky, day.sunrise),
        "sunset": _iso(sky, day.sunset),
    }
    if span is not None:
        out["starts"] = _iso(sky, span[0])
        out["ends"] = _iso(sky, span[1])
    if window is not None and kala is not None and window[1] > window[0]:
        out["muhurta"] = {
            "kala": _WINDOW_LABEL.get(kala, kala),
            "start": _iso(sky, window[0]),
            "end": _iso(sky, window[1]),
        }
    if parana is not None:
        out["parana"] = {"start": _iso(sky, parana[0]), "end": _iso(sky, parana[1])}
    if instant is not None:
        out["instant"] = _iso(sky, instant)
    return out


def _tithi_rule_dict(
    month: str, paksha: str, tithi: int, adhika: bool
) -> Dict[str, Any]:
    if tithi == 15:
        tithi_name = "Purnima" if paksha == SHUKLA else "Amavasya"
    else:
        tithi_name = TITHI_BASE[tithi - 1]
    return {
        "type": "tithi",
        "month": month,
        "adhika": adhika,
        "paksha": paksha,
        "tithi": tithi_name,
    }


def _weekday_on_or_before(d: date_cls, iso_weekday: int) -> date_cls:
    return d - timedelta(days=(d.isoweekday() - iso_weekday) % 7)


def compute_festivals(
    year: int,
    latitude: float,
    longitude: float,
    timezone_name: Optional[str] = None,
) -> Dict[str, Any]:
    if not MIN_YEAR <= year <= MAX_YEAR:
        raise ValueError(f"year must be between {MIN_YEAR} and {MAX_YEAR}")
    if not timezone_name:
        timezone_name = _TF.timezone_at(lat=latitude, lng=longitude) or "UTC"
    sky = _sky(year, round(latitude, 4), round(longitude, 4), timezone_name)
    events: List[Dict[str, Any]] = []
    in_year = lambda d: d is not None and d.date.year == year  # noqa: E731

    rules_by_key: Dict[Tuple[str, str, int], List[TithiRule]] = {}
    for r in TITHI_RULES:
        rules_by_key.setdefault((r.month, r.paksha, r.tithi), []).append(r)

    with sidereal_context("lahiri"):
        for i, seg in enumerate(sky.tithis):
            label = _lunar_label(sky, seg)
            if label is None:
                continue
            month, paksha, tithi, month_obj = label
            adhika = month_obj.adhika
            rule = _tithi_rule_dict(month, paksha, tithi, adhika)
            span = (seg.start, seg.end)

            if tithi == 11 and i + 1 < len(sky.tithis):
                picked = _ekadashi_pick(sky, seg, sky.tithis[i + 1])
                if picked and in_year(picked[0]):
                    key = (
                        ADHIKA_EKADASHI[paksha]
                        if adhika
                        else EKADASHI_NAMES[(month, paksha)]
                    )
                    events.append(
                        _event(
                            sky,
                            picked[0],
                            f"ekadashi_{key}",
                            kind="tithi",
                            rule=rule,
                            major=key in MAJOR_EKADASHIS,
                            series="ekadashi",
                            span=span,
                            parana=picked[1],
                        )
                    )
            if tithi == 15:
                d = _udaya_day(sky, seg)
                if in_year(d):
                    fid = "purnima" if paksha == SHUKLA else "amavasya"
                    events.append(
                        _event(
                            sky, d, fid, kind="tithi", rule=rule, series=fid, span=span
                        )
                    )
                    if fid == "amavasya" and d.date.isoweekday() == 1:
                        events.append(
                            _event(
                                sky,
                                d,
                                "somavati_amavasya",
                                kind="tithi",
                                rule=rule,
                                span=span,
                            )
                        )
            for r in rules_by_key.get((month, paksha, tithi), []):
                if adhika and r.adhika != "first":
                    continue
                if not adhika and r.adhika == "first" and month_obj.after_adhika:
                    continue
                picked = _pick(sky, seg, r)
                if picked and in_year(picked[0]):
                    events.append(
                        _event(
                            sky,
                            picked[0],
                            r.id,
                            kind="tithi",
                            rule=rule,
                            major=r.major,
                            series=r.series,
                            span=span,
                            window=picked[1],
                            kala=r.kala,
                        )
                    )

        for seg in sky.nakshatras:
            for fid, nak_idx, constraint, kala, major in NAKSHATRA_RULES:
                if seg.index != nak_idx:
                    continue
                ok = False
                if constraint.startswith("sun_sign:"):
                    ok = sky.sun_sign(seg.start) == int(constraint.split(":")[1])
                else:
                    _, want_month, want_paksha = constraint.split(":")
                    label = _lunar_label(sky, sky.tithi_at(seg.start))
                    ok = (
                        label is not None
                        and label[0] == want_month
                        and label[1] == want_paksha
                        and not label[3].adhika
                    )
                if not ok:
                    continue
                if kala == "udaya":
                    picked = (_udaya_day(sky, seg), None)
                else:
                    picked = _kala_pick(sky, seg, kala)
                if picked and in_year(picked[0]):
                    rule = {"type": "nakshatra", "nakshatra": NAKSHATRAS[nak_idx]}
                    if constraint.startswith("lunar:"):
                        rule["month"] = constraint.split(":")[1]
                    series = (
                        "pitru_paksha"
                        if fid in ("maha_bharani", "magha_shraddha")
                        else None
                    )
                    events.append(
                        _event(
                            sky,
                            picked[0],
                            fid,
                            kind="nakshatra",
                            rule=rule,
                            major=major,
                            series=series,
                            span=(seg.start, seg.end),
                            window=picked[1],
                            kala=kala,
                        )
                    )

        for sign, jd in sky.ingresses:
            local = _jd_to_local(jd, sky.tz)
            d = sky.day(local.date()) if local else None
            if d is None:
                continue
            if jd > d.sunset and sign in _SANKRANTI_PUNYA_AFTER:
                d = sky.day_after(d) or d
            if not in_year(d):
                continue
            rule = {
                "type": "sankranti",
                "from_sign": RASHI_NAMES[(sign - 2) % 12],
                "to_sign": RASHI_NAMES[sign - 1],
            }
            events.append(
                _event(
                    sky,
                    d,
                    "sankranti",
                    kind="sankranti",
                    rule=rule,
                    major=sign in MAJOR_SANKRANTIS,
                    series="sankranti",
                    instant=jd,
                )
            )
            for extra in SANKRANTI_EXTRAS.get(sign, []):
                events.append(
                    _event(
                        sky,
                        d,
                        extra,
                        kind="sankranti",
                        rule=rule,
                        major=True,
                        instant=jd,
                    )
                )

        events.extend(_eclipses(sky, year))

    # Holi (Dhulandi) is always the day after Holika Dahan; Varalakshmi Vrat the
    # Friday on or before Shravana Purnima (Raksha Bandhan).
    derived = []
    for e in events:
        if e["id"] == "holika_dahan":
            d = sky.day(date_cls.fromisoformat(e["date"]) + timedelta(days=1))
            if in_year(d):
                rule = {"type": "derived", "after": "holika_dahan"}
                derived.append(
                    _event(sky, d, "holi", kind="derived", rule=rule, major=True)
                )
        if e["id"] == "raksha_bandhan":
            d = sky.day(_weekday_on_or_before(date_cls.fromisoformat(e["date"]), 5))
            if in_year(d):
                rule = {"type": "derived", "after": "raksha_bandhan"}
                derived.append(
                    _event(sky, d, "varalakshmi_vrat", kind="derived", rule=rule)
                )
    events.extend(derived)

    events.sort(key=lambda e: (e["date"], not e["major"], e["id"]))
    return {
        "year": year,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone_name,
        },
        "festivals": events,
        "periods": _periods(sky, year, events),
    }


def _eclipses(sky: _Sky, year: int) -> List[Dict[str, Any]]:
    out = []
    jd_lo = _jd_local_midnight(date_cls(year, 1, 1), sky.tz)
    jd_hi = _jd_local_midnight(date_cls(year + 1, 1, 1), sky.tz)
    for fn, fid, types in (
        (
            swe.sol_eclipse_when_glob,
            "surya_grahan",
            (
                (swe.ECL_ANNULAR_TOTAL, "hybrid"),
                (swe.ECL_TOTAL, "total"),
                (swe.ECL_ANNULAR, "annular"),
                (swe.ECL_PARTIAL, "partial"),
            ),
        ),
        (
            swe.lun_eclipse_when,
            "chandra_grahan",
            (
                (swe.ECL_TOTAL, "total"),
                (swe.ECL_PARTIAL, "partial"),
                (swe.ECL_PENUMBRAL, "penumbral"),
            ),
        ),
    ):
        jd = jd_lo - 1
        for _ in range(8):
            try:
                flags, tret = fn(jd, swe.FLG_SWIEPH, 0, False)
            except Exception:
                break
            peak = tret[0]
            if peak >= jd_hi:
                break
            local = _jd_to_local(peak, sky.tz)
            if local is not None and local.year == year:
                day = sky.day(local.date())
                if day is not None:
                    kind = next((name for bit, name in types if flags & bit), "partial")
                    # tret[2]/[3] bound the (umbral) eclipse; lunar penumbral-only
                    # eclipses report those as 0 and carry the span in tret[6]/[7].
                    begin = tret[2] or tret[6]
                    end = tret[3] or tret[7]
                    out.append(
                        _event(
                            sky,
                            day,
                            fid,
                            kind="eclipse",
                            rule={"type": "eclipse", "eclipse": kind},
                            major=kind in ("total", "annular", "hybrid"),
                            span=(begin, end) if begin and end else None,
                            instant=peak,
                        )
                    )
            jd = peak + 5
    return out


def _periods(
    sky: _Sky, year: int, events: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    by_id: Dict[str, List[str]] = {}
    for e in events:
        by_id.setdefault(e["id"], []).append(e["date"])

    def span(pid: str, start_id: str, end_id: str) -> List[Dict[str, Any]]:
        starts, ends = by_id.get(start_id, []), by_id.get(end_id, [])
        out = []
        for s in starts:
            e = next((x for x in ends if x >= s), None)
            if e is None:
                continue
            days = (date_cls.fromisoformat(e) - date_cls.fromisoformat(s)).days + 1
            out.append({"id": pid, "start": s, "end": e, "days": days})
        return out

    periods: List[Dict[str, Any]] = []
    for m in sky.months:
        if not m.adhika:
            continue
        first = next((d for d in sky.days if d.sunrise >= m.start), None)
        last = next((d for d in sky.days if d.sunrise <= m.end < d.next_sunrise), None)
        if first is None or last is None:
            continue
        if first.date.year != year and last.date.year != year:
            continue
        periods.append(
            {
                "id": "adhika_masa",
                "start": first.date.isoformat(),
                "end": last.date.isoformat(),
                "days": (last.date - first.date).days + 1,
                "month": CHANDRA_MASA[m.amanta - 1],
            }
        )
    periods.extend(span("chaitra_navratri", "chaitra_navratri", "rama_navami"))
    periods.extend(span("chaturmas", "ekadashi_devshayani", "ekadashi_devutthana"))
    periods.extend(span("pitru_paksha", "purnima_shraddha", "sarva_pitru_amavasya"))
    periods.extend(span("sharad_navratri", "navratri_begins", "maha_navami"))
    periods.extend(span("durga_puja", "maha_shashthi", "vijayadashami"))
    periods.sort(key=lambda p: p["start"])
    return periods
