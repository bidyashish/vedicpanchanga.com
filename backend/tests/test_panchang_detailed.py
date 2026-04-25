"""Detailed Drik Panchang verification — comprehensive /api/get-panchang.

Uses Kelowna BC, 2026-04-20 as the canonical Drik reference.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    from pathlib import Path
    p = Path("/app/frontend/.env")
    if p.exists():
        for line in p.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="module")
def kelowna():
    r = requests.get(f"{BASE_URL}/api/get-panchang", params={
        "latitude": 49.8871, "longitude": -119.4960,
        "timezone": "America/Vancouver", "date": "2026-04-20",
    }, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def delhi_default():
    r = requests.get(f"{BASE_URL}/api/get-panchang", params={
        "latitude": 28.6139, "longitude": 77.2090,
        "timezone": "Asia/Kolkata",
    }, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Kelowna 2026-04-20 reference values ----------
class TestKelownaReference:

    def test_top_level_sections(self, kelowna):
        for k in ["sun_moon", "vara", "panchang", "rashi_nakshatra", "lunar_month",
                  "ritu_ayana", "auspicious_timings", "inauspicious_timings",
                  "udaya_lagna", "chandrabalam", "tarabalam", "shool_vasa", "calendars"]:
            assert k in kelowna, f"missing section {k}"

    def test_sunrise_around_0554(self, kelowna):
        # Apparent upper-limb sunrise with refraction (matches drikpanchang).
        sr = kelowna["sun_moon"]["sunrise"]
        assert sr.startswith("2026-04-20T05:54"), sr

    def test_tithi_shukla_chaturthi(self, kelowna):
        first = kelowna["panchang"]["tithi_sequence"][0]
        assert first["name"] == "Shukla Chaturthi"
        assert first["ends_at"].startswith("2026-04-20T15:45")

    def test_nakshatra_rohini(self, kelowna):
        first = kelowna["panchang"]["nakshatra_sequence"][0]
        assert first["name"] == "Rohini"
        assert first["ends_at"].startswith("2026-04-20T13:38")

    def test_yoga_shobhana(self, kelowna):
        assert kelowna["panchang"]["yoga_sequence"][0]["name"] == "Shobhana"

    def test_karana_first_vishti(self, kelowna):
        assert kelowna["panchang"]["karana_sequence"][0]["name"] == "Vishti"

    def test_moonsign_vrishabha(self, kelowna):
        assert kelowna["rashi_nakshatra"]["moonsign_sequence"][0]["rashi"] == "Vrishabha"

    def test_sunsign_mesha(self, kelowna):
        assert kelowna["rashi_nakshatra"]["sunsign"]["rashi"] == "Mesha"

    def test_surya_nakshatra_ashwini_pada_2(self, kelowna):
        sn = kelowna["rashi_nakshatra"]["surya_nakshatra"]
        assert sn["name"] == "Ashwini" and sn["pada"] == 2

    def test_rahu_kalam_window(self, kelowna):
        # Derived from sunrise/sunset; shifts ~1 min earlier with apparent rise/set.
        rk = kelowna["inauspicious_timings"]["rahu_kalam"]
        assert rk["start"].startswith("2026-04-20T07:40")
        assert rk["end"].startswith("2026-04-20T09:25")

    def test_brahma_muhurta_window(self, kelowna):
        bm = kelowna["auspicious_timings"]["brahma_muhurta"]
        assert bm["start"].startswith("2026-04-20T04:35")
        assert bm["end"].startswith("2026-04-20T05:15")

    def test_shaka_samvat_1948_parabhava(self, kelowna):
        lm = kelowna["lunar_month"]
        assert lm["shaka_samvat"] == 1948
        assert lm["samvatsara_shaka"] == "Parabhava"

    def test_vikram_samvat_2083_siddharthi(self, kelowna):
        lm = kelowna["lunar_month"]
        assert lm["vikram_samvat"] == 2083
        assert lm["samvatsara_vikram"] == "Siddharthi"

    def test_kali_ahargana(self, kelowna):
        assert abs(kelowna["calendars"]["kali_ahargana_days"] - 1872686) <= 1

    def test_ayanamsha_lahiri(self, kelowna):
        assert abs(kelowna["calendars"]["ayanamsha_lahiri"] - 24.23) < 0.05

    def test_udaya_lagna_count(self, kelowna):
        # Should be ~12-13 lagna transits
        assert 11 <= len(kelowna["udaya_lagna"]) <= 14

    def test_auspicious_seven_timings(self, kelowna):
        a = kelowna["auspicious_timings"]
        for k in ["brahma_muhurta", "pratah_sandhya", "abhijit", "vijay_muhurta",
                  "godhuli_muhurta", "sayahna_sandhya", "nishita_muhurta"]:
            assert a.get(k), f"auspicious missing {k}"

    def test_inauspicious_required(self, kelowna):
        i = kelowna["inauspicious_timings"]
        for k in ["rahu_kalam", "yamaganda", "gulika_kalam", "dur_muhurtam", "bhadra"]:
            assert k in i, f"inauspicious missing {k}"

    def test_chandrabalam_six(self, kelowna):
        assert 5 <= len(kelowna["chandrabalam"]["good_rashis"]) <= 7

    def test_tarabalam_about_18(self, kelowna):
        assert 15 <= len(kelowna["tarabalam"]["good_nakshatras"]) <= 21

    def test_shool_vasa_present(self, kelowna):
        sv = kelowna["shool_vasa"]
        for k in ["disha_shool", "rahu_vasa", "chandra_vasa"]:
            assert sv.get(k), f"shool_vasa missing {k}"

    def test_calendars_complete(self, kelowna):
        c = kelowna["calendars"]
        for k in ["kali_year", "kali_ahargana_days", "julian_day",
                  "modified_julian_day", "rata_die", "ayanamsha_lahiri",
                  "national_civil_date", "national_nirayana_date"]:
            assert k in c, f"calendars missing {k}"


class TestDelhiTodayDetailed:
    """Smoke test: detailed payload for Delhi today, IST timezone."""
    def test_sunrise_in_ist(self, delhi_default):
        sr = delhi_default["sun_moon"]["sunrise"]
        assert "+05:30" in sr, sr

    def test_lunar_month_keys(self, delhi_default):
        lm = delhi_default["lunar_month"]
        for k in ["vikram_samvat", "shaka_samvat", "gujarati_samvat",
                  "chandramasa_purnimanta", "chandramasa_amanta",
                  "nirayana_solar_month", "pravishte_day", "paksha",
                  "samvatsara_vikram", "samvatsara_shaka"]:
            assert k in lm, f"lunar_month missing {k}"
