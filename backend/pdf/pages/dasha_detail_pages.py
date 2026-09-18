"""Detailed Vimshottari pages: Antardasha grid (one page) and Pratyantar
catalogue (paginated)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fpdf import FPDF

from dasha_extras import compute_pratyantars

from ..core.dasha import lord_abbr
from ..core.i18n import t, t_num
from ..core.layout import MARGIN, page_header, section_title
from ..core.text import BOLD, LATIN_REGULAR, REGULAR, draw_text


PAGE_LABEL_ANTAR = "Vimshottari Dasha - Antardasha"
PAGE_LABEL_PRATY = "Vimshottari Dasha - Pratyantar"


def _fmt_date_short(iso: str) -> str:
    """`1985-07-01T00:00:00` → `1/ 7/85` (matching AstroSage compact style)."""
    try:
        d = datetime.fromisoformat(iso)
    except Exception:
        return iso
    return f"{d.day:>2}/{d.month:>2}/{d.year % 100:02d}"


def _draw_block(
    pdf: FPDF,
    x: float,
    y: float,
    w: float,
    title: str,
    subtitle: str,
    rows: List[tuple],
) -> float:
    """Draw one Mahadasha-or-Antardasha block. Returns the block height used."""
    line_h = 10
    body_h = line_h * len(rows)
    head_h = 22
    block_h = head_h + body_h + 4

    pdf.set_line_width(0.3)
    pdf.set_draw_color(120, 120, 120)
    pdf.rect(x, y, w, block_h)

    pdf.set_fill_color(235, 235, 235)
    pdf.rect(x, y, w, head_h, "F")
    draw_text(pdf, x + w / 2, y + 9, title, LATIN_REGULAR, BOLD, 9, anchor="center")
    draw_text(
        pdf, x + w / 2, y + 18, subtitle, LATIN_REGULAR, REGULAR, 7, anchor="center"
    )

    pdf.line(x, y + head_h, x + w, y + head_h)

    for i, (label, end_date) in enumerate(rows):
        ry = y + head_h + 2 + i * line_h + line_h - 3
        draw_text(pdf, x + 8, ry, label, LATIN_REGULAR, BOLD, 8)
        draw_text(
            pdf, x + w - 8, ry, end_date, LATIN_REGULAR, REGULAR, 8, anchor="right"
        )

    return block_h


def draw_antardasha_page(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    """Grid of 9 Mahadasha blocks, each listing its 9 Antardasha end-dates."""
    mahadashas = chart_data.get("dasha_antar") or []
    if not mahadashas:
        return

    pdf.add_page()
    page_header(pdf, name, PAGE_LABEL_ANTAR)

    page_w = pdf.w
    inner_w = page_w - 2 * MARGIN
    title = t(lang, "vimshottari_antardasha_title")
    cur_y = section_title(
        pdf,
        MARGIN,
        MARGIN + 22,
        inner_w,
        title,
        "Each Mahadasha block lists its 9 Antardasha sub-period end dates",
    )

    # 3×3 grid of blocks
    cols = 3
    gap = 6
    block_w = (inner_w - gap * (cols - 1)) / cols

    birth_dt = datetime.fromisoformat(chart_data["birth"]["utc_time"]).replace(
        tzinfo=None
    )

    row_block_h = 0
    for idx, md in enumerate(mahadashas):
        col = idx % cols
        if col == 0 and idx > 0:
            cur_y += row_block_h + gap
            row_block_h = 0
        bx = MARGIN + col * (block_w + gap)
        years = (
            datetime.fromisoformat(md["end"]) - datetime.fromisoformat(md["start"])
        ).days / 365.25
        title_str = f"{lord_abbr(md['lord'])} - {t_num(lang, round(years, 1))} yr"
        subtitle = t_num(
            lang, f"{_fmt_date_short(md['start'])} to {_fmt_date_short(md['end'])}"
        )
        rows = []
        for ad in md["antardashas"]:
            ad_end = datetime.fromisoformat(ad["end"])
            elapsed_at_birth = ad_end <= birth_dt
            end_str = "00/00/00" if elapsed_at_birth else _fmt_date_short(ad["end"])
            rows.append((lord_abbr(ad["lord"]), t_num(lang, end_str)))
        h = _draw_block(pdf, bx, cur_y, block_w, title_str, subtitle, rows)
        row_block_h = max(row_block_h, h)


def draw_pratyantar_pages(
    pdf: FPDF,
    chart_data: Dict[str, Any],
    name: str,
    lang: str,
) -> None:
    """For every Antardasha, draw a small block listing its 9 pratyantar end-dates.
    Auto-paginates across as many A4 pages as needed."""
    mahadashas = chart_data.get("dasha_antar") or []
    if not mahadashas:
        return

    page_w = pdf.w
    page_h = pdf.h
    inner_w = page_w - 2 * MARGIN

    cols = 3
    gap = 6
    block_w = (inner_w - gap * (cols - 1)) / cols
    line_h = 10
    head_h = 22
    body_h = line_h * 9
    block_h = head_h + body_h + 4

    title = t(lang, "vimshottari_pratyantar_title")

    page_no = 0
    cur_y = 0
    row_block_h = 0
    cur_col = 0

    def _new_page() -> None:
        nonlocal page_no, cur_y, row_block_h, cur_col
        page_no += 1
        pdf.add_page()
        page_header(pdf, name, f"{PAGE_LABEL_PRATY} - page {page_no}")
        cur_y = section_title(
            pdf,
            MARGIN,
            MARGIN + 22,
            inner_w,
            title,
            "Each Antardasha block lists its 9 Pratyantar sub-period end dates",
        )
        row_block_h = 0
        cur_col = 0

    _new_page()
    birth_dt = datetime.fromisoformat(chart_data["birth"]["utc_time"]).replace(
        tzinfo=None
    )

    for md in mahadashas:
        for ad in md["antardashas"]:
            ad_end = datetime.fromisoformat(ad["end"])
            if ad_end <= birth_dt:
                # Antardasha already elapsed at birth → skip; nothing useful to show.
                continue
            if cur_col == 0 and cur_y + block_h > page_h - MARGIN - 14:
                _new_page()
            if cur_col >= cols:
                cur_y += row_block_h + gap
                cur_col = 0
                row_block_h = 0
                if cur_y + block_h > page_h - MARGIN - 14:
                    _new_page()

            bx = MARGIN + cur_col * (block_w + gap)
            title_str = f"{lord_abbr(md['lord'])} - {lord_abbr(ad['lord'])}"
            subtitle = t_num(
                lang, f"{_fmt_date_short(ad['start'])} to {_fmt_date_short(ad['end'])}"
            )
            pratyantars = compute_pratyantars(ad)
            rows = [
                (lord_abbr(p["lord"]), t_num(lang, _fmt_date_short(p["end"])))
                for p in pratyantars
            ]
            h = _draw_block(pdf, bx, cur_y, block_w, title_str, subtitle, rows)
            row_block_h = max(row_block_h, h)
            cur_col += 1
        # End of mahadasha: force next mahadasha onto a fresh row for visual grouping.
        if cur_col != 0:
            cur_y += row_block_h + gap
            cur_col = 0
            row_block_h = 0
