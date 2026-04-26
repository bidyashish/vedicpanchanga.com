"""North Indian style square chart (fpdf2 backend, top-left origin)."""

from __future__ import annotations

from typing import Dict, List, Tuple

from fpdf import FPDF

from .i18n import ABBR_KEY_BY_ABBR, t
from .text import BOLD, DEV_REGULAR, LATIN_REGULAR, REGULAR, draw_text


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

    for h in range(1, 13):
        cx, cy = cells[h]
        sign_id = ((asc_sign_id - 1) + (h - 1)) % 12 + 1
        # Sign number above the planet text.
        draw_text(
            pdf,
            cx,
            cy - text_size * 0.3,
            str(sign_id),
            LATIN_REGULAR,
            REGULAR,
            sign_size,
            anchor="center",
        )
        abbrs: List[str] = chart.get(h) or chart.get(str(h)) or []
        if abbrs:
            joined = " ".join(t(lang, ABBR_KEY_BY_ABBR.get(a, a)) for a in abbrs)
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
