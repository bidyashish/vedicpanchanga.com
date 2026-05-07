"""Single-page 'Traditional' PDF report. Composes the page from helpers in
`pdf.sections` and `pdf.chart`. fpdf2 backend; A4 portrait; origin top-left.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Tuple

from fpdf import FPDF

import mangal
import sade_sati

from .core.chart import draw_north_indian_chart
from .pages.dasha_detail_pages import (
    draw_antardasha_page,
    draw_pratyantar_pages,
)
from .pages.detail_pages import (
    draw_dasha_long,
    draw_planet_long_table,
    draw_planet_varga_matrix,
)
from .pages.jaimini_page import draw_jaimini_page
from .core.layout import page_footer
from .pages.relations_page import draw_friendship_page, draw_kalsarpa_page
from .pages.toc_page import draw_toc_page
from .core.formatters import (
    fmt_ayan,
    fmt_dasha_balance,
    fmt_date_dmy,
    fmt_hms_local,
    fmt_lat,
    fmt_lon,
    local_sidereal_time,
)
from .pages.sade_sati_page import draw_mangal_page, draw_sade_sati_page
from .pages.varga_pages import draw_varga_pages
from .core.i18n import (
    LOCALES,
    t,
    t_num,
    tr_karana,
    tr_nakshatra,
    tr_planet,
    tr_sign,
    tr_tithi,
    tr_weekday,
    tr_yoga,
)
from .core.sections import (
    draw_ashtakavarga,
    draw_basic_details,
    draw_dasha_block,
    draw_header,
    draw_planets_table,
    draw_title_bar,
)
from .core.text import (
    BOLD,
    DEV_REGULAR,
    LATIN_REGULAR,
    REGULAR,
    draw_text,
    register_fonts,
)

PAGE_W_PT, PAGE_H_PT = 595.28, 841.89  # A4 in pt


class _ReportPDF(FPDF):
    """FPDF subclass — uses the built-in `footer()` hook so the stamp runs
    while each page's font subset is still mutable. (Stamping post-finalise
    via `pdf.page = n` corrupts the subset.)"""

    def footer(self) -> None:
        page_footer(self)


def _build_basic_rows(
    *,
    name: str,
    sex_label: str,
    place_name: str,
    chart_data: Dict[str, Any],
    panchang_data: Dict[str, Any],
    lang: str,
) -> List[Tuple[str, str]]:
    birth = chart_data["birth"]
    asc = chart_data["ascendant"]
    planets = chart_data["planets_data"]
    moon = next((p for p in planets if p["name"] == "Moon"), None)

    panchang = (panchang_data or {}).get("panchang", {}) or {}
    sun_moon = (panchang_data or {}).get("sun_moon", {}) or {}

    birth_local = datetime.fromisoformat(birth["local_time"])

    # `panchang.karana` (and tithi/yoga) report the value at sunrise; for
    # a birth chart we need the value at the actual birth moment instead.
    def _at_birth(seq, fallback):
        if not seq:
            return fallback or {}
        for entry in seq:
            ends = entry.get("ends_at")
            if not ends:
                continue
            try:
                if datetime.fromisoformat(ends) > birth_local:
                    return entry
            except Exception:
                continue
        return seq[-1] if seq else (fallback or {})

    tithi_at_birth = _at_birth(panchang.get("tithi_sequence"), panchang.get("tithi"))
    yoga_at_birth = _at_birth(panchang.get("yoga_sequence"), panchang.get("yoga"))
    karana_at_birth = _at_birth(panchang.get("karana_sequence"), panchang.get("karana"))
    weekday_label = tr_weekday(lang, birth_local.weekday())
    sid_str = local_sidereal_time(birth["julian_day"], birth["longitude"])
    julian_int = int(round(birth["julian_day"]))
    ayan_label = (birth.get("ayanamsa_label") or "Lahiri").split("(")[0].strip()
    ayan_str = fmt_ayan(birth["ayanamsa"])
    bal_dasa = fmt_dasha_balance(chart_data["dasha"][0])

    # Latin-script locales use the compact 3-letter abbrev (SUN, MOO, MAR);
    # non-Latin locales use the full localized planet name since their
    # scripts don't truncate cleanly into 3 characters.
    use_full_planet = lang in ("hi", "ta", "zh", "ja")

    def _planet_disp(eng_name: str) -> str:
        if use_full_planet:
            return tr_planet(lang, eng_name)
        return eng_name[:3].upper()

    asc_lord_disp = _planet_disp(asc["sign_lord"])
    asc_sign_disp = tr_sign(lang, asc["sign_id"]) or asc["sign"]

    if moon:
        rasi_lord_disp = _planet_disp(moon["sign_lord"])
        nak_lord_disp = _planet_disp(moon["nakshatra_lord"])
        moon_sign_disp = tr_sign(lang, moon["sign_id"]) or moon["sign"]
        nak_disp = tr_nakshatra(lang, moon["nakshatra"])
        nak_pada_str = f"{nak_disp}-{t_num(lang, moon['nakshatra_pada'])}"
    else:
        rasi_lord_disp = nak_lord_disp = moon_sign_disp = nak_pada_str = ""

    # Strip the "Krishna "/"Shukla " prefix the backend prepends (the basic
    # box has no paksha row, only the ordinal). For English the Sanskrit
    # paksha word isn't meaningful here; for Hindi/Tamil tr_tithi maps the
    # bare ordinal to native script.
    tithi_full = tithi_at_birth.get("name", "")
    tithi_parts = tithi_full.split(" ", 1)
    tithi_ordinal = tithi_parts[1] if len(tithi_parts) == 2 else tithi_full
    tithi_disp = tr_tithi(lang, tithi_ordinal)
    yoga_disp = tr_yoga(lang, yoga_at_birth.get("name", ""))
    karana_disp = tr_karana(lang, karana_at_birth.get("name", ""))
    sunrise_disp = fmt_hms_local(sun_moon.get("sunrise", ""))
    sunset_disp = fmt_hms_local(sun_moon.get("sunset", ""))

    return [
        # Column 1
        ("name", name or ""),
        ("sex", sex_label),
        ("date", t_num(lang, fmt_date_dmy(birth["local_time"]))),
        ("day", weekday_label),
        ("time_of_birth", t_num(lang, birth_local.strftime("%H.%M.%S"))),
        ("sid", t_num(lang, sid_str)),
        # Column 2
        ("julian_day", t_num(lang, julian_int)),
        ("ayan_type", ayan_label),
        ("ayan", t_num(lang, ayan_str)),
        ("place", place_name or ""),
        ("longitude", t_num(lang, fmt_lon(birth["longitude"]))),
        ("latitude", t_num(lang, fmt_lat(birth["latitude"]))),
        # Column 3
        ("asc_lord", asc_lord_disp),
        ("asc", asc_sign_disp),
        ("yoga", yoga_disp),
        ("tithi", tithi_disp),
        ("sunset", t_num(lang, sunset_disp)),
        ("sunrise", t_num(lang, sunrise_disp)),
        # Column 4
        ("bal_dasa", t_num(lang, bal_dasa)),
        ("karan", karana_disp),
        ("star_lord", nak_lord_disp),
        ("star_pada", nak_pada_str),
        ("rasi_lord", rasi_lord_disp),
        ("rasi", moon_sign_disp),
    ]


def render_pdf(
    *,
    name: str,
    sex: str,
    chart_data: Dict[str, Any],
    panchang_data: Dict[str, Any],
    place_name: str,
    lang: str = "en",
) -> bytes:
    if lang not in LOCALES:
        lang = "en"

    pdf = _ReportPDF(unit="pt", format="A4")
    pdf.set_auto_page_break(False)
    register_fonts(pdf)
    pdf.add_page()
    pdf.set_margins(0, 0, 0)

    sex_label = (
        t(lang, "male") if (sex or "").lower().startswith("m") else t(lang, "female")
    )
    rows = _build_basic_rows(
        name=name,
        sex_label=sex_label,
        place_name=place_name,
        chart_data=chart_data,
        panchang_data=panchang_data,
        lang=lang,
    )

    asc = chart_data["ascendant"]
    planets = chart_data["planets_data"]
    d1 = chart_data["d1_chart"]
    d9 = chart_data["d9_chart"]

    margin = 14
    x = margin
    w = PAGE_W_PT - 2 * margin
    cur_y = margin

    # ---- header + title ----
    draw_header(pdf, x, cur_y, w, name, lang)
    cur_y += 16 + 6
    draw_title_bar(pdf, x, cur_y, w, lang)
    cur_y += 22

    # ---- basic details box ----
    cur_y += 4
    box_h = 110
    draw_basic_details(pdf, x, cur_y, w, box_h, rows, lang)
    cur_y += box_h + 6

    # ---- charts row ----
    label_family = DEV_REGULAR if lang == "hi" else LATIN_REGULAR
    draw_text(pdf, x, cur_y + 8, t(lang, "lagna_chart"), label_family, BOLD, 10)
    nav_x = x + w - 230
    draw_text(pdf, nav_x, cur_y + 8, t(lang, "navamasa_chart"), label_family, BOLD, 10)
    cur_y += 12
    chart_side = 230
    draw_north_indian_chart(pdf, x, cur_y, chart_side, d1, asc["sign_id"], lang)
    d9_asc = chart_data.get("d9_asc_sign") or asc["sign_id"]
    draw_north_indian_chart(pdf, nav_x, cur_y, chart_side, d9, d9_asc, lang)
    cur_y += chart_side + 8

    # ---- bottom row ----
    bottom_h = PAGE_H_PT - margin - 16 - cur_y
    if bottom_h < 180:
        bottom_h = 180

    vim_w = (w - 8) * 0.50
    draw_dasha_block(pdf, x, cur_y, vim_w, bottom_h, chart_data["dasha"], lang)

    right_x = x + vim_w + 8
    right_w = w - vim_w - 8
    planets_h = bottom_h * 0.55
    av_h = bottom_h - planets_h - 4
    draw_planets_table(pdf, right_x, cur_y, right_w, planets_h, planets, asc, lang)
    draw_ashtakavarga(
        pdf,
        right_x,
        cur_y + planets_h + 4,
        right_w,
        av_h,
        chart_data["ashtakavarga"],
        lang,
    )

    # ---- footer ----
    draw_text(
        pdf,
        PAGE_W_PT / 2,
        PAGE_H_PT - 8,
        t(lang, "footer"),
        (DEV_REGULAR if lang == "hi" else LATIN_REGULAR),
        REGULAR,
        7,
        anchor="center",
    )

    # Track each section's start page so the TOC at the end can list them.
    sections: List[Tuple[str, int]] = [("Traditional Birth Summary", 1)]

    def _track(label: str, fn) -> None:
        before = pdf.pages_count
        fn()
        if pdf.pages_count > before:
            sections.append((label, before + 1))

    _track(
        "Planetary Positions",
        lambda: draw_planet_long_table(pdf, chart_data, name or "", lang),
    )
    _track(
        "Vimshottari Mahadasha",
        lambda: draw_dasha_long(pdf, chart_data, name or "", lang),
    )
    _track(
        "Vimshottari Antardasha",
        lambda: draw_antardasha_page(pdf, chart_data, name or "", lang),
    )
    _track(
        "Vimshottari Pratyantar",
        lambda: draw_pratyantar_pages(pdf, chart_data, name or "", lang),
    )
    _track(
        "Shodashvarga (D1–D60)",
        lambda: draw_varga_pages(pdf, chart_data, name or "", lang),
    )
    _track(
        "Planet × Varga Matrix",
        lambda: draw_planet_varga_matrix(pdf, chart_data, name or "", lang),
    )
    _track(
        "Jaimini - Karakamsa & Swamsa",
        lambda: draw_jaimini_page(pdf, chart_data, name or "", lang),
    )
    _track(
        "Friendship Tables",
        lambda: draw_friendship_page(pdf, chart_data, name or "", lang),
    )
    _track(
        "Kalsarpa Yoga", lambda: draw_kalsarpa_page(pdf, chart_data, name or "", lang)
    )

    # Mangal Dosha + Sade Sati
    moon = next((p for p in chart_data["planets_data"] if p["name"] == "Moon"), None)
    if moon is not None:

        def _sade():
            sade_segments = sade_sati.compute_sade_sati(
                birth_jd_ut=chart_data["birth"]["julian_day"],
                moon_sign_id=moon["sign_id"],
                horizon_years=120,
                step_days=2.0,
            )
            draw_sade_sati_page(
                pdf,
                name=name or "",
                segments=sade_segments,
                moon_sign=moon["sign"],
                lang=lang,
            )

        _track("Sade Sati Report", _sade)
    mangal_result = mangal.analyse(
        ascendant=chart_data["ascendant"],
        planets=chart_data["planets_data"],
    )
    _track(
        "Mangal Dosha",
        lambda: draw_mangal_page(pdf, name=name or "", analysis=mangal_result),
    )

    # Add the table-of-contents at the end so we know the actual page numbers.
    draw_toc_page(pdf, name or "", sections)

    return bytes(pdf.output())
