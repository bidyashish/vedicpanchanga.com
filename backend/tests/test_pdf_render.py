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
    "Vimshottari Dasha - Antardasha",
    "Vimshottari Dasha - Pratyantar",
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


def test_text_width_is_harfbuzz_shaped():
    """draw_text/text_width must measure HarfBuzz-shaped runs. Devanagari
    conjuncts merge glyphs, so the shaped width is well below the naive
    per-character sum that FPDF.get_string_width returns; if this assert
    fails the renderer has regressed to the unshaped FPDF.text() path
    (Tamil matras out of order, no conjuncts, no Arabic joining)."""
    from fpdf import FPDF

    from pdf.core.text import DEV_REGULAR, REGULAR, register_fonts, text_width

    pdf = FPDF(unit="pt", format="A4")
    register_fonts(pdf)
    pdf.add_page()
    s = "विम्शोत्तरी क्षेत्र ज्योतिष"
    shaped = text_width(pdf, s, DEV_REGULAR, REGULAR, 18)
    pdf.set_font(DEV_REGULAR, REGULAR, 18)
    # Passing no shaping params yields the naive per-character advance sum.
    _, unshaped = pdf.current_font.get_text_width(s, 18, None)
    assert 0 < shaped < unshaped * 0.9


def test_render_pdf_tamil_uses_south_indian_chart(delhi_chart, panchang_module):
    """Tamil defaults to the South Indian chart style (issue #86); the
    render must succeed and produce a full report."""
    from pdf import render_pdf

    panch = panchang_module.compute_detailed_panchang(
        target_date="1990-01-01",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
    )
    out = render_pdf(
        name="Smoke",
        sex="Male",
        chart_data=delhi_chart,
        panchang_data=panch,
        place_name="New Delhi",
        lang="ta",
    )
    assert out[:4] == b"%PDF"
    assert len(out) > 50_000


def test_render_pdf_tamil_keeps_technical_values_latin(delhi_chart, panchang_module):
    """Dates, clock times and coordinates in the basic-details box must stay
    in Latin digits even for Tamil. Converting them to Tamil digits glued the
    native numerals onto Latin direction letters (E/N) and produced garbled
    values like 'எல.கங.E' for the longitude - see issue #86."""
    pdfium = pytest.importorskip("pypdfium2")
    from pdf import render_pdf

    panch = panchang_module.compute_detailed_panchang(
        target_date="1990-01-01",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
    )
    out = render_pdf(
        name="Smoke",
        sex="Male",
        chart_data=delhi_chart,
        panchang_data=panch,
        place_name="New Delhi",
        lang="ta",
    )
    doc = pdfium.PdfDocument(out)
    page1 = doc[0].get_textpage().get_text_range()
    # Gregorian date, birth time and both coordinates render in Latin digits
    # (DELHI_BIRTH: 1990-01-01 12:00, 28.6139 N, 77.2090 E).
    assert "01.01.1990" in page1
    assert "12.00.00" in page1
    assert "28.37.N" in page1
    assert "77.13.E" in page1
    # No native digit anywhere in the report: degrees, padas, dasha years,
    # dasha date ranges and table counts were still Tamil numerals after the
    # first round of #86 and read as gibberish (e.g. '௦௮-௦௬-௪௧' for a DMS).
    for i in range(len(doc)):
        page_text = doc[i].get_textpage().get_text_range()
        assert not re.search(r"[௦-௯]", page_text), f"Tamil digit on page {i + 1}"


def test_render_pdf_hindi_keeps_all_digits_latin(delhi_chart, panchang_module):
    """Same rule for Devanagari: every numeral in the Hindi report is Latin."""
    pdfium = pytest.importorskip("pypdfium2")
    from pdf import render_pdf

    panch = panchang_module.compute_detailed_panchang(
        target_date="1990-01-01",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
    )
    out = render_pdf(
        name="Smoke",
        sex="Male",
        chart_data=delhi_chart,
        panchang_data=panch,
        place_name="New Delhi",
        lang="hi",
    )
    doc = pdfium.PdfDocument(out)
    for i in range(len(doc)):
        page_text = doc[i].get_textpage().get_text_range()
        assert not re.search(r"[०-९]", page_text), f"Devanagari digit on page {i + 1}"


def test_render_pdf_explicit_chart_style_override(delhi_chart, panchang_module):
    """chart_style='south' must work for any language, e.g. English."""
    from pdf import render_pdf

    panch = panchang_module.compute_detailed_panchang(
        target_date="1990-01-01",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
    )
    out = render_pdf(
        name="Smoke",
        sex="Male",
        chart_data=delhi_chart,
        panchang_data=panch,
        place_name="New Delhi",
        lang="en",
        chart_style="south",
    )
    assert out[:4] == b"%PDF"


def test_render_pdf_tamil_ignores_north_override(delhi_chart, panchang_module):
    """Tamil always renders South Indian charts - a caller-supplied
    chart_style='north' must not override the language rule (issue #86).
    Page 1 of the override render must be pixel-identical to the default
    Tamil render (raw PDF bytes differ by creation timestamp, so compare
    rasterized output instead)."""
    pdfium = pytest.importorskip("pypdfium2")
    from pdf import render_pdf

    panch = panchang_module.compute_detailed_panchang(
        target_date="1990-01-01",
        latitude=28.6139,
        longitude=77.2090,
        timezone_name="Asia/Kolkata",
    )
    kwargs = dict(
        name="Smoke",
        sex="Male",
        chart_data=delhi_chart,
        panchang_data=panch,
        place_name="New Delhi",
        lang="ta",
    )

    def page1_pixels(pdf_bytes):
        page = pdfium.PdfDocument(pdf_bytes)[0]
        return bytes(page.render(scale=1.0).buffer)

    defaulted = page1_pixels(render_pdf(**kwargs))
    overridden = page1_pixels(render_pdf(**kwargs, chart_style="north"))
    assert overridden == defaulted


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
