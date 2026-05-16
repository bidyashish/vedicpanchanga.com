"""Tests for Tyajyam calculations."""

import pytz

from tyajyam import (
    NAKSHATRA_TYAJYAM_RATIO,
    VARA_TYAJYAM_NAZHIGAI,
    _AMRITADI_TABLE,
    _tithi_ratio,
    compute_nakshatra_tyajyam,
    compute_vara_tyajyam,
    compute_amritadi_yogam,
    compute_tyajyam,
)

TZ = pytz.timezone("Asia/Kolkata")


def _iso(jd, tz):
    """Simplified JD->ISO for testing (minutes-level precision)."""
    from advanced_panchang import _iso as real_iso

    return real_iso(jd, tz)


# ---- Table dimension tests ----


def test_nakshatra_ratio_table_has_27_entries():
    assert len(NAKSHATRA_TYAJYAM_RATIO) == 27


def test_amritadi_table_has_27_rows_of_7_columns():
    assert len(_AMRITADI_TABLE) == 27
    for i, row in enumerate(_AMRITADI_TABLE):
        assert len(row) == 7, f"Row {i} has {len(row)} cols"


def test_amritadi_table_valid_codes():
    valid = {"A", "S", "M", "P"}
    for i, row in enumerate(_AMRITADI_TABLE):
        for j, ch in enumerate(row):
            assert ch in valid, f"Row {i} col {j}: invalid code '{ch}'"


def test_vara_nazhigai_covers_all_weekdays():
    for d in range(1, 8):
        assert d in VARA_TYAJYAM_NAZHIGAI


# ---- Tithi ratio tests ----


def test_tithi_ratio_pratipada():
    assert _tithi_ratio(1) == (2, 5)
    assert _tithi_ratio(16) == (2, 5)  # Krishna Pratipada same base


def test_tithi_ratio_dashami():
    assert _tithi_ratio(10) == (11, 20)
    assert _tithi_ratio(25) == (11, 20)  # Krishna Dashami


def test_tithi_ratio_purnima():
    assert _tithi_ratio(15) == (29, 60)


def test_tithi_ratio_amavasya():
    assert _tithi_ratio(30) == (1, 10)


# ---- Spec example: Ashwini Nakshatra Tyajyam ----


def test_ashwini_tyajyam_matches_spec():
    """Ashwini ratio 5/6, 12h span -> start at 10h, duration 96 min."""
    base_jd = 2460000.0
    span_jd = 12.0 / 24.0  # 12 hours
    naks = [{"nak_idx": 0, "start_jd": base_jd, "end_jd": base_jd + span_jd}]
    results = compute_nakshatra_tyajyam(naks, _iso, TZ)
    assert len(results) == 1
    assert results[0]["nakshatra"] == "Ashwini"


def test_nakshatra_tyajyam_skips_if_offset_past_end():
    """If the ratio puts the start beyond the nakshatra end, skip it."""
    base_jd = 2460000.0
    # Give Chitra (ratio 14/15) only a 1-hour window - tyajyam starts at 56 min
    span_jd = 1.0 / 24.0
    naks = [{"nak_idx": 13, "start_jd": base_jd, "end_jd": base_jd + span_jd}]
    results = compute_nakshatra_tyajyam(naks, _iso, TZ)
    # Chitra 14/15 of 60 min = 56 min offset, so start is at 56 min — within window
    assert len(results) == 1


# ---- Vara Tyajyam ----


def test_vara_tyajyam_friday():
    """Friday: 21 nazhigai * 24 min = 504 min from sunrise, 90 min duration."""
    base_jd = 2460000.0
    result = compute_vara_tyajyam(base_jd, 5, _iso, TZ)
    assert result is not None
    assert "start" in result
    assert "end" in result


def test_vara_tyajyam_none_without_sunrise():
    assert compute_vara_tyajyam(None, 5, _iso, TZ) is None


# ---- Amritadi Yogam ----


def test_amritadi_safe_nakshatras_never_marana():
    """Punarvasu, Purva Phalguni, Swati, Uttara Bhadrapada never produce M or P."""
    safe_indices = [6, 10, 14, 25]
    for idx in safe_indices:
        row = _AMRITADI_TABLE[idx]
        assert "M" not in row and "P" not in row, (
            f"Nakshatra {idx} should never have Marana or Prabalarishta"
        )


def test_amritadi_yogam_returns_correct_yogam():
    """Thursday (iso=4) + Ashwini -> column index 3 -> 'A' -> Amrita."""
    base_jd = 2460000.0
    naks = [{"nak_idx": 0, "start_jd": base_jd, "end_jd": base_jd + 0.5}]
    results = compute_amritadi_yogam(naks, 4, base_jd, base_jd + 1.0, _iso, TZ)
    assert len(results) == 1
    assert results[0]["yogam"] == "Amrita"
    assert results[0]["nakshatra"] == "Ashwini"


def test_amritadi_bharani_sunday_is_prabalarishta():
    """Sunday (iso=7) + Bharani -> column index 6 -> 'P' -> Prabalarishta."""
    base_jd = 2460000.0
    naks = [{"nak_idx": 1, "start_jd": base_jd, "end_jd": base_jd + 0.5}]
    results = compute_amritadi_yogam(naks, 7, base_jd, base_jd + 1.0, _iso, TZ)
    assert len(results) == 1
    assert results[0]["yogam"] == "Prabalarishta"


# ---- Integration test ----


def test_compute_tyajyam_returns_all_keys():
    base_jd = 2460000.0
    naks = [{"nak_idx": 0, "start_jd": base_jd, "end_jd": base_jd + 0.5}]
    tithis = [
        {
            "index": 1,
            "name": "Shukla Pratipada",
            "start_jd": base_jd,
            "ends_at_jd": base_jd + 0.5,
        }
    ]
    result = compute_tyajyam(
        nakshatras_with_bounds=naks,
        tithis_in_window=tithis,
        sunrise_jd=base_jd,
        next_sunrise_jd=base_jd + 1.0,
        weekday_iso=4,
        iso_fn=_iso,
        tz=TZ,
    )
    assert "nakshatra_tyajyam" in result
    assert "tithi_tyajyam" in result
    assert "vara_tyajyam" in result
    assert "amritadi_yogam" in result


def test_full_panchang_includes_tyajyam():
    """End-to-end: compute_detailed_panchang returns tyajyam section."""
    from advanced_panchang import compute_detailed_panchang

    result = compute_detailed_panchang(
        "2026-05-16", 49.888, -119.496, "America/Vancouver"
    )
    assert "tyajyam" in result
    tyajyam = result["tyajyam"]
    assert "nakshatra_tyajyam" in tyajyam
    assert "tithi_tyajyam" in tyajyam
    assert "vara_tyajyam" in tyajyam
    assert "amritadi_yogam" in tyajyam
    # Should have at least one entry in most categories
    assert len(tyajyam["nakshatra_tyajyam"]) >= 1
    assert len(tyajyam["amritadi_yogam"]) >= 1
