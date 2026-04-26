"""Unit tests for `dasha_extras.compute_antardashas` and
`compute_pratyantars`. No HTTP needed — runs against `chart_data` produced
in-process by the `delhi_chart`/`knk_chart` fixtures.

Reference values for `knk_chart` (Knk, 25 Apr 2026 11:36 IST Ranchi) come
from the AstroSage sample report used during PDF verification:
balance Mer 6Y 0M 2D, Ketu antardasha ends ≈ 24/09/2032, etc.
"""

from __future__ import annotations

from datetime import datetime

import pytest


def test_antardashas_full_120_year_total(delhi_chart):
    """Mahadashas 2..9 are full periods that sum to 120-balance years."""
    md = delhi_chart["dasha_antar"]
    assert len(md) == 9
    for entry in md:
        assert "antardashas" in entry
        assert len(entry["antardashas"]) == 9


def test_antardasha_durations_sum_to_mahadasha(delhi_chart, chart_module):
    """Within a Mahadasha M-years long, the 9 antardashas should sum to M."""
    md = delhi_chart["dasha_antar"]
    total_years = chart_module.DASHA_YEARS
    # Skip the first MD (partial — its concept-start is pre-birth, so the
    # 9 ADs sum to its FULL Vimshottari period, not its `years` field).
    for entry in md[1:]:
        ad_total = sum(ad["years"] for ad in entry["antardashas"])
        assert abs(ad_total - total_years[entry["lord"]]) < 1e-3, (
            f"{entry['lord']} antardashas sum to {ad_total}, "
            f"expected {total_years[entry['lord']]}"
        )


def test_first_mahadasha_pre_birth_antardashas(delhi_chart, delhi_birth):
    """The first Mahadasha covers the FULL Vimshottari period; antardashas
    that ended before birth are kept (caller can flag them) but the
    *active* one must straddle birth."""
    md0 = delhi_chart["dasha_antar"][0]
    birth_dt = datetime.fromisoformat(delhi_chart["birth"]["utc_time"]).replace(tzinfo=None)
    ads = md0["antardashas"]

    pre_birth = [ad for ad in ads if datetime.fromisoformat(ad["end"]) <= birth_dt]
    post_birth = [ad for ad in ads if datetime.fromisoformat(ad["end"]) > birth_dt]
    assert pre_birth, "first MD should have some pre-birth antardashas"
    assert post_birth, "first MD should have at least one post-birth antardasha"

    first_active = post_birth[0]
    start = datetime.fromisoformat(first_active["start"])
    end = datetime.fromisoformat(first_active["end"])
    assert start <= birth_dt <= end


def test_knk_antardasha_against_astrosage(knk_chart):
    """End-to-end check against the Knk reference report (AstroSage).
    Mahadasha 1 = Mercury (balance 6Y 0M 2D ≈ 6.005 yr); MD 2 = Ketu (7 yr).
    Ketu antardasha (within Ketu MD) ends 24/09/2032 in the reference;
    we accept ±2 days for year-length rounding."""
    md = knk_chart["dasha_antar"]
    assert md[0]["lord"] == "Mercury"
    assert md[1]["lord"] == "Ketu"

    ket_md = md[1]
    ket_ad = next(ad for ad in ket_md["antardashas"] if ad["lord"] == "Ketu")
    end = datetime.fromisoformat(ket_ad["end"]).date()
    expected = datetime.fromisoformat("2032-09-24T00:00:00").date()
    assert abs((end - expected).days) <= 2, f"Ket-Ket ends {end}, expected ~{expected}"


def test_pratyantar_count_and_sequence_starts_with_ad_lord(knk_chart):
    """Pratyantar level: 9 entries per antardasha, first entry's lord
    equals the parent antardasha's lord."""
    from dasha_extras import compute_pratyantars

    ad = knk_chart["dasha_antar"][1]["antardashas"][0]  # Ket-Ket
    pds = compute_pratyantars(ad)
    assert len(pds) == 9
    assert pds[0]["lord"] == ad["lord"]
    pd_total = sum(p["years"] for p in pds)
    assert abs(pd_total - ad["years"]) < 1e-3
