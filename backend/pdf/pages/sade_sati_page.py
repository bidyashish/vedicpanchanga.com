"""Sade Sati / Small Panoti report page(s).

Long table (S.N. | kind | Shani sign | Start | End | Phase) auto-paginating
across as many A4 pages as needed.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fpdf import FPDF

from ..core.text import BOLD, DEV_REGULAR, LATIN_REGULAR, REGULAR, draw_text


def _draw_header(pdf: FPDF, name: str, page_label: str) -> None:
    margin = 14
    page_w = pdf.w
    pdf.set_line_width(0.6)
    pdf.set_draw_color(0, 0, 0)
    pdf.rect(margin, margin, page_w - 2 * margin, 16)
    draw_text(pdf, margin + 6, margin + 11, name or "—",
              LATIN_REGULAR, BOLD, 11)
    draw_text(pdf, page_w - margin - 6, margin + 11, page_label,
              LATIN_REGULAR, REGULAR, 9, anchor="right")


def _fmt_date(iso: str) -> str:
    """`2032-05-30` → `30 May 2032`."""
    try:
        return datetime.fromisoformat(iso).strftime("%d %b %Y")
    except Exception:
        return iso


def draw_sade_sati_page(
    pdf: FPDF,
    *,
    name: str,
    segments: List[Dict[str, Any]],
    moon_sign: str,
    lang: str,
) -> None:
    margin = 14
    page_w = pdf.w
    page_h = pdf.h
    inner_w = page_w - 2 * margin

    headers = ["S.N.", "Kind", "Phase", "Shani Rashi", "Start", "End"]
    col_w = [inner_w * 0.06, inner_w * 0.16, inner_w * 0.18,
             inner_w * 0.16, inner_w * 0.22, inner_w * 0.22]

    row_h = 14
    title = "Sade Sati Report"

    page_no = 0
    total_pages = 1  # filled in later

    rows_per_page_first = None
    rows_per_page_other = None

    def _new_page(first: bool):
        nonlocal page_no
        page_no += 1
        pdf.add_page()
        _draw_header(pdf, name, f"{title} — page {page_no}")

        cur_y = margin + 22
        if first:
            draw_text(pdf, page_w / 2, cur_y + 12, title,
                      LATIN_REGULAR, BOLD, 14, anchor="center")
            cur_y += 22
            sub = f"Saturn-from-Moon transits over 120 years (Moon in {moon_sign})"
            draw_text(pdf, page_w / 2, cur_y + 8, sub,
                      LATIN_REGULAR, REGULAR, 9, anchor="center")
            cur_y += 12

        # Header strip
        pdf.set_fill_color(230, 230, 230)
        pdf.rect(margin, cur_y, inner_w, row_h, "F")
        cx = margin
        for h, w in zip(headers, col_w):
            draw_text(pdf, cx + 4, cur_y + row_h - 4, h, LATIN_REGULAR, BOLD, 8)
            cx += w
        return cur_y + row_h

    body_y = _new_page(first=True)
    body_top_first = body_y - row_h
    pdf.set_line_width(0.3)

    for idx, seg in enumerate(segments, start=1):
        if body_y + row_h > page_h - margin - 14:
            # Close current page table border
            pdf.rect(margin, body_top_first, inner_w, body_y - body_top_first)
            # New page
            body_y = _new_page(first=False)
            body_top_first = body_y - row_h

        cx = margin
        cells = [
            str(idx),
            seg["kind"],
            seg["phase"],
            seg["sign"],
            _fmt_date(seg["start"]),
            _fmt_date(seg["end"]),
        ]
        for cell, w in zip(cells, col_w):
            draw_text(pdf, cx + 4, body_y + row_h - 4, cell,
                      LATIN_REGULAR, REGULAR, 8)
            cx += w
        pdf.line(margin, body_y + row_h, margin + inner_w, body_y + row_h)
        body_y += row_h

    # Final border for last page's table
    pdf.rect(margin, body_top_first, inner_w, body_y - body_top_first)

    # Vertical separators on last page (re-draw them once across the table)
    cx = margin
    for w in col_w[:-1]:
        cx += w
        pdf.line(cx, body_top_first, cx, body_y)


def draw_mangal_page(
    pdf: FPDF,
    *,
    name: str,
    analysis: Dict[str, Any],
) -> None:
    pdf.add_page()
    _draw_header(pdf, name, "Mangal Dosha")

    margin = 14
    page_w = pdf.w
    cur_y = margin + 22

    draw_text(pdf, page_w / 2, cur_y + 12, "Mangal Dosha (Manglik) Analysis",
              LATIN_REGULAR, BOLD, 14, anchor="center")
    cur_y += 28

    # Verdict box
    pdf.set_fill_color(245, 245, 245) if not analysis["present"] else pdf.set_fill_color(255, 240, 230)
    pdf.set_line_width(0.5)
    pdf.rect(margin, cur_y, page_w - 2 * margin, 26, "DF")
    draw_text(pdf, margin + 8, cur_y + 16, analysis["verdict"],
              LATIN_REGULAR, BOLD, 11)
    cur_y += 36

    # Key facts
    rows = [
        ("Mars sign", f"{analysis['mars_sign']} (#{analysis['mars_sign_id']})"),
        ("Mars retrograde", "Yes" if analysis["mars_retrograde"] else "No"),
        ("House from Lagna", str(analysis["house_from_lagna"])),
        ("In dosha-bearing house from Lagna",
         "Yes" if analysis["in_lagna_dosha"] else "No"),
        ("House from Moon",
         str(analysis["house_from_moon"]) if analysis["house_from_moon"] else "—"),
        ("In dosha-bearing house from Moon",
         "Yes" if analysis["in_moon_dosha"] else "No"),
    ]

    inner_w = page_w - 2 * margin
    label_w = inner_w * 0.55
    val_w = inner_w - label_w
    row_h = 16

    pdf.set_line_width(0.3)
    pdf.rect(margin, cur_y, inner_w, row_h * len(rows))
    pdf.line(margin + label_w, cur_y, margin + label_w, cur_y + row_h * len(rows))
    for i, (k, v) in enumerate(rows):
        y = cur_y + i * row_h
        if i > 0:
            pdf.line(margin, y, margin + inner_w, y)
        draw_text(pdf, margin + 6, y + row_h - 5, k, LATIN_REGULAR, BOLD, 9)
        draw_text(pdf, margin + label_w + 6, y + row_h - 5, v,
                  LATIN_REGULAR, REGULAR, 9)
    cur_y += row_h * len(rows) + 18

    # Cancellations / mitigations
    if analysis["cancellations"]:
        draw_text(pdf, margin, cur_y, "Mitigating conditions detected:",
                  LATIN_REGULAR, BOLD, 11)
        cur_y += 14
        for note in analysis["cancellations"]:
            draw_text(pdf, margin + 12, cur_y, "• " + note,
                      LATIN_REGULAR, REGULAR, 10)
            cur_y += 14

    cur_y += 12
    note = (
        "Note: Mangal Dosha rules vary across regional traditions. The classical "
        "houses considered are 1, 2, 4, 7, 8, 12 from the Lagna and from the natal "
        "Moon. Cancellation conditions (Mangal Dosha Bhanga) include Mars in its "
        "own / exaltation sign, retrograde Mars, certain ascendants and aspects. "
        "Always consult a qualified astrologer before drawing conclusions."
    )
    # Multi-line wrap by simple split — fpdf2's multi_cell would also work here.
    pdf.set_font(LATIN_REGULAR, REGULAR, 9)
    pdf.set_xy(margin, cur_y)
    pdf.multi_cell(inner_w, 12, note, border=0)
