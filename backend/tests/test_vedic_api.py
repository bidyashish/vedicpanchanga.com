"""HTTP integration tests for `/api/calculate` and `/api/get-panchang`.

Sample anchor: `DELHI_BIRTH` (1990-01-01 12:00 New Delhi). Numbers like the
Julian Day, classical BAV totals (Su=48, Mo=49, …, SAV=337), Sun's sign
(Sagittarius) are all true for that birth and act as regression checks.
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.http


@pytest.fixture(scope="module")
def chart(api, base_url):
    payload = {
        "birth_date": "1990-01-01", "birth_time": "12:00",
        "latitude": 28.6139, "longitude": 77.2090,
        "timezone": "Asia/Kolkata", "place_name": "New Delhi",
        "ayanamsa": "lahiri",
    }
    r = api.post(f"{base_url}/api/calculate", json=payload, timeout=30)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    return r.json()


# ==================== /api/calculate ====================


class TestCalculateContract:
    """Verify response shape contains all expected sections."""

    def test_required_fields_present(self, chart):
        for f in [
            "planets_data",
            "d1_chart",
            "d2_chart",
            "d9_chart",
            "ascendant",
            "dasha",
            "ashtakavarga",
            "birth",
        ]:
            assert f in chart, f"Missing top-level field: {f}"

    def test_planets_count(self, chart):
        names = [p["name"] for p in chart["planets_data"]]
        assert names == [
            "Sun",
            "Moon",
            "Mars",
            "Mercury",
            "Jupiter",
            "Venus",
            "Saturn",
            "Rahu",
            "Ketu",
        ]

    def test_planet_entry_fields(self, chart):
        sun = chart["planets_data"][0]
        for k in [
            "longitude",
            "sign",
            "sign_id",
            "degree_in_sign",
            "dms",
            "nakshatra",
            "nakshatra_pada",
            "nakshatra_lord",
            "house",
        ]:
            assert k in sun, f"Sun missing {k}"

    def test_julian_day_correct(self, chart):
        # New Delhi 1990-01-01 12:00 IST -> 06:30 UT -> JD ~ 2447892.7708
        jd = chart["birth"]["julian_day"]
        assert abs(jd - 2447892.7708333) < 0.001, f"JD off: {jd}"


class TestCalculateAccuracy:

    def test_rahu_ketu_180_apart(self, chart):
        planets = {p["name"]: p for p in chart["planets_data"]}
        diff = abs(planets["Rahu"]["longitude"] - planets["Ketu"]["longitude"])
        diff = min(diff, 360 - diff)
        assert abs(diff - 180.0) < 1e-6, f"Rahu-Ketu diff = {diff}"

    def test_d9_sign_calculation_valid(self, chart):
        for p in chart["planets_data"]:
            lon = p["longitude"]
            expected = int(((lon * 9) % 360) // 30) + 1
            # We need d9_sign on the planet entry — re-derive from chart map
            # Find which D9 house the abbr is in:
            d9 = chart["d9_chart"]
            d9_asc = chart["d9_asc_sign"]
            placed_house = None
            for h, abbrs in d9.items():
                if p["abbr"] in abbrs:
                    placed_house = int(h)
                    break
            assert placed_house is not None, f"{p['name']} not in d9_chart"
            placed_sign = ((placed_house - 1) + (d9_asc - 1)) % 12 + 1
            assert (
                placed_sign == expected
            ), f"{p['name']} D9 sign mismatch: got {placed_sign}, expected {expected}"

    def test_d2_hora_correctness(self, chart):
        for p in chart["planets_data"]:
            lon = p["longitude"]
            sign = int(lon // 30) + 1
            deg_in_sign = lon - (sign - 1) * 30
            is_odd = sign % 2 == 1
            if is_odd:
                expected = 5 if deg_in_sign < 15 else 4
            else:
                expected = 4 if deg_in_sign < 15 else 5
            d2 = chart["d2_chart"]
            d2_asc = chart["d2_asc_sign"]
            placed_house = None
            for h, abbrs in d2.items():
                if p["abbr"] in abbrs:
                    placed_house = int(h)
                    break
            assert placed_house is not None, f"{p['name']} not in d2_chart"
            placed_sign = ((placed_house - 1) + (d2_asc - 1)) % 12 + 1
            assert (
                placed_sign == expected
            ), f"{p['name']} D2 sign mismatch: got {placed_sign}, expected {expected}"

    def test_sun_sign_sagittarius(self, chart):
        sun = next(p for p in chart["planets_data"] if p["name"] == "Sun")
        # Jan 1 1990 sidereal Sun should be in Sagittarius (Dhanu)
        assert sun["sign"] == "Sagittarius", f"Sun sign = {sun['sign']}"


class TestVimshottariDasha:
    def test_nine_periods(self, chart):
        assert len(chart["dasha"]) == 9

    def test_total_years_120(self, chart):
        total = sum(d["years"] for d in chart["dasha"])
        assert (
            abs(total - 120.0) < 20.0
        ), f"Total years {total} (first dasha is balance)"
        # All 9 lords should appear exactly once
        lords = [d["lord"] for d in chart["dasha"]]
        assert sorted(lords) == sorted(
            [
                "Ketu",
                "Venus",
                "Sun",
                "Moon",
                "Mars",
                "Rahu",
                "Jupiter",
                "Saturn",
                "Mercury",
            ]
        )


class TestAshtakavarga:
    def test_sav_total_close_to_337(self, chart):
        sav = chart["ashtakavarga"]["sav"]
        assert len(sav) == 12
        total = sum(sav)
        assert 335 <= total <= 340, f"SAV total {total} not in [335,340]"

    def test_bav_per_planet_total(self, chart):
        # Classical BAV totals: Sun=48, Moon=49, Mars=39, Mercury=54,
        # Jupiter=56, Venus=52, Saturn=39 => SAV=337
        expected = {
            "Sun": 48,
            "Moon": 49,
            "Mars": 39,
            "Mercury": 54,
            "Jupiter": 56,
            "Venus": 52,
            "Saturn": 39,
        }
        bav = chart["ashtakavarga"]["bav"]
        for p, exp in expected.items():
            actual = sum(bav[p])
            assert actual == exp, f"BAV {p} total {actual} != classical {exp}"


class TestCalculateValidation:
    def test_invalid_date_returns_400(self, api, base_url):
        r = api.post(
            f"{base_url}/api/calculate",
            json={"birth_date": "not-a-date", "birth_time": "12:00",
                  "latitude": 28.6, "longitude": 77.2},
            timeout=15,
        )
        assert r.status_code == 400, f"Got {r.status_code}: {r.text}"

    def test_invalid_time_returns_400(self, api, base_url):
        r = api.post(
            f"{base_url}/api/calculate",
            json={"birth_date": "1990-01-01", "birth_time": "garbage",
                  "latitude": 28.6, "longitude": 77.2},
            timeout=15,
        )
        assert r.status_code == 400


# ==================== /api/get-panchang ====================


@pytest.fixture(scope="module")
def panchang_today(api, base_url):
    r = api.get(
        f"{base_url}/api/get-panchang",
        params={"latitude": 28.6139, "longitude": 77.2090,
                "timezone": "Asia/Kolkata", "detailed": "false"},
        timeout=30,
    )
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def panchang_thursday(api, base_url):
    # 2024-01-04 was a Thursday.
    r = api.get(
        f"{base_url}/api/get-panchang",
        params={"latitude": 28.6139, "longitude": 77.2090,
                "timezone": "Asia/Kolkata", "date": "2024-01-04",
                "detailed": "false"},
        timeout=30,
    )
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    return r.json()


class TestPanchang:
    """Sanity checks against the current detailed-panchang shape
    (`sun_moon`, `panchang.{tithi,nakshatra,yoga,karana}`,
    `auspicious_timings.abhijit`, `inauspicious_timings.rahu_kalam`)."""

    def test_five_limbs_present(self, panchang_today):
        assert {"sanskrit", "english"} <= set(panchang_today["vara"].keys())
        p = panchang_today["panchang"]
        for k in ("tithi", "nakshatra", "yoga", "karana"):
            assert "name" in p[k], f"{k} missing 'name'"

    def test_sun_moon_times_iso(self, panchang_today):
        sm = panchang_today["sun_moon"]
        assert "T" in sm["sunrise"] and "+05:30" in sm["sunrise"]
        assert "T" in sm["sunset"] and "+05:30" in sm["sunset"]
        for opt in ("moonrise", "moonset"):
            assert sm.get(opt) is None or "T" in sm[opt]

    def test_inauspicious_windows(self, panchang_today):
        ins = panchang_today["inauspicious_timings"]
        for key in ("rahu_kalam", "yamaganda", "gulika_kalam"):
            assert ins[key]["start"] and ins[key]["end"]

    def test_abhijit_centered_on_midday(self, panchang_today):
        from datetime import datetime

        ab = panchang_today["auspicious_timings"]["abhijit"]
        sm = panchang_today["sun_moon"]
        sr = datetime.fromisoformat(sm["sunrise"])
        ss = datetime.fromisoformat(sm["sunset"])
        ab_s = datetime.fromisoformat(ab["start"])
        ab_e = datetime.fromisoformat(ab["end"])
        midday = sr + (ss - sr) / 2
        center = ab_s + (ab_e - ab_s) / 2
        # Abhijit is the 8th of 15 day-muhūrtas; its mid-point coincides with
        # solar noon to within a minute.
        assert abs((center - midday).total_seconds()) < 60

    def test_thursday_rahu_kaal_is_6th_segment(self, panchang_thursday):
        from datetime import datetime

        assert panchang_thursday["vara"]["english"] == "Thursday"
        sm = panchang_thursday["sun_moon"]
        sr = datetime.fromisoformat(sm["sunrise"])
        ss = datetime.fromisoformat(sm["sunset"])
        seg_dur = (ss - sr) / 8
        # Thursday's Rāhu kālam is the 6th of 8 day-eighths (segments are
        # 0-indexed: index 5 → start sr+5·seg, end sr+6·seg).
        expected_start = sr + 5 * seg_dur
        expected_end = sr + 6 * seg_dur
        rk = panchang_thursday["inauspicious_timings"]["rahu_kalam"]
        rk_s = datetime.fromisoformat(rk["start"])
        rk_e = datetime.fromisoformat(rk["end"])
        assert abs((rk_s - expected_start).total_seconds()) < 60
        assert abs((rk_e - expected_end).total_seconds()) < 60

    def test_default_date_is_today(self, api, base_url):
        from datetime import date as date_cls

        r = api.get(
            f"{base_url}/api/get-panchang",
            params={"latitude": 28.6139, "longitude": 77.2090,
                    "timezone": "Asia/Kolkata"},
            timeout=30,
        )
        assert r.status_code == 200
        assert r.json()["date"] == date_cls.today().isoformat()
