"""Font registration helpers for the PDF (fpdf2 backend).

fpdf2 has built-in HarfBuzz shaping when `set_text_shaping(True)` is enabled,
so Devanagari conjuncts and matra reordering work out of the box. We keep a
thin wrapper here so the rest of the package never deals with fpdf2 details
beyond the high-level font names.

Five font families are registered to cover the nine languages we ship:
  NotoSans   — Latin + IAST (en, es, de, pt, fr)
  NotoDev    — Devanagari (hi)
  NotoTamil  — Tamil block (ta)
  NotoSC     — Han for Simplified Chinese (zh)
  NotoJP     — Hiragana / Katakana + Han for Japanese (ja)

draw_text() auto-detects the dominant script per text run and overrides the
caller's `family` hint when the string actually contains glyphs from a
non-Latin block. Callers therefore don't need to think about script dispatch.
"""

from __future__ import annotations

from pathlib import Path
from typing import Tuple

from fpdf import FPDF

FONT_DIR = Path(__file__).resolve().parent.parent / "fonts"

LATIN_REGULAR = "NotoSans"
DEV_REGULAR = "NotoDev"
TAMIL_REGULAR = "NotoTamil"
SC_REGULAR = "NotoSC"
JP_REGULAR = "NotoJP"

REGULAR = ""        # fpdf2 style codes
BOLD = "B"


def register_fonts(pdf: FPDF) -> None:
    """Add all script TTF/OTFs and turn on text shaping. Idempotent.

    For CJK we ship Regular only and alias it under both REGULAR and BOLD
    style keys — bold weight isn't critical for the few CJK headings we
    draw, and skipping the bold .otf saves ~13 MB of binary on disk.
    """
    if "noto-registered" in getattr(pdf, "_panchanga_flags", set()):
        return
    # Latin + IAST diacritics
    pdf.add_font(LATIN_REGULAR, REGULAR, str(FONT_DIR / "NotoSans-Regular.ttf"))
    pdf.add_font(LATIN_REGULAR, BOLD, str(FONT_DIR / "NotoSans-Bold.ttf"))
    # Devanagari (Hindi)
    pdf.add_font(DEV_REGULAR, REGULAR, str(FONT_DIR / "NotoSansDevanagari-Regular.ttf"))
    pdf.add_font(DEV_REGULAR, BOLD, str(FONT_DIR / "NotoSansDevanagari-Bold.ttf"))
    # Tamil
    pdf.add_font(TAMIL_REGULAR, REGULAR, str(FONT_DIR / "NotoSansTamil-Regular.ttf"))
    pdf.add_font(TAMIL_REGULAR, BOLD, str(FONT_DIR / "NotoSansTamil-Bold.ttf"))
    # Simplified Chinese — alias Regular under both keys (no bold .otf shipped)
    pdf.add_font(SC_REGULAR, REGULAR, str(FONT_DIR / "NotoSansSC-Regular.otf"))
    pdf.add_font(SC_REGULAR, BOLD, str(FONT_DIR / "NotoSansSC-Regular.otf"))
    # Japanese — same single-weight pattern
    pdf.add_font(JP_REGULAR, REGULAR, str(FONT_DIR / "NotoSansJP-Regular.otf"))
    pdf.add_font(JP_REGULAR, BOLD, str(FONT_DIR / "NotoSansJP-Regular.otf"))
    pdf.set_text_shaping(use_shaping_engine=True)
    pdf._panchanga_flags = getattr(pdf, "_panchanga_flags", set()) | {"noto-registered"}


def is_devanagari(text: str) -> bool:
    return any("ऀ" <= ch <= "ॿ" for ch in text)


def _script_of(text: str) -> str:
    """Return the dominant non-Latin script in `text`.

    Returns one of: 'deva', 'tamil', 'jp', 'cn', 'latin'. Hiragana or
    Katakana wins outright (→ 'jp'); a string of pure Han characters
    returns 'cn' and the caller's `lang` decides whether to use the
    Japanese face instead (since the Han block is shared).
    """
    has_han = False
    for ch in text:
        if "ऀ" <= ch <= "ॿ":
            return "deva"
        if "஀" <= ch <= "௿":
            return "tamil"
        if "぀" <= ch <= "ヿ":  # Hiragana + Katakana
            return "jp"
        if "一" <= ch <= "鿿":
            has_han = True
    return "cn" if has_han else "latin"


def _family_for(text: str, lang: str = "en") -> str:
    """Pick the font family for `text`. `lang` only matters for Han
    disambiguation — pure-Latin runs always render in NotoSans regardless
    of page language, which keeps numerals consistent across locales."""
    script = _script_of(text)
    if script == "deva":
        return DEV_REGULAR
    if script == "tamil":
        return TAMIL_REGULAR
    if script == "jp":
        return JP_REGULAR
    if script == "cn":
        return JP_REGULAR if lang == "ja" else SC_REGULAR
    return LATIN_REGULAR


def font_for(text: str, lang: str, bold: bool = False) -> Tuple[str, str]:
    """Pick (family, style) appropriate for `text` and `lang`."""
    return _family_for(text, lang), BOLD if bold else REGULAR


def text_width(pdf: FPDF, text: str, family: str, style: str, size: float) -> float:
    """Width of `text` at the given font/size, in PDF user units (we use pt)."""
    pdf.set_font(family, style, size)
    return pdf.get_string_width(text)


def _split_runs(text: str, lang: str):
    """Yield (family, segment) pairs by walking `text` and breaking at every
    script boundary. Required because no single font in our stack covers
    both IAST diacritics (ā, ś, ṁ — Latin Extended-A/Additional) AND CJK
    ideographs simultaneously, so a label like "Rāśi 主星" must be split
    into a Latin run and a Han run rendered with their respective fonts."""
    cur_family: str | None = None
    cur_seg = ""
    for ch in text:
        fam = _family_for(ch, lang)
        if fam != cur_family:
            if cur_seg:
                yield cur_family, cur_seg
            cur_family = fam
            cur_seg = ch
        else:
            cur_seg += ch
    if cur_seg:
        yield cur_family, cur_seg


def draw_text(
    pdf: FPDF,
    x: float, y: float,
    text: str,
    family: str, style: str, size: float,
    anchor: str = "left",
    lang: str = "en",
) -> float:
    """Draw `text` with baseline at (x, y).

    Splits `text` into per-script runs and renders each with the appropriate
    Noto family — so a mixed string like "Rāśi 主星" picks NotoSans for the
    Latin/IAST head and NotoSC for the Han tail, and Devanagari conjuncts
    still get HarfBuzz-shaped within their own run.

    The `family` argument is advisory and is overridden by the per-run
    dispatch. `lang` disambiguates pure-Han runs (zh→SC, ja→JP)."""
    if not text:
        return 0.0
    runs = list(_split_runs(text, lang))

    total_width = 0.0
    for fam, seg in runs:
        pdf.set_font(fam, style, size)
        total_width += pdf.get_string_width(seg)

    if anchor == "center":
        x -= total_width / 2
    elif anchor == "right":
        x -= total_width

    cursor = x
    for fam, seg in runs:
        pdf.set_font(fam, style, size)
        seg_width = pdf.get_string_width(seg)
        pdf.text(cursor, y, seg)
        cursor += seg_width
    return total_width
