"""Smoke tests for the PDF report. Verifies render_pdf produces a well-
formed PDF with the expected section layout — exercises every page builder
without checking pixel positions."""

from __future__ import annotations

import re

import pytest

EXPECTED_SECTION_TITLES = [
    "Traditional",  # page 1
    "Planetary Positions",
    "Vimshottari Dasha",
    "Vimshottari Dasha — Antardasha",
    "Vimshottari Dasha — Pratyantar",
    "Shodashvarga",
    "Jaimini",
    "Friendship Tables",
    "Kalsarpa Yoga",
    "Sade Sati Report",
    "Mangal Dosha",
    "Index of Sections",
]


@pytest.fixture(scope="module")
def rendered(delhi_chart, panchang_module):
    """Build a full PDF for the Delhi sample once and reuse the bytes."""
    from pdf import render_pdf  # noqa: WPS433

    panch = panchang_module.compute_detailed_panchang(
        target_date="1990-01-01",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
    )
    return render_pdf(
        name="Smoke",
        sex="Male",
        chart_data=delhi_chart,
        panchang_data=panch,
        place_name="New Delhi",
        lang="en",
    )


def test_pdf_starts_with_pdf_magic(rendered):
    assert rendered[:4] == b"%PDF"


def test_pdf_has_expected_page_count(rendered):
    pdfium = pytest.importorskip("pypdfium2")
    pdf = pdfium.PdfDocument(rendered)
    assert len(pdf) >= 18, f"expected ≥18 pages, got {len(pdf)}"


def test_every_section_title_appears_somewhere(rendered):
    pdfium = pytest.importorskip("pypdfium2")
    pdf = pdfium.PdfDocument(rendered)
    full_text = "\n".join(p.get_textpage().get_text_range() for p in pdf)
    for title in EXPECTED_SECTION_TITLES:
        assert title in full_text, f"missing section: {title}"


def test_footer_stamps_page_numbers_on_every_page(rendered):
    pdfium = pytest.importorskip("pypdfium2")
    pdf = pdfium.PdfDocument(rendered)
    for i, page in enumerate(pdf, start=1):
        text = page.get_textpage().get_text_range()
        assert f"Page {i}" in text, f"page {i} missing footer stamp"


def test_index_lists_every_section_with_a_page_number(rendered):
    """The Index page should list section labels followed by a page number."""
    pdfium = pytest.importorskip("pypdfium2")
    pdf = pdfium.PdfDocument(rendered)
    last = pdf[len(pdf) - 1].get_textpage().get_text_range()
    assert "Index of Sections" in last
    # Each section row is a label + integer page number on the right.
    for label in (
        "Planetary Positions",
        "Vimshottari Mahadasha",
        "Friendship Tables",
        "Kalsarpa Yoga",
        "Mangal Dosha",
    ):
        # Pattern "<label>\n…\n<int>" — page numbers are bold-rendered ints.
        assert re.search(rf"{re.escape(label)}.{{0,20}}\d+", last, re.DOTALL), label


def test_render_pdf_handles_hindi_lang(delhi_chart, panchang_module):
    """The Hindi pass must not crash even though most labels in panchang
    are still English; the renderer falls back per-glyph to NotoSans for
    any character outside the Devanagari range."""
    from pdf import render_pdf

    panch = panchang_module.compute_detailed_panchang(
        target_date="1990-01-01",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
    )
    out = render_pdf(
        name="Aśiṣ",  # IAST diacritics — must use Latin font
        sex="Male",
        chart_data=delhi_chart,
        panchang_data=panch,
        place_name="New Delhi",
        lang="hi",
    )
    assert out[:4] == b"%PDF"
    assert len(out) > 50_000  # sanity: real content, not empty stub
