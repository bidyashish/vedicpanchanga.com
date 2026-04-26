"""Unit tests for `kalsarpa.analyse_kalsarpa`."""

from __future__ import annotations

from kalsarpa import KALSARPA_TYPES, analyse_kalsarpa


def _planets(longitudes: dict) -> list:
    """Tiny helper: build the minimal planet list `analyse_kalsarpa` needs.
    Pass {name: longitude_deg}; sign_id is derived (1=Aries..12=Pisces)."""
    return [
        {"name": n, "longitude": lon, "sign_id": int(lon // 30) + 1}
        for n, lon in longitudes.items()
    ]


def test_no_kalsarpa_when_planets_straddle_axis():
    # Rahu at 0°, Ketu at 180°. Put one planet on each side of the axis.
    planets = _planets({
        "Rahu": 0.0, "Ketu": 180.0,
        "Sun": 90.0,    # forward arc (Rahu→Ketu, via Cancer)
        "Saturn": 270.0,  # other arc
        "Moon": 60.0, "Mars": 120.0, "Mercury": 150.0,
        "Jupiter": 30.0, "Venus": 45.0,
    })
    result = analyse_kalsarpa(planets, asc_sign=1)
    assert result["present"] is False
    assert "NOT" in result["verdict"]


def test_full_kalsarpa_when_all_planets_on_one_arc():
    # Rahu at 0°, Ketu at 180°, all 7 planets between 0° and 180° (forward
    # arc). Should detect a Kalsarpa Yoga; type comes from Rahu's house.
    planets = _planets({
        "Rahu": 0.0, "Ketu": 180.0,
        "Sun":     30.0,
        "Moon":    60.0,
        "Mars":    90.0,
        "Mercury": 100.0,
        "Jupiter": 120.0,
        "Venus":   150.0,
        "Saturn":  170.0,
    })
    # Lagna in Aries (sign 1). Rahu also in Aries → Rahu in house 1 → Anant.
    result = analyse_kalsarpa(planets, asc_sign=1)
    assert result["present"] is True
    assert result["kind"] == "Anant"
    assert result["direction"].startswith("Forward")
    assert result["rahu_house"] == 1
    assert result["ketu_house"] == 7


def test_kalsarpa_type_keyed_by_rahu_house():
    # Same arc-confined planets, but lagna placed so Rahu is in house 8
    # (asc_sign=6 → Rahu in Aries is the 8th from Virgo). Expected: Karkotak.
    planets = _planets({
        "Rahu": 0.0, "Ketu": 180.0,
        "Sun": 30.0, "Moon": 60.0, "Mars": 90.0,
        "Mercury": 100.0, "Jupiter": 120.0, "Venus": 150.0, "Saturn": 170.0,
    })
    result = analyse_kalsarpa(planets, asc_sign=6)
    assert result["present"] is True
    assert result["rahu_house"] == 8
    assert result["kind"] == KALSARPA_TYPES[7]  # 0-indexed → "Karkotak"


def test_reverse_kalsarpa_detected():
    # Planets behind Rahu (on Ketu→Rahu arc).
    planets = _planets({
        "Rahu": 180.0, "Ketu": 0.0,
        "Sun": 30.0, "Moon": 60.0, "Mars": 90.0,
        "Mercury": 100.0, "Jupiter": 120.0, "Venus": 150.0, "Saturn": 170.0,
    })
    result = analyse_kalsarpa(planets, asc_sign=1)
    assert result["present"] is True
    assert result["direction"].startswith("Reverse")


def test_real_chart_negative(delhi_chart):
    """Delhi 1990-01-01 has Rahu in 11th and planets scattered → no Kalsarpa."""
    assert delhi_chart["kalsarpa"]["present"] is False


def test_real_chart_positive(knk_chart):
    """Knk (25 Apr 2026) has all 7 visible planets between Rahu and Ketu →
    Karkotak Kalsarpa Yoga (Rahu in 8th from Cancer lagna)."""
    ks = knk_chart["kalsarpa"]
    assert ks["present"] is True
    assert ks["kind"] == "Karkotak"
    assert ks["rahu_house"] == 8
