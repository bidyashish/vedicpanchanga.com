from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime, timezone

from calculator import compute_chart
from panchang import compute_panchang
from advanced_panchang import compute_detailed_panchang
from ayanamsa import AYANAMSA_OPTIONS
from muhurta import find_muhurtas, list_purposes, PURPOSES

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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


class SavedChart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request: CalculateRequest
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@api_router.get("/")
async def root():
    return {"message": "Vedic Astrology API", "status": "ok"}


@api_router.post("/calculate")
async def calculate(req: CalculateRequest):
    try:
        year, month, day = map(int, req.birth_date.split("-"))
        hour, minute = map(int, req.birth_time.split(":"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date or time format")

    try:
        result = compute_chart(
            year=year, month=month, day=day, hour=hour, minute=minute,
            latitude=req.latitude, longitude=req.longitude,
            timezone_name=req.timezone,
            ayanamsa=req.ayanamsa or "lahiri",
        )
    except Exception as e:
        logging.exception("Chart calculation failed")
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")

    # Persist request (optional history)
    doc = {
        "id": str(uuid.uuid4()),
        "request": req.model_dump(),
        "place_name": req.place_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.charts.insert_one({**doc})
    except Exception:
        pass

    result["id"] = doc["id"]
    return result


@api_router.get("/ayanamsa-options")
async def get_ayanamsa_options():
    """List available ayanamsa choices."""
    return [
        {"id": k, "label": v[1]}
        for k, v in AYANAMSA_OPTIONS.items()
    ]


@api_router.get("/get-panchang")
async def get_panchang(
    latitude: float,
    longitude: float,
    date: Optional[str] = None,
    timezone: Optional[str] = None,
    detailed: bool = True,
):
    """Get Drik-style daily Panchang for a location and date (default: today local).

    When `detailed=true` (default) returns the full Drik Panchang: samvatsara, muhurtas,
    calendars, lagna transits, tarabalam/chandrabalam, etc. Set `detailed=false` for a
    lean payload (legacy behaviour).
    """
    from datetime import date as date_cls
    if not date:
        date = date_cls.today().isoformat()
    try:
        if detailed:
            return compute_detailed_panchang(
                target_date=date, latitude=latitude, longitude=longitude,
                timezone_name=timezone,
            )
        return compute_panchang(
            target_date=date, latitude=latitude, longitude=longitude,
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
async def find_muhurta(req: MuhurtaRequest):
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


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
