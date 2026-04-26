"""Jaimini page: Karakamsa & Swamsa charts side-by-side, plus the
Chara Karakas table beneath them."""

from __future__ import annotations

from typing import Any, Dict

from fpdf import FPDF

from .chart import draw_north_indian_chart
from .text import BOLD, LATIN_REGULAR, REGULAR, draw_text


def _draw_header(pdf: FPDF, name: str, label: str) -> None:
    margin = 14
    page_w = pdf.w
    pdf.set_line_width(0.6)
    pdf.set_draw_color(0, 0, 0)
    pdf.rect(margin, margin, page_w - 2 * margin, 16)
    draw_text(pdf, margin + 6, margin + 11, name or "—",
              LATIN_REGULAR, BOLD, 11)
    draw_text(pdf, page_w - margin - 6, margin + 11, label,
              LATIN_REGULAR, REGULAR, 9, anchor="right")


def draw_jaimini_page(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    karakas = chart_data.get("karakas") or []
    karakamsa = chart_data.get("karakamsa") or {}
    swamsa = chart_data.get("swamsa") or {}
    if not karakamsa or not swamsa:
        return

    pdf.add_page()
    _draw_header(pdf, name, "Jaimini — Karakamsa & Swamsa")

    margin = 14
    page_w = pdf.w
    inner_w = page_w - 2 * margin
    cur_y = margin + 22

    draw_text(pdf, page_w / 2, cur_y + 12,
              "Jaimini System — Karakamsa & Swamsa",
              LATIN_REGULAR, BOLD, 14, anchor="center")
    cur_y += 22

    # Two-up charts.
    chart_side = min(220, (inner_w - 20) / 2)
    left_x = margin + (inner_w / 2 - chart_side) / 2
    right_x = margin + inner_w / 2 + (inner_w / 2 - chart_side) / 2

    draw_text(pdf, left_x + chart_side / 2, cur_y + 8, "Karakamsa Chart",
              LATIN_REGULAR, BOLD, 10, anchor="center")
    draw_text(pdf, right_x + chart_side / 2, cur_y + 8, "Swamsa Chart",
              LATIN_REGULAR, BOLD, 10, anchor="center")
    cur_y += 12

    draw_north_indian_chart(
        pdf, left_x, cur_y, chart_side,
        karakamsa["chart"], int(karakamsa["lagna_sign"]), lang,
    )
    draw_north_indian_chart(
        pdf, right_x, cur_y, chart_side,
        swamsa["chart"], int(swamsa["lagna_sign"]), lang,
    )
    cur_y += chart_side + 12

    # Karakas table.
    draw_text(pdf, margin, cur_y, "Chara Karakas (by degree-in-sign, descending)",
              LATIN_REGULAR, BOLD, 11)
    cur_y += 6

    headers = ["#", "Karaka", "Title", "Planet", "Sign", "Degree"]
    col_w = [inner_w * 0.06, inner_w * 0.10, inner_w * 0.24,
             inner_w * 0.16, inner_w * 0.20, inner_w * 0.24]
    row_h = 16
    n_rows = len(karakas) + 1

    pdf.set_line_width(0.3)
    pdf.rect(margin, cur_y, inner_w, row_h * n_rows)
    pdf.set_fill_color(230, 230, 230)
    pdf.rect(margin, cur_y, inner_w, row_h, "F")

    cx = margin
    for h, w in zip(headers, col_w):
        draw_text(pdf, cx + 6, cur_y + row_h - 5, h, LATIN_REGULAR, BOLD, 9)
        cx += w
    pdf.line(margin, cur_y + row_h, margin + inner_w, cur_y + row_h)

    for i, k in enumerate(karakas):
        y = cur_y + row_h * (i + 1)
        pdf.line(margin, y + row_h, margin + inner_w, y + row_h)
        cells = [
            str(k["rank"]),
            k["abbr"],
            k["title"],
            k["planet"],
            k["sign"],
            k.get("dms") or "",
        ]
        cx = margin
        for cell, w in zip(cells, col_w):
            draw_text(pdf, cx + 6, y + row_h - 5, cell,
                      LATIN_REGULAR, REGULAR, 9)
            cx += w

    cx = margin
    for w in col_w[:-1]:
        cx += w
        pdf.line(cx, cur_y, cx, cur_y + row_h * n_rows)
