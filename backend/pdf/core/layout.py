"""Shared page-chrome (header strip, footer, section title bar) and the
palette every PDF page should pull from."""

from __future__ import annotations

from fpdf import FPDF

from .text import BOLD, DEV_REGULAR, LATIN_REGULAR, REGULAR, draw_text

MARGIN = 14
HEADER_H = 16
FOOTER_H = 14

ZEBRA_RGB = (248, 248, 244)
HEADER_RGB = (228, 226, 218)
ACCENT_RGB = (179, 89, 0)
RULE_RGB = (120, 120, 120)


def page_header(pdf: FPDF, name: str, label: str) -> None:
    pdf.set_line_width(0.5)
    pdf.set_draw_color(*RULE_RGB)
    pdf.rect(MARGIN, MARGIN, pdf.w - 2 * MARGIN, HEADER_H)
    family = (
        DEV_REGULAR if any("ऀ" <= ch <= "ॿ" for ch in (name or "")) else LATIN_REGULAR
    )
    draw_text(pdf, MARGIN + 6, MARGIN + 11, name or "-", family, BOLD, 11)
    draw_text(
        pdf,
        pdf.w - MARGIN - 6,
        MARGIN + 11,
        label,
        LATIN_REGULAR,
        REGULAR,
        9,
        anchor="right",
    )


def page_footer(pdf: FPDF) -> None:
    # Must be called during the page's draw — revisiting a finalised page
    # via `pdf.page = n` corrupts fpdf2's per-page font subset and produces
    # garbled glyphs.
    y = pdf.h - FOOTER_H
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.4)
    pdf.line(MARGIN, y, pdf.w - MARGIN, y)
    draw_text(pdf, MARGIN, y + 9, "vedicpanchanga.com", LATIN_REGULAR, REGULAR, 8)
    draw_text(
        pdf,
        pdf.w - MARGIN,
        y + 9,
        f"Page {pdf.page_no()}",
        LATIN_REGULAR,
        REGULAR,
        8,
        anchor="right",
    )


def section_title(
    pdf: FPDF, x: float, y: float, w: float, title: str, subtitle: str = ""
) -> float:
    """Saffron accent bar + title (and optional subtitle). Returns next y."""
    bar_h = 22 if not subtitle else 30
    pdf.set_fill_color(*ACCENT_RGB)
    pdf.set_draw_color(*ACCENT_RGB)
    pdf.rect(x, y, 4, bar_h, "F")
    draw_text(pdf, x + 12, y + 14, title, LATIN_REGULAR, BOLD, 13)
    if subtitle:
        draw_text(pdf, x + 12, y + 26, subtitle, LATIN_REGULAR, REGULAR, 8.5)
    return y + bar_h + 6
