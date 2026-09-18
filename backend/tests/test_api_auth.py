"""In-process tests for the optional API-key layer (auth.py) and the CORS
contract that external browser apps (Flutter Web, React, ...) rely on.

Uses FastAPI's TestClient, so no running server is needed. API_KEYS /
AUTH_EXEMPT_ORIGINS are read per-request by auth.py, which is what makes
monkeypatch.setenv work here without reloading the app.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from server import app

KEY = "test-key-abc123"
SECOND_KEY = "second-key-xyz789"

# Cheap authenticated endpoint - static payload, no ephemeris math.
PROBE = "/api/ayanamsa-options"


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture
def auth_on(monkeypatch):
    # Space after the comma on purpose: keys must be stripped when parsed.
    monkeypatch.setenv("API_KEYS", f"{KEY}, {SECOND_KEY}")


@pytest.fixture
def auth_off(monkeypatch):
    monkeypatch.delenv("API_KEYS", raising=False)


# ── auth disabled (default) ──────────────────────────────────────────────
def test_open_access_when_no_keys_configured(client, auth_off):
    assert client.get(PROBE).status_code == 200


def test_empty_api_keys_var_means_open(client, monkeypatch):
    monkeypatch.setenv("API_KEYS", "  ,  ")
    assert client.get(PROBE).status_code == 200


# ── auth enabled: key checks ─────────────────────────────────────────────
def test_401_without_key(client, auth_on):
    r = client.get(PROBE)
    assert r.status_code == 401
    assert r.headers.get("www-authenticate") == "Bearer"


def test_bearer_key_accepted(client, auth_on):
    r = client.get(PROBE, headers={"Authorization": f"Bearer {KEY}"})
    assert r.status_code == 200


def test_x_api_key_accepted(client, auth_on):
    r = client.get(PROBE, headers={"X-API-Key": KEY})
    assert r.status_code == 200


def test_second_key_in_csv_accepted(client, auth_on):
    r = client.get(PROBE, headers={"X-API-Key": SECOND_KEY})
    assert r.status_code == 200


def test_wrong_key_rejected(client, auth_on):
    r = client.get(PROBE, headers={"X-API-Key": "not-a-real-key"})
    assert r.status_code == 401


def test_wrong_bearer_scheme_rejected(client, auth_on):
    r = client.get(PROBE, headers={"Authorization": f"Basic {KEY}"})
    assert r.status_code == 401


# ── auth enabled: exemptions ─────────────────────────────────────────────
def test_liveness_paths_stay_open(client, auth_on):
    assert client.get("/api/").status_code == 200
    assert client.get("/api/health").status_code in (200, 503)


def test_exempt_origin_needs_no_key(client, auth_on):
    # localhost:3121 is in the default AUTH_EXEMPT_ORIGINS (Vite dev server).
    r = client.get(PROBE, headers={"Origin": "http://localhost:3121"})
    assert r.status_code == 200


def test_referer_fallback_for_same_origin_get(client, auth_on):
    # Same-origin GET fetches omit Origin; the Referer prefix must match.
    r = client.get(PROBE, headers={"Referer": "https://vedicpanchanga.com/panchang"})
    assert r.status_code == 200


def test_unknown_origin_still_needs_key(client, auth_on):
    headers = {"Origin": "https://myexampledomain.com"}
    assert client.get(PROBE, headers=headers).status_code == 401
    headers["X-API-Key"] = KEY
    assert client.get(PROBE, headers=headers).status_code == 200


def test_custom_exempt_origins_override(client, auth_on, monkeypatch):
    monkeypatch.setenv("AUTH_EXEMPT_ORIGINS", "https://partner.example")
    r = client.get(PROBE, headers={"Origin": "https://partner.example"})
    assert r.status_code == 200
    # The default exemptions are replaced, not extended.
    r = client.get(PROBE, headers={"Origin": "http://localhost:3121"})
    assert r.status_code == 401


# ── CORS preflight contract ──────────────────────────────────────────────
def test_preflight_succeeds_without_key(client, auth_on):
    """OPTIONS /api/calculate must succeed with the CORS headers browser apps
    need, even with auth enabled - preflights never carry credentials."""
    r = client.options(
        "/api/calculate",
        headers={
            # localhost:3121 is in the dev CORS_ORIGINS allowlist (.env).
            "Origin": "http://localhost:3121",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-api-key",
        },
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:3121"
    assert "POST" in r.headers["access-control-allow-methods"]
    allow_headers = r.headers["access-control-allow-headers"].lower()
    assert "authorization" in allow_headers
    assert "x-api-key" in allow_headers
    assert r.headers["access-control-max-age"] == "86400"


def test_preflight_rejects_origin_outside_cors_allowlist(client, auth_on):
    r = client.options(
        "/api/calculate",
        headers={
            "Origin": "https://not-in-allowlist.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert r.status_code == 400
    assert "access-control-allow-origin" not in r.headers
