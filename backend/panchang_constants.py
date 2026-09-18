"""Extended constants for Drik-style Panchang."""

# 60 Samvatsara cycle (Prabhavadi)
SAMVATSARAS = [
    "Prabhava",
    "Vibhava",
    "Shukla",
    "Pramoda",
    "Prajapati",
    "Angira",
    "Srimukha",
    "Bhava",
    "Yuva",
    "Dhata",
    "Ishvara",
    "Bahudhanya",
    "Pramathi",
    "Vikrama",
    "Vrisha",
    "Chitrabhanu",
    "Subhanu",
    "Tarana",
    "Parthiva",
    "Vyaya",
    "Sarvajit",
    "Sarvadhari",
    "Virodhi",
    "Vikriti",
    "Khara",
    "Nandana",
    "Vijaya",
    "Jaya",
    "Manmatha",
    "Durmukha",
    "Hevilambi",
    "Vilambi",
    "Vikari",
    "Sharvari",
    "Plava",
    "Shubhakrit",
    "Shobhakrit",
    "Krodhi",
    "Vishvavasu",
    "Parabhava",
    "Plavanga",
    "Keelaka",
    "Saumya",
    "Sadharana",
    "Virodhikrit",
    "Paridhavi",
    "Pramadi",
    "Ananda",
    "Rakshasa",
    "Nala",
    "Pingala",
    "Kalayukta",
    "Siddharthi",
    "Raudra",
    "Durmati",
    "Dundubhi",
    "Rudhirodgari",
    "Raktakshi",
    "Krodhana",
    "Akshaya",
]

# Lunar months (Chaitradi) - 12 names
CHANDRA_MASA = [
    "Chaitra",
    "Vaishakha",
    "Jyeshtha",
    "Ashadha",
    "Shravana",
    "Bhadrapada",
    "Ashwin",
    "Kartika",
    "Margashirsha",
    "Pausha",
    "Magha",
    "Phalguna",
]

# Solar sidereal months (Nirayana) - month begins when Sun enters each sign (Mesha first)
NIRAYANA_MONTHS = [
    "Vaishakha",
    "Jyeshtha",
    "Ashadha",
    "Shravana",
    "Bhadrapada",
    "Ashwin",
    "Kartika",
    "Margashirsha",
    "Pausha",
    "Magha",
    "Phalguna",
    "Chaitra",
]

# National (Shaka) civil calendar months and day counts (day 1 of Chaitra = Mar 22 / Mar 21 in leap year)
SHAKA_MONTHS = [
    ("Chaitra", 30),  # 31 in leap year
    ("Vaishakha", 31),
    ("Jyeshtha", 31),
    ("Ashadha", 31),
    ("Shravana", 31),
    ("Bhadrapada", 31),
    ("Ashwin", 30),
    ("Kartika", 30),
    ("Margashirsha", 30),
    ("Pausha", 30),
    ("Magha", 30),
    ("Phalguna", 30),
]

# Ritu (6 seasons). Sun-sign indexed. 2 signs per ritu.
# Sidereal (Vedic) Ritu: based on sidereal sign of Sun.
#   Makara, Kumbha -> Shishir, Meena, Mesha -> Vasant, Vrishabha, Mithuna -> Grishma,
#   Karka, Simha -> Varsha, Kanya, Tula -> Sharad, Vrishchika, Dhanu -> Hemant
SIGN_TO_VEDIC_RITU = {
    10: "Shishir",
    11: "Shishir",
    12: "Vasant",
    1: "Vasant",
    2: "Grishma",
    3: "Grishma",
    4: "Varsha",
    5: "Varsha",
    6: "Sharad",
    7: "Sharad",
    8: "Hemant",
    9: "Hemant",
}
# Drik (tropical) Ritu: based on tropical sign of Sun.
SIGN_TO_DRIK_RITU = {
    10: "Shishir (Winter)",
    11: "Shishir (Winter)",
    12: "Vasant (Spring)",
    1: "Vasant (Spring)",
    2: "Grishma (Summer)",
    3: "Grishma (Summer)",
    4: "Varsha (Monsoon)",
    5: "Varsha (Monsoon)",
    6: "Sharad (Autumn)",
    7: "Sharad (Autumn)",
    8: "Hemant (Pre-Winter)",
    9: "Hemant (Pre-Winter)",
}

# Disha Shool (direction to avoid travel), by isoweekday (1=Mon..7=Sun)
DISHA_SHOOL = {
    1: "East",
    2: "North",
    3: "North",
    4: "South",
    5: "West",
    6: "East",
    7: "West",
}

# Rahu Vasa (direction where Rahu resides), by isoweekday
RAHU_VASA = {
    1: "North-West",
    2: "North",
    3: "South-East",
    4: "South",
    5: "East",
    6: "West",
    7: "South-West",
}

# Chandra Vasa (Moon direction), by Rashi (1-12)
CHANDRA_VASA = {
    1: "West",  # Mesha
    2: "South",  # Vrishabha
    3: "West",  # Mithuna
    4: "North",  # Karka
    5: "East",  # Simha
    6: "West",  # Kanya
    7: "South",  # Tula
    8: "East",  # Vrishchika
    9: "North",  # Dhanu
    10: "East",  # Makara
    11: "West",  # Kumbha
    12: "South",  # Meena
}

# Dur Muhurtam: muhurta index (1..15) of the day, keyed by isoweekday (1=Mon..7=Sun).
# Verified against drikpanchang.com daily panchang (New Delhi, Jun 2026). Note that
# Wednesday's Dur Muhurtam is the 8th muhurta, which is the same slot as Abhijit -
# by classical rule Abhijit is therefore unavailable on Wednesday (handled in
# advanced_panchang._auspicious_times via ABHIJIT_MUHURTA_INDEX).
DUR_MUHURTA = {
    1: [9, 12],  # Mon
    2: [4],  # Tue
    3: [8],  # Wed (coincides with Abhijit -> Abhijit suppressed)
    4: [6],  # Thu
    5: [4],  # Fri
    6: [1, 2],  # Sat
    7: [14],  # Sun
}

# Abhijit is always the middle (8th) of the 15 daytime muhurtas. When a weekday's
# Dur Muhurtam falls on this same index, Abhijit is not observed (e.g. Wednesday).
ABHIJIT_MUHURTA_INDEX = 8

# Tarabalam - count inclusively from the native's janma nakshatra to the transit
# nakshatra and reduce to a position in the 9-tara cycle (it repeats three times
# over the 27 nakshatras). DrikPanchang counts Sampat, Kshema, Sadhaka, Mitra and
# Ati Mitra as good Tarabalam; Janma, Vipat, Pratyari and Vadha are not.
TARA_NAMES = (
    "Janma",
    "Sampat",
    "Vipat",
    "Kshema",
    "Pratyari",
    "Sadhaka",
    "Vadha",
    "Mitra",
    "Ati Mitra",
)
GOOD_TARA_POSITIONS = {2, 4, 6, 8, 9}

# Chandrabalam - good when the transit Moon is in house 1, 3, 6, 7, 10 or 11
# counted from the native's janma rashi. 2, 5, 9 are neutral; 4, 8, 12 are weak
# (8 is Chandrashtama).
GOOD_CHANDRA_HOUSES = {1, 3, 6, 7, 10, 11}

RASHI_NAMES = [
    "Mesha",
    "Vrishabha",
    "Mithuna",
    "Karka",
    "Simha",
    "Kanya",
    "Tula",
    "Vrishchika",
    "Dhanu",
    "Makara",
    "Kumbha",
    "Meena",
]
