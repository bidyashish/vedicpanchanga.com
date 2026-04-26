"""Friendship table + Kalsarpa Yoga (one page)."""

from __future__ import annotations

from typing import Any, Dict, List

from fpdf import FPDF

from ..core.layout import MARGIN, page_header, section_title
from ..core.text import BOLD, LATIN_REGULAR, REGULAR, draw_text


# Cell tints to make the matrix scannable. GF=green, F=light-green, N=parchment,
# E=light-pink, GE=red. Same colours work for the simpler F/N/E codes too.
CELL_FILL = {
    "GF": (200, 230, 200),
    "F": (224, 240, 224),
    "N": (245, 245, 235),
    "E": (250, 220, 220),
    "GE": (240, 180, 180),
    "": (255, 255, 255),
}


def _draw_matrix(
    pdf: FPDF,
    x: float,
    y: float,
    w: float,
    title: str,
    planets: List[str],
    matrix: Dict[str, Dict[str, str]],
) -> float:
    draw_text(pdf, x, y, title, LATIN_REGULAR, BOLD, 10)
    y += 6
    n = len(planets) + 1
    cell_w = w / n
    cell_h = 16

    pdf.set_line_width(0.3)
    pdf.set_draw_color(120, 120, 120)
    pdf.rect(x, y, cell_w * n, cell_h * n)

    pdf.set_fill_color(230, 230, 230)
    pdf.rect(x, y, cell_w * n, cell_h, "F")
    pdf.rect(x, y, cell_w, cell_h * n, "F")

    for j, p in enumerate(planets):
        cx = x + cell_w * (j + 1) + cell_w / 2
        draw_text(
            pdf, cx, y + cell_h - 5, p[:3], LATIN_REGULAR, BOLD, 8, anchor="center"
        )
        cy = y + cell_h * (j + 1) + cell_h - 5
        draw_text(
            pdf, x + cell_w / 2, cy, p[:3], LATIN_REGULAR, BOLD, 8, anchor="center"
        )

    for i, row_planet in enumerate(planets):
        for j, col_planet in enumerate(planets):
            cell_x = x + cell_w * (j + 1)
            cell_y = y + cell_h * (i + 1)
            code = matrix.get(row_planet, {}).get(col_planet, "")
            r, g, b = CELL_FILL.get(code, (255, 255, 255))
            pdf.set_fill_color(r, g, b)
            pdf.rect(cell_x, cell_y, cell_w, cell_h, "F")
            draw_text(
                pdf,
                cell_x + cell_w / 2,
                cell_y + cell_h - 5,
                code or "—",
                LATIN_REGULAR,
                REGULAR,
                8,
                anchor="center",
            )

    for k in range(1, n):
        pdf.line(x + cell_w * k, y, x + cell_w * k, y + cell_h * n)
        pdf.line(x, y + cell_h * k, x + cell_w * n, y + cell_h * k)

    return y + cell_h * n + 6


def _draw_legend(pdf: FPDF, x: float, y: float, labels: Dict[str, str]) -> float:
    draw_text(pdf, x, y, "Legend:", LATIN_REGULAR, BOLD, 9)
    cx = x + 50
    for code, name in labels.items():
        r, g, b = CELL_FILL.get(code, (255, 255, 255))
        pdf.set_fill_color(r, g, b)
        pdf.set_draw_color(120, 120, 120)
        pdf.rect(cx, y - 8, 14, 10, "DF")
        draw_text(pdf, cx + 18, y, f"{code} — {name}", LATIN_REGULAR, REGULAR, 8)
        cx += 18 + pdf.get_string_width(f"{code} — {name}") + 14
    return y + 12


def draw_friendship_page(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    fr = chart_data.get("friendships") or {}
    if not fr:
        return

    pdf.add_page()
    page_header(pdf, name, "Friendship Tables")

    page_w = pdf.w
    inner_w = page_w - 2 * MARGIN
    cur_y = section_title(
        pdf,
        MARGIN,
        MARGIN + 22,
        inner_w,
        "Planetary Friendship Tables",
        "Natural · Temporal (sign-position derived) · Composite (5-fold) — read row planet's view of column planet",
    )

    planets = fr["planets"]
    cur_y = _draw_matrix(
        pdf,
        MARGIN,
        cur_y,
        inner_w,
        "Natural Friendship (Naisargika)",
        planets,
        fr["natural"],
    )
    cur_y += 8
    cur_y = _draw_matrix(
        pdf,
        MARGIN,
        cur_y,
        inner_w,
        "Temporal Friendship (Tatkalika) — from current sign positions",
        planets,
        fr["temporal"],
    )
    cur_y += 8
    cur_y = _draw_matrix(
        pdf,
        MARGIN,
        cur_y,
        inner_w,
        "Composite Friendship (Panchadha) — natural × temporal",
        planets,
        fr["composite"],
    )
    cur_y += 6
    _draw_legend(pdf, MARGIN, cur_y, fr["labels"])


def draw_kalsarpa_page(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    ks = chart_data.get("kalsarpa") or {}
    if not ks:
        return

    pdf.add_page()
    page_header(pdf, name, "Kalsarpa Yoga")

    page_w = pdf.w
    inner_w = page_w - 2 * MARGIN
    cur_y = section_title(
        pdf,
        MARGIN,
        MARGIN + 22,
        inner_w,
        "Kalsarpa Yoga Analysis",
        "All seven visible planets confined to one arc between Rahu and Ketu",
    )

    if ks.get("present"):
        pdf.set_fill_color(255, 240, 230)
    else:
        pdf.set_fill_color(240, 245, 240)
    pdf.set_line_width(0.5)
    pdf.set_draw_color(180, 180, 180)
    pdf.rect(MARGIN, cur_y, inner_w, 28, "DF")
    draw_text(
        pdf, MARGIN + 10, cur_y + 17, ks.get("verdict", "—"), LATIN_REGULAR, BOLD, 12
    )
    cur_y += 40

    rows = [
        ("Type", ks.get("kind") or "—"),
        ("Direction", ks.get("direction") or "—"),
        (
            "Rahu in house (from Lagna)",
            str(ks.get("rahu_house")) if ks.get("rahu_house") is not None else "—",
        ),
        (
            "Ketu in house (from Lagna)",
            str(ks.get("ketu_house")) if ks.get("ketu_house") is not None else "—",
        ),
    ]
    label_w = inner_w * 0.55
    row_h = 18

    pdf.set_line_width(0.3)
    pdf.set_draw_color(180, 180, 180)
    pdf.rect(MARGIN, cur_y, inner_w, row_h * len(rows))
    pdf.line(MARGIN + label_w, cur_y, MARGIN + label_w, cur_y + row_h * len(rows))
    for i, (k, v) in enumerate(rows):
        y = cur_y + i * row_h
        if i % 2 == 1:
            pdf.set_fill_color(248, 248, 244)
            pdf.rect(MARGIN, y, inner_w, row_h, "F")
        if i > 0:
            pdf.line(MARGIN, y, MARGIN + inner_w, y)
        draw_text(pdf, MARGIN + 8, y + row_h - 6, k, LATIN_REGULAR, BOLD, 10)
        draw_text(
            pdf, MARGIN + label_w + 8, y + row_h - 6, v, LATIN_REGULAR, REGULAR, 10
        )
