"""Page-section drawers for the Traditional layout (fpdf2 backend).

Origin convention: y grows downward (fpdf2). Each helper takes a top-left
corner + width/height and renders in-place. No astrological logic here -
that lives in `pdf.report` and the modules under `backend/`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fpdf import FPDF

from .dasha import DASHA_YEARS, lord_abbr
from .formatters import fmt_dms
from .i18n import t, t_num, tr_nakshatra, tr_planet, tr_sign
from .text import (
    BOLD,
    DEV_REGULAR,
    LATIN_REGULAR,
    REGULAR,
    draw_text,
    is_devanagari,
    text_width,
)


PLANET_ORDER_FOR_TABLE = [
    ("Ascendant", "ASC"),
    ("Sun", "Sun"),
    ("Moon", "Moon"),
    ("Mars", "Mars"),
    ("Mercury", "Merc"),
    ("Jupiter", "Jupt"),
    ("Venus", "Venu"),
    ("Saturn", "Satn"),
    ("Rahu", "Rahu"),
    ("Ketu", "Ketu"),
    ("Uranus", "Uran"),
    ("Neptune", "Nept"),
    ("Pluto", "Plut"),
]


def _stroke(pdf: FPDF, w: float = 0.6) -> None:
    pdf.set_line_width(w)
    pdf.set_draw_color(0, 0, 0)


def _fill(pdf: FPDF, r: int, g: int, b: int) -> None:
    pdf.set_fill_color(r, g, b)


# ---------------------------------------------------------------- header --


def draw_header(pdf: FPDF, x: float, y: float, w: float, name: str, lang: str) -> None:
    _stroke(pdf)
    pdf.rect(x, y, w, 16)
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, x + 6, y + 11, name or "-", family, BOLD, 11)
    draw_text(
        pdf,
        x + w - 6,
        y + 11,
        "vedicpanchanga.com",
        LATIN_REGULAR,
        REGULAR,
        9,
        anchor="right",
    )


def draw_title_bar(pdf: FPDF, x: float, y: float, w: float, lang: str) -> None:
    _stroke(pdf)
    pdf.rect(x, y, w, 22)
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    title = t(lang, "title_traditional")
    draw_text(pdf, x + w / 2, y + 16, title, family, BOLD, 14, anchor="center")


# ----------------------------------------------------- basic details box --


def draw_basic_details(
    pdf: FPDF,
    x: float,
    y: float,
    w: float,
    h: float,
    rows: List[Any],
    lang: str,
) -> None:
    """4-column × 6-row label/value grid. `rows` is an ordered list of
    `(label_key, value_str)` pairs."""
    _stroke(pdf)
    pdf.rect(x, y, w, h)

    label_size = 8.0
    value_size = 8.0
    cols = 4
    col_w = w / cols
    rows_per_col = 6
    row_h = (h - 8) / rows_per_col
    pad = 6

    for idx, (lkey, val) in enumerate(rows):
        col = idx // rows_per_col
        row = idx % rows_per_col
        cx = x + col * col_w + pad
        cy = y + 12 + row * row_h
        inner_right = cx + col_w - 2 * pad  # right edge inside this column
        label = t(lang, lkey)
        l_family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
        # Long localized labels (Tamil especially) overrun the fixed value
        # column; shrink the label a little, then push the value right
        # rather than draw it over the label.
        l_size = label_size
        lw = text_width(pdf, label, l_family, BOLD, l_size)
        max_label_w = (col_w - 2 * pad) * 0.58
        if lw > max_label_w:
            l_size = max(6.0, l_size * max_label_w / lw)
        label_w = draw_text(pdf, cx, cy, label, l_family, BOLD, l_size)

        val_str = "" if val is None else str(val)
        if not val_str:
            continue
        v_family = DEV_REGULAR if is_devanagari(val_str) else LATIN_REGULAR
        val_x = max(cx + col_w * 0.42, cx + label_w + 4)
        v_size = value_size
        vw = text_width(pdf, val_str, v_family, REGULAR, v_size)
        if vw > inner_right - val_x:
            v_size = max(6.0, v_size * (inner_right - val_x) / vw)
        draw_text(pdf, val_x, cy, val_str, v_family, REGULAR, v_size)


# ---------------------------------------------------- Vimshottari Dasha --


def draw_dasha_block(
    pdf: FPDF,
    x: float,
    y: float,
    w: float,
    h: float,
    periods: List[Dict[str, Any]],
    lang: str,
) -> None:
    title = t(lang, "vimshottari_dasha")
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, x + w / 2, y + 12, title, family, BOLD, 11, anchor="center")

    inner_top = y + 18
    grid_h = h - 18
    cols, rows = 3, 3
    cw = w / cols
    rh = grid_h / rows

    for i, period in enumerate(periods[:9]):
        col = i % cols
        row = i // cols
        bx = x + col * cw + 2
        by = inner_top + row * rh + 2
        bw = cw - 4
        bh = rh - 4
        _draw_dasha_cell(pdf, bx, by, bw, bh, period, lang)


def _draw_dasha_cell(pdf, x, y, w, h, period, lang):
    pdf.set_line_width(0.3)
    pdf.rect(x, y, w, h)
    lord = period["lord"]
    years = DASHA_YEARS.get(lord, int(round(period.get("years", 0))))
    start = datetime.fromisoformat(period["start"])
    end = datetime.fromisoformat(period["end"])
    title = f"{lord_abbr(lord)} -{t_num(lang, years)} {t(lang, 'years_short')}"
    dates = t_num(lang, f"{start.strftime('%d/%m/%y')} - {end.strftime('%d/%m/%y')}")
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, x + w / 2, y + 11, title, family, BOLD, 8.0, anchor="center")
    draw_text(
        pdf, x + w / 2, y + 20, dates, LATIN_REGULAR, REGULAR, 7.0, anchor="center"
    )


# ---------------------------------------------------- Planet positions --


def draw_planets_table(
    pdf: FPDF,
    x: float,
    y: float,
    w: float,
    h: float,
    planets: List[Dict[str, Any]],
    asc: Dict[str, Any],
    lang: str,
) -> None:
    title = t(lang, "planetary_positions")
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, x + 4, y + 11, title, family, BOLD, 9.5)

    rows: List[List[str]] = []
    for long_name, abbr in PLANET_ORDER_FOR_TABLE:
        if long_name == "Ascendant":
            p = asc
            name_disp = "ASC" if lang == "en" else t(lang, "abbr_as")
        else:
            p = next((pl for pl in planets if pl["name"] == long_name), None)
            if p is None:
                continue
            name_disp = abbr if lang == "en" else tr_planet(lang, long_name)
        if p.get("retrograde"):
            name_disp += " [R]"
        sign_disp = tr_sign(lang, p["sign_id"]) or p["sign"]
        nak_disp = tr_nakshatra(lang, p["nakshatra"])
        rows.append(
            [
                name_disp,
                sign_disp,
                t_num(lang, fmt_dms(p["degree_in_sign"])),
                nak_disp,
                t_num(lang, p.get("nakshatra_pada", "")),
            ]
        )

    headers = [
        t(lang, "planets"),
        t(lang, "sign"),
        t(lang, "longitude_dms"),
        t(lang, "nakshatra"),
        t(lang, "pada"),
    ]
    col_w = [w * 0.20, w * 0.22, w * 0.22, w * 0.24, w * 0.12]
    body_top = y + 16
    n_rows = len(rows) + 1
    row_h = (h - 16) / n_rows

    # Outer border
    pdf.set_line_width(0.3)
    pdf.rect(x, body_top, w, row_h * n_rows)

    # Header strip
    _fill(pdf, 230, 230, 230)
    pdf.rect(x, body_top, w, row_h, "F")
    cx = x
    f_h = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    for i, htxt in enumerate(headers):
        draw_text(pdf, cx + 4, body_top + row_h - 3, htxt, f_h, BOLD, 7.5)
        cx += col_w[i]
    pdf.line(x, body_top + row_h, x + w, body_top + row_h)

    for ri, row in enumerate(rows):
        cy = body_top + row_h * (ri + 2) - 3
        cx = x
        for ci, cell in enumerate(row):
            cell_str = "" if cell is None else str(cell)
            f = DEV_REGULAR if is_devanagari(cell_str) else LATIN_REGULAR
            draw_text(pdf, cx + 4, cy, cell_str, f, REGULAR, 7.5)
            cx += col_w[ci]


# --------------------------------------------------------- Ashtakavarga --


def draw_ashtakavarga(
    pdf: FPDF, x: float, y: float, w: float, h: float, av: Dict[str, Any], lang: str
) -> None:
    title = t(lang, "ashtakvarga_table")
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, x + 4, y + 11, title, family, BOLD, 9.5)

    bav = av.get("bav", {})
    sav = av.get("sav", [0] * 12)
    planet_order = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

    cols = 13
    col_w = w / cols
    n_rows = len(planet_order) + 2  # header + planets + total
    body_top = y + 16
    row_h = (h - 16) / n_rows

    pdf.set_line_width(0.3)
    pdf.rect(x, body_top, w, row_h * n_rows)

    _fill(pdf, 230, 230, 230)
    pdf.rect(x, body_top, w, row_h, "F")
    f_h = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(
        pdf,
        x + col_w / 2,
        body_top + row_h - 3,
        t(lang, "sign_no"),
        f_h,
        BOLD,
        7,
        anchor="center",
    )
    for i in range(12):
        draw_text(
            pdf,
            x + col_w * (i + 1.5),
            body_top + row_h - 3,
            t_num(lang, i + 1),
            f_h,
            BOLD,
            7,
            anchor="center",
        )
    pdf.line(x, body_top + row_h, x + w, body_top + row_h)

    for ri, name in enumerate(planet_order):
        rowy = body_top + row_h * (ri + 1)
        pdf.line(x, rowy + row_h, x + w, rowy + row_h)
        label = name[:3] if lang == "en" else tr_planet(lang, name)
        f_p = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
        draw_text(
            pdf, x + col_w / 2, rowy + row_h - 3, label, f_p, BOLD, 7, anchor="center"
        )
        for i, v in enumerate(bav.get(name, [0] * 12)):
            draw_text(
                pdf,
                x + col_w * (i + 1.5),
                rowy + row_h - 3,
                t_num(lang, v),
                LATIN_REGULAR,
                REGULAR,
                7,
                anchor="center",
            )

    rowy = body_top + row_h * (n_rows - 1)
    _fill(pdf, 240, 240, 240)
    pdf.rect(x, rowy, w, row_h, "F")
    f_t = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(
        pdf,
        x + col_w / 2,
        rowy + row_h - 3,
        t(lang, "total"),
        f_t,
        BOLD,
        7,
        anchor="center",
    )
    for i, v in enumerate(sav):
        draw_text(
            pdf,
            x + col_w * (i + 1.5),
            rowy + row_h - 3,
            t_num(lang, v),
            LATIN_REGULAR,
            BOLD,
            7,
            anchor="center",
        )
