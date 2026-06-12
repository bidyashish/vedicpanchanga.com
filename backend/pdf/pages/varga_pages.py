"""Render the Shodashvarga (sixteen-fold varga) chart pages.

Lays out all 16 divisional charts (D1 → D60) in a 2-col × 3-row grid,
6 charts per page, across 3 pages. Each cell shows D-number + varga name
+ subtitle on top of a North or South Indian style chart (per chart_style).
"""

from __future__ import annotations

from typing import Any, Dict, List

from fpdf import FPDF

from ..core.chart import draw_chart
from ..core.i18n import t, t_num
from ..core.text import (
    BOLD,
    DEV_REGULAR,
    LATIN_REGULAR,
    REGULAR,
    draw_text,
)


CHARTS_PER_PAGE = 6
COLS = 2
ROWS = 3


def _draw_page_header(
    pdf: FPDF, name: str, lang: str, page_no: int, total: int
) -> None:
    margin = 14
    page_w = pdf.w
    pdf.set_line_width(0.6)
    pdf.set_draw_color(0, 0, 0)
    pdf.rect(margin, margin, page_w - 2 * margin, 16)
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, margin + 6, margin + 11, name or "-", family, BOLD, 11)
    draw_text(
        pdf,
        page_w - margin - 6,
        margin + 11,
        f"Shodashvarga - {t_num(lang, page_no)}/{t_num(lang, total)}",
        LATIN_REGULAR,
        REGULAR,
        9,
        anchor="right",
    )


def draw_varga_pages(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
    chart_style: str = "north",
) -> None:
    vargas: Dict[str, Dict[str, Any]] = chart_data["vargas"]
    order: List[int] = chart_data["varga_order"]  # [1, 2, 3, ...]

    items: List[Dict[str, Any]] = []
    for n in order:
        v = vargas.get(f"d{n}")
        if not v:
            continue
        items.append(
            {
                "division": n,
                "chart": v["chart"],
                "asc_sign": v["asc_sign"],
                "name": v["name"],
                "subtitle": v.get("subtitle", ""),
            }
        )

    total_pages = (len(items) + CHARTS_PER_PAGE - 1) // CHARTS_PER_PAGE
    margin = 14
    page_w = pdf.w
    page_h = pdf.h
    inner_w = page_w - 2 * margin

    cell_w = (inner_w - (COLS - 1) * 8) / COLS
    avail_h = page_h - margin - 16 - 14 - margin  # header + footer space
    cell_h = (avail_h - (ROWS - 1) * 8) / ROWS

    chart_side = min(cell_w - 8, cell_h - 36)  # leave room for title strip
    chart_x_offset = (cell_w - chart_side) / 2

    for page_idx in range(total_pages):
        pdf.add_page()
        _draw_page_header(pdf, name, lang, page_idx + 1, total_pages)
        page_items = items[
            page_idx * CHARTS_PER_PAGE : (page_idx + 1) * CHARTS_PER_PAGE
        ]

        top = margin + 16 + 10
        for slot, item in enumerate(page_items):
            col = slot % COLS
            row = slot // COLS
            cx = margin + col * (cell_w + 8)
            cy = top + row * (cell_h + 8)

            # Title strip
            family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
            title_main = f"D{t_num(lang, item['division'])} - {item['name']}"
            draw_text(
                pdf,
                cx + cell_w / 2,
                cy + 11,
                title_main,
                family,
                BOLD,
                10,
                anchor="center",
            )
            if item["subtitle"]:
                draw_text(
                    pdf,
                    cx + cell_w / 2,
                    cy + 22,
                    item["subtitle"],
                    LATIN_REGULAR,
                    REGULAR,
                    8,
                    anchor="center",
                )

            chart_y = cy + 28
            draw_chart(
                pdf,
                cx + chart_x_offset,
                chart_y,
                chart_side,
                item["chart"],
                item["asc_sign"],
                lang,
                chart_style,
            )

        # Footer
        draw_text(
            pdf,
            page_w / 2,
            page_h - 8,
            t(lang, "footer"),
            (DEV_REGULAR if lang == "hi" else LATIN_REGULAR),
            REGULAR,
            7,
            anchor="center",
        )
