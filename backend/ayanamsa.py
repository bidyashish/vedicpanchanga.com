"""Ayanamsa options supported by the app."""

import swisseph as swe

# Keyed by a user-friendly ID. Each entry: (swe constant, display label, notes)
# Use None for 'sayan' (tropical — no sidereal shift applied).
AYANAMSA_OPTIONS = {
    "lahiri": (swe.SIDM_LAHIRI, "N.C. Lahiri (Chitrapaksha)"),
    "kp_new": (swe.SIDM_KRISHNAMURTI_VP291, "K.P. New (Krishnamurti VP291)"),
    "kp_old": (swe.SIDM_KRISHNAMURTI, "K.P. Old (Krishnamurti)"),
    "raman": (swe.SIDM_RAMAN, "B.V. Raman"),
    "kp_khullar": (swe.SIDM_TRUE_CITRA, "K.P. Khullar (True Chitrapaksha)"),
    "sayan": (None, "Sāyana (Tropical)"),
    "manoj": (swe.SIDM_LAHIRI_ICRC, "Manoj (Lahiri ICRC)"),
}


def set_ayanamsa(ayanamsa_id: str):
    """Configure Swiss Ephemeris for a chosen ayanamsa.

    Returns (flags_sidereal_bit, ayanamsa_label). For 'sayan' (tropical) the
    sidereal bit is 0, i.e., callers should use plain tropical longitudes.
    """
    entry = AYANAMSA_OPTIONS.get(ayanamsa_id) or AYANAMSA_OPTIONS["lahiri"]
    swe_const, label = entry
    if swe_const is None:
        # Tropical: no sidereal mode; callers will omit FLG_SIDEREAL
        return 0, label
    swe.set_sid_mode(swe_const)
    return swe.FLG_SIDEREAL, label
