"""Shared page-chrome helpers used by every detail page.

Centralising these means the page header strip, footer with page number, and
section title bar all look identical across the PDF — no per-page font or
colour drift.
"""

from __future__ import annotations

from typing import Optional

from fpdf import FPDF

from .text import BOLD, DEV_REGULAR, LATIN_REGULAR, REGULAR, draw_text

MARGIN = 14
HEADER_H = 16
FOOTER_H = 14

ZEBRA_RGB = (248, 248, 244)
HEADER_RGB = (228, 226, 218)
ACCENT_RGB = (179, 89, 0)  # Saffron stamp colour
RULE_RGB = (120, 120, 120)


def page_header(pdf: FPDF, name: str, label: str) -> None:
    """Top strip with native name (left) and section label (right)."""
    pdf.set_line_width(0.5)
    pdf.set_draw_color(*RULE_RGB)
    pdf.rect(MARGIN, MARGIN, pdf.w - 2 * MARGIN, HEADER_H)
    family = DEV_REGULAR if any("ऀ" <= ch <= "ॿ" for ch in (name or "")) else LATIN_REGULAR
    draw_text(pdf, MARGIN + 6, MARGIN + 11, name or "—", family, BOLD, 11)
    draw_text(pdf, pdf.w - MARGIN - 6, MARGIN + 11, label,
              LATIN_REGULAR, REGULAR, 9, anchor="right")


def page_footer(pdf: FPDF) -> None:
    """Footer rule + brand on the left, current page number on the right.
    Call once near the end of every page's draw — fpdf2's per-page font
    subset is still mutable here. Doing it post-finalisation (e.g. by
    revisiting pages with `pdf.page = n`) corrupts the font dict and
    yields garbled glyphs."""
    y = pdf.h - FOOTER_H
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.4)
    pdf.line(MARGIN, y, pdf.w - MARGIN, y)
    draw_text(pdf, MARGIN, y + 9, "vedicpanchanga.com",
              LATIN_REGULAR, REGULAR, 8)
    draw_text(pdf, pdf.w - MARGIN, y + 9, f"Page {pdf.page_no()}",
              LATIN_REGULAR, REGULAR, 8, anchor="right")


def section_title(pdf: FPDF, x: float, y: float, w: float, title: str,
                  subtitle: str = "") -> float:
    """Title bar with optional subtitle. Returns the new y after the bar."""
    bar_h = 22 if not subtitle else 30
    pdf.set_fill_color(*ACCENT_RGB)
    pdf.set_draw_color(*ACCENT_RGB)
    pdf.rect(x, y, 4, bar_h, "F")
    draw_text(pdf, x + 12, y + 14, title, LATIN_REGULAR, BOLD, 13)
    if subtitle:
        draw_text(pdf, x + 12, y + 26, subtitle,
                  LATIN_REGULAR, REGULAR, 8.5)
    return y + bar_h + 6
