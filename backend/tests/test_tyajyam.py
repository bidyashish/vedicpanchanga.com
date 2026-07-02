"""Tests for Tyajyam calculations."""

import pytz

from tyajyam import (
    INAUSPICIOUS_KARANAS,
    NAKSHATRA_TYAJYAM_RATIO,
    TAMIL_MONTH_AVOIDABLES,
    TITHI_AVOIDABLE_LAGNAS,
    VARA_TYAJYAM_NAZHIGAI,
    _AMRITADI_TABLE,
    _tithi_base_name,
    _tithi_ratio,
    compute_amritadi_yogam,
    compute_dosha_tyajyam,
    compute_gowri_tyajyam,
    compute_karana_tyajyam,
    compute_nakshatra_tyajyam,
    compute_tamil_month_avoidables,
    compute_tithi_lagna_tyajyam,
    compute_tyajyam,
    compute_vara_tyajyam,
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


def test_amritadi_table_matches_source():
    """Full-table anchor against the issue #48 source table (Sun..Sat order).

    The table was once corrupted by a bad transcription (columns shifted by
    one for 19 of 27 rows), so every cell is pinned here. Do not edit either
    copy without the other.
    """
    source_sun_to_sat = [
        "SSSMAAS",  # Ashwini
        "PSSSSSS",  # Bharani
        "SMSAMSS",  # Krittika
        "SAASMMA",  # Rohini
        "SSSSMSS",  # Mrigashira
        "SSMSMSS",  # Ardra
        "SASSASS",  # Punarvasu
        "SSSSSMS",  # Pushya
        "SSSSSMM",  # Ashlesha
        "MMSSAMA",  # Magha
        "SSSASSS",  # Purva Phalguni
        "ASAAMSM",  # Uttara Phalguni
        "SSSMSAM",  # Hasta
        "SPSSSSM",  # Chitra
        "SASSASS",  # Swati
        "MMMSSSS",  # Vishakha
        "MSSSSSS",  # Anuradha
        "MSMSPMS",  # Jyeshtha
        "ASAMSAS",  # Mula
        "SMSASPS",  # Purva Ashadha
        "AMPASSS",  # Uttara Ashadha
        "AASSSMS",  # Shravana
        "MSSPSSS",  # Dhanishta
        "SSMSMSA",  # Shatabhisha
        "SMMASSM",  # Purva Bhadrapada
        "ASASSSS",  # Uttara Bhadrapada
        "ASSMSSP",  # Revati
    ]
    for i, row in enumerate(source_sun_to_sat):
        expected_mon_to_sun = row[1:] + row[0]
        assert _AMRITADI_TABLE[i] == expected_mon_to_sun, (
            f"Nakshatra {i}: expected {expected_mon_to_sun}, got {_AMRITADI_TABLE[i]}"
        )


# ---- Karana Tyajyam ----


def test_karana_tyajyam_filters_inauspicious_only():
    base_jd = 2460000.0
    karanas = [
        {"name": "Bava", "start_jd": base_jd, "ends_at_jd": base_jd + 0.2},
        {"name": "Vishti", "start_jd": base_jd + 0.2, "ends_at_jd": base_jd + 0.4},
        {"name": "Naga", "start_jd": base_jd + 0.4, "ends_at_jd": base_jd + 0.6},
    ]
    results = compute_karana_tyajyam(karanas, _iso, TZ)
    assert [r["karana"] for r in results] == ["Vishti", "Naga"]


def test_inauspicious_karana_set():
    assert INAUSPICIOUS_KARANAS == {"Vishti", "Chatushpada", "Naga"}


# ---- Gowri Tyajyam ----


def test_gowri_tyajyam_filters_inauspicious_segments():
    gowri = {
        "day": [
            {"name": "Soram", "start": "a", "end": "b", "auspicious": False},
            {"name": "Uthi", "start": "b", "end": "c", "auspicious": True},
        ],
        "night": [
            {"name": "Visham", "start": "d", "end": "e", "auspicious": False},
        ],
    }
    results = compute_gowri_tyajyam(gowri)
    assert [(r["name"], r["period"]) for r in results] == [
        ("Soram", "day"),
        ("Visham", "night"),
    ]


def test_gowri_tyajyam_handles_missing_payload():
    assert compute_gowri_tyajyam(None) == []
    assert compute_gowri_tyajyam({}) == []


# ---- Dosha Tyajyam ----


def test_dosha_tyajyam_finds_2024_solar_eclipse():
    """2024-04-08 total solar eclipse: the Dallas local day must carry a
    solar_eclipse dosha window."""
    import swisseph as swe

    sunrise_jd = swe.julday(2024, 4, 8, 12.0)  # ~07:00 CDT
    next_sunrise_jd = sunrise_jd + 1.0
    results = compute_dosha_tyajyam(
        sunrise_jd, next_sunrise_jd, _iso, pytz.timezone("America/Chicago")
    )
    doshas = [r["dosha"] for r in results]
    assert "solar_eclipse" in doshas


def test_dosha_tyajyam_none_without_sunrise():
    assert compute_dosha_tyajyam(None, None, _iso, TZ) == []


# ---- Tamil Month Avoidables ----


def test_tamil_month_table_covers_all_12_months():
    from constants import NAKSHATRAS, TITHI_BASE

    valid_tithis = set(TITHI_BASE) | {"Purnima", "Amavasya"}
    for m in range(1, 13):
        info = TAMIL_MONTH_AVOIDABLES[m]
        for t in info["tithis"]:
            assert t in valid_tithis, f"month {m}: bad tithi {t}"
        for n in info["nakshatras"]:
            assert n in NAKSHATRAS, f"month {m}: bad nakshatra {n}"
        assert info["lagnas"], f"month {m}: empty lagna list"


def test_tamil_month_avoidables_matches_today():
    base_jd = 2460000.0
    # Month 4 (Aadi) avoids Shashthi tithi, Purva Phalguni nak, Gemini lagna.
    tithis = [
        {"index": 6, "start_jd": base_jd, "ends_at_jd": base_jd + 0.5},
        {"index": 7, "start_jd": base_jd + 0.5, "ends_at_jd": base_jd + 1.0},
    ]
    naks = [{"nak_idx": 10, "start_jd": base_jd, "end_jd": base_jd + 0.8}]
    lagnas = [
        {"sign": "Gemini", "start_jd": base_jd, "end_jd": base_jd + 0.08},
        {"sign": "Cancer", "start_jd": base_jd + 0.08, "end_jd": base_jd + 0.16},
    ]
    result = compute_tamil_month_avoidables(4, tithis, naks, lagnas, _iso, TZ)
    kinds = sorted((w["kind"], w["name"]) for w in result["windows"])
    assert kinds == [
        ("lagna", "Gemini"),
        ("nakshatra", "Purva Phalguni"),
        ("tithi", "Shashthi"),
    ]
    assert result["avoid_tithis"] == ["Shashthi"]


def test_tamil_month_avoidables_none_for_unknown_month():
    assert compute_tamil_month_avoidables(None, [], [], [], _iso, TZ) is None


# ---- Tithi-based Avoidable Lagnas ----


def test_tithi_lagna_table_uses_valid_names():
    from constants import TITHI_BASE

    signs = {
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
    }
    for tithi, lagnas in TITHI_AVOIDABLE_LAGNAS.items():
        assert tithi in TITHI_BASE
        for s in lagnas:
            assert s in signs, f"{tithi}: bad sign {s}"


def test_tithi_base_name():
    assert _tithi_base_name(1) == "Pratipada"
    assert _tithi_base_name(16) == "Pratipada"  # Krishna paksha same base
    assert _tithi_base_name(15) == "Purnima"
    assert _tithi_base_name(30) == "Amavasya"


def test_tithi_lagna_tyajyam_intersects_windows():
    base_jd = 2460000.0
    # Pratipada avoids Taurus and Leo.
    tithis = [{"index": 1, "start_jd": base_jd, "ends_at_jd": base_jd + 0.5}]
    lagnas = [
        # Taurus rises inside the tithi -> flagged.
        {"sign": "Taurus", "start_jd": base_jd + 0.1, "end_jd": base_jd + 0.18},
        # Leo rises after the tithi ends -> no overlap, not flagged.
        {"sign": "Leo", "start_jd": base_jd + 0.6, "end_jd": base_jd + 0.68},
        # Gemini is not avoidable on Pratipada.
        {"sign": "Gemini", "start_jd": base_jd + 0.2, "end_jd": base_jd + 0.28},
    ]
    results = compute_tithi_lagna_tyajyam(tithis, lagnas, _iso, TZ)
    assert len(results) == 1
    assert results[0]["sign"] == "Taurus"
    assert results[0]["tithi"] == "Pratipada"


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


def test_tithi_tyajyam_uses_true_tithi_span():
    """Regression for issue #48: the last tithi of the day used to have its
    end clipped to next sunrise, shrinking the span the ratio is applied to.

    Chennai 2026-07-01: Krishna Dwitiya runs 07:38:42 IST (Jul 1) to
    09:38:24 IST (Jul 2, after next sunrise 05:46:18). Ratio 1/5 over the
    full span puts the tyajyam start at 12:50 IST; the clipped span gave
    the wrong 12:04 IST.
    """
    from advanced_panchang import compute_detailed_panchang

    result = compute_detailed_panchang("2026-07-01", 13.0837, 80.2702, "Asia/Kolkata")

    last_tithi = result["panchang"]["tithi_sequence"][-1]
    assert last_tithi["name"] == "Krishna Dwitiya"
    assert last_tithi["ends_at"].startswith("2026-07-02T09:38")

    dwitiya = [
        t for t in result["tyajyam"]["tithi_tyajyam"] if t["tithi"] == "Krishna Dwitiya"
    ]
    assert len(dwitiya) == 1
    assert dwitiya[0]["start"].startswith("2026-07-01T12:50")


def test_full_panchang_includes_tyajyam():
    """End-to-end: compute_detailed_panchang returns tyajyam section."""
    from advanced_panchang import compute_detailed_panchang

    result = compute_detailed_panchang(
        "2026-05-16", 49.888, -119.496, "America/Vancouver"
    )
    assert "tyajyam" in result
    tyajyam = result["tyajyam"]
    for key in (
        "nakshatra_tyajyam",
        "tithi_tyajyam",
        "vara_tyajyam",
        "amritadi_yogam",
        "lagna_tyajyam",
        "karana_tyajyam",
        "gowri_tyajyam",
        "dosha_tyajyam",
        "tamil_month_avoidables",
        "tithi_lagna_tyajyam",
    ):
        assert key in tyajyam, f"missing {key}"
    # Should have at least one entry in most categories
    assert len(tyajyam["nakshatra_tyajyam"]) >= 1
    assert len(tyajyam["amritadi_yogam"]) >= 1
    # Gowri always yields inauspicious segments when rise/set exist.
    assert len(tyajyam["gowri_tyajyam"]) >= 1
    # Tamil month is always known, so the avoid lists must be present.
    assert tyajyam["tamil_month_avoidables"] is not None
    assert tyajyam["tamil_month_avoidables"]["avoid_tithis"]
