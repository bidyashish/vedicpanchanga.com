"""Unit tests for `panchang_extras` (Ganda Mūla, Ravi Yoga).

Spot-checked against drikpanchang for Knk's birth date (26 Apr 2026 New
Delhi): Moon in Magha → Ganda Mūla active 05:45 → 20:27; Sun-Moon
nakshatra offset of 13 → Ravi Yoga across the same window.
"""

from __future__ import annotations

import pytest

from panchang_extras import (
    GANDA_MULA_NAKSHATRAS,
    RAVI_YOGA_OFFSETS,
    detect_ganda_mula,
    detect_ravi_yoga,
)


# ── Ganda Mūla ───────────────────────────────────────────────────────────
@pytest.mark.parametrize("nak", sorted(GANDA_MULA_NAKSHATRAS))
def test_each_ganda_mula_nakshatra_detected(nak):
    out = detect_ganda_mula(nak, ends_at="2026-04-26T20:27:21+05:30")
    assert out is not None
    assert out["nakshatra"] == nak
    assert out["ends_at"].startswith("2026-04-26T")


def test_non_ganda_mula_returns_none():
    assert detect_ganda_mula("Rohini", ends_at="2026-04-21T08:00:00+05:30") is None


def test_ganda_mula_handles_missing_end():
    out = detect_ganda_mula("Mula", ends_at=None)
    assert out is not None and out["ends_at"] == ""


# ── Ravi Yoga ────────────────────────────────────────────────────────────
@pytest.mark.parametrize("offset", sorted(RAVI_YOGA_OFFSETS))
def test_ravi_yoga_at_each_qualifying_offset(offset):
    # Moon at offset N from Sun (1-indexed) → Sun at nak X, Moon at nak X+offset-1.
    out = detect_ravi_yoga(
        moon_nak_index_1based=offset,
        sun_nak_index_1based=1,
        sunrise_iso="2026-04-26T05:44:54+05:30",
        nak_ends_at="2026-04-26T20:27:21+05:30",
    )
    assert out is not None
    assert out["start"].startswith("2026-04-26T05:44")
    assert out["end"].startswith("2026-04-26T20:27")


def test_ravi_yoga_inactive_at_non_qualifying_offset():
    # Offset of 2 (3rd nakshatra) is not in {4,6,9,10,13,20}.
    out = detect_ravi_yoga(
        moon_nak_index_1based=3, sun_nak_index_1based=1,
        sunrise_iso="2026-04-26T05:44:54+05:30",
        nak_ends_at="2026-04-26T20:27:21+05:30",
    )
    assert out is None


def test_ravi_yoga_offset_wraps_through_27():
    # Sun at nak 25, Moon at nak 8 → offset = (8 - 25) % 27 + 1 = 11. Not
    # in the set, so no yoga.
    assert detect_ravi_yoga(8, 25, "x", "y") is None
    # Sun at nak 26, Moon at nak 11 → offset = (11 - 26) % 27 + 1 = 13 → yes.
    out = detect_ravi_yoga(11, 26, "sunrise", "nak_end")
    assert out == {"start": "sunrise", "end": "nak_end"}


def test_ravi_yoga_rejects_out_of_range_indices():
    assert detect_ravi_yoga(0, 13, "x", "y") is None
    assert detect_ravi_yoga(13, 28, "x", "y") is None
