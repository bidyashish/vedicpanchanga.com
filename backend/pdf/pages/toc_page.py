"""Index page — placed last so each section's actual page number is known."""

from __future__ import annotations

from typing import List, Tuple

from fpdf import FPDF

from ..core.layout import MARGIN, page_header, section_title
from ..core.text import BOLD, LATIN_REGULAR, REGULAR, draw_text


def draw_toc_page(pdf: FPDF, name: str, sections: List[Tuple[str, int]]) -> None:
    if not sections:
        return
    pdf.add_page()
    page_header(pdf, name, "Index")

    inner_w = pdf.w - 2 * MARGIN
    cur_y = MARGIN + 22
    cur_y = section_title(pdf, MARGIN, cur_y, inner_w,
                          "Index of Sections",
                          "Click or scroll to the listed page")

    row_h = 18
    pdf.set_line_width(0.3)
    pdf.set_draw_color(220, 220, 220)
    for i, (label, page_no) in enumerate(sections):
        if i % 2 == 1:
            pdf.set_fill_color(248, 248, 244)
            pdf.rect(MARGIN, cur_y, inner_w, row_h, "F")
        draw_text(pdf, MARGIN + 8, cur_y + row_h - 5, label,
                  LATIN_REGULAR, REGULAR, 10)
        draw_text(pdf, MARGIN + inner_w - 8, cur_y + row_h - 5, str(page_no),
                  LATIN_REGULAR, BOLD, 10, anchor="right")
        cur_y += row_h
        pdf.line(MARGIN, cur_y, MARGIN + inner_w, cur_y)
