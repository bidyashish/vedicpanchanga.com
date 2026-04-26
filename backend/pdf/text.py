"""Font registration helpers for the PDF (fpdf2 backend).

fpdf2 has built-in HarfBuzz shaping when `set_text_shaping(True)` is enabled,
so Devanagari conjuncts and matra reordering work out of the box. We keep a
thin wrapper here so the rest of the package never deals with fpdf2 details
beyond the high-level font names.
"""

from __future__ import annotations

from pathlib import Path
from typing import Tuple

from fpdf import FPDF

FONT_DIR = Path(__file__).parent / "fonts"

DEV_REGULAR = "NotoDev"
LATIN_REGULAR = "NotoSans"

REGULAR = ""        # fpdf2 style codes
BOLD = "B"


def register_fonts(pdf: FPDF) -> None:
    """Add Devanagari + Latin Unicode TTFs and turn on text shaping.
    Idempotent. We use Noto Sans (Latin) instead of the base14 Helvetica so
    diacritics (ā, ś, ṣ), em-dashes and other Unicode chars render cleanly.
    """
    if "noto-registered" in getattr(pdf, "_panchanga_flags", set()):
        return
    pdf.add_font(DEV_REGULAR, REGULAR, str(FONT_DIR / "NotoSansDevanagari-Regular.ttf"))
    pdf.add_font(DEV_REGULAR, BOLD, str(FONT_DIR / "NotoSansDevanagari-Bold.ttf"))
    pdf.add_font(LATIN_REGULAR, REGULAR, str(FONT_DIR / "NotoSans-Regular.ttf"))
    pdf.add_font(LATIN_REGULAR, BOLD, str(FONT_DIR / "NotoSans-Bold.ttf"))
    pdf.set_text_shaping(use_shaping_engine=True)
    pdf._panchanga_flags = getattr(pdf, "_panchanga_flags", set()) | {"noto-registered"}


def is_devanagari(text: str) -> bool:
    return any("ऀ" <= ch <= "ॿ" for ch in text)


def font_for(text: str, lang: str, bold: bool = False) -> Tuple[str, str]:
    """Pick (family, style) appropriate for `text` and `lang`."""
    use_dev = is_devanagari(text) or lang == "hi"
    family = DEV_REGULAR if use_dev else LATIN_REGULAR
    style = BOLD if bold else REGULAR
    return family, style


def text_width(pdf: FPDF, text: str, family: str, style: str, size: float) -> float:
    """Width of `text` at the given font/size, in PDF user units (we use pt)."""
    pdf.set_font(family, style, size)
    return pdf.get_string_width(text)


def draw_text(
    pdf: FPDF,
    x: float, y: float,
    text: str,
    family: str, style: str, size: float,
    anchor: str = "left",
) -> float:
    """Draw `text` with baseline at (x, y). The `family` argument is
    advisory — we always pick NotoDev for Devanagari content and NotoSans
    for Latin/IAST content based on what's actually in the string. This
    avoids "char outside font range" errors for IAST diacritics like ṣ, ṁ.
    """
    if not text:
        return 0.0
    actual_family = DEV_REGULAR if is_devanagari(text) else LATIN_REGULAR
    pdf.set_font(actual_family, style, size)
    width = pdf.get_string_width(text)
    if anchor == "center":
        x -= width / 2
    elif anchor == "right":
        x -= width
    pdf.text(x, y, text)
    return width
