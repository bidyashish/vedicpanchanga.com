"""Constants / lookup tables for the Panchang."""

# Tithi names (30 half-moons through a lunar month)
# 1-14 Shukla (Pratipada..Chaturdashi), 15 Purnima
# 16-29 Krishna (Pratipada..Chaturdashi), 30 Amavasya
TITHI_BASE = [
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
]


def tithi_name(index: int) -> str:
    """index 1-30."""
    if index == 15:
        return "Purnima"
    if index == 30:
        return "Amavasya"
    if 1 <= index <= 14:
        return f"Shukla {TITHI_BASE[index - 1]}"
    if 16 <= index <= 29:
        return f"Krishna {TITHI_BASE[index - 16]}"
    return "Unknown"


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

YOGAS = [
    "Vishkumbha",
    "Priti",
    "Ayushman",
    "Saubhagya",
    "Shobhana",
    "Atiganda",
    "Sukarma",
    "Dhriti",
    "Shula",
    "Ganda",
    "Vriddhi",
    "Dhruva",
    "Vyaghata",
    "Harshana",
    "Vajra",
    "Siddhi",
    "Vyatipata",
    "Variyana",
    "Parigha",
    "Shiva",
    "Siddha",
    "Sadhya",
    "Shubha",
    "Shukla",
    "Brahma",
    "Indra",
    "Vaidhriti",
]

# Karanas: 60 half-tithis in a lunar month.
# half-index 0: Kimstughna (fixed)
# half-indices 1-56: cycle of 7 movable karanas repeated 8 times
# half-indices 57, 58, 59: Shakuni, Chatushpada, Naga (fixed)
MOVABLE_KARANAS = [
    "Bava",
    "Balava",
    "Kaulava",
    "Taitila",
    "Gara",
    "Vanija",
    "Vishti",
]


def karana_name(half_index: int) -> str:
    """half_index: 0..59 where each tithi has two halves."""
    if half_index == 0:
        return "Kimstughna"
    if 1 <= half_index <= 56:
        return MOVABLE_KARANAS[(half_index - 1) % 7]
    if half_index == 57:
        return "Shakuni"
    if half_index == 58:
        return "Chatushpada"
    if half_index == 59:
        return "Naga"
    return "Unknown"


# Vara (weekday). Python isoweekday: Mon=1..Sun=7
VARA_NAMES = {
    1: "Somavara",  # Monday
    2: "Mangalavara",  # Tuesday
    3: "Budhavara",  # Wednesday
    4: "Guruvara",  # Thursday
    5: "Shukravara",  # Friday
    6: "Shanivara",  # Saturday
    7: "Ravivara",  # Sunday
}

VARA_ENGLISH = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
}

# Rahu Kaal / Yamaganda / Gulika lookup (1-indexed segment out of 8)
# Keys are isoweekday (1=Mon..7=Sun)
RAHU_KAAL_SEGMENT = {1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3, 7: 8}
YAMAGANDA_SEGMENT = {1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6, 7: 5}
GULIKA_SEGMENT = {1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1, 7: 7}

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
