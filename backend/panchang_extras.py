"""Panchang yoga detectors verified against drikpanchang. Other classical
sections (Mantri Mandala, Agnivāsa, Śivavāsa, Kumbha Cakra, Homahuti) are
intentionally omitted — they need authoritative source tables we don't
have, and printing a wrong value is worse than printing none."""

from __future__ import annotations

from typing import Dict, Optional


GANDA_MULA_NAKSHATRAS = {"Ashwini", "Ashlesha", "Magha", "Jyeshtha", "Mula", "Revati"}


def detect_ganda_mula(
    current_nak_name: str, ends_at: Optional[str]
) -> Optional[Dict[str, str]]:
    if current_nak_name in GANDA_MULA_NAKSHATRAS:
        return {"nakshatra": current_nak_name, "ends_at": ends_at or ""}
    return None


RAVI_YOGA_OFFSETS = {4, 6, 9, 10, 13, 20}


def detect_ravi_yoga(
    moon_nak_index_1based: int,
    sun_nak_index_1based: int,
    sunrise_iso: str,
    nak_ends_at: Optional[str],
) -> Optional[Dict[str, str]]:
    if not (1 <= moon_nak_index_1based <= 27 and 1 <= sun_nak_index_1based <= 27):
        return None
    offset = ((moon_nak_index_1based - sun_nak_index_1based) % 27) + 1
    if offset not in RAVI_YOGA_OFFSETS:
        return None
    return {"start": sunrise_iso, "end": nak_ends_at or sunrise_iso}
