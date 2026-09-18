"""Shared pytest fixtures.

The backend test-suite has two flavours:

* **Unit tests** (no I/O beyond the local Swiss Ephemeris files) — run by
  default, fast, deterministic.
* **HTTP integration tests** — call the running FastAPI server. They opt-in
  via the ``api`` fixture, which probes the server and `skip()`s the whole
  module if nothing is listening. That way the suite passes cleanly even
  with no backend running.

Run examples
------------
    # everything (HTTP tests skipped if no server)
    pytest backend/tests -v

    # only the fast unit tests
    pytest backend/tests -v -m "not http"

    # against a remote backend
    BACKEND_URL=https://staging.example.com pytest backend/tests -v
"""

from __future__ import annotations

import os
import sys
from datetime import date as _date
from pathlib import Path

import pytest
import requests

# Put `backend/` on sys.path so test modules can `from kalsarpa import …`
# at import time. Doing it here means the path is set before pytest starts
# collecting test modules (conftest is imported first).
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


# ---- BASE_URL resolution --------------------------------------------------
# Look first at the canonical env var (`BACKEND_URL`), then accept the
# Vite-era frontend var, then the legacy CRA name we still see in older
# scripts, and finally fall back to local dev. Reading `frontend/.env` is
# kept as a last resort for IDE runners that don't pre-load it.
def _resolve_base_url() -> str:
    for var in ("BACKEND_URL", "VITE_BACKEND_URL", "REACT_APP_BACKEND_URL"):
        v = os.environ.get(var)
        if v:
            return v.rstrip("/")
    env_path = Path(__file__).resolve().parent.parent.parent / "frontend" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            for var in ("VITE_BACKEND_URL", "REACT_APP_BACKEND_URL"):
                if line.startswith(f"{var}="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    return "http://127.0.0.1:8001"


BASE_URL = _resolve_base_url()


# ---- HTTP fixture --------------------------------------------------------
@pytest.fixture(scope="session")
def api() -> requests.Session:
    """Yield a requests.Session pointed at the backend, or `pytest.skip()`
    the entire test if the server isn't reachable. Module-scoped so we
    don't probe more than once per session."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    try:
        r = s.get(f"{BASE_URL}/api/", timeout=2)
    except requests.RequestException as e:
        pytest.skip(f"backend not reachable at {BASE_URL} ({e})")
    if r.status_code >= 500:
        pytest.skip(f"backend at {BASE_URL} is unhealthy ({r.status_code})")
    return s


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


# ---- Canonical birth payloads -------------------------------------------
# Reuse these across HTTP and unit tests so cross-checks stay consistent.
DELHI_BIRTH = {
    "birth_date": "1990-01-01",
    "birth_time": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata",
    "place_name": "New Delhi",
    "ayanamsa": "lahiri",
}

# Knk reference matches the AstroSage sample PDF used during PDF
# verification (Ranchi, 25 Apr 2026 11:36 IST). Keeping it here means any
# new code can be cross-checked against the same reference data.
KNK_BIRTH = {
    "birth_date": "2026-04-25",
    "birth_time": "11:36",
    "latitude": 23.35,
    "longitude": 85.3167,
    "timezone": "Asia/Kolkata",
    "place_name": "Ranchi",
    "ayanamsa": "lahiri",
}

KELOWNA_BIRTH = {
    "birth_date": "2026-04-20",
    "birth_time": "06:00",
    "latitude": 49.8880,
    "longitude": -119.4960,
    "timezone": "America/Vancouver",
    "place_name": "Kelowna, BC",
    "ayanamsa": "lahiri",
}


@pytest.fixture
def delhi_birth():
    return dict(DELHI_BIRTH)


@pytest.fixture
def knk_birth():
    return dict(KNK_BIRTH)


@pytest.fixture
def kelowna_birth():
    return dict(KELOWNA_BIRTH)


# ---- Direct (in-process) calls ------------------------------------------
@pytest.fixture(scope="session")
def chart_module():
    """Import the in-process calculator. Allows unit tests to run without
    the FastAPI server."""
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import calculator  # noqa: WPS433

    return calculator


@pytest.fixture(scope="session")
def panchang_module():
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import advanced_panchang  # noqa: WPS433

    return advanced_panchang


def _build_chart(chart_module, payload: dict) -> dict:
    y, m, d = (int(p) for p in payload["birth_date"].split("-"))
    h, mi = (int(p) for p in payload["birth_time"].split(":"))
    return chart_module.compute_chart(
        year=y,
        month=m,
        day=d,
        hour=h,
        minute=mi,
        latitude=payload["latitude"],
        longitude=payload["longitude"],
        timezone_name=payload["timezone"],
        ayanamsa="lahiri",
    )


@pytest.fixture(scope="session")
def delhi_chart(chart_module):
    """Pre-built chart_data for the Delhi sample. Session-scoped because
    `compute_chart` is the slowest call in the suite and the result is
    treated as read-only by every test."""
    return _build_chart(chart_module, DELHI_BIRTH)


@pytest.fixture(scope="session")
def knk_chart(chart_module):
    return _build_chart(chart_module, KNK_BIRTH)


# ---- Marker registration ------------------------------------------------
def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "http: test requires the FastAPI server to be running",
    )


# Today helper for HTTP tests that need a forward-looking date range.
TODAY = _date.today().isoformat()
