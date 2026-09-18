"""North and South Indian style square charts (fpdf2 backend, top-left
origin). `draw_chart` dispatches on style; Tamil reports default to the
South Indian fixed-sign layout."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

from fpdf import FPDF

from .i18n import t_num, tr_abbr
from .text import BOLD, DEV_REGULAR, LATIN_REGULAR, REGULAR, draw_text

OM_SVG = Path(__file__).resolve().parent.parent / "assets" / "om.svg"


def _centroid(*pts: Tuple[float, float]) -> Tuple[float, float]:
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def _midpoint(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def draw_north_indian_chart(
    pdf: FPDF,
    x0: float,
    y0: float,
    side: float,
    chart: Dict,
    asc_sign_id: int,
    lang: str,
) -> None:
    """Draw a square chart whose top-left corner sits at (x0, y0) and whose
    side length is `side`. Origin convention: y increases downward (fpdf2)."""
    W = side
    TL = (x0, y0)
    TR = (x0 + W, y0)
    BR = (x0 + W, y0 + W)
    BL = (x0, y0 + W)
    T = _midpoint(TL, TR)
    R = _midpoint(TR, BR)
    B = _midpoint(BR, BL)
    L = _midpoint(BL, TL)
    C = (x0 + W / 2, y0 + W / 2)

    pdf.set_line_width(0.6)
    pdf.set_draw_color(0, 0, 0)
    pdf.rect(x0, y0, W, W)
    pdf.line(*TL, *BR)
    pdf.line(*TR, *BL)
    pdf.line(*T, *R)
    pdf.line(*R, *B)
    pdf.line(*B, *L)
    pdf.line(*L, *T)

    # The two outer-square diagonals cross the diamond edges at their midpoints
    mLT = _midpoint(L, T)
    mTR = _midpoint(T, R)
    mRB = _midpoint(R, B)
    mBL = _midpoint(B, L)

    OFF = W * 0.13
    cells: Dict[int, Tuple[float, float]] = {
        # Kites: pulled slightly toward the outer side they face.
        1: (C[0], C[1] - OFF),  # top kite (y- = toward top)
        4: (C[0] - OFF, C[1]),  # left kite
        7: (C[0], C[1] + OFF),  # bottom kite
        10: (C[0] + OFF, C[1]),  # right kite
        2: _centroid(TL, T, mLT),  # upper-left, top
        3: _centroid(TL, mLT, L),  # upper-left, left
        5: _centroid(BL, L, mBL),  # lower-left, left
        6: _centroid(BL, mBL, B),  # lower-left, bottom
        8: _centroid(BR, B, mRB),  # lower-right, bottom
        9: _centroid(BR, mRB, R),  # lower-right, right
        11: _centroid(TR, R, mTR),  # upper-right, right
        12: _centroid(TR, mTR, T),  # upper-right, top
    }

    text_size = max(7.5, W / 22)
    sign_size = max(6.5, W / 30)

    # Same SVG OM as the frontend, centered on the chart, behind any planet text.
    # Opacity is baked into the SVG (fill-opacity) because fpdf2's set_alpha
    om_size = max(20.0, W / 5)
    pdf.image(
        str(OM_SVG), x=C[0] - om_size / 2, y=C[1] - om_size / 2, w=om_size, h=om_size
    )

    for h in range(1, 13):
        cx, cy = cells[h]
        sign_id = ((asc_sign_id - 1) + (h - 1)) % 12 + 1
        # Sign number above the planet text.
        draw_text(
            pdf,
            cx,
            cy - text_size * 0.3,
            t_num(lang, sign_id),
            LATIN_REGULAR,
            REGULAR,
            sign_size,
            anchor="center",
        )
        abbrs: List[str] = chart.get(h) or chart.get(str(h)) or []
        if abbrs:
            joined = " ".join(tr_abbr(lang, a) or a for a in abbrs)
            family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
            draw_text(
                pdf,
                cx,
                cy + text_size * 0.85,
                joined,
                family,
                BOLD,
                text_size,
                anchor="center",
            )


# Fixed sign → (col, row) grid positions, matching the frontend
# SouthIndianChart component: Aries on the second cell of the top row,
# signs running clockwise around the 4×4 perimeter.
SOUTH_CELLS: Dict[int, Tuple[int, int]] = {
    12: (0, 0),
    1: (1, 0),
    2: (2, 0),
    3: (3, 0),
    4: (3, 1),
    5: (3, 2),
    6: (3, 3),
    7: (2, 3),
    8: (1, 3),
    9: (0, 3),
    10: (0, 2),
    11: (0, 1),
}


def draw_south_indian_chart(
    pdf: FPDF,
    x0: float,
    y0: float,
    side: float,
    chart: Dict,
    asc_sign_id: int,
    lang: str,
) -> None:
    """Draw a South Indian (fixed-sign) chart: a 4×4 grid whose perimeter
    cells host the 12 signs in canonical positions, central 2×2 left open.
    The ascendant cell is marked with the traditional double diagonal."""
    W = side
    c = W / 4

    pdf.set_line_width(0.6)
    pdf.set_draw_color(0, 0, 0)
    pdf.rect(x0, y0, W, W)
    # Quarter lines run edge-to-edge; half lines stop at the central box.
    pdf.line(x0, y0 + c, x0 + W, y0 + c)
    pdf.line(x0, y0 + 3 * c, x0 + W, y0 + 3 * c)
    pdf.line(x0 + c, y0, x0 + c, y0 + W)
    pdf.line(x0 + 3 * c, y0, x0 + 3 * c, y0 + W)
    pdf.line(x0 + 2 * c, y0, x0 + 2 * c, y0 + c)
    pdf.line(x0 + 2 * c, y0 + 3 * c, x0 + 2 * c, y0 + W)
    pdf.line(x0, y0 + 2 * c, x0 + c, y0 + 2 * c)
    pdf.line(x0 + 3 * c, y0 + 2 * c, x0 + W, y0 + 2 * c)

    om_size = max(20.0, W / 5)
    pdf.image(
        str(OM_SVG),
        x=x0 + W / 2 - om_size / 2,
        y=y0 + W / 2 - om_size / 2,
        w=om_size,
        h=om_size,
    )

    text_size = max(6.5, W / 28)
    num_size = max(6.0, W / 32)
    line_h = text_size * 1.2
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR

    for h in range(1, 13):
        sign_id = ((asc_sign_id - 1) + (h - 1)) % 12 + 1
        col, row = SOUTH_CELLS[sign_id]
        cx = x0 + col * c
        cy = y0 + row * c

        # House number in the top-right corner of the cell.
        draw_text(
            pdf,
            cx + c - 2.5,
            cy + num_size + 2,
            t_num(lang, h),
            LATIN_REGULAR,
            REGULAR,
            num_size,
            anchor="right",
        )

        if sign_id == asc_sign_id:
            # Double diagonal across the top-left corner marks the lagna.
            f = c / 125.0
            pdf.set_line_width(1.0)
            pdf.line(cx + 1, cy + 12 * f, cx + 14 * f, cy)
            pdf.line(cx + 1, cy + 20 * f, cx + 24 * f, cy)
            pdf.set_line_width(0.6)

        abbrs: List[str] = chart.get(h) or chart.get(str(h)) or []
        if not abbrs:
            continue
        # Two abbreviations per row, the block vertically centred in the cell.
        rows = [abbrs[i : i + 2] for i in range(0, len(abbrs), 2)]
        base_y = cy + c / 2 + text_size * 0.35 - (len(rows) - 1) * line_h / 2
        for ri, pair in enumerate(rows):
            joined = " ".join(tr_abbr(lang, a) or a for a in pair)
            draw_text(
                pdf,
                cx + c / 2,
                base_y + ri * line_h,
                joined,
                family,
                BOLD,
                text_size,
                anchor="center",
            )


def draw_chart(
    pdf: FPDF,
    x0: float,
    y0: float,
    side: float,
    chart: Dict,
    asc_sign_id: int,
    lang: str,
    style: str = "north",
) -> None:
    """Style dispatcher used by every page that renders a rasi-style chart."""
    if style == "south":
        draw_south_indian_chart(pdf, x0, y0, side, chart, asc_sign_id, lang)
    else:
        draw_north_indian_chart(pdf, x0, y0, side, chart, asc_sign_id, lang)
