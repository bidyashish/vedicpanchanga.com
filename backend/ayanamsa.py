"""Ayanamsa options and centralized Swiss Ephemeris sidereal-state handling.

swisseph keeps the sidereal mode (swe.set_sid_mode) in process-global C state.
FastAPI runs the CPU-bound endpoints in a threadpool, so two in-flight
requests can interleave swe calls - a /calculate with Raman could flip the
mode mid-way through a /get-panchang on another thread, silently shifting
its longitudes by over a degree.

Every computation that depends on the sidereal mode must therefore run
inside `sidereal_context(...)`, which (a) serializes swisseph access with a
re-entrant lock and (b) sets the requested mode on entry, so no call site
ever inherits a stale mode from a previous request. Nesting is safe on the
same thread (RLock): e.g. compute_detailed_panchang -> compute_tamil_calendar.
"""

import threading
from contextlib import contextmanager

import swisseph as swe

# Keyed by a user-friendly ID. Each entry: (swe constant, display label).
# Use None for 'sayan' (tropical - no sidereal shift applied).
AYANAMSA_OPTIONS = {
    "lahiri": (swe.SIDM_LAHIRI, "N.C. Lahiri (Chitrapaksha)"),
    "kp_new": (swe.SIDM_KRISHNAMURTI_VP291, "K.P. New (Krishnamurti VP291)"),
    "kp_old": (swe.SIDM_KRISHNAMURTI, "K.P. Old (Krishnamurti)"),
    "raman": (swe.SIDM_RAMAN, "B.V. Raman"),
    "kp_khullar": (swe.SIDM_TRUE_CITRA, "K.P. Khullar (True Chitrapaksha)"),
    "sayan": (None, "Sayana (Tropical)"),
    "manoj": (swe.SIDM_LAHIRI_ICRC, "Manoj (Lahiri ICRC)"),
}

_SWE_LOCK = threading.RLock()


@contextmanager
def sidereal_context(ayanamsa_id: str = "lahiri"):
    """Serialize swisseph access and pin the sidereal mode for the block.

    Yields (sidereal_flag, label). `sidereal_flag` is swe.FLG_SIDEREAL, or 0
    for 'sayan' (tropical) - callers must OR it into their calc flags rather
    than hardcoding FLG_SIDEREAL. Unknown IDs fall back to Lahiri.
    """
    entry = AYANAMSA_OPTIONS.get(ayanamsa_id) or AYANAMSA_OPTIONS["lahiri"]
    swe_const, label = entry
    with _SWE_LOCK:
        if swe_const is None:
            yield 0, label
        else:
            swe.set_sid_mode(swe_const)
            yield swe.FLG_SIDEREAL, label
