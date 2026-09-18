"""Dasha display helpers for the PDF report.

`DASHA_YEARS` is re-exported from `calculator` so PDF code has a single
import for both the canonical 120-year breakdown and the 3-letter display
abbreviations.
"""

from __future__ import annotations

from typing import Dict

from calculator import DASHA_YEARS as _DASHA_YEARS

DASHA_YEARS: Dict[str, int] = _DASHA_YEARS

_LORD_ABBR: Dict[str, str] = {
    "Sun": "SUN",
    "Moon": "MON",
    "Mars": "MAR",
    "Mercury": "MER",
    "Jupiter": "JUP",
    "Venus": "VEN",
    "Saturn": "SAT",
    "Rahu": "RAH",
    "Ketu": "KET",
}


def lord_abbr(lord: str) -> str:
    """3-letter uppercase display label, fallback to the first 3 chars."""
    return _LORD_ABBR.get(lord, lord[:3].upper())
