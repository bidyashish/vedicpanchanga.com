"""Detail pages: planet × varga sign matrix and a long-form planet positions
table that also lists each planet's varga signs across D1-D60.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fpdf import FPDF

from ..core.formatters import fmt_dms
from ..core.i18n import (
    DASHA_LORD_ABBR,
    DASHA_TOTAL_YEARS,
    PLANET_KEY_BY_NAME,
    SIGN_KEYS_BY_ID,
    t,
)
from ..core.text import (
    BOLD,
    DEV_REGULAR,
    LATIN_REGULAR,
    REGULAR,
    draw_text,
    is_devanagari,
)


def _fill(pdf: FPDF, r: int, g: int, b: int) -> None:
    pdf.set_fill_color(r, g, b)


def _draw_page_header(pdf: FPDF, name: str, lang: str, label: str) -> None:
    margin = 14
    page_w = pdf.w
    pdf.set_line_width(0.6)
    pdf.set_draw_color(0, 0, 0)
    pdf.rect(margin, margin, page_w - 2 * margin, 16)
    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, margin + 6, margin + 11, name or "—", family, BOLD, 11)
    draw_text(pdf, page_w - margin - 6, margin + 11, label,
              LATIN_REGULAR, REGULAR, 9, anchor="right")


PLANET_ROWS = [
    ("Sun", "Sun"),
    ("Moon", "Moon"),
    ("Mars", "Mars"),
    ("Mercury", "Merc"),
    ("Jupiter", "Jupt"),
    ("Venus", "Venu"),
    ("Saturn", "Satn"),
    ("Rahu", "Rahu"),
    ("Ketu", "Ketu"),
]


def draw_planet_varga_matrix(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    """One landscape-feeling table on a portrait page: planet rows × 16 varga
    columns, each cell = sign id 1..12 the planet falls in that varga.
    """
    pdf.add_page()
    _draw_page_header(pdf, name, lang, "Shodashvarga — Planet Matrix")

    margin = 14
    page_w = pdf.w
    cur_y = margin + 22

    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    title = "Planet × Varga Sign Matrix" if lang == "en" else "ग्रह × वर्ग राशि सारणी"
    draw_text(pdf, page_w / 2, cur_y + 10, title, family, BOLD, 12, anchor="center")
    cur_y += 18

    varga_order: List[int] = chart_data["varga_order"]
    planets = chart_data["planets_data"]

    # Headers: planet | D1 | D2 | ... | D60 (16 columns + 1 label = 17 cols)
    n_cols = 1 + len(varga_order)
    inner_w = page_w - 2 * margin
    label_w = inner_w * 0.10
    cell_w = (inner_w - label_w) / len(varga_order)
    rows = PLANET_ROWS
    n_rows = len(rows) + 1
    row_h = 14

    pdf.set_line_width(0.3)
    pdf.rect(margin, cur_y, inner_w, row_h * n_rows)

    # Header row
    _fill(pdf, 230, 230, 230)
    pdf.rect(margin, cur_y, inner_w, row_h, "F")
    f_h = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    label_h = "Planet" if lang == "en" else t(lang, "planets")
    draw_text(pdf, margin + label_w / 2, cur_y + row_h - 4, label_h,
              f_h, BOLD, 8, anchor="center")
    for i, n in enumerate(varga_order):
        cx = margin + label_w + i * cell_w + cell_w / 2
        draw_text(pdf, cx, cur_y + row_h - 4, f"D{n}",
                  LATIN_REGULAR, BOLD, 8, anchor="center")

    pdf.line(margin, cur_y + row_h, margin + inner_w, cur_y + row_h)

    for ri, (planet_name, abbr) in enumerate(rows):
        y = cur_y + row_h * (ri + 1)
        pdf.line(margin, y + row_h, margin + inner_w, y + row_h)
        pdat = next((p for p in planets if p["name"] == planet_name), None)
        if pdat is None:
            continue
        label = abbr if lang == "en" else t(lang, PLANET_KEY_BY_NAME[planet_name])
        f_p = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
        draw_text(pdf, margin + label_w / 2, y + row_h - 4, label,
                  f_p, BOLD, 8, anchor="center")
        for i, n in enumerate(varga_order):
            sign = pdat.get(f"d{n}_sign")
            cx = margin + label_w + i * cell_w + cell_w / 2
            draw_text(pdf, cx, y + row_h - 4, str(sign) if sign else "",
                      LATIN_REGULAR, REGULAR, 8, anchor="center")

    # Vertical column separators
    pdf.line(margin + label_w, cur_y, margin + label_w, cur_y + row_h * n_rows)
    for i in range(1, len(varga_order)):
        x = margin + label_w + i * cell_w
        pdf.line(x, cur_y, x, cur_y + row_h * n_rows)


def draw_planet_long_table(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    """Detailed planet positions table (sign + DMS + nakshatra-pada + retrograde
    + sign-lord). Standalone page so it can hold all the detail without
    competing with the Traditional page-1 layout."""
    pdf.add_page()
    _draw_page_header(pdf, name, lang, "Planetary Positions")

    margin = 14
    page_w = pdf.w
    cur_y = margin + 24

    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    title = t(lang, "planetary_positions")
    draw_text(pdf, page_w / 2, cur_y + 10, title, family, BOLD, 14, anchor="center")
    cur_y += 22

    headers = [
        ("Planet", 0.12),
        ("Sign", 0.13),
        ("Longitude", 0.13),
        ("Nakshatra", 0.16),
        ("Pada", 0.05),
        ("Lord", 0.10),
        ("Nak. Lord", 0.13),
        ("R", 0.04),
        ("House", 0.06),
    ]
    inner_w = page_w - 2 * margin
    col_widths = [inner_w * w for _, w in headers]

    asc = chart_data["ascendant"]
    planets = chart_data["planets_data"]

    rows: List[List[str]] = []
    rows.append([
        "ASC" if lang == "en" else t(lang, "abbr_as"),
        t(lang, SIGN_KEYS_BY_ID.get(asc["sign_id"], "")) or asc["sign"],
        fmt_dms(asc["degree_in_sign"]),
        asc["nakshatra"],
        str(asc.get("nakshatra_pada", "")),
        asc["sign_lord"],
        asc["nakshatra_lord"],
        "",
        "1",
    ])
    for p in planets:
        rows.append([
            p["name"][:4] if lang == "en" else t(lang, PLANET_KEY_BY_NAME[p["name"]]),
            t(lang, SIGN_KEYS_BY_ID.get(p["sign_id"], "")) or p["sign"],
            fmt_dms(p["degree_in_sign"]),
            p["nakshatra"],
            str(p.get("nakshatra_pada", "")),
            p["sign_lord"],
            p["nakshatra_lord"],
            "R" if p.get("retrograde") else "",
            str(p.get("house", "")),
        ])

    row_h = 14
    n_rows = len(rows) + 1
    pdf.set_line_width(0.3)
    pdf.rect(margin, cur_y, inner_w, row_h * n_rows)

    _fill(pdf, 230, 230, 230)
    pdf.rect(margin, cur_y, inner_w, row_h, "F")

    cx = margin
    for (label, _), w in zip(headers, col_widths):
        draw_text(pdf, cx + 4, cur_y + row_h - 4, label,
                  LATIN_REGULAR, BOLD, 8)
        cx += w
    pdf.line(margin, cur_y + row_h, margin + inner_w, cur_y + row_h)

    for ri, row in enumerate(rows):
        y = cur_y + row_h * (ri + 1)
        pdf.line(margin, y + row_h, margin + inner_w, y + row_h)
        cx = margin
        for ci, cell in enumerate(row):
            cell_str = "" if cell is None else str(cell)
            f = DEV_REGULAR if is_devanagari(cell_str) else LATIN_REGULAR
            draw_text(pdf, cx + 4, y + row_h - 4, cell_str, f, REGULAR, 8)
            cx += col_widths[ci]

    # Column separators
    cx = margin
    for w in col_widths[:-1]:
        cx += w
        pdf.line(cx, cur_y, cx, cur_y + row_h * n_rows)


def draw_dasha_long(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    """Full Vimshottari mahadasha listing on its own page (lord, total years,
    start, end). All 9 periods, more readable than the page-1 mini-grid."""
    from datetime import datetime as _dt

    pdf.add_page()
    _draw_page_header(pdf, name, lang, "Vimshottari Dasha")

    margin = 14
    page_w = pdf.w
    cur_y = margin + 24

    family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    title = t(lang, "vimshottari_dasha")
    draw_text(pdf, page_w / 2, cur_y + 10, title, family, BOLD, 14, anchor="center")
    cur_y += 22

    inner_w = page_w - 2 * margin
    col_w = [inner_w * 0.18, inner_w * 0.16, inner_w * 0.30, inner_w * 0.30]
    headers = ["Mahadasha", "Years", "From", "To"]
    rows: List[List[str]] = []
    for period in chart_data.get("dasha", []):
        lord = period["lord"]
        abbr = DASHA_LORD_ABBR.get(lord, lord[:3].upper())
        years = DASHA_TOTAL_YEARS.get(lord, int(round(period.get("years", 0))))
        start = _dt.fromisoformat(period["start"])
        end = _dt.fromisoformat(period["end"])
        label = abbr if lang == "en" else t(lang, PLANET_KEY_BY_NAME.get(lord, ""))
        rows.append([
            f"{label} ({abbr})",
            str(years),
            start.strftime("%d %b %Y  %H:%M"),
            end.strftime("%d %b %Y  %H:%M"),
        ])

    row_h = 16
    n_rows = len(rows) + 1
    pdf.set_line_width(0.3)
    pdf.rect(margin, cur_y, inner_w, row_h * n_rows)
    _fill(pdf, 230, 230, 230)
    pdf.rect(margin, cur_y, inner_w, row_h, "F")
    cx = margin
    for h, w in zip(headers, col_w):
        draw_text(pdf, cx + 6, cur_y + row_h - 5, h, LATIN_REGULAR, BOLD, 9)
        cx += w
    pdf.line(margin, cur_y + row_h, margin + inner_w, cur_y + row_h)

    for ri, row in enumerate(rows):
        y = cur_y + row_h * (ri + 1)
        pdf.line(margin, y + row_h, margin + inner_w, y + row_h)
        cx = margin
        for ci, cell in enumerate(row):
            f = DEV_REGULAR if is_devanagari(cell) else LATIN_REGULAR
            draw_text(pdf, cx + 6, y + row_h - 5, cell, f, REGULAR, 9)
            cx += col_w[ci]

    # Column separators
    cx = margin
    for w in col_w[:-1]:
        cx += w
        pdf.line(cx, cur_y, cx, cur_y + row_h * n_rows)
