"""Rendering primitives shared by every PDF page (font registration, text
shaping, layout chrome, formatters, locale labels, chart drawing, page-1
section components). Re-exports the most common symbols so detail pages
can use a single `from ..core import …` line."""

from .chart import draw_north_indian_chart
from .dasha import DASHA_LORD_ABBR, DASHA_YEARS, lord_abbr
from .formatters import (
    fmt_ayan,
    fmt_dasha_balance,
    fmt_date_dmy,
    fmt_dms,
    fmt_hms_local,
    fmt_lat,
    fmt_lon,
    local_sidereal_time,
)
from .i18n import (
    t,
    tr_abbr,
    tr_planet,
    tr_sign,
    tr_weekday,
)
from .layout import (
    ACCENT_RGB,
    HEADER_RGB,
    MARGIN,
    RULE_RGB,
    ZEBRA_RGB,
    page_footer,
    page_header,
    section_title,
)
from .sections import (
    draw_ashtakavarga,
    draw_basic_details,
    draw_dasha_block,
    draw_header,
    draw_planets_table,
    draw_title_bar,
)
from .text import (
    BOLD,
    DEV_REGULAR,
    JP_REGULAR,
    LATIN_REGULAR,
    REGULAR,
    SC_REGULAR,
    TAMIL_REGULAR,
    draw_text,
    is_devanagari,
    register_fonts,
)

__all__ = [
    # chart
    "draw_north_indian_chart",
    # dasha
    "DASHA_LORD_ABBR",
    "DASHA_YEARS",
    "lord_abbr",
    # formatters
    "fmt_ayan",
    "fmt_dasha_balance",
    "fmt_date_dmy",
    "fmt_dms",
    "fmt_hms_local",
    "fmt_lat",
    "fmt_lon",
    "local_sidereal_time",
    # i18n
    "t",
    "tr_abbr",
    "tr_planet",
    "tr_sign",
    "tr_weekday",
    # layout
    "ACCENT_RGB",
    "HEADER_RGB",
    "MARGIN",
    "RULE_RGB",
    "ZEBRA_RGB",
    "page_footer",
    "page_header",
    "section_title",
    # sections (page-1 components)
    "draw_ashtakavarga",
    "draw_basic_details",
    "draw_dasha_block",
    "draw_header",
    "draw_planets_table",
    "draw_title_bar",
    # text
    "BOLD",
    "DEV_REGULAR",
    "JP_REGULAR",
    "LATIN_REGULAR",
    "REGULAR",
    "SC_REGULAR",
    "TAMIL_REGULAR",
    "draw_text",
    "is_devanagari",
    "register_fonts",
]
