"""Unit tests for backend/tamil_calendar.py.

Anchored on the spec example: Apr 27 2026 (Asia/Kolkata) →
Chithirai 14, Parabhava (id 40) — and on the cycle anchor Prabhava (id 1)
on the Mesha sankranti of 1987.
"""

from __future__ import annotations

import pytest

from tamil_calendar import (
    _CYCLE_ANCHOR_GREGORIAN,
    _KARI_NAAL,
    _KEEZH_NOKKU,
    _MEL_NOKKU,
    _MONTH_EN,
    _MONTH_TA,
    _SAMA_NOKKU,
    _THANIYA_NAAL,
    _WEEKDAY_EN,
    _WEEKDAY_TA,
    _YEAR_EN,
    _YEAR_TA,
    compute_tamil_calendar,
    format_summary,
    nakshatra_nokku,
)


def test_static_tables_have_expected_lengths():
    assert len(_WEEKDAY_EN) == 7 == len(_WEEKDAY_TA)
    assert len(_MONTH_EN) == 12 == len(_MONTH_TA)
    assert len(_YEAR_EN) == 60 == len(_YEAR_TA)
    assert _CYCLE_ANCHOR_GREGORIAN == 1987


def test_spec_example_apr_27_2026():
    """The single example called out in the spec."""
    out = compute_tamil_calendar("2026-04-27", "Asia/Kolkata")
    assert out["week_day"] == {"en": "Monday", "ta": "திங்கள்"}
    assert out["tamil_date"] == 14
    assert out["tamil_month"]["id"] == 1
    assert out["tamil_month"]["en"] == "Chithirai"
    assert out["tamil_month"]["ta"] == "சித்திரை"
    assert out["tamil_year"]["id"] == 40
    assert out["tamil_year"]["name_en"] == "Parabhava"
    assert out["tamil_year"]["name_ta"] == "பராபவ"
    assert out["month_start_iso"] == "2026-04-14"


def test_format_summary_matches_spec_string():
    out = compute_tamil_calendar("2026-04-27", "Asia/Kolkata")
    assert format_summary(out, "2026-04-27") == (
        "Monday, 27 April 2026 → சித்திரை 14, பராபவ ஆண்டு"
    )


def test_tamil_new_year_2026_is_chithirai_one():
    out = compute_tamil_calendar("2026-04-14", "Asia/Kolkata")
    assert out["tamil_date"] == 1
    assert out["tamil_month"]["en"] == "Chithirai"
    assert out["tamil_year"]["name_en"] == "Parabhava"


def test_day_before_tamil_new_year_2026_is_panguni_30_prev_year():
    """April 13 2026 should still be the previous Tamil year (Vishvavasu, id 39)."""
    out = compute_tamil_calendar("2026-04-13", "Asia/Kolkata")
    assert out["tamil_month"]["en"] == "Panguni"
    assert out["tamil_year"]["id"] == 39
    assert out["tamil_year"]["name_en"] == "Vishvavasu"


def test_cycle_anchor_prabhava_starts_apr_14_1987():
    out = compute_tamil_calendar("1987-04-14", "Asia/Kolkata")
    assert out["tamil_year"]["id"] == 1
    assert out["tamil_year"]["name_en"] == "Prabhava"
    assert out["tamil_date"] == 1
    assert out["tamil_month"]["en"] == "Chithirai"


def test_day_before_cycle_anchor_is_akshaya_60():
    out = compute_tamil_calendar("1987-04-13", "Asia/Kolkata")
    assert out["tamil_year"]["id"] == 60
    assert out["tamil_year"]["name_en"] == "Akshaya"


@pytest.mark.parametrize(
    "iso, expected_month, expected_year_id",
    [
        # Margazhi straddles the Gregorian year boundary; both halves stay in
        # the Tamil year that started Apr 14 of the *previous* Gregorian year.
        ("2025-12-25", "Margazhi", 39),
        ("2026-01-01", "Margazhi", 39),
        ("2026-01-13", "Margazhi", 39),  # last day of Margazhi
        ("2026-01-14", "Thai", 39),  # Thai 1
    ],
)
def test_year_does_not_roll_over_at_gregorian_new_year(
    iso, expected_month, expected_year_id
):
    out = compute_tamil_calendar(iso, "Asia/Kolkata")
    assert out["tamil_month"]["en"] == expected_month
    assert out["tamil_year"]["id"] == expected_year_id


@pytest.mark.parametrize(
    "iso, weekday_ta",
    [
        ("2026-04-26", "ஞாயிறு"),  # Sunday
        ("2026-04-27", "திங்கள்"),  # Monday
        ("2026-04-28", "செவ்வாய்"),  # Tuesday
        ("2026-04-29", "புதன்"),  # Wednesday
        ("2026-04-30", "வியாழன்"),  # Thursday
        ("2026-05-01", "வெள்ளி"),  # Friday
        ("2026-05-02", "சனி"),  # Saturday
    ],
)
def test_weekday_in_tamil_for_each_day(iso, weekday_ta):
    out = compute_tamil_calendar(iso, "Asia/Kolkata")
    assert out["week_day"]["ta"] == weekday_ta


# ---- Nokku Naal (issue #85) ------------------------------------------------


def test_nokku_groups_partition_all_27_nakshatras():
    assert len(_MEL_NOKKU) == len(_KEEZH_NOKKU) == len(_SAMA_NOKKU) == 9
    assert _MEL_NOKKU | _KEEZH_NOKKU | _SAMA_NOKKU == set(range(1, 28))


@pytest.mark.parametrize(
    "index, kind",
    [
        (4, "mel"),  # Rohini
        (6, "mel"),  # Ardra
        (26, "mel"),  # Uttara Bhadrapada
        (2, "keezh"),  # Bharani
        (10, "keezh"),  # Magha
        (25, "keezh"),  # Purva Bhadrapada
        (1, "sama"),  # Ashwini
        (18, "sama"),  # Jyeshtha
        (27, "sama"),  # Revati
    ],
)
def test_nakshatra_nokku_classification(index, kind):
    out = nakshatra_nokku(index)
    assert out is not None
    assert out["type"] == kind
    assert out["arrow"] == {"mel": "↑", "keezh": "↓", "sama": "↔"}[kind]


def test_nakshatra_nokku_handles_missing_index():
    assert nakshatra_nokku(None) is None
    assert nakshatra_nokku(0) is None
    assert nakshatra_nokku(28) is None


def test_nokku_included_when_nakshatra_index_passed():
    out = compute_tamil_calendar("2026-04-27", "Asia/Kolkata", nakshatra_index=4)
    assert out["nokku_naal"]["type"] == "mel"
    assert out["nokku_naal"]["ta"] == "மேல் நோக்கு நாள்"
    out2 = compute_tamil_calendar("2026-04-27", "Asia/Kolkata")
    assert out2["nokku_naal"] is None


# ---- Kari Naal / Thaniya Naal (issue #85) ----------------------------------


def test_kari_thaniya_tables_cover_all_months_with_valid_dates():
    for table in (_KARI_NAAL, _THANIYA_NAAL):
        assert set(table.keys()) == set(range(1, 13))
        for dates in table.values():
            assert dates and all(1 <= d <= 32 for d in dates)


@pytest.mark.parametrize(
    "iso, kari, thaniya",
    [
        # Chithirai 2026 starts Apr 14 → Tamil date = Gregorian day - 13.
        ("2026-04-19", True, False),  # Chithirai 6 - Kari Naal
        ("2026-04-28", True, False),  # Chithirai 15 - Kari Naal
        ("2026-04-16", False, True),  # Chithirai 3 - Thaniya Naal
        ("2026-05-03", False, True),  # Chithirai 20 - Thaniya Naal
        ("2026-04-27", False, False),  # Chithirai 14 - plain day
        ("2026-01-14", True, False),  # Thai 1 - Kari Naal
    ],
)
def test_kari_and_thaniya_flags(iso, kari, thaniya):
    out = compute_tamil_calendar(iso, "Asia/Kolkata")
    assert out["kari_naal"] is kari
    assert out["thaniya_naal"] is thaniya
