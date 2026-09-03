"""Tarabala and Chandrabala calculation tests."""

import os
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bala import chandrabala, tarabala
from server import app


def test_inclusive_tarabala_and_wraparound():
    janma = tarabala(1, 1)
    assert {
        key: janma[key]
        for key in ("count", "cycle", "tara_number", "tara", "favorable")
    } == {
        "count": 1,
        "cycle": 1,
        "tara_number": 1,
        "tara": "janma",
        "favorable": False,
    }
    assert janma["do"] == "Perform routine, low-risk tasks. Be mindful."
    assert tarabala(27, 1)["tara"] == "sampat"
    assert tarabala(1, 22)["tara"] == "kshema"


def test_chandrabala_uses_strict_reference_houses():
    favorable = chandrabala(1, 6)
    unfavorable = chandrabala(1, 8)
    assert (favorable["house"], favorable["favorable"]) == (6, True)
    assert (unfavorable["house"], unfavorable["favorable"]) == (8, False)
    assert "important decisions" in favorable["do"]
    assert "major decisions" in unfavorable["dont"]


def test_toronto_reference_transition_and_api():
    payload = {
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
        "birth_rashi_id": 1,
        "birth_nakshatra_id": 1,
        "latitude": 43.6532,
        "longitude": -79.3832,
        "timezone": "America/Toronto",
    }
    response = TestClient(app).post("/api/tarabala-chandrabala", json=payload)
    assert response.status_code == 200
    report = response.json()
    september_first = report["days"][0]
    assert [segment["nakshatra"] for segment in september_first["tarabala"]] == [
        "Ashwini",
        "Bharani",
    ]
    assert september_first["tarabala"][0]["end"][11:16] == "17:12"
    assert report["favorable_days"] > 0
    assert len(report["days"]) == 30


def test_date_range_validation():
    response = TestClient(app).post(
        "/api/tarabala-chandrabala",
        json={
            "start_date": "2026-09-02",
            "end_date": "2026-09-01",
            "birth_rashi_id": 1,
            "birth_nakshatra_id": 1,
            "latitude": 43.6532,
            "longitude": -79.3832,
            "timezone": "America/Toronto",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "End date must be on or after start date"
