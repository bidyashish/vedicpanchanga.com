"""Display formatters used by the PDF report (DMS, lat/lon, dates, sidereal time)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

import swisseph as swe

from .dasha import lord_abbr


def fmt_dms(deg_in_sign: float) -> str:
    d = int(deg_in_sign)
    m_full = (deg_in_sign - d) * 60
    m = int(m_full)
    s = int(round((m_full - m) * 60))
    if s == 60:
        s = 0
        m += 1
    if m == 60:
        m = 0
        d += 1
    return f"{d:02d}-{m:02d}-{s:02d}"


def fmt_ayan(ayan_deg: float) -> str:
    d = int(ayan_deg)
    m_full = (ayan_deg - d) * 60
    m = int(m_full)
    s = int(round((m_full - m) * 60))
    if s == 60:
        s = 0
        m += 1
    if m == 60:
        m = 0
        d += 1
    return f"{d:03d}-{m:02d}-{s:02d}"


def fmt_lat(lat: float) -> str:
    hemi = "N" if lat >= 0 else "S"
    a = abs(lat)
    d = int(a)
    m = int(round((a - d) * 60))
    return f"{d:02d}.{m:02d}.{hemi}"


def fmt_lon(lon: float) -> str:
    hemi = "E" if lon >= 0 else "W"
    a = abs(lon)
    d = int(a)
    m = int(round((a - d) * 60))
    return f"{d:02d}.{m:02d}.{hemi}"


def fmt_hms_local(iso: str) -> str:
    if not iso:
        return ""
    return datetime.fromisoformat(iso).strftime("%H.%M.%S")


def fmt_date_dmy(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%d.%m.%Y")


def fmt_dasha_balance(dasha_first: Dict[str, Any]) -> str:
    """Format the running mahadasha's residue as 'XYZ A Y B M C D'."""
    start = datetime.fromisoformat(dasha_first["start"])
    end = datetime.fromisoformat(dasha_first["end"])
    days = (end - start).total_seconds() / 86400.0
    years = int(days // 365.25)
    rem = days - years * 365.25
    months = int(rem // 30.4375)
    rem_days = int(round(rem - months * 30.4375))
    if rem_days >= 30:
        rem_days -= 30
        months += 1
    if months >= 12:
        months -= 12
        years += 1
    return f"{lord_abbr(dasha_first['lord'])} {years} Y {months} M {rem_days} D"


def local_sidereal_time(jd_ut: float, longitude: float) -> str:
    gmst = swe.sidtime(jd_ut)  # hours
    lst = (gmst + longitude / 15.0) % 24
    h = int(lst)
    m_full = (lst - h) * 60
    m = int(m_full)
    s = int(round((m_full - m) * 60))
    if s == 60:
        s = 0
        m += 1
    if m == 60:
        m = 0
        h += 1
    return f"{h:02d}.{m:02d}.{s:02d}"
