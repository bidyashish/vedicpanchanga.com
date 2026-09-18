"""Shared pytest fixtures for the backend test-suite.

Two flavours of test live here:

- Unit tests import the calculation modules directly (``vargas``, ``muhurta``,
  ``tyajyam`` ...). The ``sys.path`` insert below makes ``backend/`` importable
  no matter where pytest is launched from.
- API tests (``@pytest.mark.http``) exercise the FastAPI app through the
  ``api`` fixture. By default that is an in-process ``TestClient`` - no server
  needed. Set ``BACKEND_URL`` to run the same tests against a live deployment
  instead, e.g. ``BACKEND_URL=http://127.0.0.1:8001 pytest -m http``.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def base_url() -> str:
    """Prefix for API URLs: the live server when ``BACKEND_URL`` is set, else
    empty because the in-process ``TestClient`` takes bare paths."""
    return os.environ.get("BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="session")
def api(base_url: str):
    """HTTP client for the FastAPI app.

    Returns a ``fastapi.testclient.TestClient`` (in-process, default) or a
    ``requests.Session`` pointed at ``BACKEND_URL``. Both expose the same
    ``.get`` / ``.post`` surface, so tests do not care which one they got.
    """
    if not base_url:
        from fastapi.testclient import TestClient

        from server import app

        with TestClient(app) as client:
            yield client
        return

    import requests

    class _Session(requests.Session):
        """requests.Session with a default timeout, so tests stay free of
        per-call timeouts (which the in-process TestClient rejects)."""

        def request(self, method, url, **kwargs):
            kwargs.setdefault("timeout", 120)
            return super().request(method, url, **kwargs)

    session = _Session()
    try:
        session.get(f"{base_url}/api/", timeout=3).raise_for_status()
    except requests.RequestException as exc:
        pytest.skip(f"backend not reachable at {base_url}: {exc}")
    yield session


# ---------------------------------------------------------------------------
# Reference births / locations
# ---------------------------------------------------------------------------

DELHI_BIRTH = {
    "birth_date": "1990-01-01",
    "birth_time": "12:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone": "Asia/Kolkata",
    "place_name": "New Delhi, India",
}

# Ranchi birth used by the Jaimini / sub-period / friendship suites.
KNK_BIRTH = {
    "birth_date": "2026-04-25",
    "birth_time": "11:36",
    "latitude": 23.35,
    "longitude": 85.3167,
    "timezone": "Asia/Kolkata",
    "place_name": "Ranchi, JH",
}


@pytest.fixture(scope="session")
def delhi_birth() -> dict:
    return dict(DELHI_BIRTH)


@pytest.fixture(scope="session")
def knk_birth() -> dict:
    return dict(KNK_BIRTH)


# ---------------------------------------------------------------------------
# Direct module access (no HTTP)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def chart_module():
    import calculator

    return calculator


@pytest.fixture(scope="session")
def panchang_module():
    import advanced_panchang

    return advanced_panchang


def _build_chart(chart_module, birth: dict) -> dict:
    y, m, d = (int(x) for x in birth["birth_date"].split("-"))
    h, mi = (int(x) for x in birth["birth_time"].split(":"))
    return chart_module.compute_chart(
        year=y,
        month=m,
        day=d,
        hour=h,
        minute=mi,
        latitude=birth["latitude"],
        longitude=birth["longitude"],
        timezone_name=birth["timezone"],
        ayanamsa="lahiri",
    )


@pytest.fixture(scope="session")
def delhi_chart(chart_module, delhi_birth) -> dict:
    return _build_chart(chart_module, delhi_birth)


@pytest.fixture(scope="session")
def knk_chart(chart_module, knk_birth) -> dict:
    return _build_chart(chart_module, knk_birth)


# ---------------------------------------------------------------------------
# Markers
# ---------------------------------------------------------------------------


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "http: exercises the FastAPI app over HTTP (in-process TestClient by "
        "default; set BACKEND_URL to target a live server)",
    )
