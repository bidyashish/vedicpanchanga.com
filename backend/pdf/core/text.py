"""Font registration helpers for the PDF (fpdf2 backend).

fpdf2 has built-in HarfBuzz shaping when `set_text_shaping(True)` is enabled,
so Devanagari conjuncts, Arabic ligature joining and matra reordering work
out of the box. We keep a thin wrapper here so the rest of the package
never deals with fpdf2 details beyond the high-level font names.

Eight font families are registered to cover the fifteen languages we ship:
  NotoSans    — Latin + IAST + Cyrillic (en, es, de, pt, fr, ru)
  NotoDev     — Devanagari (hi, ne)
  NotoTamil   — Tamil block (ta)
  NotoBengali — Bengali block (bn)
  NotoArabic  — Arabic block (ar, fa)
  NotoHebrew  — Hebrew block (he)
  NotoSC      — Han for Simplified Chinese (zh)
  NotoJP      — Hiragana / Katakana + Han for Japanese (ja)

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
BENGALI_REGULAR = "NotoBengali"
ARABIC_REGULAR = "NotoArabic"
HEBREW_REGULAR = "NotoHebrew"
SC_REGULAR = "NotoSC"
JP_REGULAR = "NotoJP"

REGULAR = ""  # fpdf2 style codes
BOLD = "B"


# Per-family TTF/OTF sources for lazy registration. Parsing a face with
# fontTools inside add_font is the single most expensive part of a render
# (~150ms each, >1s for all eight), so faces are only added the first time
# a text run actually needs their script.
# For CJK we ship Regular only and alias it under both REGULAR and BOLD
# style keys - bold weight isn't critical for the few CJK headings we
# draw, and skipping the bold .otf saves ~13 MB of binary on disk.
FONT_FILES = {
    # Latin + IAST diacritics + Cyrillic (covers ru without an extra font)
    LATIN_REGULAR: {REGULAR: "NotoSans-Regular.ttf", BOLD: "NotoSans-Bold.ttf"},
    # Devanagari (Hindi, Nepali)
    DEV_REGULAR: {
        REGULAR: "NotoSansDevanagari-Regular.ttf",
        BOLD: "NotoSansDevanagari-Bold.ttf",
    },
    TAMIL_REGULAR: {
        REGULAR: "NotoSansTamil-Regular.ttf",
        BOLD: "NotoSansTamil-Bold.ttf",
    },
    BENGALI_REGULAR: {
        REGULAR: "NotoSansBengali-Regular.ttf",
        BOLD: "NotoSansBengali-Bold.ttf",
    },
    # Arabic (covers ar + fa - Persian uses the Arabic script)
    ARABIC_REGULAR: {
        REGULAR: "NotoSansArabic-Regular.ttf",
        BOLD: "NotoSansArabic-Bold.ttf",
    },
    HEBREW_REGULAR: {
        REGULAR: "NotoSansHebrew-Regular.ttf",
        BOLD: "NotoSansHebrew-Bold.ttf",
    },
    SC_REGULAR: {REGULAR: "NotoSansSC-Regular.otf", BOLD: "NotoSansSC-Regular.otf"},
    JP_REGULAR: {REGULAR: "NotoSansJP-Regular.otf", BOLD: "NotoSansJP-Regular.otf"},
}

# Scripts that render wrongly without HarfBuzz (conjunct formation, matra
# reordering, cursive joining, bidi). Latin/Cyrillic/CJK are correct without
# the shaping engine, and skipping it saves ~1s on a Latin-only report.
_SHAPED_FAMILIES = {
    DEV_REGULAR,
    TAMIL_REGULAR,
    BENGALI_REGULAR,
    ARABIC_REGULAR,
    HEBREW_REGULAR,
}


def ensure_family(pdf: FPDF, family: str) -> None:
    """Register `family`'s faces on `pdf` if not already done (lazy add_font)."""
    flags = getattr(pdf, "_panchanga_flags", set())
    key = f"font:{family}"
    if key in flags:
        return
    for style, fname in FONT_FILES[family].items():
        pdf.add_font(family, style, str(FONT_DIR / fname))
    pdf._panchanga_flags = flags | {key}


def _set_run_font(pdf: FPDF, family: str, style: str, size: float) -> None:
    """set_font plus lazy registration plus per-script shaping toggle."""
    ensure_family(pdf, family)
    pdf.set_text_shaping(use_shaping_engine=family in _SHAPED_FAMILIES)
    pdf.set_font(family, style, size)


def register_fonts(pdf: FPDF) -> None:
    """Prepare `pdf` for script-aware text. Idempotent.

    Only NotoSans (Latin + Cyrillic) is registered eagerly - it appears on
    every page. The other seven families are parsed lazily by draw_text /
    text_width the first time a run of their script shows up, so an
    English-only report never pays for Devanagari/CJK font parsing.
    """
    ensure_family(pdf, LATIN_REGULAR)


def is_devanagari(text: str) -> bool:
    return any("ऀ" <= ch <= "ॿ" for ch in text)


def _script_of(text: str) -> str:
    """Return the dominant non-Latin script in `text`.

    Returns one of: 'deva', 'tamil', 'bengali', 'arabic', 'hebrew', 'jp',
    'cn', 'latin'. Hiragana or Katakana wins outright (→ 'jp'); a string of
    pure Han characters returns 'cn' and the caller's `lang` decides whether
    to use the Japanese face instead (since the Han block is shared).

    Cyrillic falls through to 'latin' because NotoSans-Regular ships with
    full Cyrillic coverage — no separate face is needed for Russian.
    """
    has_han = False
    for ch in text:
        if "ऀ" <= ch <= "ॿ":
            return "deva"
        if "஀" <= ch <= "௿":
            return "tamil"
        if "ঀ" <= ch <= "৾":
            return "bengali"
        # Arabic main block + Arabic Supplement + Arabic Extended-A.
        # Persian-specific letters (پ چ ژ گ etc.) fall in the same ranges.
        if (
            "؀" <= ch <= "ۿ"
            or "ݐ" <= ch <= "ݿ"
            or "ࢠ" <= ch <= "ࣿ"
            or "ﭐ" <= ch <= "﷿"
            or "ﹰ" <= ch <= "﻿"
        ):
            return "arabic"
        if "֐" <= ch <= "׿" or "יִ" <= ch <= "ﭏ":
            return "hebrew"
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
    if script == "bengali":
        return BENGALI_REGULAR
    if script == "arabic":
        return ARABIC_REGULAR
    if script == "hebrew":
        return HEBREW_REGULAR
    if script == "jp":
        return JP_REGULAR
    if script == "cn":
        return JP_REGULAR if lang == "ja" else SC_REGULAR
    return LATIN_REGULAR


def font_for(text: str, lang: str, bold: bool = False) -> Tuple[str, str]:
    """Pick (family, style) appropriate for `text` and `lang`."""
    return _family_for(text, lang), BOLD if bold else REGULAR


def _run_width(pdf: FPDF, seg: str, size: float) -> float:
    """Width of `seg` in the current font at `size`, HarfBuzz-shaped.

    `FPDF.get_string_width` sums per-character advances without shaping;
    for scripts where shaping merges glyphs (Devanagari conjuncts shrink a
    string by ~20%) that overestimates badly, so anchors drift. The font's
    own `get_text_width` shapes when given the shaping params. The whole
    package renders with unit="pt", so user units == font points here."""
    _, w = pdf.current_font.get_text_width(
        seg, size, getattr(pdf, "text_shaping", None)
    )
    return w


def text_width(pdf: FPDF, text: str, family: str, style: str, size: float) -> float:
    """Width of `text` at the given font/size, in PDF user units (we use pt).
    Splits into per-script runs and measures each shaped, mirroring how
    draw_text will actually render the string."""
    total = 0.0
    for fam, seg in _split_runs(text, "en"):
        _set_run_font(pdf, fam, style, size)
        total += _run_width(pdf, seg, size)
    return total


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
    x: float,
    y: float,
    text: str,
    family: str,
    style: str,
    size: float,
    anchor: str = "left",
    lang: str = "en",
) -> float:
    """Draw `text` with baseline at (x, y).

    Splits `text` into per-script runs and renders each with the appropriate
    Noto family — so a mixed string like "Rāśi 主星" picks NotoSans for the
    Latin/IAST head and NotoSC for the Han tail.

    Each run is rendered through `FPDF.cell()`, NOT `FPDF.text()`: text()
    bypasses the HarfBuzz shaping engine entirely (its own docstring says
    so), which broke every complex-script run — Tamil pre-base matras came
    out after their consonant (நேரம் read as நரேம்), Devanagari conjuncts
    never formed, Arabic letters never joined. cell() goes through the
    shaping path; we zero `c_margin` so the run starts exactly at the
    cursor and offset the cell top so the baseline lands on `y` (cell puts
    the baseline 0.8 × font-size below its top, the same coefficient as
    fpdf2's _render_styled_text_line).

    The `family` argument is advisory and is overridden by the per-run
    dispatch. `lang` disambiguates pure-Han runs (zh→SC, ja→JP)."""
    if not text:
        return 0.0
    runs = list(_split_runs(text, lang))

    widths = []
    for fam, seg in runs:
        _set_run_font(pdf, fam, style, size)
        widths.append(_run_width(pdf, seg, size))
    total_width = sum(widths)

    if anchor == "center":
        x -= total_width / 2
    elif anchor == "right":
        x -= total_width

    prev_margin = pdf.c_margin
    prev_xy = (pdf.x, pdf.y)
    pdf.c_margin = 0
    cursor = x
    try:
        for (fam, seg), seg_width in zip(runs, widths):
            _set_run_font(pdf, fam, style, size)
            pdf.set_xy(cursor, y - 0.8 * size)
            # w=0 would mean "extend to the right margin" to cell(); None
            # makes it size the cell to the (shaped) text itself.
            pdf.cell(w=seg_width or None, h=size, text=seg)
            cursor += seg_width
    finally:
        pdf.c_margin = prev_margin
        pdf.set_xy(*prev_xy)
    return total_width
