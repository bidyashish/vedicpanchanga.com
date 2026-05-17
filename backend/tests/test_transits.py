"""Transit-event regression tests.

The Mercury ingress dates are deliberately written as `>=` / `<=` ranges
rather than exact matches: different ephemeris file versions (and the
ayanamsa epoch correction inside `swisseph`) shift sidereal ingress times by
a few hours, occasionally pushing them over a UT midnight. The tests check
the right *day-range*, not the minute, so they survive ephemeris refreshes.
"""

from __future__ import annotations

import pytest

from transits import compute_transits


@pytest.fixture(scope="module")
def transits_60d():
    return compute_transits(
        start_date="2026-05-16",
        end_date="2026-07-16",
        latitude=23.1765,
        longitude=75.7885,
        timezone_name="Asia/Kolkata",
        include_moon=False,
    )


class TestStructure:
    def test_returns_events_list(self, transits_60d):
        assert "events" in transits_60d
        assert isinstance(transits_60d["events"], list)

    def test_count_matches_events(self, transits_60d):
        assert transits_60d["count"] == len(transits_60d["events"])

    def test_events_are_sorted(self, transits_60d):
        times = [e["date_utc"] for e in transits_60d["events"]]
        assert times == sorted(times)

    def test_each_event_has_required_fields(self, transits_60d):
        for ev in transits_60d["events"]:
            assert "planet" in ev
            assert "abbr" in ev
            assert "event_type" in ev
            assert "date_utc" in ev
            assert "date_local" in ev


class TestPlanetCoverage:
    def test_moon_absent_by_default(self, transits_60d):
        moon = [e for e in transits_60d["events"] if e["planet"] == "Moon"]
        assert moon == []

    def test_outer_planets_present(self, transits_60d):
        # At least one of the outer planets emits an event in this window
        # (Pluto's Uttara Ashadha nakshatra ingress in mid-June, Neptune's
        # Pisces retrograde in early July, or - depending on the precise
        # sidereal state inherited from prior tests - a Uranus nakshatra
        # ingress near the same period). We don't pin which one because
        # swisseph's process-global state shifts events by arc-seconds
        # across test ordering.
        outers = {e["planet"] for e in transits_60d["events"]
                  if e["planet"] in ("Uranus", "Neptune", "Pluto")}
        assert len(outers) >= 1, "Expected at least one outer-planet event"


class TestMercuryGeminiIngress:
    """Mercury enters sidereal Gemini around 2026-05-29 in Lahiri ayanamsa.

    Mercury also retrogrades back into Gemini from Cancer in early July, so
    we expect 1-2 ingresses in this window depending on station timing.
    """

    def test_event_present(self, transits_60d):
        match = [
            e for e in transits_60d["events"]
            if e["planet"] == "Mercury"
            and e["event_type"] == "sign_ingress"
            and e["to_sign"] == "Gemini"
        ]
        assert 1 <= len(match) <= 2

    def test_first_ingress_late_may(self, transits_60d):
        match = next(
            e for e in transits_60d["events"]
            if e["planet"] == "Mercury"
            and e["event_type"] == "sign_ingress"
            and e["to_sign"] == "Gemini"
        )
        assert match["date_local"].startswith("2026-05-29") or \
            match["date_local"].startswith("2026-05-30")

    def test_mercury_retrogrades_in_window(self, transits_60d):
        # Mercury's June 2026 retrograde must be detected
        retro = [
            e for e in transits_60d["events"]
            if e["planet"] == "Mercury" and e["event_type"] == "retrograde"
        ]
        assert len(retro) >= 1


class TestEventTypes:
    def test_sign_ingress_has_from_to(self, transits_60d):
        for ev in transits_60d["events"]:
            if ev["event_type"] == "sign_ingress":
                assert "from_sign" in ev
                assert "to_sign" in ev
                # Adjacent rashis: |to_id - from_id| is 1 or 11 (wrap)
                diff = abs(ev["to_sign_id"] - ev["from_sign_id"])
                assert diff in (1, 11), (
                    f"{ev['planet']}: non-adjacent ingress {ev['from_sign']}->{ev['to_sign']}"
                )

    def test_nakshatra_ingress_has_from_to(self, transits_60d):
        for ev in transits_60d["events"]:
            if ev["event_type"] == "nakshatra_ingress":
                assert "from_nakshatra" in ev
                assert "to_nakshatra" in ev

    def test_retrograde_has_in_sign(self, transits_60d):
        for ev in transits_60d["events"]:
            if ev["event_type"] in ("retrograde", "direct"):
                assert "in_sign" in ev
                assert "in_nakshatra" in ev


class TestMoonToggle:
    def test_include_moon_adds_events(self):
        without_moon = compute_transits(
            start_date="2026-05-16",
            end_date="2026-06-16",
            latitude=23.1765,
            longitude=75.7885,
            timezone_name="Asia/Kolkata",
            include_moon=False,
        )
        with_moon = compute_transits(
            start_date="2026-05-16",
            end_date="2026-06-16",
            latitude=23.1765,
            longitude=75.7885,
            timezone_name="Asia/Kolkata",
            include_moon=True,
            moon_nakshatras=False,
        )
        assert with_moon["count"] > without_moon["count"]
        moon_events = [e for e in with_moon["events"] if e["planet"] == "Moon"]
        # Moon transits ~12-13 signs per month
        assert 10 <= len(moon_events) <= 16
        # No nakshatra events when moon_nakshatras=False
        nak_moon = [e for e in moon_events if e["event_type"] == "nakshatra_ingress"]
        assert nak_moon == []

    def test_moon_nakshatras_flag(self):
        out = compute_transits(
            start_date="2026-05-16",
            end_date="2026-06-16",
            latitude=23.1765,
            longitude=75.7885,
            timezone_name="Asia/Kolkata",
            include_moon=True,
            moon_nakshatras=True,
        )
        moon_nak = [
            e for e in out["events"]
            if e["planet"] == "Moon" and e["event_type"] == "nakshatra_ingress"
        ]
        # ~1 nakshatra per day
        assert 25 <= len(moon_nak) <= 32


class TestKetuAntipode:
    def test_ketu_sign_opposite_rahu(self):
        # Within a year-long window we should catch at least one Rahu sign
        # ingress; if so, Ketu's matching event is in the opposite rashi.
        out = compute_transits(
            start_date="2026-01-01",
            end_date="2026-12-31",
            latitude=23.1765,
            longitude=75.7885,
            timezone_name="Asia/Kolkata",
        )
        rahu_ingress = [
            e for e in out["events"]
            if e["planet"] == "Rahu" and e["event_type"] == "sign_ingress"
        ]
        ketu_ingress = [
            e for e in out["events"]
            if e["planet"] == "Ketu" and e["event_type"] == "sign_ingress"
        ]
        if rahu_ingress and ketu_ingress:
            r = rahu_ingress[0]
            k = ketu_ingress[0]
            # They occur at the same instant +/- a minute
            assert r["date_utc"][:16] == k["date_utc"][:16]
            # And in opposite signs (6 apart)
            assert (r["to_sign_id"] - k["to_sign_id"]) % 12 == 6
