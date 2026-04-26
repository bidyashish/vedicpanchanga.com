"""Single-page 'Traditional' PDF report. Composes the page from helpers in
`pdf.sections` and `pdf.chart`. fpdf2 backend; A4 portrait; origin top-left.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Tuple

from fpdf import FPDF

import mangal
import sade_sati

from .chart import draw_north_indian_chart
from .dasha_detail_pages import (
    draw_antardasha_page,
    draw_pratyantar_pages,
)
from .detail_pages import (
    draw_dasha_long,
    draw_planet_long_table,
    draw_planet_varga_matrix,
)
from .jaimini_page import draw_jaimini_page
from .relations_page import draw_friendship_page, draw_kalsarpa_page
from .formatters import (
    fmt_ayan,
    fmt_dasha_balance,
    fmt_date_dmy,
    fmt_hms_local,
    fmt_lat,
    fmt_lon,
    local_sidereal_time,
)
from .sade_sati_page import draw_mangal_page, draw_sade_sati_page
from .varga_pages import draw_varga_pages
from .i18n import (
    PLANET_KEY_BY_NAME,
    SIGN_KEYS_BY_ID,
    WEEKDAY_KEYS,
    t,
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
    LATIN_REGULAR,
    REGULAR,
    draw_text,
    register_fonts,
)

PAGE_W_PT, PAGE_H_PT = 595.28, 841.89  # A4 in pt


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
    weekday_label = t(lang, WEEKDAY_KEYS[birth_local.weekday()])
    sid_str = local_sidereal_time(birth["julian_day"], birth["longitude"])
    julian_int = int(round(birth["julian_day"]))
    ayan_label = (birth.get("ayanamsa_label") or "Lahiri").split("(")[0].strip()
    ayan_str = fmt_ayan(birth["ayanamsa"])
    bal_dasa = fmt_dasha_balance(chart_data["dasha"][0])

    asc_lord_disp = (
        t(lang, PLANET_KEY_BY_NAME.get(asc["sign_lord"], ""))
        if lang == "hi" else asc["sign_lord"][:3].upper()
    )
    asc_sign_disp = t(lang, SIGN_KEYS_BY_ID.get(asc["sign_id"], "")) or asc["sign"]

    if moon:
        rasi_lord_disp = (
            t(lang, PLANET_KEY_BY_NAME.get(moon["sign_lord"], ""))
            if lang == "hi" else moon["sign_lord"][:3].upper()
        )
        nak_lord_disp = (
            t(lang, PLANET_KEY_BY_NAME.get(moon["nakshatra_lord"], ""))
            if lang == "hi" else moon["nakshatra_lord"][:3].upper()
        )
        moon_sign_disp = t(lang, SIGN_KEYS_BY_ID.get(moon["sign_id"], "")) or moon["sign"]
        nak_pada_str = f"{moon['nakshatra']}-{moon['nakshatra_pada']}"
    else:
        rasi_lord_disp = nak_lord_disp = moon_sign_disp = nak_pada_str = ""

    tithi_full = (panchang.get("tithi") or {}).get("name", "")
    tithi_parts = tithi_full.split(" ", 1)
    tithi_disp = tithi_parts[1] if len(tithi_parts) == 2 else tithi_full
    yoga_disp = (panchang.get("yoga") or {}).get("name", "")
    karana_disp = (panchang.get("karana") or {}).get("name", "")
    sunrise_disp = fmt_hms_local(sun_moon.get("sunrise", ""))
    sunset_disp = fmt_hms_local(sun_moon.get("sunset", ""))

    return [
        # Column 1
        ("name", name or ""),
        ("sex", sex_label),
        ("date", fmt_date_dmy(birth["local_time"])),
        ("day", weekday_label),
        ("time_of_birth", birth_local.strftime("%H.%M.%S")),
        ("sid", sid_str),
        # Column 2
        ("julian_day", str(julian_int)),
        ("ayan_type", ayan_label),
        ("ayan", ayan_str),
        ("place", place_name or ""),
        ("longitude", fmt_lon(birth["longitude"])),
        ("latitude", fmt_lat(birth["latitude"])),
        # Column 3
        ("asc_lord", asc_lord_disp),
        ("asc", asc_sign_disp),
        ("yoga", yoga_disp),
        ("tithi", tithi_disp),
        ("sunset", sunset_disp),
        ("sunrise", sunrise_disp),
        # Column 4
        ("bal_dasa", bal_dasa),
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
    if lang not in ("en", "hi"):
        lang = "en"

    pdf = FPDF(unit="pt", format="A4")
    pdf.set_auto_page_break(False)
    pdf.add_page()
    register_fonts(pdf)
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
    draw_text(pdf, x, cur_y + 8, t(lang, "lagna_chart"),
              label_family, BOLD, 10)
    nav_x = x + w - 230
    draw_text(pdf, nav_x, cur_y + 8, t(lang, "navamasa_chart"),
              label_family, BOLD, 10)
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
    draw_dasha_block(pdf, x, cur_y, vim_w, bottom_h,
                     chart_data["dasha"], lang)

    right_x = x + vim_w + 8
    right_w = w - vim_w - 8
    planets_h = bottom_h * 0.55
    av_h = bottom_h - planets_h - 4
    draw_planets_table(pdf, right_x, cur_y, right_w, planets_h,
                       planets, asc, lang)
    draw_ashtakavarga(pdf, right_x, cur_y + planets_h + 4, right_w, av_h,
                      chart_data["ashtakavarga"], lang)

    # ---- footer ----
    draw_text(pdf, PAGE_W_PT / 2, PAGE_H_PT - 8,
              t(lang, "footer"),
              (DEV_REGULAR if lang == "hi" else LATIN_REGULAR),
              REGULAR, 7, anchor="center")

    # ---- additional pages ----
    draw_planet_long_table(pdf, chart_data, name or "", lang)
    draw_dasha_long(pdf, chart_data, name or "", lang)
    draw_antardasha_page(pdf, chart_data, name or "", lang)
    draw_pratyantar_pages(pdf, chart_data, name or "", lang)
    draw_varga_pages(pdf, chart_data, name or "", lang)
    draw_planet_varga_matrix(pdf, chart_data, name or "", lang)
    draw_jaimini_page(pdf, chart_data, name or "", lang)
    draw_friendship_page(pdf, chart_data, name or "", lang)
    draw_kalsarpa_page(pdf, chart_data, name or "", lang)

    # Mangal Dosha + Sade Sati
    moon = next((p for p in chart_data["planets_data"] if p["name"] == "Moon"), None)
    if moon is not None:
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
    mangal_result = mangal.analyse(
        ascendant=chart_data["ascendant"],
        planets=chart_data["planets_data"],
    )
    draw_mangal_page(pdf, name=name or "", analysis=mangal_result)

    return bytes(pdf.output())
