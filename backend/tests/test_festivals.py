"""Festival calendar (`festivals.py`) pinned against DrikPanchang.

`fixtures/drikpanchang_festivals_delhi.json` holds every dated entry of the
DrikPanchang Hindu calendar for New Delhi in 2026 and 2027 plus both Pitru
Paksha Shraddha lists, captured on 2026-09-17. Each Drik name is mapped to
our festival id and the computed date must agree exactly. A set of marquee
festivals is also pinned by name so a regression says which festival moved,
not just that a count dropped. Do not change expected dates without checking
DrikPanchang for the same place and year.
"""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

import pytest

from festivals import MAX_YEAR, MIN_YEAR, compute_festivals

FIXTURE = Path(__file__).parent / "fixtures" / "drikpanchang_festivals_delhi.json"
DELHI = (28.6139, 77.2090, "Asia/Kolkata")

# Drik rows that have no counterpart in our rule set (regional / ISKCON variants
# and the Kumbha Mela markers).
SKIP = {
    "Agastya Arghya",
    "Kali Chaudas",
    "Swaminarayan Jayanti",
    "Rama Navami *ISKCON",
    "Rama Navami *Smarta",
}
ALIAS = {
    "Ganesh Visarjan": "anant_chaturdashi",
    "Basoda": "sheetala_ashtami",
    "Chhoti Holi": "holika_dahan",
    "Lakshmi Puja": "diwali",
    "Dussehra": "vijayadashami",
    "Gauri Puja": "gangaur",
    "Gudi Padwa": "hindu_new_year",
    "Ugadi": "hindu_new_year",
    "Nutan Varsh Prarambha": "hindu_new_year",
    "Hanuman Janmotsava": "hanuman_jayanti",
    "Kojagara Puja": "sharad_purnima",
    "Mauni Amavas": "mauni_amavasya",
    "Navratri Begins": "navratri_begins",
    "Pitrupaksha Begins": "pratipada_shraddha",
    "Rakhi": "raksha_bandhan",
    "Jagannath Rathyatra": "jagannath_rathyatra",
    "Maha Bharani": "maha_bharani",
    "Sarva Pitru Amavasya": "sarva_pitru_amavasya",
    "Bhaiya Dooj": "bhaiya_dooj",
}
NAMED_PURNIMAS = {
    "Guru Purnima",
    "Buddha Purnima",
    "Sharad Purnima",
    "Kartika Purnima",
    "Magha Purnima",
}
MONTH_SPELLING = {"Ashwina": "Ashwin"}


def drik_key(name: str):
    """Map a DrikPanchang calendar label to (id, *selector) or None to skip."""
    if name in SKIP or name.startswith("Gauna") or "Kumbha" in name:
        return None
    if name in ALIAS:
        return (ALIAS[name],)
    if name.startswith("Chandra Grahan"):
        return ("chandra_grahan",)
    if name.startswith("Surya Grahan"):
        return ("surya_grahan",)
    m = re.match(r"^(\w+) Sankranti$", name)
    if m:
        return ("sankranti", "to_sign", m.group(1))
    m = re.match(r"^(\w+)( Adhika)? Purnima$", name)
    if m and name not in NAMED_PURNIMAS:
        return (
            "purnima",
            "month",
            MONTH_SPELLING.get(m.group(1), m.group(1)),
            bool(m.group(2)),
        )
    if name.endswith(" Ekadashi"):
        return ("ekadashi_" + name[:-9].lower().replace(" ", "_"),)
    return (name.lower().replace(" ", "_"),)


@pytest.fixture(scope="module")
def drik():
    return json.loads(FIXTURE.read_text())


@pytest.fixture(scope="module")
def delhi():
    return {year: compute_festivals(year, *DELHI) for year in (2026, 2027)}


def by_id(result, fid):
    return [e for e in result["festivals"] if e["id"] == fid]


def one(result, fid):
    events = by_id(result, fid)
    assert len(events) == 1, (
        f"{fid}: expected one event, got {[e['date'] for e in events]}"
    )
    return events[0]


class TestDrikOracle:
    def test_every_calendar_entry_matches(self, drik, delhi):
        mismatches = []
        checked = 0
        for row in drik["events"] + drik["shraddha"]:
            key = drik_key(row["name"])
            if key is None:
                continue
            year = int(row["date"][:4])
            cands = by_id(delhi[year], key[0])
            if len(key) > 1 and key[1] == "to_sign":
                cands = [c for c in cands if c["rule"]["to_sign"] == key[2]]
            if len(key) > 1 and key[1] == "month":
                cands = [
                    c
                    for c in cands
                    if c["rule"]["month"] == key[2] and c["rule"]["adhika"] == key[3]
                ]
            checked += 1
            if not cands:
                mismatches.append(f"{row['date']} {row['name']}: not produced")
                continue
            target = date.fromisoformat(row["date"])
            nearest = min(
                cands, key=lambda c: abs((date.fromisoformat(c["date"]) - target).days)
            )
            if nearest["date"] != row["date"]:
                mismatches.append(
                    f"{row['date']} {row['name']}: ours {nearest['date']}"
                )
        assert checked > 290
        assert mismatches == []

    def test_shraddha_lists_complete(self, drik, delhi):
        for year in (2026, 2027):
            ours = {
                (e["id"], e["date"])
                for e in delhi[year]["festivals"]
                if e["series"] == "pitru_paksha"
            }
            want = {
                (drik_key(r["name"])[0], r["date"])
                for r in drik["shraddha"]
                if r["date"].startswith(str(year))
            }
            assert want <= ours


class TestMarqueeDates:
    """Explicit pins for the festivals people actually look up."""

    @pytest.mark.parametrize(
        "year,fid,expected",
        [
            (2026, "holika_dahan", "2026-03-03"),
            (2026, "holi", "2026-03-04"),
            (2026, "rama_navami", "2026-03-26"),
            (2026, "akshaya_tritiya", "2026-04-19"),
            (2026, "ganga_dussehra", "2026-05-25"),
            (2026, "ekadashi_nirjala", "2026-06-25"),
            (2026, "raksha_bandhan", "2026-08-28"),
            (2026, "varalakshmi_vrat", "2026-08-28"),
            (2026, "krishna_janmashtami", "2026-09-04"),
            (2026, "ganesh_chaturthi", "2026-09-14"),
            (2026, "balarama_jayanti", "2026-09-16"),
            (2026, "navratri_begins", "2026-10-11"),
            (2026, "durga_ashtami", "2026-10-19"),
            (2026, "maha_navami", "2026-10-19"),
            (2026, "vijayadashami", "2026-10-20"),
            (2026, "karwa_chauth", "2026-10-29"),
            (2026, "dhanteras", "2026-11-06"),
            (2026, "diwali", "2026-11-08"),
            (2026, "kali_puja", "2026-11-08"),
            (2026, "govardhan_puja", "2026-11-10"),
            (2026, "bhaiya_dooj", "2026-11-11"),
            (2026, "chhath_puja", "2026-11-15"),
            (2026, "ekadashi_devutthana", "2026-11-20"),
            (2026, "kalabhairav_jayanti", "2026-12-01"),
            (2027, "ekadashi_pausha_putrada", "2027-01-18"),
            (2027, "maha_shivaratri", "2027-03-06"),
            (2027, "holika_dahan", "2027-03-21"),
            (2027, "holi", "2027-03-22"),
            (2027, "rama_navami", "2027-04-15"),
            (2027, "akshaya_tritiya", "2027-05-09"),
            (2027, "raksha_bandhan", "2027-08-17"),
            (2027, "varalakshmi_vrat", "2027-08-13"),
            (2027, "krishna_janmashtami", "2027-08-25"),
            (2027, "balarama_jayanti", "2027-09-06"),
            (2027, "durga_ashtami", "2027-10-07"),
            (2027, "maha_navami", "2027-10-08"),
            (2027, "vijayadashami", "2027-10-09"),
            (2027, "diwali", "2027-10-29"),
            (2027, "chhath_puja", "2027-11-04"),
            (2027, "kalabhairav_jayanti", "2027-11-20"),
        ],
    )
    def test_date(self, delhi, year, fid, expected):
        assert one(delhi[year], fid)["date"] == expected

    def test_makara_sankranti_after_sunset_moves_to_next_day(self, delhi):
        makara = [
            e
            for e in by_id(delhi[2027], "sankranti")
            if e["rule"]["to_sign"] == "Makara"
        ]
        assert [e["date"] for e in makara] == ["2027-01-15"]
        assert makara[0]["instant"].startswith("2027-01-14T21")

    def test_adhika_month_hosts_only_ekadashi_purnima_amavasya(self, delhi):
        adhika = [e for e in delhi[2026]["festivals"] if e["rule"].get("adhika")]
        ids = {e["id"] for e in adhika}
        assert "ekadashi_padmini" in ids and "ekadashi_parama" in ids
        assert ids <= {
            "ekadashi_padmini",
            "ekadashi_parama",
            "purnima",
            "amavasya",
            "somavati_amavasya",
            "ganga_dussehra",
        }


class TestTimings:
    def test_diwali_has_tithi_span_and_pradosh_window(self, delhi):
        e = one(delhi[2026], "diwali")
        assert e["starts"].startswith("2026-11-08T11:2")
        assert e["ends"].startswith("2026-11-09T12:3")
        assert e["muhurta"]["kala"] == "pradosh"
        assert e["muhurta"]["start"].startswith("2026-11-08T17:3")
        assert e["sunrise"].startswith("2026-11-08T06:3")
        assert e["sunset"].startswith("2026-11-08T17:3")

    def test_holika_dahan_window_is_pradosh_on_pratipada_evening(self, delhi):
        # 2026: Bhadra covers the Purnima evening, Purnima lasts to 17:07 next
        # day, so Drik and we burn Holika in the Mar 3 pradosh (18:22 - 20:50).
        e = one(delhi[2026], "holika_dahan")
        assert e["muhurta"]["start"].startswith("2026-03-03T18:2")
        assert e["muhurta"]["end"].startswith("2026-03-03T20:5")

    def test_raksha_bandhan_window_is_next_morning_after_bhadra(self, delhi):
        e = one(delhi[2026], "raksha_bandhan")
        assert e["muhurta"]["start"].startswith("2026-08-28T05:5")
        assert e["muhurta"]["end"].startswith("2026-08-28T09:4")

    def test_janmashtami_window_is_nishita(self, delhi):
        e = one(delhi[2026], "krishna_janmashtami")
        assert e["muhurta"]["kala"] == "nishita"
        assert e["muhurta"]["start"].startswith("2026-09-04T23:5")

    def test_nirjala_ekadashi_parana(self, delhi):
        e = one(delhi[2026], "ekadashi_nirjala")
        assert e["parana"]["start"].startswith("2026-06-26T05:2")
        assert e["parana"]["end"].startswith("2026-06-26T08:1")

    def test_karwa_chauth_moonrise(self, delhi):
        e = one(delhi[2026], "karwa_chauth")
        assert e["muhurta"]["kala"] == "moonrise"
        assert e["muhurta"]["start"].startswith("2026-10-29T20:1")

    def test_eclipse_has_span_and_peak(self, delhi):
        eclipses = [e for e in delhi[2026]["festivals"] if e["kind"] == "eclipse"]
        assert [e["date"] for e in eclipses] == [
            "2026-02-17",
            "2026-03-03",
            "2026-08-12",
            "2026-08-28",
        ]
        for e in eclipses:
            assert e["starts"] < e["instant"] < e["ends"]

    def test_every_event_has_sunrise_sunset(self, delhi):
        for e in delhi[2026]["festivals"]:
            assert e["sunrise"] and e["sunset"]
            assert e["sunrise"].startswith(e["date"])


class TestPeriods:
    def test_delhi_2026_periods(self, delhi):
        periods = {p["id"]: p for p in delhi[2026]["periods"]}
        assert (periods["adhika_masa"]["start"], periods["adhika_masa"]["end"]) == (
            "2026-05-17",
            "2026-06-15",
        )
        assert periods["adhika_masa"]["month"] == "Jyeshtha"
        assert (periods["chaturmas"]["start"], periods["chaturmas"]["end"]) == (
            "2026-07-25",
            "2026-11-20",
        )
        assert (periods["pitru_paksha"]["start"], periods["pitru_paksha"]["end"]) == (
            "2026-09-26",
            "2026-10-10",
        )
        assert (
            periods["sharad_navratri"]["start"],
            periods["sharad_navratri"]["end"],
        ) == (
            "2026-10-11",
            "2026-10-19",
        )
        assert (periods["durga_puja"]["start"], periods["durga_puja"]["end"]) == (
            "2026-10-16",
            "2026-10-20",
        )
        assert (
            periods["chaitra_navratri"]["start"],
            periods["chaitra_navratri"]["end"],
        ) == (
            "2026-03-19",
            "2026-03-26",
        )

    def test_2027_has_no_adhika_month(self, delhi):
        assert not [p for p in delhi[2027]["periods"] if p["id"] == "adhika_masa"]


class TestOtherLocations:
    def test_toronto_shifts_evening_festivals_a_day_earlier(self):
        res = compute_festivals(2026, 43.65, -79.38, "America/Toronto")
        ids = {e["id"]: e["date"] for e in res["festivals"]}
        # Phalguna Purnima runs 17:54 Mar 2 to 17:07 Mar 3 IST, which is
        # 07:26 Mar 2 to 06:37 Mar 3 in Toronto: the only pradosh with Purnima
        # is Mar 2, so Holika Dahan and Holi fall a day earlier than in Delhi.
        # Janmashtami's Ashtami midnight likewise lands on Sep 3 there.
        assert ids["holika_dahan"] == "2026-03-02"
        assert ids["holi"] == "2026-03-03"
        assert ids["krishna_janmashtami"] == "2026-09-03"
        assert ids["diwali"] == "2026-11-08"
        assert res["location"]["timezone"] == "America/Toronto"

    def test_timezone_resolved_when_missing(self):
        res = compute_festivals(2026, -36.85, 174.76)
        assert res["location"]["timezone"] == "Pacific/Auckland"
        assert any(e["id"] == "diwali" for e in res["festivals"])

    def test_year_bounds(self):
        with pytest.raises(ValueError):
            compute_festivals(MIN_YEAR - 1, *DELHI)
        with pytest.raises(ValueError):
            compute_festivals(MAX_YEAR + 1, *DELHI)


@pytest.mark.http
class TestFestivalsApi:
    def test_endpoint_shape(self, api, base_url):
        r = api.get(
            f"{base_url}/api/festivals",
            params={"year": 2026, "latitude": 28.6139, "longitude": 77.209},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["year"] == 2026
        assert body["location"]["timezone"] == "Asia/Kolkata"
        diwali = [e for e in body["festivals"] if e["id"] == "diwali"]
        assert diwali and diwali[0]["date"] == "2026-11-08"
        assert {p["id"] for p in body["periods"]} >= {"chaturmas", "pitru_paksha"}

    def test_year_validation(self, api, base_url):
        r = api.get(
            f"{base_url}/api/festivals",
            params={"year": 1800, "latitude": 28.6139, "longitude": 77.209},
        )
        assert r.status_code == 400
