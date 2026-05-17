import logging
import os
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from advanced_panchang import compute_detailed_panchang
from ayanamsa import AYANAMSA_OPTIONS
from calculator import compute_chart
from muhurta import find_muhurtas, list_purposes
from pdf import render_pdf
from transits import compute_transits

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="Vedic Astrology API")
api_router = APIRouter(prefix="/api")


class CalculateRequest(BaseModel):
    birth_date: str = Field(..., description="YYYY-MM-DD")
    birth_time: str = Field(..., description="HH:MM (24h)")
    latitude: float
    longitude: float
    timezone: Optional[str] = None
    place_name: Optional[str] = None
    ayanamsa: Optional[str] = "lahiri"


@api_router.get("/")
async def root():
    return {"message": "Vedic Astrology API", "status": "ok"}


@api_router.post("/calculate")
def calculate(req: CalculateRequest):
    try:
        year, month, day = map(int, req.birth_date.split("-"))
        hour, minute = map(int, req.birth_time.split(":"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date or time format")

    try:
        return compute_chart(
            year=year,
            month=month,
            day=day,
            hour=hour,
            minute=minute,
            latitude=req.latitude,
            longitude=req.longitude,
            timezone_name=req.timezone,
            ayanamsa=req.ayanamsa or "lahiri",
        )
    except Exception as e:
        logging.exception("Chart calculation failed")
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")


@api_router.get("/ayanamsa-options")
async def get_ayanamsa_options():
    """List available ayanamsa choices."""
    return [{"id": k, "label": v[1]} for k, v in AYANAMSA_OPTIONS.items()]


# Country (ISO-3166-1 alpha-2) -> shipped UI locale. Only includes countries
# whose dominant language we ship; other countries fall through to "en". Trust
# is the CF-IPCountry header, which only nginx-fronted Cloudflare requests
# carry; direct hits to 8001 (firewalled in prod) get blank and degrade to en.
_COUNTRY_TO_LANG = {
    # Arabic
    "SA": "ar",
    "AE": "ar",
    "EG": "ar",
    "JO": "ar",
    "KW": "ar",
    "QA": "ar",
    "BH": "ar",
    "OM": "ar",
    "YE": "ar",
    "SY": "ar",
    "IQ": "ar",
    "LB": "ar",
    "MA": "ar",
    "TN": "ar",
    "DZ": "ar",
    "LY": "ar",
    "SD": "ar",
    "MR": "ar",
    "PS": "ar",
    # Persian / Hebrew
    "IR": "fa",
    "AF": "fa",
    "IL": "he",
    # Indic
    "IN": "hi",
    "NP": "ne",
    "BD": "bn",
    # CJK
    "CN": "zh",
    "TW": "zh",
    "HK": "zh",
    "MO": "zh",
    "SG": "zh",
    "JP": "ja",
    # Cyrillic
    "RU": "ru",
    "BY": "ru",
    "KZ": "ru",
    "KG": "ru",
    # Romance / Germanic
    "ES": "es",
    "MX": "es",
    "AR": "es",
    "CO": "es",
    "CL": "es",
    "PE": "es",
    "VE": "es",
    "UY": "es",
    "GT": "es",
    "EC": "es",
    "BO": "es",
    "PY": "es",
    "HN": "es",
    "NI": "es",
    "CR": "es",
    "PA": "es",
    "DO": "es",
    "CU": "es",
    "SV": "es",
    "DE": "de",
    "AT": "de",
    "CH": "de",
    "LI": "de",
    "BR": "pt",
    "PT": "pt",
    "AO": "pt",
    "MZ": "pt",
    "FR": "fr",
    "BE": "fr",
    "LU": "fr",
    "MC": "fr",
}

_SHIPPED_LANGS = {"en"} | set(_COUNTRY_TO_LANG.values())


def _accept_language_to_shipped(header: str) -> Optional[str]:
    """Pick the first 2-letter primary tag from Accept-Language we actually ship."""
    if not header:
        return None
    for tok in header.split(","):
        code = tok.split(";")[0].strip().split("-")[0].lower()
        if code in _SHIPPED_LANGS:
            return code
    return None


@api_router.get("/suggest-lang")
def suggest_lang(request: Request, response: Response):
    """Suggest a UI locale from the visitor's country (Cloudflare CF-IPCountry)
    with Accept-Language as fallback. The frontend calls this once on first
    load if the user has no saved preference. Always safe to ignore - manual
    pick in the switcher wins and is persisted in localStorage."""
    cc_raw = (request.headers.get("cf-ipcountry") or "").upper()
    # Cloudflare uses XX for unknown, T1 for Tor, EU for generic EU - none map cleanly.
    cc = cc_raw if cc_raw and cc_raw not in {"XX", "T1", "EU"} else ""
    by_country = _COUNTRY_TO_LANG.get(cc) if cc else None
    by_accept = _accept_language_to_shipped(request.headers.get("accept-language", ""))
    lang = by_country or by_accept or "en"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Vary"] = "CF-IPCountry, Accept-Language"
    return {"country": cc, "lang": lang}


_UJJAIN = {
    "latitude": 23.1765,
    "longitude": 75.7885,
    "place_name": "Ujjain, Madhya Pradesh, India",
}


@api_router.get("/geo-ip")
def geo_ip(request: Request, response: Response):
    """Return approximate visitor location from Cloudflare geo headers.

    Falls back to Ujjain when headers are absent so the response is
    always valid JSON - the frontend never sees a non-200.
    """
    response.headers["Cache-Control"] = "no-store"
    response.headers["Vary"] = "CF-IPLatitude, CF-IPLongitude, CF-IPCity"

    raw_lat = request.headers.get("cf-iplatitude", "")
    raw_lon = request.headers.get("cf-iplongitude", "")
    if not raw_lat or not raw_lon:
        return _UJJAIN

    try:
        lat = float(raw_lat)
        lon = float(raw_lon)
    except ValueError:
        return _UJJAIN

    city = request.headers.get("cf-ipcity") or ""
    region = request.headers.get("cf-ipregion") or ""
    country = (request.headers.get("cf-ipcountry") or "").upper()

    parts = [p for p in (city, region, country) if p and p not in {"XX", "T1"}]
    place_name = ", ".join(parts) if parts else f"{lat:.2f}, {lon:.2f}"

    return {"latitude": lat, "longitude": lon, "place_name": place_name}


@api_router.get("/get-panchang")
def get_panchang(
    latitude: float,
    longitude: float,
    date: Optional[str] = None,
    timezone: Optional[str] = None,
):
    """Get Drik-style daily Panchang for a location and date (default: today local).

    Returns the full Drik Panchang: samvatsara, muhurtas, calendars, lagna transits,
    tarabalam, chandrabalam, etc.
    """
    from datetime import date as date_cls

    if not date:
        date = date_cls.today().isoformat()
    try:
        return compute_detailed_panchang(
            target_date=date,
            latitude=latitude,
            longitude=longitude,
            timezone_name=timezone,
        )
    except Exception as e:
        logging.exception("Panchang computation failed")
        raise HTTPException(status_code=500, detail=f"Panchang error: {e}")


class MuhurtaRequest(BaseModel):
    purpose: str
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    latitude: float
    longitude: float
    timezone: Optional[str] = None
    birth_rashi_id: Optional[int] = Field(None, ge=1, le=12)
    birth_nakshatra_id: Optional[int] = Field(None, ge=1, le=27)
    min_score: int = 60
    limit: int = 30


@api_router.get("/muhurta-purposes")
async def get_muhurta_purposes():
    """List available Muhurta purposes (marriage, griha-pravesha, business, etc.)."""
    return list_purposes()


@api_router.post("/find-muhurta")
def find_muhurta(req: MuhurtaRequest):
    """Scan a date-range and return best auspicious windows for a given purpose.

    Optionally filtered by the native's birth rashi (Chandrabalam) and birth nakshatra
    (Tarabalam). Each day is scored 0–100 with explainable reasons & cautions.
    """
    try:
        return find_muhurtas(
            purpose=req.purpose,
            start_date=req.start_date,
            end_date=req.end_date,
            latitude=req.latitude,
            longitude=req.longitude,
            timezone_name=req.timezone,
            birth_rashi_id=req.birth_rashi_id,
            birth_nakshatra_id=req.birth_nakshatra_id,
            min_score=req.min_score,
            limit=req.limit,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logging.exception("Muhurta search failed")
        raise HTTPException(status_code=500, detail=f"Muhurta error: {e}")


@api_router.get("/transits")
def get_transits(
    latitude: float,
    longitude: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    timezone: Optional[str] = None,
    include_signs: bool = True,
    include_nakshatras: bool = True,
    include_retrograde: bool = True,
    include_moon: bool = False,
    moon_nakshatras: bool = False,
):
    """Planetary transit events (sign ingress, nakshatra ingress, retrograde
    stations) over a date range.

    Defaults to a 1-year window starting today in the requested timezone.
    Moon is hidden by default because its 27-day cycle produces 12+ sign
    events per month - flip include_moon=true to add its sign ingresses,
    moon_nakshatras=true to also include its daily nakshatra crossings."""
    from datetime import date as date_cls, timedelta as td

    if not start_date:
        start_date = date_cls.today().isoformat()
    if not end_date:
        end_dt = date_cls.fromisoformat(start_date) + td(days=365)
        end_date = end_dt.isoformat()
    try:
        return compute_transits(
            start_date=start_date,
            end_date=end_date,
            latitude=latitude,
            longitude=longitude,
            timezone_name=timezone,
            include_signs=include_signs,
            include_nakshatras=include_nakshatras,
            include_retrograde=include_retrograde,
            include_moon=include_moon,
            moon_nakshatras=moon_nakshatras,
        )
    except Exception as e:
        logging.exception("Transit computation failed")
        raise HTTPException(status_code=500, detail=f"Transit error: {e}")


class PrintPdfRequest(BaseModel):
    name: Optional[str] = ""
    sex: Optional[str] = "Male"
    birth_date: str = Field(..., description="YYYY-MM-DD")
    birth_time: str = Field(..., description="HH:MM (24h)")
    latitude: float
    longitude: float
    timezone: Optional[str] = None
    place_name: Optional[str] = ""
    ayanamsa: Optional[str] = "lahiri"
    lang: Literal[
        "en",
        "hi",
        "ta",
        "bn",
        "ne",
        "zh",
        "ja",
        "es",
        "de",
        "pt",
        "fr",
        "ru",
        "ar",
        "fa",
        "he",
    ] = "en"


@api_router.post("/print-pdf")
def print_pdf(req: PrintPdfRequest):
    """Render the Traditional one-page PDF for the given birth details and
    return it as `application/pdf`."""
    try:
        year, month, day = map(int, req.birth_date.split("-"))
        hour, minute = map(int, req.birth_time.split(":"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date or time format")

    try:
        chart_data = compute_chart(
            year=year,
            month=month,
            day=day,
            hour=hour,
            minute=minute,
            latitude=req.latitude,
            longitude=req.longitude,
            timezone_name=req.timezone,
            ayanamsa=req.ayanamsa or "lahiri",
        )
        panchang_data = compute_detailed_panchang(
            target_date=req.birth_date,
            latitude=req.latitude,
            longitude=req.longitude,
            timezone_name=req.timezone,
        )
        pdf_bytes = render_pdf(
            name=req.name or "",
            sex=req.sex or "Male",
            chart_data=chart_data,
            panchang_data=panchang_data,
            place_name=req.place_name or "",
            lang=req.lang,
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("PDF render failed")
        raise HTTPException(status_code=500, detail=f"PDF render error: {e}")

    safe_name = (
        "".join(ch for ch in (req.name or "kundali") if ch.isalnum() or ch in "_-")[:40]
        or "kundali"
    )
    filename = f"{safe_name}-{req.birth_date}-{req.lang}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
