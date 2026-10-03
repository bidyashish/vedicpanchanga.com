"""``/api/charts`` - saved birth details for the signed-in user.

Only the *inputs* are stored (name, date, time, place, ayanamsa, notes). The
frontend opens a saved chart by navigating to ``/kundali?...`` with those
values, which re-runs ``POST /api/calculate`` - so saved charts always
benefit from calculation fixes and the database stays a few hundred bytes
per row.

    GET    /charts            list, newest first
    POST   /charts            create (409 ``chart_limit_reached`` at cap)
    PUT    /charts/{id}       update any subset of fields
    DELETE /charts/{id}
"""

from __future__ import annotations

import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from . import users
from .db import connect, new_id, now_iso
from .sessions import require_user

router = APIRouter(prefix="/charts", tags=["accounts"])

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME_RE = re.compile(r"^\d{2}:\d{2}(:\d{2})?$")
_COLUMNS = (
    "id",
    "name",
    "sex",
    "birth_date",
    "birth_time",
    "latitude",
    "longitude",
    "timezone",
    "place_name",
    "ayanamsa",
    "notes",
    "created_at",
    "updated_at",
)


class ChartInput(BaseModel):
    name: str = Field(default="", max_length=80)
    sex: Optional[str] = Field(default=None, max_length=10)
    birth_date: str
    birth_time: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone: Optional[str] = Field(default=None, max_length=64)
    place_name: str = Field(default="", max_length=160)
    ayanamsa: str = Field(default="lahiri", max_length=40)
    notes: str = Field(default="", max_length=2000)

    @field_validator("birth_date")
    @classmethod
    def _date(cls, v: str) -> str:
        if not _DATE_RE.match(v):
            raise ValueError("birth_date must be YYYY-MM-DD")
        return v

    @field_validator("birth_time")
    @classmethod
    def _time(cls, v: str) -> str:
        if not _TIME_RE.match(v):
            raise ValueError("birth_time must be HH:MM")
        return v[:5]


class ChartPatch(BaseModel):
    name: Optional[str] = Field(default=None, max_length=80)
    sex: Optional[str] = Field(default=None, max_length=10)
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    timezone: Optional[str] = Field(default=None, max_length=64)
    place_name: Optional[str] = Field(default=None, max_length=160)
    ayanamsa: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("birth_date")
    @classmethod
    def _date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _DATE_RE.match(v):
            raise ValueError("birth_date must be YYYY-MM-DD")
        return v

    @field_validator("birth_time")
    @classmethod
    def _time(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not _TIME_RE.match(v):
                raise ValueError("birth_time must be HH:MM")
            return v[:5]
        return v


def _row(r: Any) -> dict[str, Any]:
    return {c: r[c] for c in _COLUMNS}


def list_charts(user_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM charts WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()
    return [_row(r) for r in rows]


def count_charts(user_id: str) -> int:
    with connect() as conn:
        return conn.execute(
            "SELECT COUNT(*) FROM charts WHERE user_id = ?", (user_id,)
        ).fetchone()[0]


@router.get("")
def charts_list(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    return {"charts": list_charts(user["id"]), "limit": users.chart_limit(user)}


@router.post("", status_code=201)
def charts_create(
    body: ChartInput, user: dict[str, Any] = Depends(require_user)
) -> dict[str, Any]:
    limit = users.chart_limit(user)
    chart_id = new_id()
    now = now_iso()
    with connect() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM charts WHERE user_id = ?", (user["id"],)
        ).fetchone()[0]
        if count >= limit:
            raise HTTPException(status_code=409, detail="chart_limit_reached")
        conn.execute(
            """INSERT INTO charts
               (id, user_id, name, sex, birth_date, birth_time, latitude, longitude,
                timezone, place_name, ayanamsa, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                chart_id,
                user["id"],
                body.name.strip(),
                body.sex,
                body.birth_date,
                body.birth_time,
                body.latitude,
                body.longitude,
                body.timezone,
                body.place_name.strip(),
                body.ayanamsa,
                body.notes,
                now,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM charts WHERE id = ?", (chart_id,)).fetchone()
    return {"chart": _row(row)}


@router.put("/{chart_id}")
def charts_update(
    chart_id: str, body: ChartPatch, user: dict[str, Any] = Depends(require_user)
) -> dict[str, Any]:
    changes = {k: v for k, v in body.model_dump().items() if v is not None}
    if "name" in changes:
        changes["name"] = changes["name"].strip()
    if "place_name" in changes:
        changes["place_name"] = changes["place_name"].strip()
    with connect() as conn:
        owned = conn.execute(
            "SELECT 1 FROM charts WHERE id = ? AND user_id = ?", (chart_id, user["id"])
        ).fetchone()
        if owned is None:
            raise HTTPException(status_code=404, detail="chart_not_found")
        if changes:
            changes["updated_at"] = now_iso()
            sets = ", ".join(f"{k} = ?" for k in changes)
            conn.execute(
                f"UPDATE charts SET {sets} WHERE id = ?", (*changes.values(), chart_id)
            )
        row = conn.execute("SELECT * FROM charts WHERE id = ?", (chart_id,)).fetchone()
    return {"chart": _row(row)}


@router.delete("/{chart_id}")
def charts_delete(
    chart_id: str, user: dict[str, Any] = Depends(require_user)
) -> dict[str, Any]:
    with connect() as conn:
        cur = conn.execute(
            "DELETE FROM charts WHERE id = ? AND user_id = ?", (chart_id, user["id"])
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="chart_not_found")
    return {"ok": True}
