"""Extended constants for Drik-style Panchang."""

# 60 Samvatsara cycle (Prabhavadi)
SAMVATSARAS = [
    "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajapati", "Angira",
    "Srimukha", "Bhava", "Yuva", "Dhata", "Ishvara", "Bahudhanya",
    "Pramathi", "Vikrama", "Vrisha", "Chitrabhanu", "Subhanu", "Tarana",
    "Parthiva", "Vyaya", "Sarvajit", "Sarvadhari", "Virodhi", "Vikriti",
    "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukha",
    "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakrit",
    "Shobhakrit", "Krodhi", "Vishvavasu", "Parabhava", "Plavanga", "Keelaka",
    "Saumya", "Sadharana", "Virodhikrit", "Paridhavi", "Pramadi", "Ananda",
    "Rakshasa", "Nala", "Pingala", "Kalayukta", "Siddharthi", "Raudra",
    "Durmati", "Dundubhi", "Rudhirodgari", "Raktakshi", "Krodhana", "Akshaya",
]

# Lunar months (Chaitradi) - 12 names
CHANDRA_MASA = [
    "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashwin", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna",
]

# Solar sidereal months (Nirayana) — month begins when Sun enters each sign (Mesha first)
NIRAYANA_MONTHS = [
    "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashwin",
    "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna", "Chaitra",
]

# National (Shaka) civil calendar months and day counts (day 1 of Chaitra = Mar 22 / Mar 21 in leap year)
SHAKA_MONTHS = [
    ("Chaitra", 30),       # 31 in leap year
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
    10: "Shishir", 11: "Shishir",
    12: "Vasant", 1: "Vasant",
    2: "Grishma", 3: "Grishma",
    4: "Varsha", 5: "Varsha",
    6: "Sharad", 7: "Sharad",
    8: "Hemant", 9: "Hemant",
}
# Drik (tropical) Ritu: based on tropical sign of Sun.
SIGN_TO_DRIK_RITU = {
    10: "Shishir (Winter)", 11: "Shishir (Winter)",
    12: "Vasant (Spring)", 1: "Vasant (Spring)",
    2: "Grishma (Summer)", 3: "Grishma (Summer)",
    4: "Varsha (Monsoon)", 5: "Varsha (Monsoon)",
    6: "Sharad (Autumn)", 7: "Sharad (Autumn)",
    8: "Hemant (Pre-Winter)", 9: "Hemant (Pre-Winter)",
}

# Disha Shool (direction to avoid travel), by isoweekday (1=Mon..7=Sun)
DISHA_SHOOL = {
    1: "East", 2: "North", 3: "North", 4: "South",
    5: "West", 6: "East", 7: "West",
}

# Rahu Vasa (direction where Rahu resides), by isoweekday
RAHU_VASA = {
    1: "North-West", 2: "North", 3: "South-East", 4: "South",
    5: "East", 6: "West", 7: "South-West",
}

# Chandra Vasa (Moon direction), by Rashi (1-12)
CHANDRA_VASA = {
    1: "West",          # Mesha
    2: "South",         # Vrishabha
    3: "West",          # Mithuna
    4: "North",         # Karka
    5: "East",          # Simha
    6: "West",          # Kanya
    7: "South",         # Tula
    8: "East",          # Vrishchika
    9: "North",         # Dhanu
    10: "East",         # Makara
    11: "West",         # Kumbha
    12: "South",        # Meena
}

# Dur Muhurtam: muhurta index (1..15) of the day, keyed by isoweekday (1=Mon..7=Sun)
DUR_MUHURTA = {
    1: [9, 12],   # Mon
    2: [4, 9],    # Tue
    3: [5],       # Wed
    4: [8],       # Thu
    5: [4, 9],    # Fri
    6: [1, 11],   # Sat
    7: [14],      # Sun
}

# Tarabalam — when current nakshatra is (N_birth + k) % 27 + 1, k of {0,1,2,..26}:
# Good (auspicious) stars are: Janma (1), Sampat (2), Kshema (4), Sadhaka (6), Mitra (8), Param Mitra (9)
# Bad stars are: Vipat (3), Pratyak (5), Naidhana (7)
# In 27-nakshatra cycle, the series 1..9 repeats three times.
GOOD_TARA_OFFSETS = {0, 1, 3, 5, 7, 8, 9, 10, 12, 14, 16, 17, 18, 19, 21, 23, 25, 26}
# (offsets 0..26 from birth nakshatra where tarabalam is favorable, i.e. position 1,2,4,6,8,9 within each cycle of 9)

# Chandrabalam — good when current Moon sign is 1st, 3rd, 6th, 7th, 10th, 11th from native's rashi
GOOD_CHANDRA_OFFSETS = {0, 2, 5, 6, 9, 10}  # (sign - birth_sign) mod 12

RASHI_NAMES = [
    "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
    "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
]
